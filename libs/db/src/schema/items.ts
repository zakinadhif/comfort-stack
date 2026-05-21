import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const items = pgTable("items", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const selectItemSchema = createSelectSchema(items);
export const insertItemSchema = createInsertSchema(items);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
