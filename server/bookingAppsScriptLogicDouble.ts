/**
 * NOT a real Google Apps Script / Google Sheets / Google Lock client.
 *
 * This is a plain TypeScript re-implementation of the *decision logic* in
 * google-apps-script/Code.gs (secret check → validate → lock → dedupe →
 * append → release), built only so that logic can be exercised with vitest.
 * It proves the rules are internally consistent; it proves nothing about
 * real Google Sheets write behavior, real Apps Script execution limits, or
 * real ScriptLock semantics — those require manually exercising the actual
 * deployed Apps Script (see google-apps-script/SETUP.md), which this change
 * explicitly has NOT done.
 */
import { createHash } from "node:crypto";
import { bookingRequestSchema, canonicalPayloadString, stripHoneypot, type BookingRequestPayload } from "../shared/booking";

export type FakeRow = {
  requestId: string;
  fingerprint: string;
  storedFields: BookingRequestPayload;
};

export class FakeSheet {
  rows: FakeRow[] = [];
  throwOnAppend = false;
}

export class FakeLock {
  private locked = false;
  acquireCount = 0;
  releaseCount = 0;

  tryLock(): boolean {
    if (this.locked) return false;
    this.locked = true;
    this.acquireCount++;
    return true;
  }

  isLocked(): boolean {
    return this.locked;
  }

  release(): void {
    this.locked = false;
    this.releaseCount++;
  }
}

export type DoPostAck =
  | { ok: true; requestId: string; outcome: "created" | "duplicate" }
  | { ok: false; error: "unauthorized" | "invalid_payload" | "busy" | "conflict" | "internal_error"; requestId?: string };

export function fingerprintOf(payload: BookingRequestPayload): string {
  return createHash("sha256").update(canonicalPayloadString(payload)).digest("hex");
}

export function handleDoPostDouble(args: {
  secretProvided: string;
  expectedSecret: string;
  rawPayload: unknown;
  sheet: FakeSheet;
  lock: FakeLock;
}): DoPostAck {
  if (args.secretProvided !== args.expectedSecret) {
    // Secret checked before anything touches the sheet.
    return { ok: false, error: "unauthorized" };
  }

  const parsed = bookingRequestSchema.safeParse(args.rawPayload);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload" };
  }
  const payload = stripHoneypot(parsed.data);

  const gotLock = args.lock.tryLock();
  if (!gotLock) {
    return { ok: false, error: "busy" };
  }

  try {
    const fingerprint = fingerprintOf(payload);
    const existing = args.sheet.rows.find((row) => row.requestId === payload.requestId);

    if (existing) {
      if (existing.fingerprint === fingerprint) {
        return { ok: true, requestId: payload.requestId, outcome: "duplicate" };
      }
      return { ok: false, error: "conflict", requestId: payload.requestId };
    }

    if (args.sheet.throwOnAppend) {
      throw new Error("simulated append failure");
    }

    // Stored exactly as given — a guest-supplied "=1+1" lands here as the
    // literal three-character string, never evaluated (this double has no
    // formula engine at all, mirroring the Apps Script "@" text-format guard).
    args.sheet.rows.push({ requestId: payload.requestId, fingerprint, storedFields: payload });
    return { ok: true, requestId: payload.requestId, outcome: "created" };
  } catch {
    return { ok: false, error: "internal_error" };
  } finally {
    args.lock.release();
  }
}
