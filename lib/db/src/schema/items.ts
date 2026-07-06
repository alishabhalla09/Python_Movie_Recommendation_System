import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  genres: text("genres").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  rating: real("rating").notNull().default(0),
  releaseYear: integer("release_year").notNull(),
  posterUrl: text("poster_url"),
  backdropUrl: text("backdrop_url"),
  trailerUrl: text("trailer_url"),
  duration: integer("duration"),
  director: text("director"),
  cast: text("cast").array().notNull().default([]),
  type: text("type").notNull().default("movie"),
  metadata: jsonb("metadata").default({}),
  // Simple TF-IDF-like feature vector stored as JSON array for content-based filtering
  featureVector: jsonb("feature_vector").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({
  id: true,
  createdAt: true,
  featureVector: true,
});
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
