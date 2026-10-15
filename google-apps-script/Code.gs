/**
 * Le Grand Homestay — booking intake Apps Script web app.
 *
 * Deploy as a web app (doPost only is used). See SETUP.md in this folder for
 * exact owner steps. This file is plain Google Apps Script (V8 runtime) —
 * paste it into the Apps Script editor; it is not run by this project's own
 * build/test tooling (Node can't execute .gs files).
 *
 * Contract this must keep in sync with shared/booking.ts (the Node/React
 * side can't import this file, so the validation rules below are a
 * deliberate, manual mirror of shared/booking.ts — update both together):
 *   - requestId: UUID string
 *   - fullName: 1-120 chars (trimmed)
 *   - email: valid, max 254 chars
 *   - phone: optional, max 40 chars
 *   - unitId: one of the four fixed unit IDs below
 *   - checkIn/checkOut: YYYY-MM-DD real calendar dates, checkOut > checkIn,
 *     checkIn not before "today" in Asia/Manila
 *   - guests: positive integer
 *   - message: optional, max 1000 chars
 *
 * Response shape, for the HTTP responses *this script itself* produces via
 * jsonOutput_ (see "ContentService and HTTP status" below for the cases this
 * does NOT cover): { ok: boolean, requestId?: string,
 * outcome?: "created"|"duplicate", error?: string }. The caller
 * (server/booking.ts) treats anything other than `ok: true` with a matching
 * `requestId` as a failure — timeout, network error, non-JSON body, a
 * non-2xx HTTP status, and a mismatched requestId are all treated
 * identically as "uncertain" by the caller, never as success.
 *
 * ContentService and HTTP status: when doPost runs and returns normally (or
 * is caught by the try/catch below), Apps Script does not let it set a real
 * non-200 HTTP status — every response this code path produces comes back
 * as HTTP 200 with a JSON body, so for THOSE responses the `ok` field is
 * load-bearing, not the status code. This is not a blanket "Apps Script web
 * apps always return HTTP 200": platform/authorization/transport failures
 * that happen outside doPost's own execution — e.g. the deployment isn't
 * authorized or published correctly, the account hit an execution quota, or
 * Google returns an HTML interstitial — can surface as a non-2xx status or a
 * non-JSON (HTML) body instead of this JSON shape. server/booking.ts must
 * treat both a non-2xx status AND a malformed/non-JSON body as "uncertain",
 * not assume every response is a 200 with this JSON shape. Visiting the
 * deployment's /exec URL is also typically answered with a redirect to a
 * googleusercontent.com URL that serves the actual body; server/booking.ts's
 * fetch call uses `redirect: "follow"` so it receives the real response
 * rather than stopping at the redirect. Re-check the current Apps Script web
 * app guide before changing this deployment — these are platform behaviors,
 * not something this script controls.
 *
 * Quotas/limits: a single execution is capped by the Apps Script execution
 * time limit (several minutes depending on account type), and
 * LockService.getScriptLock() serializes concurrent executions of this
 * script. Re-check the current Apps Script quotas documentation before
 * relying on specific numeric limits — they are platform-defined and can
 * change.
 */

var SHEET_HEADERS = [
  "Request ID",
  "Received Timestamp",
  "Full Name",
  "Email",
  "Phone",
  "Unit ID",
  "Check-in",
  "Check-out",
  "Guests",
  "Message",
  "Status",
];
// Documented additional column (beyond the 11 required headers above), used
// only for request-id+payload deduplication — never shown to the owner as a
// "real" booking field.
var FINGERPRINT_HEADER = "Fingerprint (internal, for duplicate detection)";

var UNIT_IDS = ["residence-i", "residence-ii", "residence-iii", "residence-iv"];
var MANILA_TIME_ZONE = "Asia/Manila";
var LOCK_WAIT_MS = 6000; // kept below the caller's outbound timeout (8s default) so a lock conflict surfaces as a clean "busy", not a client-side timeout.

