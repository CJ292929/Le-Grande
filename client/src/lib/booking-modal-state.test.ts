/**
 * Covers the shared booking modal's unit-preselection logic and how it
 * interacts with retry-id identity: switching the preselected unit must
 * never clear contact details already typed, and — because it changes the
 * payload — must also mint a fresh requestId on the next submit rather than
 * reusing the one from a prior uncertain failure.
 */
import { describe, expect, it } from "vitest";
import { applyUnitPreselection, defaultBookingValues } from "./booking-modal-state";
import { fingerprintOf, requestIdFor } from "./booking";
import type { BookingFormValues } from "@shared/booking";

function filledValues(overrides: Partial<BookingFormValues> = {}): BookingFormValues {
  return {
    ...defaultBookingValues("residence-i"),
    fullName: "Juana Dela Cruz",
    email: "juana@example.com",
    checkIn: "2026-11-01",
    checkOut: "2026-11-02",
    ...overrides,
  };
}

describe("defaultBookingValues", () => {
  it("preselects the requested unit", () => {
    expect(defaultBookingValues("residence-iii").unitId).toBe("residence-iii");
  });

  it("falls back to the first unit when none is requested", () => {
    expect(defaultBookingValues().unitId).toBe("residence-i");
  });
});

describe("applyUnitPreselection", () => {
  it("changes only unitId, preserving every other field the guest already typed", () => {
    const current = filledValues({ unitId: "residence-i" });
    const next = applyUnitPreselection(current, "residence-ii");

    expect(next.unitId).toBe("residence-ii");
    expect(next.fullName).toBe(current.fullName);
    expect(next.email).toBe(current.email);
    expect(next.checkIn).toBe(current.checkIn);
    expect(next.checkOut).toBe(current.checkOut);
  });

  it("is a no-op when no unit is requested", () => {
    const current = filledValues();
    expect(applyUnitPreselection(current, undefined)).toBe(current);
  });

  it("is a no-op when the requested unit is already selected", () => {
    const current = filledValues({ unitId: "residence-iv" });
    expect(applyUnitPreselection(current, "residence-iv")).toBe(current);
  });

  it("changing the preselected unit changes the next requestId for an otherwise-unchanged payload", () => {
    const original = filledValues({ unitId: "residence-i" });
    const fp1 = fingerprintOf(original);
    const firstId = requestIdFor(fp1, null);

    const reopenedForDifferentUnit = applyUnitPreselection(original, "residence-ii");
    const fp2 = fingerprintOf(reopenedForDifferentUnit);
    const nextId = requestIdFor(fp2, { fingerprint: fp1, requestId: firstId });

    expect(fp2).not.toBe(fp1);
    expect(nextId).not.toBe(firstId);
  });

  it("reopening for the same unit after an uncertain failure preserves the retry requestId", () => {
    const original = filledValues({ unitId: "residence-i" });
    const fp1 = fingerprintOf(original);
    const firstId = requestIdFor(fp1, null);

    const reopenedSameUnit = applyUnitPreselection(original, "residence-i");
    const fp2 = fingerprintOf(reopenedSameUnit);
    const nextId = requestIdFor(fp2, { fingerprint: fp1, requestId: firstId });

    expect(fp2).toBe(fp1);
    expect(nextId).toBe(firstId);
  });
});
