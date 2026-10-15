/**
 * These tests exercise bookingAppsScriptLogicDouble.ts, a local
 * re-implementation of google-apps-script/Code.gs's decision logic. They
 * verify the dedup/conflict/locking RULES are correct — they do NOT prove
 * anything about a real Google Sheet write or real Google ScriptLock
 * behavior. The actual Apps Script has not been deployed or exercised as
 * part of this change.
 */
import { describe, expect, it } from "vitest";
import { FakeLock, FakeSheet, handleDoPostDouble } from "./bookingAppsScriptLogicDouble";

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
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    fullName: "Juana Dela Cruz",
    email: "juana@example.com",
    unitId: "residence-i",
    checkIn,
    checkOut: dayAfter(checkIn),
    guests: 2,
    ...overrides,
  };
}

const SECRET = "correct-secret";

function freshArgs(overrides: Record<string, unknown> = {}) {
  return {
    secretProvided: SECRET,
    expectedSecret: SECRET,
    rawPayload: payload(overrides),
    sheet: new FakeSheet(),
    lock: new FakeLock(),
  };
}

describe("bookingAppsScriptLogicDouble (labeled: logic double, not a real Sheets/Lock proof)", () => {
  it("a brand-new requestId creates exactly one row", () => {
    const args = freshArgs();
    const ack = handleDoPostDouble(args);
    expect(ack).toMatchObject({ ok: true, outcome: "created" });
    expect(args.sheet.rows).toHaveLength(1);
  });

  it("the same requestId with the same payload retried twice still produces exactly one row", () => {
    const sheet = new FakeSheet();
    const body = payload();
    const first = handleDoPostDouble({ secretProvided: SECRET, expectedSecret: SECRET, rawPayload: body, sheet, lock: new FakeLock() });
    const second = handleDoPostDouble({ secretProvided: SECRET, expectedSecret: SECRET, rawPayload: body, sheet, lock: new FakeLock() });

    expect(first).toMatchObject({ ok: true, outcome: "created" });
    expect(second).toMatchObject({ ok: true, outcome: "duplicate" });
    expect(sheet.rows).toHaveLength(1);
  });

  it("the same requestId with a changed payload is a conflict and never overwrites or appends", () => {
    const sheet = new FakeSheet();
    const original = payload();
    handleDoPostDouble({ secretProvided: SECRET, expectedSecret: SECRET, rawPayload: original, sheet, lock: new FakeLock() });

    const edited = payload({ guests: original.guests + 1 });
    const ack = handleDoPostDouble({ secretProvided: SECRET, expectedSecret: SECRET, rawPayload: edited, sheet, lock: new FakeLock() });

    expect(ack).toMatchObject({ ok: false, error: "conflict" });
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0].storedFields.guests).toBe(original.guests);
  });

  it("a wrong secret writes nothing", () => {
    const args = freshArgs();
    args.secretProvided = "wrong-secret";
    const ack = handleDoPostDouble(args);
    expect(ack).toMatchObject({ ok: false, error: "unauthorized" });
    expect(args.sheet.rows).toHaveLength(0);
  });

  it("formula-like input in a text field is stored as a literal string, never evaluated", () => {
    const args = freshArgs({ message: "=1+1", fullName: "=HYPERLINK(\"http://evil.example\")" });
    const ack = handleDoPostDouble(args);
    expect(ack.ok).toBe(true);
    expect(args.sheet.rows[0].storedFields.message).toBe("=1+1");
    expect(args.sheet.rows[0].storedFields.fullName).toBe('=HYPERLINK("http://evil.example")');
  });

  it("the lock is released after a successful append", () => {
    const args = freshArgs();
    handleDoPostDouble(args);
    expect(args.lock.isLocked()).toBe(false);
    expect(args.lock.acquireCount).toBe(1);
    expect(args.lock.releaseCount).toBe(1);
  });

  it("the lock is released even when the append throws", () => {
    const args = freshArgs();
    args.sheet.throwOnAppend = true;
    const ack = handleDoPostDouble(args);
    expect(ack).toMatchObject({ ok: false, error: "internal_error" });
    expect(args.lock.isLocked()).toBe(false);
    expect(args.lock.releaseCount).toBe(1);
  });

  it("a second request fails fast as busy while the lock is already held", () => {
    const lock = new FakeLock();
    lock.tryLock(); // simulate an in-flight request already holding the lock
    const args = freshArgs();
    args.lock = lock;
    const ack = handleDoPostDouble(args);
    expect(ack).toMatchObject({ ok: false, error: "busy" });
  });

  it("rejects an invalid payload (e.g. bad unitId) before ever touching the lock", () => {
    const args = freshArgs({ unitId: "residence-v" });
    const ack = handleDoPostDouble(args);
    expect(ack).toMatchObject({ ok: false, error: "invalid_payload" });
    expect(args.lock.acquireCount).toBe(0);
    expect(args.sheet.rows).toHaveLength(0);
  });
});
