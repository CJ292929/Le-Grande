import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function contextFor(role: "admin" | "user" | null): TrpcContext {
  const user: AuthenticatedUser | null = role
    ? {
        id: 1,
        openId: `${role}-media-test`,
        email: `${role}@example.com`,
        name: role === "admin" ? "Le Grande Owner" : "Guest",
        loginMethod: "test",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("media owner access", () => {
  it("rejects unauthenticated media-library access", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.media.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects regular visitors from media-library access", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.media.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
