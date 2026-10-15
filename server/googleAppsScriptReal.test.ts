/**
 * Exercises the ACTUAL google-apps-script/Code.gs file (not a
 * reimplementation) through createGasHarness, which runs Code.gs's real
 * source via node:vm with stubbed Google services. See
 * googleAppsScriptRealHarness.ts and bookingAppsScriptLogicDouble.test.ts
 * (a separate, simpler decision-logic double) for what each proves and
 * doesn't. Neither proves anything about a real Google Sheet, real
 * ScriptLock, or real Properties/Sheets write durability — the actual Apps
 * Script has not been deployed or exercised against real Google services as
 * part of this change.
 */
import { describe, expect, it } from "vitest";
import { createGasHarness, FakeLockState, FakeSheetState, validHeader } from "./googleAppsScriptRealHarness";

const SECRET = "correct-secret";

function tomorrow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}

function dayAfter(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function payload(overrides: Record<string, unknown> = {}) {
  const checkIn = tomorrow();
  return {
    secret: SECRET,
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    fullName: "Juana Dela Cruz",
    email: "juana@example.com",
    phone: "",
    unitId: "residence-i",
    checkIn,
    checkOut: dayAfter(checkIn),
    guests: 2,
    message: "",
    ...overrides,
  };
}

function event(body: Record<string, unknown>) {
  return { postData: { contents: JSON.stringify(body) } };
}

function freshHarness(opts: { sheet?: FakeSheetState } = {}) {
  return createGasHarness({
    props: {
      BOOKING_SHEET_SHARED_SECRET: SECRET,
      BOOKING_SHEET_ID: "sheet-id-123",
      BOOKING_SHEET_TAB: "Bookings",
    },
    sheet: opts.sheet ?? new FakeSheetState({ tabName: "Bookings", header: validHeader() }),
  });
}

describe("the real google-apps-script/Code.gs, run via node:vm with stubbed Google services", () => {
  it("a wrong secret causes zero Sheet access and writes nothing", () => {
    const h = freshHarness();
    const ack = h.doPost(event(payload({ secret: "wrong" })));
    expect(ack).toMatchObject({ ok: false, error: "unauthorized" });
    expect(h.accessLog.filter((e) => e.type === "openById")).toHaveLength(0);
    expect(h.sheetState.table).toHaveLength(1); // header only
  });

  it("a missing secret property causes zero Sheet access", () => {
    const h = createGasHarness({
      props: { BOOKING_SHEET_ID: "sheet-id-123", BOOKING_SHEET_TAB: "Bookings" },
      sheet: new FakeSheetState({ tabName: "Bookings", header: validHeader() }),
    });
    const ack = h.doPost(event(payload()));
    expect(ack).toMatchObject({ ok: false, error: "unauthorized" });
    expect(h.accessLog).toHaveLength(0);
  });

  it("same requestId + same payload creates exactly one row (first created, retry duplicate)", () => {
    const h = freshHarness();
    const body = payload();
    const first = h.doPost(event(body));
    const second = h.doPost(event(body));
    expect(first).toMatchObject({ ok: true, outcome: "created" });
    expect(second).toMatchObject({ ok: true, outcome: "duplicate" });
    expect(h.sheetState.table).toHaveLength(2); // header + 1 data row
  });

  it("same requestId + different payload conflicts and never writes a second row", () => {
    const h = freshHarness();
    const original = payload();
    h.doPost(event(original));
    const edited = payload({ guests: 5 });
    const ack = h.doPost(event(edited));
    expect(ack).toMatchObject({ ok: false, error: "conflict", requestId: original.requestId });
    expect(h.sheetState.table).toHaveLength(2);
    expect(h.sheetState.table[1][8]).toBe(2); // guests column unchanged from the original row
  });

  it("header mismatch writes nothing", () => {
    const badHeader = validHeader();
    badHeader[0] = "Wrong Header";
    const h = freshHarness({ sheet: new FakeSheetState({ tabName: "Bookings", header: badHeader }) });
    const ack = h.doPost(event(payload()));
    expect(ack).toMatchObject({ ok: false, error: "sheet_schema_mismatch" });
    expect(h.sheetState.table).toHaveLength(1);
  });

  it("missing tab (sheet not found) writes nothing", () => {
    const h = freshHarness({ sheet: new FakeSheetState({ tabName: null }) });
    const ack = h.doPost(event(payload()));
    expect(ack).toMatchObject({ ok: false, error: "sheet_schema_mismatch" });
  });

  it("lock failure (already busy) writes nothing", () => {
    const lock = new FakeLockState();
    lock.locked = true; // simulate another in-flight execution already holding the script lock
    const h = createGasHarness({
      props: { BOOKING_SHEET_SHARED_SECRET: SECRET, BOOKING_SHEET_ID: "id", BOOKING_SHEET_TAB: "Bookings" },
      sheet: new FakeSheetState({ tabName: "Bookings", header: validHeader() }),
      lock,
    });
    const ack = h.doPost(event(payload()));
    expect(ack).toMatchObject({ ok: false, error: "busy" });
    expect(h.accessLog.filter((e) => e.type === "openById")).toHaveLength(0);
    expect(h.sheetState.table).toHaveLength(1);
  });

  it("the lock releases when the append write throws, and never acknowledges success", () => {
    const sheet = new FakeSheetState({ tabName: "Bookings", header: validHeader() });
    sheet.throwOnAppendWrite = true;
    const h = freshHarness({ sheet });
    const ack = h.doPost(event(payload()));
    expect(ack.ok).toBe(false);
    expect(ack).toMatchObject({ error: "internal_error" });
    expect(h.lockState.locked).toBe(false);
    expect(h.lockState.releaseCount).toBe(1);
  });

  it("the lock releases when flush throws, and a failed flush never produces a successful acknowledgment", () => {
    const sheet = new FakeSheetState({ tabName: "Bookings", header: validHeader() });
    sheet.throwOnFlush = true;
    const h = freshHarness({ sheet });
    const ack = h.doPost(event(payload()));
    expect(ack.ok).toBe(false);
    expect(ack).toMatchObject({ error: "internal_error" });
    expect(h.lockState.locked).toBe(false);
    expect(h.lockState.releaseCount).toBe(1);
  });

  describe("invalid payloads are rejected before the Sheet is ever touched", () => {
    it("rejects an invalid checkIn date", () => {
      const h = freshHarness();
      const ack = h.doPost(event(payload({ checkIn: "2026-02-30" })));
      expect(ack.ok).toBe(false);
      expect(h.accessLog.filter((e) => e.type === "openById")).toHaveLength(0);
    });

    it("rejects checkOut not after checkIn", () => {
      const h = freshHarness();
      const checkIn = tomorrow();
      const ack = h.doPost(event(payload({ checkIn, checkOut: checkIn })));
      expect(ack.ok).toBe(false);
    });

    it("rejects checkIn before today in Asia/Manila", () => {
      const h = freshHarness();
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 5);
      const checkIn = past.toISOString().slice(0, 10);
      const ack = h.doPost(event(payload({ checkIn, checkOut: dayAfter(checkIn) })));
      expect(ack.ok).toBe(false);
    });

    it("rejects an unknown unitId", () => {
      const h = freshHarness();
      const ack = h.doPost(event(payload({ unitId: "residence-v" })));
      expect(ack.ok).toBe(false);
    });

    it("rejects a non-positive guest count", () => {
      const h = freshHarness();
      const ack = h.doPost(event(payload({ guests: 0 })));
      expect(ack.ok).toBe(false);
    });

    it("rejects a non-integer guest count", () => {
      const h = freshHarness();
      const ack = h.doPost(event(payload({ guests: 2.5 })));
      expect(ack.ok).toBe(false);
    });
  });

  describe("formula-like strings receive an explicit safe literal encoding, independent of setNumberFormat", () => {
    const cases: Array<[string, string]> = [
      ["=HYPERLINK(\"http://evil.example\")", "fullName"],
      ["+1-555-0100=cmd", "phone"],
      ["-2+3", "message"],
      ["@SUM(A1:A9)", "message"],
      ["  =leading-whitespace", "message"],
      ["\t=tab-prefixed", "message"],
      [" =null-byte-prefixed", "message"],
    ];

    it.each(cases)("stores %j as a literal, never a live formula-trigger prefix", (value, field) => {
      const h = freshHarness();
      const ack = h.doPost(event(payload({ [field]: value })));
      expect(ack.ok).toBe(true);

      const colIndex = { fullName: 2, email: 3, phone: 4, message: 9 }[field as "fullName" | "email" | "phone" | "message"];
      const stored = h.sheetState.table[1][colIndex] as string;
      // The stored cell must start with something other than a live
      // formula-trigger character (after any whitespace/control chars) —
      // the apostrophe-prefix guard must hold even though this harness,
      // unlike real Sheets, does not itself evaluate formulas.
      const strippedStored = stored.replace(/^[\s\x00-\x1F]+/, "");
      expect(["=", "+", "-", "@"]).not.toContain(strippedStored.charAt(0));
      // And the original guest-entered text must still be recoverable
      // (nothing was silently dropped or mangled, just safely prefixed).
      expect(stored.endsWith(value.trim()) || stored === value || stored === "'" + value).toBe(true);
    });

    it("a fingerprint that happens to start with a base64 '+' is also stored safely and dedupe still matches on retry", () => {
      // Search for a payload whose fingerprint's first base64 character is "+".
      let found: ReturnType<typeof payload> | null = null;
      for (let i = 0; i < 2000 && !found; i++) {
        const candidate = payload({ message: `probe-${i}` });
        const h = freshHarness();
        const ack = h.doPost(event(candidate));
        const stored = h.sheetState.table[1][11] as string; // fingerprint column
        if (stored.replace(/^'/, "").startsWith("+")) {
          found = candidate;
          // Confirm the stored cell itself never starts with a live "+".
          expect(stored.charAt(0)).not.toBe("+");
        }
      }
      expect(found).not.toBeNull();

      // Now confirm dedupe still recognizes a retry of that exact payload
      // against a sheet that already has the safely-prefixed fingerprint
      // stored, i.e. the write-side and compare-side encoding stayed in sync.
      const sheet = new FakeSheetState({ tabName: "Bookings", header: validHeader() });
      const h2 = freshHarness({ sheet });
      const first = h2.doPost(event(found!));
      const second = h2.doPost(event(found!));
      expect(first).toMatchObject({ ok: true, outcome: "created" });
      expect(second).toMatchObject({ ok: true, outcome: "duplicate" });
      expect(h2.sheetState.table).toHaveLength(2);
    });
  });

  it("stored checkIn/checkOut retain their exact YYYY-MM-DD string meaning", () => {
    const h = freshHarness();
    const body = payload();
    h.doPost(event(body));
    expect(h.sheetState.table[1][6]).toBe(body.checkIn);
    expect(h.sheetState.table[1][7]).toBe(body.checkOut);
  });
});
