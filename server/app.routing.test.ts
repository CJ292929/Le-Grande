import { createServer, request as httpRequest, type Server } from "http";
import { AddressInfo } from "net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, parseBookingBody } from "./_core/app";
import { handleBookingRequest } from "./booking";
import { restoreRewrittenUrl } from "../api/index";

function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp();
  const server = createServer(app);
  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe("backend routing (real local HTTP requests)", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    ({ server, baseUrl } = await startServer());
  });

  afterEach(() => {
    server.close();
  });

  it("returns an API 404 (not the SPA) for an unknown /api route", async () => {
    const res = await fetch(`${baseUrl}/api/this-route-does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "Not Found" });
  });

  it("rejects a malformed JSON body on /api/booking with a generic JSON 400, not an HTML error page", async () => {
    const res = await fetch(`${baseUrl}/api/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "Bad Request" });
  });

  it("rejects an oversized /api/booking body with a generic JSON 413, not an HTML error page", async () => {
    const res = await fetch(`${baseUrl}/api/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(20_000) }),
    });
    expect(res.status).toBe(413);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "Request body too large" });
  });
});

function tomorrowISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}

function dayAfterISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function validBookingBody(overrides: Record<string, unknown> = {}) {
  const checkIn = tomorrowISO();
  return {
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    fullName: "Juana Dela Cruz",
    email: "juana@example.com",
    unitId: "residence-i",
    checkIn,
    checkOut: dayAfterISO(checkIn),
    guests: 2,
    ...overrides,
  };
}

/**
 * A minimal app wired the same way as createApp()'s /api/booking route,
 * but with a leading middleware that defines `req.body` as a getter —
 * standing in for @vercel/node's lazy body getter, which the real platform
 * installs on IncomingMessage ahead of any Express code. A real HTTP
 * client can't reproduce that platform behavior directly, so this harness
 * fakes only the one thing the platform does differently, while exercising
 * the actual, unmodified `parseBookingBody` and `handleBookingRequest`.
 */
function buildPreparsedTestApp(getBody: () => unknown) {
  const app = express();
  app.post(
    "/api/booking",
    (req, _res, next) => {
      Object.defineProperty(req, "body", { configurable: true, get: getBody });
      next();
    },
    parseBookingBody,
    handleBookingRequest
  );
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = (err as { status?: number; statusCode?: number } | null)?.status
      ?? (err as { status?: number; statusCode?: number } | null)?.statusCode
      ?? 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    res.status(safeStatus).json({ error: safeStatus === 413 ? "Request body too large" : "Bad Request" });
  });
  return app;
}

async function listen(app: express.Express): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("platform-parsed (Vercel-style) booking request bodies", () => {
  const originalScriptUrl = process.env.BOOKING_SHEET_SCRIPT_URL;
  const originalSecret = process.env.BOOKING_SHEET_SHARED_SECRET;
  let jsonSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.BOOKING_SHEET_SCRIPT_URL;
    delete process.env.BOOKING_SHEET_SHARED_SECRET;
    jsonSpy = vi.spyOn(express, "json");
  });

  afterEach(() => {
    jsonSpy.mockRestore();
    if (originalScriptUrl === undefined) delete process.env.BOOKING_SHEET_SCRIPT_URL;
    else process.env.BOOKING_SHEET_SCRIPT_URL = originalScriptUrl;
    if (originalSecret === undefined) delete process.env.BOOKING_SHEET_SHARED_SECRET;
    else process.env.BOOKING_SHEET_SHARED_SECRET = originalSecret;
  });

  it("returns 503 (never 500) for a valid pre-parsed payload when unconfigured, without ever falling back to the raw-body parser", async () => {
    const app = buildPreparsedTestApp(() => validBookingBody());
    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/booking`, { method: "POST" });
      expect(res.status).toBe(503);
      expect(jsonSpy).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("returns 400 when the lazy getter itself throws (platform-side malformed JSON)", async () => {
    const app = buildPreparsedTestApp(() => {
      throw new SyntaxError("Unexpected token in JSON");
    });
    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/booking`, { method: "POST" });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Bad Request" });
      expect(jsonSpy).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("returns 400 for a pre-parsed payload that fails schema validation", async () => {
    const app = buildPreparsedTestApp(() => validBookingBody({ email: "not-an-email" }));
    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/booking`, { method: "POST" });
      expect(res.status).toBe(400);
      expect(jsonSpy).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("returns 413 for a pre-parsed payload whose serialized size exceeds the limit", async () => {
    const app = buildPreparsedTestApp(() => validBookingBody({ message: "x".repeat(20_000) }));
    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/booking`, { method: "POST" });
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual({ error: "Request body too large" });
      expect(jsonSpy).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("still routes an ordinary (non-pre-parsed) raw JSON request through the ordinary body-parser path", async () => {
    // createApp()'s own route — req.body is undefined until express.json() runs.
    const app = createApp();
    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/booking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBookingBody()),
      });
      expect(res.status).toBe(503);
      expect(jsonSpy).toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("rejects a declared Content-Length above the limit before ever touching req.body", async () => {
    let getterCalled = false;
    const app = buildPreparsedTestApp(() => {
      getterCalled = true;
      return validBookingBody();
    });
    const { server, baseUrl } = await listen(app);
    try {
      // fetch() always derives Content-Length from the actual body it sends
      // and refuses a mismatched override, so a raw http.request is used
      // here to claim an oversized Content-Length independent of the few
      // bytes actually written — exactly what an adversarial client could
      // do, and exactly what this pre-check must not trust blindly for
      // anything under the limit, while still fast-failing anything over it.
      const status = await new Promise<number>((resolve, reject) => {
        const url = new URL(`${baseUrl}/api/booking`);
        const req = httpRequest(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: "POST",
            headers: { "content-type": "application/json", "content-length": "20000" },
          },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode ?? 0));
          }
        );
        req.on("error", reject);
        req.end("{}");
      });
      expect(status).toBe(413);
      expect(getterCalled).toBe(false);
      expect(jsonSpy).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});

describe("Vercel function entry point (api/index.ts)", () => {
  it("does not open a listening socket when imported", async () => {
    const netModule = await import("net");
    const listenSpy = vi.spyOn(netModule.Server.prototype, "listen");

    vi.resetModules();
    const mod = await import("../api/index");

    expect(typeof mod.default).toBe("function");
    expect(listenSpy).not.toHaveBeenCalled();
    listenSpy.mockRestore();
  });

  it("restores the real path from __rw_path and merges in the visitor's own query string", async () => {
    vi.resetModules();
    const { restoreRewrittenUrl } = await import("../api/index");

    expect(restoreRewrittenUrl("/api/index?__rw_path=%2Fapi%2Fbooking&foo=bar")).toBe(
      "/api/booking?foo=bar"
    );
    // No __rw_path present (e.g. a direct, non-rewritten hit on the function) passes the url through untouched.
    expect(restoreRewrittenUrl("/unrelated/path")).toBe("/unrelated/path");
  });

  it("preserves repeated query parameters and encoded characters when reconstructing the real path", () => {
    expect(
      restoreRewrittenUrl(
        "/api/index?__rw_path=%2Fapi%2Fbooking&tag=a&tag=b&msg=hello%20world%26more"
      )
    ).toBe("/api/booking?tag=a&tag=b&msg=hello+world%26more");
  });

  it("does NOT let a visitor-supplied __rw_path override the path Vercel's own rewrite already resolved", () => {
    // Verified against `vercel dev`: for a request that arrives via a configured
    // rewrite (e.g. POST /api/booking), req.url already carries the correct,
    // real pathname — Vercel appends __rw_path/path to the query string rather
    // than replacing the path. A visitor who smuggles their own __rw_path into
    // that request's query string must not be able to redirect it elsewhere.
    expect(
      restoreRewrittenUrl("/api/booking?__rw_path=%2Fapi%2Fsome-other-route")
    ).toBe("/api/booking?__rw_path=%2Fapi%2Fsome-other-route");
  });

  it("only trusts __rw_path when the request is a direct, literal hit on /api/index", () => {
    expect(restoreRewrittenUrl("/not-api/thing?__rw_path=%2Fapi%2Fbooking")).toBe(
      "/not-api/thing?__rw_path=%2Fapi%2Fbooking"
    );
  });

  it("fails safely (JSON 404, not a crash or SPA fallback) when a direct /api/index hit names a route the app doesn't expose", async () => {
    vi.resetModules();
    const { default: vercelHandler } = await import("../api/index");
    const server = createServer(vercelHandler);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", () => resolve()));
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/index?__rw_path=%2Fapi%2Fnot-a-real-route`);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toEqual({ error: "Not Found" });
    } finally {
      server.close();
    }
  });
});
