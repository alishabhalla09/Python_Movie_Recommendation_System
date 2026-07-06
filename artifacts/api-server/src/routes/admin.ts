import { Router, type IRouter } from "express";
import { db, usersTable, itemsTable, interactionsTable, watchlistTable, reviewsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import {
  GetAnalyticsResponse,
  GetAdminStatsResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [[users], [items], [interactions], [watchlist], [reviews]] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(usersTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(itemsTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(interactionsTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(watchlistTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(reviewsTable),
  ]);

  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: Number(users?.count ?? 0),
      totalItems: Number(items?.count ?? 0),
      totalInteractions: Number(interactions?.count ?? 0),
      totalWatchlistEntries: Number(watchlist?.count ?? 0),
      totalReviews: Number(reviews?.count ?? 0),
    })
  );
});

router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const [[users], [items], [interactions]] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(usersTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(itemsTable),
    db.select({ count: sql<number>`COUNT(*)` }).from(interactionsTable),
  ]);

  // Top items by interaction count
  const topItemsRows = await db
    .select({
      id: itemsTable.id,
      title: itemsTable.title,
      description: itemsTable.description,
      genres: itemsTable.genres,
      tags: itemsTable.tags,
      rating: itemsTable.rating,
      releaseYear: itemsTable.releaseYear,
      posterUrl: itemsTable.posterUrl,
      backdropUrl: itemsTable.backdropUrl,
      trailerUrl: itemsTable.trailerUrl,
      duration: itemsTable.duration,
      director: itemsTable.director,
      cast: itemsTable.cast,
      type: itemsTable.type,
      createdAt: itemsTable.createdAt,
      interactionCount: sql<number>`COUNT(${interactionsTable.id})`.as("interaction_count"),
    })
    .from(itemsTable)
    .leftJoin(interactionsTable, sql`${interactionsTable.itemId} = ${itemsTable.id}`)
    .groupBy(itemsTable.id)
    .orderBy(desc(sql`interaction_count`))
    .limit(10);

  // Genre distribution
  const allItems = await db.select({ genres: itemsTable.genres }).from(itemsTable);
  const genreMap = new Map<string, number>();
  for (const item of allItems) {
    for (const g of item.genres) {
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
    }
  }
  const genreDistribution = [...genreMap.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  // Interactions by type
  const interactionsByType = await db
    .select({
      eventType: interactionsTable.eventType,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(interactionsTable)
    .groupBy(interactionsTable.eventType)
    .orderBy(desc(sql`count`));

  // Recent activity
  const recentActivity = await db
    .select({
      eventType: interactionsTable.eventType,
      itemTitle: itemsTable.title,
      userEmail: usersTable.email,
      createdAt: interactionsTable.createdAt,
    })
    .from(interactionsTable)
    .innerJoin(itemsTable, sql`${interactionsTable.itemId} = ${itemsTable.id}`)
    .innerJoin(usersTable, sql`${interactionsTable.userId} = ${usersTable.id}`)
    .orderBy(desc(interactionsTable.createdAt))
    .limit(20);

  res.json(
    GetAnalyticsResponse.parse({
      totalUsers: Number(users?.count ?? 0),
      totalItems: Number(items?.count ?? 0),
      totalInteractions: Number(interactions?.count ?? 0),
      topItems: topItemsRows.map((r) => ({
        ...r,
        interactionCount: Number(r.interactionCount ?? 0),
      })),
      genreDistribution,
      interactionsByType: interactionsByType.map((r) => ({
        eventType: r.eventType,
        count: Number(r.count),
      })),
      recentActivity: recentActivity.map((r) => ({
        eventType: r.eventType,
        itemTitle: r.itemTitle,
        userEmail: r.userEmail ?? null,
        createdAt: r.createdAt,
      })),
    })
  );
});

export default router;
