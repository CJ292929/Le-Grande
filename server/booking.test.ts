import { createServer, type Server } from "http";
import { AddressInfo } from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKING_HONEYPOT_FIELD } from "../shared/booking";

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

function validBody(overrides: Record<string, unknown> = {}) {
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

/**
 * Starts a fresh Express app (via a fresh module import, so it picks up
 * whatever process.env is set at call time) on its own ephemeral server.
 * Returns a self-contained handle — never relies on shared/outer state, so
 * tests can run with no risk of one test's server or env leaking into
 * another's.
 */
async function startApp(realFetch: typeof fetch) {
  vi.resetModules();
  const { createApp } = await import("./_core/app");
  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function post(body: unknown) {
    // Always the real fetch for the test's own client->server request —
    // global.fetch gets replaced in these tests to intercept the server's
    // own outbound call to the Apps Script URL, and the two must not collide.
    return realFetch(`${baseUrl}/api/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function close() {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  return { post, close };
}

describe("POST /api/booking", () => {
  const originalScriptUrl = process.env.BOOKING_SHEET_SCRIPT_URL;
  const originalSecret = process.env.BOOKING_SHEET_SHARED_SECRET;
  const originalTimeout = process.env.BOOKING_UPSTREAM_TIMEOUT_MS;
  let realFetch: typeof fetch;

  beforeEach(() => {
    realFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
    if (originalScriptUrl === undefined) delete process.env.BOOKING_SHEET_SCRIPT_URL;
    else process.env.BOOKING_SHEET_SCRIPT_URL = originalScriptUrl;
    if (originalSecret === undefined) delete process.env.BOOKING_SHEET_SHARED_SECRET;
    else process.env.BOOKING_SHEET_SHARED_SECRET = originalSecret;
    if (originalTimeout === undefined) delete process.env.BOOKING_UPSTREAM_TIMEOUT_MS;
    else process.env.BOOKING_UPSTREAM_TIMEOUT_MS = originalTimeout;
  });

  describe("configuration", () => {
    it("fails with a generic 503 and forwards nothing when the sheet is not configured", async () => {
      delete process.env.BOOKING_SHEET_SCRIPT_URL;
      delete process.env.BOOKING_SHEET_SHARED_SECRET;
      const { post, close } = await startApp(realFetch);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      try {
        const res = await post(validBody());
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      process.env.BOOKING_SHEET_SCRIPT_URL = "https://script.google.com/macros/s/fake/exec";
      process.env.BOOKING_SHEET_SHARED_SECRET = "shh";
    });

    async function expectRejectedWithoutForwarding(body: unknown) {
      const { post, close } = await startApp(realFetch);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;
      try {
        const res = await post(body);
        expect(res.status).toBe(400);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    }

    it("rejects an invalid check-in/check-out pair without forwarding", async () => {
      const checkIn = tomorrow();
      await expectRejectedWithoutForwarding(validBody({ checkIn, checkOut: checkIn }));
    });

    it("rejects an unknown unitId without forwarding", async () => {
      await expectRejectedWithoutForwarding(validBody({ unitId: "residence-v" }));
    });

    it("rejects an invalid email without forwarding", async () => {
      await expectRejectedWithoutForwarding(validBody({ email: "nope" }));
    });

    it("rejects a non-positive guest count without forwarding", async () => {
      await expectRejectedWithoutForwarding(validBody({ guests: 0 }));
    });

    it("rejects an unknown field without forwarding", async () => {
      await expectRejectedWithoutForwarding(validBody({ isAdmin: true }));
    });

    it("never returns success for a filled honeypot, and never forwards it", async () => {
      const { post, close } = await startApp(realFetch);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;
      try {
        const res = await post(validBody({ [BOOKING_HONEYPOT_FIELD]: "http://spam.example" }));
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    });
  });

  describe("upstream acknowledgment", () => {
    beforeEach(() => {
      process.env.BOOKING_SHEET_SCRIPT_URL = "https://script.google.com/macros/s/fake/exec";
      process.env.BOOKING_SHEET_SHARED_SECRET = "shh";
    });

    it("returns success only when the upstream JSON acknowledges the same requestId", async () => {
      const body = validBody();
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, requestId: body.requestId, outcome: "created" }),
      })) as unknown as typeof fetch;

      try {
        const res = await post(body);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, requestId: body.requestId, outcome: "created" });
      } finally {
        await close();
      }
    });

    it("forwards the secret in the JSON body, not the URL, and forwards only validated fields", async () => {
      const body = validBody();
      const { post, close } = await startApp(realFetch);
      const fetchSpy = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, requestId: body.requestId, outcome: "created" }),
      }));
      global.fetch = fetchSpy as unknown as typeof fetch;

      try {
        await post(body);
        const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(calledUrl).not.toContain("shh");
        const sentBody = JSON.parse(calledInit.body as string);
        expect(sentBody.secret).toBe("shh");
        expect(sentBody).not.toHaveProperty(BOOKING_HONEYPOT_FIELD);
        expect(sentBody.requestId).toBe(body.requestId);
      } finally {
        await close();
      }
    });

    it("treats a mismatched requestId in the ack as an uncertain failure, not success", async () => {
      const body = validBody();
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, requestId: "different-id", outcome: "created" }),
      })) as unknown as typeof fetch;

      try {
        const res = await post(body);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.uncertain).toBe(true);
      } finally {
        await close();
      }
    });

    it("treats an HTML upstream response as an uncertain failure, never success", async () => {
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        json: async () => ({}),
      })) as unknown as typeof fetch;

      try {
        const res = await post(validBody());
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.uncertain).toBe(true);
      } finally {
        await close();
      }
    });

    it("treats a non-2xx upstream status as uncertain even when the body looks like a valid JSON ack", async () => {
      const body = validBody();
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, requestId: body.requestId, outcome: "created" }),
      })) as unknown as typeof fetch;

      try {
        const res = await post(body);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.uncertain).toBe(true);
      } finally {
        await close();
      }
    });

    it("treats a network failure as an uncertain failure, never success", async () => {
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch;

      try {
        const res = await post(validBody());
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.uncertain).toBe(true);
      } finally {
        await close();
      }
    });

    it("treats an abort/timeout as an uncertain failure, never success", async () => {
      process.env.BOOKING_UPSTREAM_TIMEOUT_MS = "200";
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("test setup error: no signal provided"));
            return;
          }
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      }) as unknown as typeof fetch;

      try {
        const res = await post(validBody());
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.uncertain).toBe(true);
      } finally {
        await close();
      }
    });

    it("surfaces a conflict (same ID, different payload) distinctly, without claiming success", async () => {
      const body = validBody();
      const { post, close } = await startApp(realFetch);
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: false, requestId: body.requestId, error: "conflict" }),
      })) as unknown as typeof fetch;

      try {
        const res = await post(body);
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.success).toBe(false);
      } finally {
        await close();
      }
    });
  });
});