function doPost(e) {
  try {
    var body = parseRequestBody_(e);
    if (!body) {
      return jsonOutput_({ ok: false, error: "bad_request" });
    }

    var props = PropertiesService.getScriptProperties();
    var expectedSecret = props.getProperty("BOOKING_SHEET_SHARED_SECRET");
    if (!expectedSecret || !constantTimeEquals_(String(body.secret || ""), expectedSecret)) {
      // Invalid secret: never touch the Sheet.
      return jsonOutput_({ ok: false, error: "unauthorized" });
    }

    var validation = validatePayload_(body);
    if (!validation.ok) {
      return jsonOutput_({ ok: false, error: "invalid_payload", requestId: validation.requestId });
    }
    var payload = validation.payload;

    var sheetId = props.getProperty("BOOKING_SHEET_ID");
    var tabName = props.getProperty("BOOKING_SHEET_TAB");
    if (!sheetId || !tabName) {
      return jsonOutput_({ ok: false, error: "not_configured" });
    }

    var lock = LockService.getScriptLock();
    var gotLock = false;
    try {
      gotLock = lock.tryLock(LOCK_WAIT_MS);
      if (!gotLock) {
        return jsonOutput_({ ok: false, error: "busy", requestId: payload.requestId });
      }

      var sheet = openValidatedSheet_(sheetId, tabName);
      if (!sheet) {
        return jsonOutput_({ ok: false, error: "sheet_schema_mismatch" });
      }

      return appendOrDedupe_(sheet, payload);
    } finally {
      if (gotLock) lock.releaseLock();
    }
  } catch (err) {
    // Never include err.message verbatim — it can leak sheet names/paths.
    return jsonOutput_({ ok: false, error: "internal_error" });
  }
}

/** One-time owner setup: run this manually from the Apps Script editor (Run > initializeSheet). Never called from doPost. */
function initializeSheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("BOOKING_SHEET_ID");
  var tabName = props.getProperty("BOOKING_SHEET_TAB");
  if (!sheetId || !tabName) {
    throw new Error("Set BOOKING_SHEET_ID and BOOKING_SHEET_TAB in Script Properties first.");
  }
  var spreadsheet = SpreadsheetApp.openById(sheetId);
  var sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);
  var lastRow = sheet.getLastRow();
  if (lastRow > 0) {
    throw new Error("Tab '" + tabName + "' already has content — refusing to overwrite. Clear it manually first if this is intentional.");
  }
  var headerRow = SHEET_HEADERS.concat([FINGERPRINT_HEADER]);
  var range = sheet.getRange(1, 1, 1, headerRow.length);
  range.setNumberFormat("@");
  range.setValues([headerRow]);
  sheet.setFrozenRows(1);
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    var parsed = JSON.parse(e.postData.contents);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var mismatch = 0;
  for (var i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

var CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDateString_(value) {
  if (typeof value !== "string" || !CALENDAR_DATE_PATTERN.test(value)) return false;
  var parts = value.split("-");
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function manilaTodayISO_() {
  return Utilities.formatDate(new Date(), MANILA_TIME_ZONE, "yyyy-MM-dd");
}

var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Independent re-validation of the payload — mirrors shared/booking.ts (see file header). */
function validatePayload_(body) {
  var requestId = typeof body.requestId === "string" ? body.requestId : "";
  var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(requestId)) return { ok: false };

  var fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (fullName.length < 1 || fullName.length > 120) return { ok: false, requestId: requestId };

  var email = typeof body.email === "string" ? body.email.trim() : "";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { ok: false, requestId: requestId };

  var phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (phone.length > 40) return { ok: false, requestId: requestId };

  var unitId = typeof body.unitId === "string" ? body.unitId : "";
  if (UNIT_IDS.indexOf(unitId) === -1) return { ok: false, requestId: requestId };

  var checkIn = typeof body.checkIn === "string" ? body.checkIn : "";
  var checkOut = typeof body.checkOut === "string" ? body.checkOut : "";
  if (!isValidCalendarDateString_(checkIn) || !isValidCalendarDateString_(checkOut)) {
    return { ok: false, requestId: requestId };
  }
  if (checkOut <= checkIn) return { ok: false, requestId: requestId };
  if (checkIn < manilaTodayISO_()) return { ok: false, requestId: requestId };

  var guests = body.guests;
  if (typeof guests !== "number" || !isFinite(guests) || Math.floor(guests) !== guests || guests <= 0) {
    return { ok: false, requestId: requestId };
  }

  var message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > 1000) return { ok: false, requestId: requestId };

  return {
    ok: true,
    requestId: requestId,
    payload: {
      requestId: requestId,
      fullName: fullName,
      email: email,
      phone: phone,
      unitId: unitId,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests,
      message: message,
    },
  };
}

/** Deterministic fingerprint of "the same booking request", excluding requestId. Mirrors shared/booking.ts canonicalPayloadString. */
function canonicalPayloadString_(payload) {
  var ordered = {
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    email: payload.email,
    fullName: payload.fullName,
    guests: payload.guests,
    message: payload.message || "",
    phone: payload.phone || "",
    unitId: payload.unitId,
  };
  return JSON.stringify(ordered);
}

