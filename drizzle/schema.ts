import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const propertyMedia = mysqlTable("property_media", {
  id: int("id").autoincrement().primaryKey(),
  sectionKey: varchar("sectionKey", { length: 64 }).notNull(),
  unitKey: varchar("unitKey", { length: 32 }),
  photoType: varchar("photoType", { length: 32 }).default("gallery").notNull(),
  imageUrl: text("imageUrl").notNull(),
  storageKey: text("storageKey"),
  imageAlt: varchar("imageAlt", { length: 255 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 80 }),
  fileSize: int("fileSize"),
  displayOrder: int("displayOrder").default(0).notNull(),
  isCover: int("isCover").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  isDemo: int("isDemo").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PropertyMedia = typeof propertyMedia.$inferSelect;
export type InsertPropertyMedia = typeof propertyMedia.$inferInsert;
