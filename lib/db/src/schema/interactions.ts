import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { itemsTable } from "./items";

export const interactionsTable = pgTable("interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // view, click, purchase, watch, rate
  rating: real("rating"),
  watchDuration: integer("watch_duration"), // seconds
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInteractionSchema = createInsertSchema(interactionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactionsTable.$inferSelect;
