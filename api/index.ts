import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/_core/app.js";

// Built once per function instance and reused across invocations. Must never
// call listen() or pull in dev-only Vite tooling — this module is the
// Vercel Node.js Function entry point for the booking API.
const app = createApp();

// This function's filesystem route is the exact literal path "/api/index" —
// Vercel does not grant a static-named function ownership of arbitrary nested
// path segments underneath it. So vercel.json rewrites all of /api/* to this
// literal path and carries the real request path in the "__rw_path" query
// parameter instead of appending it to the URL. The visitor's own query
// string is preserved by Vercel alongside "__rw_path", so we only need to
// pull "__rw_path" back out and restore it as the path before Express sees
// the request.
//
// Verified against the actual Vercel dev runtime (not assumed): for requests
// that arrive via the configured rewrites, req.url already carries the real,
// correct pathname (e.g. "/api/booking") — Vercel appends "__rw_path"/"path"
// to the query string rather than replacing the path. "__rw_path" is only
// load-bearing when this function is hit on its own literal path,
// "/api/index" (e.g. a direct, non-rewritten request). Trusting "__rw_path"
// unconditionally let a visitor smuggle their own "__rw_path" into a
// legitimately-rewritten request (say, "/api/booking?__rw_path=/api/some-
// other-route") and have it silently redirected to a different route than
// the one Vercel's rewrite actually selected. Gating on the literal pathname
// closes that: a visitor's "__rw_path" is only honored when there was no real
// path for Vercel to have already put there.
const REWRITE_PATH_PARAM = "__rw_path";
const FUNCTION_OWN_PATH = "/api/index";

export function restoreRewrittenUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const parsed = new URL(url, "http://internal");
  if (parsed.pathname !== FUNCTION_OWN_PATH) return url;
  const realPath = parsed.searchParams.get(REWRITE_PATH_PARAM);
  if (realPath === null) return url;
  parsed.searchParams.delete(REWRITE_PATH_PARAM);
  const query = parsed.searchParams.toString();
  return query.length > 0 ? `${realPath}?${query}` : realPath;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  req.url = restoreRewrittenUrl(req.url);
  return app(req, res);
}
