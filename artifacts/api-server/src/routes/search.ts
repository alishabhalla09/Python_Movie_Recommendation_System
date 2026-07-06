import { Router, type IRouter } from "express";
import { db, itemsTable } from "@workspace/db";
import { sql, and, gte } from "drizzle-orm";
import {
  SearchItemsQueryParams,
  SearchItemsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, genre, minRating, limit = 20 } = parsed.data;

  // PostgreSQL full-text search on title + description
  const searchTerm = q.trim();
  if (!searchTerm) {
    res.json(SearchItemsResponse.parse([]));
    return;
  }

  const conditions = [
    sql`(
      to_tsvector('english', ${itemsTable.title} || ' ' || ${itemsTable.description})
      @@ plainto_tsquery('english', ${searchTerm})
      OR ${itemsTable.title} ILIKE ${"%" + searchTerm + "%"}
    )`,
  ];

  if (minRating != null) {
    conditions.push(gte(itemsTable.rating, minRating));
  }

  let items = await db
    .select()
    .from(itemsTable)
    .where(and(...conditions))
    .orderBy(
      sql`ts_rank(to_tsvector('english', ${itemsTable.title} || ' ' || ${itemsTable.description}), plainto_tsquery('english', ${searchTerm})) DESC`,
      sql`${itemsTable.rating} DESC`
    )
    .limit(limit);

  if (genre) {
    items = items.filter((i) => i.genres.includes(genre));
  }

  res.json(SearchItemsResponse.parse(items.map((i) => ({ ...i, interactionCount: null }))));
});

export default router;
