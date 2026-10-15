import "dotenv/config";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { handleBookingRequest } from "../booking";

const BOOKING_BODY_LIMIT_BYTES = 10 * 1024;

// Vercel's Node.js Function runtime (both real production and `vercel dev`)
// pre-parses a JSON request body into `req.body` itself, ahead of any
// framework code — see @vercel/node's dev-server.mjs, which defines `body`
// as a lazy getter on IncomingMessage for exactly this purpose. body-parser's
// jsonParser unconditionally reads `req.body` as an already-parsed-body check
// (`req.body = req.body || {}`), which forces that getter to run and fully
// drain the raw request stream. body-parser then tries to read the same
// stream itself via raw-body and gets "stream is not readable" — surfaced to
// clients as a generic 500, including for an otherwise-valid booking (see
// P2-P4R). Detect that the platform already parsed the body and skip
// body-parser's redundant re-read instead of triggering a second,
// now-impossible read of the same drained stream.
export function parseBookingBody(req: Request, res: Response, next: NextFunction) {
  // Cheap pre-filter on the declared Content-Length, before touching
  // `req.body` at all — on the Vercel runtime, merely reading `req.body`
  // triggers the platform's lazy getter, which fully parses (and on some
  // paths re-reads) the raw body. Rejecting an obviously-oversized request
  // here avoids paying that cost. This header is attacker-supplied and can
  // be absent, wrong, or omitted under chunked transfer, so it is only a
  // fast-path safeguard, never the authority — the serialized-byte check
  // below (for pre-parsed bodies) and body-parser's own `limit` (for the
  // raw-parse fallback) remain the actual enforcement.
  const contentLength = Number(req.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > BOOKING_BODY_LIMIT_BYTES) {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  try {
    if (req.body !== undefined) {
      // A serialized size is a proxy for the original wire size, not proof
      // of it — re-serializing can shrink or grow the byte count (e.g.
      // whitespace is dropped, non-ASCII characters re-encode differently)
      // — but it is the only measurement available for a body the platform
      // already parsed for us, and it is what actually bounds the memory
      // footprint of this request going forward.
      const size = Buffer.byteLength(JSON.stringify(req.body) ?? "");
      if (size > BOOKING_BODY_LIMIT_BYTES) {
        res.status(413).json({ error: "Request body too large" });
        return;
      }
      next();
      return;
    }
  } catch (err) {
    next(Object.assign(err instanceof Error ? err : new Error("Invalid JSON"), { status: 400 }));
    return;
  }
  // Not pre-parsed by the platform (standalone Express, `tsx` dev, tests) —
  // parse the raw body ourselves, with the same size limit enforced above.
  express.json({ limit: "10kb" })(req, res, next);
}

export function createApp(): Express {
  const app = express();
  app.post("/api/booking", parseBookingBody, handleBookingRequest);
  // Unmatched requests inside our own namespace get a JSON 404 instead of
  // falling through to any static/SPA handler the host app adds afterward
  // (e.g. local dev's Vite middleware, or serveStatic in production).
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    next();
  });
  // Turns body-parser's oversized/malformed-JSON errors (thrown before any
  // route handler runs, e.g. on /api/booking) into the same JSON shape the
  // rest of /api/* uses, instead of Express's default HTML error page.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) {
      next(err);
      return;
    }
    const status = (err as { status?: number; statusCode?: number } | null)?.status
      ?? (err as { status?: number; statusCode?: number } | null)?.statusCode
      ?? 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    res.status(safeStatus).json({ error: safeStatus === 413 ? "Request body too large" : "Bad Request" });
  });
  return app;
}
