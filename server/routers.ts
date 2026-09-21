import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { deleteMedia, getMediaById, insertMedia, listMedia, listPublishedMedia, reorderMedia, setMediaCover, updateMedia } from "./db";
import { storagePut } from "./storage";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const uploadSchema = z.object({
  sectionKey: z.enum(["hero", "property-gallery", "unit", "amenities", "location"]),
  unitKey: z.string().max(32).nullable().optional(),
  photoType: z.enum(["cover", "gallery", "bedroom", "bathroom", "living", "other"]).default("gallery"),
  imageAlt: z.string().trim().min(3).max(255),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string(),
  fileSize: z.number().int().positive().max(15_000_000),
  base64: z.string().min(32),
  replaceId: z.number().int().positive().optional(),
});

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "photo";
}

function toBuffer(base64: string) {
  const encoded = base64.includes(",") ? base64.split(",").pop()! : base64;
  return Buffer.from(encoded, "base64");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  media: router({
    published: publicProcedure.query(() => listPublishedMedia()),
    adminList: adminProcedure.query(() => listMedia()),
    upload: adminProcedure.input(uploadSchema).mutation(async ({ input }) => {
      if (!allowedMimeTypes.has(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload a JPG, JPEG, PNG, or WEBP image." });
      }
      const bytes = toBuffer(input.base64);
      if (!bytes.length || bytes.length > 15_000_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The image could not be read or is larger than 15 MB." });
      }
      const existing = await listMedia({ sectionKey: input.sectionKey, unitKey: input.unitKey ?? null });
      const key = `le-grande-media/${input.sectionKey}/${input.unitKey ?? "property"}/${Date.now()}-${safeFileName(input.fileName)}`;
      const uploaded = await storagePut(key, bytes, input.mimeType);
      const sharedValues = {
        sectionKey: input.sectionKey,
        unitKey: input.unitKey ?? null,
        photoType: input.photoType,
        imageUrl: uploaded.url,
        storageKey: uploaded.key,
        imageAlt: input.imageAlt,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: bytes.length,
        isPublished: 1,
        isDemo: 0,
      } as const;

      if (input.replaceId) {
        const current = await getMediaById(input.replaceId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "The photo to replace no longer exists." });
        await updateMedia(input.replaceId, sharedValues);
        return { action: "replaced" as const, media: await listMedia({ sectionKey: current.sectionKey, unitKey: current.unitKey }) };
      }

      await insertMedia({
        ...sharedValues,
        displayOrder: existing.length,
        isCover: existing.length === 0 ? 1 : 0,
      });
      return { action: "uploaded" as const, media: await listMedia({ sectionKey: input.sectionKey, unitKey: input.unitKey ?? null }) };
    }),
    setCover: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => setMediaCover(input.id)),
    reorder: adminProcedure.input(z.object({ items: z.array(z.object({ id: z.number().int().positive(), displayOrder: z.number().int().min(0) })) })).mutation(async ({ input }) => {
      await reorderMedia(input.items);
      return listMedia();
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const current = await getMediaById(input.id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "The photo no longer exists." });
      await deleteMedia(input.id);
      const remaining = await listMedia({ sectionKey: current.sectionKey, unitKey: current.unitKey });
      if (current.isCover && remaining[0]) await setMediaCover(remaining[0].id);
      return { success: true as const, media: await listMedia() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
