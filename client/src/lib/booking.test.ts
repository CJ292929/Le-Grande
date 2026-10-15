/**
 * Covers the client-side request-ID retry helpers in booking.ts: a retry of
 * the identical payload must keep the same requestId (so the server/Sheet
 * recognizes it as a safe retry, not a new booking), while any edit to the
 * payload must mint a fresh requestId (so it's never mistaken for a retry of
 * the old one).
 */
import { describe, expect, it } from "vitest";
import { fingerprintOf, requestIdFor } from "./booking";
import type { BookingFormValues } from "@shared/booking";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function values(overrides: Partial<BookingFormValues> = {}): BookingFormValues {
  return {
    fullName: "Juana Dela Cruz",
    email: "juana@example.com",
    phone: "",
    unitId: "residence-i",
    checkIn: "2026-11-01",
    checkOut: "2026-11-02",
    guests: 2,
    message: "",
    companyWebsite: "",
    ...overrides,
  } as BookingFormValues;
}

describe("fingerprintOf", () => {
  it("is identical for the same values", () => {
    expect(fingerprintOf(values())).toBe(fingerprintOf(values()));
  });

  it("changes when any meaningful field changes", () => {
    const base = fingerprintOf(values());
    expect(fingerprintOf(values({ guests: 3 }))).not.toBe(base);
    expect(fingerprintOf(values({ fullName: "Someone Else" }))).not.toBe(base);
    expect(fingerprintOf(values({ checkIn: "2026-11-05" }))).not.toBe(base);
  });
});

describe("requestIdFor", () => {
  it("has no previous submission: always mints a fresh, valid UUID", () => {
    const id = requestIdFor(fingerprintOf(values()), null);
    expect(id).toMatch(UUID_PATTERN);
  });

  it("retrying the identical payload after an uncertain failure keeps the same requestId", () => {
    const v = values();
    const fp1 = fingerprintOf(v);
    const firstId = requestIdFor(fp1, null);

    // Simulate a retry of the exact same form values (e.g. after a timeout).
    const fp2 = fingerprintOf(values());
    const retryId = requestIdFor(fp2, { fingerprint: fp1, requestId: firstId });

    expect(fp2).toBe(fp1);
    expect(retryId).toBe(firstId);
  });

  it("editing the payload before retrying mints a new requestId, never reusing the old one", () => {
    const v = values();
    const fp1 = fingerprintOf(v);
    const firstId = requestIdFor(fp1, null);

    const editedFp = fingerprintOf(values({ guests: 3 }));
    const newId = requestIdFor(editedFp, { fingerprint: fp1, requestId: firstId });

    expect(editedFp).not.toBe(fp1);
    expect(newId).not.toBe(firstId);
    expect(newId).toMatch(UUID_PATTERN);
  });
});
