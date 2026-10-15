import {
  BOOKING_HONEYPOT_FIELD,
  canonicalPayloadString,
  type BookingFormValues,
  type BookingRequestPayload,
} from "@shared/booking";

const CLIENT_TIMEOUT_MS = 15_000;

export type BookingSubmitResult =
  | { status: "success"; requestId: string; outcome: "created" | "duplicate" }
  | { status: "conflict"; error: string }
  | { status: "invalid"; error: string }
  | { status: "unavailable"; error: string }
  | { status: "uncertain" };

function generateRequestId(): string {
  return crypto.randomUUID();
}

/** Computes the fingerprint of "the same booking request" from what the guest typed. */
export function fingerprintOf(values: BookingFormValues): string {
  const payload: BookingRequestPayload = {
    requestId: "", // ignored by canonicalPayloadString, kept only to satisfy the type
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    unitId: values.unitId,
    checkIn: values.checkIn,
    checkOut: values.checkOut,
    guests: values.guests,
    message: values.message,
  };
  return canonicalPayloadString(payload);
}

/**
 * Picks the requestId to submit with: the same ID as last time if this is a
 * retry of the identical payload (so the server/Sheet can recognize it as a
 * retry rather than a new booking), otherwise a fresh one.
 */
export function requestIdFor(
  fingerprint: string,
  previous: { fingerprint: string; requestId: string } | null
): string {
  if (previous && previous.fingerprint === fingerprint) return previous.requestId;
  return generateRequestId();
}

export async function submitBooking(
  values: BookingFormValues,
  requestId: string
): Promise<BookingSubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  const body = {
    requestId,
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    unitId: values.unitId,
    checkIn: values.checkIn,
    checkOut: values.checkOut,
    guests: values.guests,
    message: values.message,
    [BOOKING_HONEYPOT_FIELD]: values[BOOKING_HONEYPOT_FIELD] ?? "",
  };

  try {
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return { status: "uncertain" };
    }
    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object") return { status: "uncertain" };
    const data = json as {
      success?: boolean;
      requestId?: string;
      outcome?: string;
      uncertain?: boolean;
      error?: string;
    };

    if (data.success === true && data.requestId === requestId) {
      return { status: "success", requestId, outcome: data.outcome === "duplicate" ? "duplicate" : "created" };
    }
    if (res.status === 400) {
      return { status: "invalid", error: data.error ?? "That booking request isn't valid." };
    }
    if (res.status === 409) {
      return { status: "conflict", error: data.error ?? "This request was already submitted with different details." };
    }
    if (res.status === 503) {
      return { status: "unavailable", error: data.error ?? "Booking requests aren't available right now." };
    }
    return { status: "uncertain" };
  } catch {
    return { status: "uncertain" };
  } finally {
    clearTimeout(timer);
  }
}
