# Booking Sheet — owner setup

This connects the website's booking form to a Google Sheet you own, via a
small Apps Script web app. Nobody at Anthropic/this session has access to
your Google account — every step below is something only you can do.

Do not share your `BOOKING_SHEET_SHARED_SECRET` value in chat, email, or any
ticket. Treat it like a password.

## 1. Create the Google Sheet

1. Create a new Google Sheet (or use an existing spreadsheet you control).
2. Rename a tab to something you'll recognize, e.g. `Bookings`.
3. Copy the Sheet's ID from its URL: `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
4. Leave the tab empty for now — the script creates the header row for you in step 4.

## 2. Create the Apps Script project

1. In the Sheet, open **Extensions → Apps Script**.
2. Delete the placeholder `Code.gs` content and paste in the contents of
   [`google-apps-script/Code.gs`](./Code.gs) from this repository.
3. Save the project (give it a name, e.g. "Le Grand Homestay Booking Intake").

## 3. Set Script Properties

In the Apps Script editor: **Project Settings → Script Properties → Add script property**.
Add all three:

| Property | Value |
|---|---|
| `BOOKING_SHEET_ID` | the Sheet ID from step 1.3 |
| `BOOKING_SHEET_TAB` | the exact tab name from step 1.2 (e.g. `Bookings`) |
| `BOOKING_SHEET_SHARED_SECRET` | a long random string you generate yourself (e.g. from a password manager). This is **not** entered anywhere in the website's code — only here and in Vercel's environment variables (step 6). |

## 4. Initialize the header row

1. Back in the Apps Script editor, select the `initializeSheet` function from
   the function dropdown (top toolbar) and click **Run**.
2. The first time you run it, Google will ask you to authorize the script —
   review and accept (it only needs access to this one Sheet/project).
3. Check the Sheet: row 1 should now read exactly:
   `Request ID | Received Timestamp | Full Name | Email | Phone | Unit ID | Check-in | Check-out | Guests | Message | Status | Fingerprint (internal, for duplicate detection)`
4. If you ever need to re-run `initializeSheet`, it refuses to run if the tab
   already has content — this is intentional, so it can never overwrite
   existing bookings. Clear the tab manually first if you really mean to
   reset it.

## 5. Deploy as a web app

1. In the Apps Script editor: **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Settings:
   - **Execute as:** Me (your Google account)
   - **Who has access:** Anyone
4. Click **Deploy**, authorize again if prompted, and copy the **Web app
   URL** (it ends in `/exec`).

   **Important — what "Who has access: Anyone" actually means:** this
   setting controls who is *allowed to send a request to this URL* at all —
   it does not restrict requests to only come from your Vercel deployment,
   because Apps Script web apps have no concept of "only this server may
   call me." Anyone who has or guesses this URL can send it a POST request.
   The `BOOKING_SHEET_SHARED_SECRET` is what actually authenticates a
   request — `doPost` rejects any request whose `secret` field doesn't match
   the Script Property before it ever touches the Sheet. Keep the secret
   private; the URL being public-but-unguessable is not, by itself, a
   security boundary.
5. If you edit `Code.gs` later, you must create a **new deployment version**
   (Deploy → Manage deployments → edit → New version) for the change to take
   effect on the existing `/exec` URL.

## 6. Configure Vercel (do this later, when you're ready to go live)

In the Vercel project's **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `BOOKING_SHEET_SCRIPT_URL` | the `/exec` URL from step 5.4 |
| `BOOKING_SHEET_SHARED_SECRET` | the exact same value you put in Script Properties in step 3 |

Until both of these are set in Vercel, `POST /api/booking` responds with a
generic "not available right now" (HTTP 503) and never contacts Google —
this is intentional, not a bug.

This step was **not performed** as part of this change — no Vercel
environment variables were read, written, or modified by this work.

## What this script does and doesn't guarantee

- Every booking request is only ever appended once per unique `Request ID` +
  exact payload. A retried request with the same ID and same details returns
  the original outcome again instead of creating a duplicate row. A reused ID
  with *different* details is rejected as a conflict — it never overwrites
  the original row.
- The Sheet's header row is checked on every request; if it doesn't match
  exactly, the script refuses to write anything rather than guessing.
- Guest-entered free-text fields (full name, email, phone, message) get two
  independent guards against formula injection: the column's number format
  is forced to plain text (`setNumberFormat("@")`), and any value whose first
  non-whitespace/non-control character is `=`, `+`, `-`, or `@` is also
  prefixed with a literal apostrophe (`sanitizeForSheetCell_`) before being
  written. The second guard does not depend on the column's format staying
  plain text, so it still holds if that format is ever changed later.
- This script's own decision logic (secret check, validation, dedupe,
  locking) has been run against the real `Code.gs` file via a Node/vitest
  harness with Google services (PropertiesService, LockService,
  SpreadsheetApp, Utilities, ContentService) replaced by local stand-ins —
  see `server/googleAppsScriptReal.test.ts`. That proves the rules in this
  file are internally consistent; it does **not** prove anything about real
  Google Sheets write behavior, real Apps Script execution limits, real
  ScriptLock semantics, or real PropertiesService storage. This script has
  **not** been exercised against a real Google Sheet, a real deployment, or
  a real browser submitting the booking form, as part of this change.
