import { and, asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPropertyMedia, InsertUser, propertyMedia, PropertyMedia, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] === undefined) return;
    values[field] = user[field] ?? null;
    updateSet[field] = user[field] ?? null;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type MediaFilter = { sectionKey?: string; unitKey?: string | null };

function mediaWhere(filter?: MediaFilter) {
  if (!filter?.sectionKey) return undefined;
  const unitCondition = filter.unitKey ? eq(propertyMedia.unitKey, filter.unitKey) : isNull(propertyMedia.unitKey);
  return and(eq(propertyMedia.sectionKey, filter.sectionKey), unitCondition);
}

export async function listMedia(filter?: MediaFilter): Promise<PropertyMedia[]> {
  const db = await getDb();
  if (!db) return [];
  const where = mediaWhere(filter);
  return where
    ? db.select().from(propertyMedia).where(where).orderBy(asc(propertyMedia.displayOrder), asc(propertyMedia.id))
    : db.select().from(propertyMedia).orderBy(asc(propertyMedia.sectionKey), asc(propertyMedia.displayOrder), asc(propertyMedia.id));
}

export async function listPublishedMedia(): Promise<PropertyMedia[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(propertyMedia)
    .where(eq(propertyMedia.isPublished, 1))
    .orderBy(asc(propertyMedia.sectionKey), asc(propertyMedia.displayOrder), asc(propertyMedia.id));
}

export async function getMediaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id)).limit(1);
  return result[0];
}

export async function insertMedia(media: InsertPropertyMedia) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(propertyMedia).values(media);
  const rows = await listMedia({ sectionKey: media.sectionKey, unitKey: media.unitKey ?? null });
  return rows[rows.length - 1];
}

export async function updateMedia(id: number, values: Partial<InsertPropertyMedia>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(propertyMedia).set(values).where(eq(propertyMedia.id, id));
  return getMediaById(id);
}

export async function deleteMedia(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(propertyMedia).where(eq(propertyMedia.id, id));
}

export async function setMediaCover(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await getMediaById(id);
  if (!target) throw new Error("Photo not found");
  const where = mediaWhere({ sectionKey: target.sectionKey, unitKey: target.unitKey });
  if (where) await db.update(propertyMedia).set({ isCover: 0 }).where(where);
  await db.update(propertyMedia).set({ isCover: 1 }).where(eq(propertyMedia.id, id));
  return listMedia({ sectionKey: target.sectionKey, unitKey: target.unitKey });
}

export async function reorderMedia(items: Array<{ id: number; displayOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  for (const item of items) {
    await db.update(propertyMedia).set({ displayOrder: item.displayOrder }).where(eq(propertyMedia.id, item.id));
  }
}
