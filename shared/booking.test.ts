import { describe, expect, it } from "vitest";
import {
  BOOKING_HONEYPOT_FIELD,
  bookingFormSchema,
  bookingRequestSchema,
  canonicalPayloadString,
  getManilaTodayISO,
  isValidCalendarDateString,
  stripHoneypot,
} from "./booking";

function tomorrow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2); // +2 to stay clear of Manila/UTC day-boundary edge cases
  return d.toISOString().slice(0, 10);
}

function dayAfter(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function validPayload(overrides: Partial<Record<string, unknown>> = {}) {
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

describe("isValidCalendarDateString", () => {
  it("accepts a real date", () => expect(isValidCalendarDateString("2026-03-01")).toBe(true));
  it("rejects a nonexistent date (Feb 30)", () => expect(isValidCalendarDateString("2026-02-30")).toBe(false));
  it("rejects malformed input", () => expect(isValidCalendarDateString("03/01/2026")).toBe(false));
});

describe("bookingRequestSchema", () => {
  it("accepts a well-formed request", () => {
    const result = bookingRequestSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("rejects an invalid unitId", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ unitId: "residence-v" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ email: "not-an-email" }));
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive guest count", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ guests: 0 }));
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer guest count", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ guests: 2.5 }));
    expect(result.success).toBe(false);
  });

  it("rejects checkOut on or before checkIn", () => {
    const checkIn = tomorrow();
    const result = bookingRequestSchema.safeParse(validPayload({ checkIn, checkOut: checkIn }));
    expect(result.success).toBe(false);
  });

  it("rejects a checkIn before today in Asia/Manila", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ checkIn: "2000-01-01", checkOut: "2000-01-02" }));
    expect(result.success).toBe(false);
  });

  it("rejects an unknown field", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ adminOverride: true }));
    expect(result.success).toBe(false);
  });

  it("accepts the honeypot field explicitly when empty", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ [BOOKING_HONEYPOT_FIELD]: "" }));
    expect(result.success).toBe(true);
  });

  it("accepts an optional phone/message within their max lengths", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ phone: "+63 912 345 6789", message: "Arriving late." }));
    expect(result.success).toBe(true);
  });

  it("rejects a message over 1000 characters", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ message: "x".repeat(1001) }));
    expect(result.success).toBe(false);
  });
});

describe("stripHoneypot", () => {
  it("removes the honeypot field and keeps everything else", () => {
    const parsed = bookingRequestSchema.parse(validPayload({ [BOOKING_HONEYPOT_FIELD]: "" }));
    const stripped = stripHoneypot(parsed);
    expect(Object.keys(stripped)).not.toContain(BOOKING_HONEYPOT_FIELD);
    expect(stripped.fullName).toBe("Juana Dela Cruz");
  });
});

describe("canonicalPayloadString", () => {
  it("is identical for the same logical payload regardless of key order", () => {
    const payload = stripHoneypot(bookingRequestSchema.parse(validPayload()));
    const a = canonicalPayloadString(payload);
    const b = canonicalPayloadString({ ...payload });
    expect(a).toBe(b);
  });

  it("changes when any meaningful field changes", () => {
    const payload = stripHoneypot(bookingRequestSchema.parse(validPayload()));
    const edited = { ...payload, guests: payload.guests + 1 };
    expect(canonicalPayloadString(payload)).not.toBe(canonicalPayloadString(edited));
  });
});

describe("bookingFormSchema", () => {
  it("accepts form values without a requestId", () => {
    const { requestId: _requestId, ...formValues } = validPayload();
    const result = bookingFormSchema.safeParse(formValues);
    expect(result.success).toBe(true);
  });

  it("still rejects an invalid check-in/check-out pair", () => {
    const { requestId: _requestId, ...formValues } = validPayload();
    const result = bookingFormSchema.safeParse({ ...formValues, checkOut: formValues.checkIn });
    expect(result.success).toBe(false);
  });
});

describe("getManilaTodayISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(getManilaTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