function fingerprintOf_(payload) {
  var digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonicalPayloadString_(payload));
  return Utilities.base64Encode(digestBytes);
}

/** Opens the sheet and verifies the header row matches exactly — never writes if it doesn't. Returns null on mismatch. */
function openValidatedSheet_(sheetId, tabName) {
  var spreadsheet = SpreadsheetApp.openById(sheetId);
  var sheet = spreadsheet.getSheetByName(tabName);
  if (!sheet) return null;
  if (sheet.getLastRow() < 1) return null; // no header row yet — owner must run initializeSheet() first.
  var expected = SHEET_HEADERS.concat([FINGERPRINT_HEADER]);
  var actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
  for (var i = 0; i < expected.length; i++) {
    if (String(actual[i]) !== expected[i]) return null;
  }
  return sheet;
}

/**
 * Characters that make a spreadsheet engine treat a cell's content as a
 * formula if any of them is the first non-whitespace, non-control character.
 */
var FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@"];

/**
 * Explicit, format-independent injection guard for guest-supplied free text
 * (fullName, email, phone, message). setNumberFormat("@") below is kept as a
 * first line of defense, but a column's number format can be changed later
 * by the Sheet owner (manually, or by copy/pasting a differently-formatted
 * range over it) without this script's knowledge — at that point a stored
 * "=1+1" would start evaluating as a formula. Prefixing a leading apostrophe
 * forces literal text independent of the column's format, so this guard
 * still holds even if the number-format guard is ever lost. Neither
 * replaces the other. Strips leading whitespace/control characters first,
 * since spreadsheet engines skip those when deciding whether a cell starts
 * with a formula-trigger character.
 */
function sanitizeForSheetCell_(value) {
  var str = String(value);
  var stripped = str.replace(/^[\s\x00-\x1F]+/, "");
  if (stripped.length > 0 && FORMULA_TRIGGER_CHARS.indexOf(stripped.charAt(0)) !== -1) {
    return "'" + str;
  }
  return str;
}

function appendOrDedupe_(sheet, payload) {
  var lastRow = sheet.getLastRow();
  var newFingerprint = fingerprintOf_(payload);
  // The fingerprint is base64 (alphabet includes "+"), so it goes through
  // the same explicit guard as free text; sanitize once here and reuse the
  // same value for both the stored cell and the dedupe comparison below so
  // the two never drift apart.
  var newFingerprintCell = sanitizeForSheetCell_(newFingerprint);

  if (lastRow > 1) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var existingFingerprints = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      if (String(existingIds[i][0]) === payload.requestId) {
        if (String(existingFingerprints[i][0]) === newFingerprintCell) {
          // Same requestId, same payload: this is a safe retry — return the
          // original outcome again without writing a second row.
          return jsonOutput_({ ok: true, requestId: payload.requestId, outcome: "duplicate" });
        }
        // Same requestId, different payload: never overwrite or append.
        return jsonOutput_({ ok: false, error: "conflict", requestId: payload.requestId });
      }
    }
  }

  var rowIndex = lastRow + 1;
  var rowValues = [
    payload.requestId, // UUID — can never start with a formula-trigger character, left as-is.
    new Date(),
    sanitizeForSheetCell_(payload.fullName),
    sanitizeForSheetCell_(payload.email),
    sanitizeForSheetCell_(payload.phone),
    payload.unitId, // fixed enum value, never guest-free-text.
    payload.checkIn, // YYYY-MM-DD, always digit-led — sanitizing would be a no-op; kept as the exact validated string so the stored value's calendar-date meaning is unambiguous.
    payload.checkOut,
    payload.guests,
    sanitizeForSheetCell_(payload.message),
    "NEW",
    newFingerprintCell,
  ];

  // Force every guest-controlled text column to plain-text format before
  // writing, so Sheets never auto-parses a value into a date/number. This is
  // a second, independent layer on top of sanitizeForSheetCell_ above — see
  // that function's comment for why neither guard alone is sufficient.
  var textColumns = [1, 3, 4, 5, 6, 7, 8, 10, 11, 12];
  for (var c = 0; c < textColumns.length; c++) {
    sheet.getRange(rowIndex, textColumns[c]).setNumberFormat("@");
  }
  sheet.getRange(rowIndex, 9).setNumberFormat("0"); // Guests is intentionally left as a real number.
  sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);

  SpreadsheetApp.flush(); // acknowledge only after the write is durable.

  return jsonOutput_({ ok: true, requestId: payload.requestId, outcome: "created" });
}

function jsonOutput_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
