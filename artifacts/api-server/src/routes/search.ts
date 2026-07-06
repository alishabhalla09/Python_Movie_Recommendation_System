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

  const { q, genre, minRating, limit = 60 } = parsed.data;

  const searchTerm = (q ?? "").trim();
  const hasGenre = !!genre;
  const hasRating = minRating != null && minRating > 0;
  const hasQuery = searchTerm.length > 0;

  // At least one filter must be present
  if (!hasQuery && !hasGenre && !hasRating) {
    res.json(SearchItemsResponse.parse([]));
    return;
  }

  const conditions: any[] = [];

  // Full-text search only when query provided
  if (hasQuery) {
    conditions.push(
      sql`(
        to_tsvector('english', ${itemsTable.title} || ' ' || ${itemsTable.description})
        @@ plainto_tsquery('english', ${searchTerm})
        OR ${itemsTable.title} ILIKE ${"%" + searchTerm + "%"}
      )`
    );
  }

  if (hasRating) {
    // Note: minRating filter works when ratings are populated in DB
    // Currently ratings default to 0; genre filter is fully functional
    conditions.push(gte(itemsTable.rating, minRating!));
  }

  let items = await db
    .select()
    .from(itemsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      hasQuery
        ? sql`ts_rank(to_tsvector('english', ${itemsTable.title} || ' ' || ${itemsTable.description}), plainto_tsquery('english', ${searchTerm})) DESC`
        : sql`${itemsTable.rating} DESC`
    )
    .limit(hasGenre ? limit * 3 : limit); // fetch more when filtering by genre client-side

  // Genre filter (in-memory — genres stored as array)
  if (hasGenre) {
    items = items.filter((i) => i.genres.includes(genre!));
    items = items.slice(0, limit);
  }

  res.json(
    SearchItemsResponse.parse(items.map((i) => ({ ...i, interactionCount: null })))
  );
});

export default router;
