/**
 * POST /api/booking — forwards a validated booking request to the owner's
 * Google Sheet (via an Apps Script web app) and only acknowledges success
 * once that upstream call confirms it saved the exact same requestId.
 *
 * Never logs the request body, the shared secret, or the upstream response
 * body — those may contain guest personal information or the secret itself.
 */
import type { Request, Response } from "express";
import {
  BOOKING_HONEYPOT_FIELD,
  bookingRequestSchema,
  stripHoneypot,
  type BookingRequestPayload,
} from "../shared/booking.js";
import { ENV } from "./_core/env.js";

const UPSTREAM_TIMEOUT_MS = Number(process.env.BOOKING_UPSTREAM_TIMEOUT_MS) || 8_000;

type UpstreamAck = {
  ok: boolean;
  requestId?: unknown;
  outcome?: unknown;
  error?: unknown;
};

function isUpstreamAck(value: unknown): value is UpstreamAck {
  return !!value && typeof value === "object" && typeof (value as Record<string, unknown>).ok === "boolean";
}

async function forwardToSheet(payload: BookingRequestPayload): Promise<{ kind: "ack"; ack: UpstreamAck } | { kind: "uncertain" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstreamRes = await fetch(ENV.bookingSheetScriptUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, secret: ENV.bookingSheetSharedSecret }),
      signal: controller.signal,
      redirect: "follow",
    });

    // Platform/authorization/transport failures (quota, auth, HTML error
    // pages) can surface as a non-2xx status even though Apps Script's own
    // doPost responses are always HTTP 200 — see Code.gs's header comment.
    // Treat a non-2xx status as uncertain regardless of what content-type or
    // body came with it.
    if (!upstreamRes.ok) {
      return { kind: "uncertain" };
    }

    const contentType = upstreamRes.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return { kind: "uncertain" };
    }

    const body: unknown = await upstreamRes.json().catch(() => null);
    if (!isUpstreamAck(body)) {
      return { kind: "uncertain" };
    }
    return { kind: "ack", ack: body };
  } catch {
    // Network failure, abort/timeout, or a thrown parse error — all uncertain.
    return { kind: "uncertain" };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleBookingRequest(req: Request, res: Response): Promise<void> {
  const parsed = bookingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "That booking request isn't valid. Please check the form and try again." });
    return;
  }

  // Spam trap: a real visitor never fills this hidden field. Never reveal
  // that this was the reason for rejection — it would defeat the trap.
  if (parsed.data[BOOKING_HONEYPOT_FIELD]) {
    res.status(502).json({ success: false, uncertain: true });
    return;
  }

  if (!ENV.bookingSheetScriptUrl || !ENV.bookingSheetSharedSecret) {
    res.status(503).json({ success: false, error: "Booking requests aren't available right now. Please try again later." });
    return;
  }

  const payload = stripHoneypot(parsed.data);
  const result = await forwardToSheet(payload);

  if (result.kind === "uncertain") {
    res.status(504).json({ success: false, uncertain: true });
    return;
  }

  const { ack } = result;
  if (ack.requestId !== payload.requestId) {
    res.status(502).json({ success: false, uncertain: true });
    return;
  }

  if (!ack.ok) {
    if (ack.error === "conflict") {
      res.status(409).json({ success: false, error: "This request was already submitted with different details. Please start a new request." });
      return;
    }
    res.status(502).json({ success: false, uncertain: true });
    return;
  }

  res.status(200).json({
    success: true,
    requestId: payload.requestId,
    outcome: ack.outcome === "duplicate" ? "duplicate" : "created",
  });
}
