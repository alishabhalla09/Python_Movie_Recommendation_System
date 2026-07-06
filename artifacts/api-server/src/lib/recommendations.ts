import { db, itemsTable, interactionsTable } from "@workspace/db";
import { desc, sql, inArray, notInArray, ne, eq } from "drizzle-orm";
import { Item } from "@workspace/db";

// ─── Popularity / Trending ──────────────────────────────────────────────────

/**
 * Score items by interaction velocity in the last N hours, with recency decay.
 * Higher weight for purchases/ratings over views.
 */
export async function getTrendingItems(
  limit = 20,
  genre?: string,
  excludeIds: number[] = []
): Promise<Item[]> {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h window

  // Get recent interaction counts per item
  const recentCounts = await db
    .select({
      itemId: interactionsTable.itemId,
      score: sql<number>`
        SUM(
          CASE event_type
            WHEN 'purchase' THEN 5
            WHEN 'rate' THEN 4
            WHEN 'watch' THEN 3
            WHEN 'click' THEN 2
            ELSE 1
          END
          * GREATEST(0.1, 1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / (72 * 3600))
        )
      `.as("score"),
    })
    .from(interactionsTable)
    .where(sql`created_at >= ${cutoff.toISOString()}`)
    .groupBy(interactionsTable.itemId)
    .orderBy(desc(sql`score`))
    .limit(limit * 3);

  if (recentCounts.length === 0) {
    // Fallback: most recent items
    let query = db.select().from(itemsTable);
    let items = await query.orderBy(desc(itemsTable.createdAt)).limit(limit);
    if (genre) {
      items = items.filter((i) => i.genres.includes(genre));
    }
    return excludeIds.length > 0
      ? items.filter((i) => !excludeIds.includes(i.id))
      : items;
  }

  const topItemIds = recentCounts
    .filter((r) => !excludeIds.includes(r.itemId))
    .map((r) => r.itemId)
    .slice(0, limit);

  if (topItemIds.length === 0) return [];

  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, topItemIds));

  // Sort by score order
  const scoreMap = new Map(recentCounts.map((r) => [r.itemId, r.score]));
  let sorted = items.sort(
    (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)
  );

  if (genre) {
    sorted = sorted.filter((i) => i.genres.includes(genre));
  }

  return sorted.slice(0, limit);
}

// ─── Content-Based Filtering ─────────────────────────────────────────────────

/**
 * Build a simple term-frequency vector from an item's genres + tags.
 */
export function buildItemVector(item: Item): Map<string, number> {
  const terms: string[] = [];

  // Genre terms (weighted x3)
  for (const g of item.genres) {
    terms.push(g.toLowerCase(), g.toLowerCase(), g.toLowerCase());
  }

  // Tag terms (weighted x2)
  for (const t of item.tags) {
    terms.push(t.toLowerCase(), t.toLowerCase());
  }

  // Type term
  terms.push(item.type.toLowerCase());

  // Decade term
  const decade = Math.floor(item.releaseYear / 10) * 10;
  terms.push(`decade_${decade}`);

  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) ?? 0) + 1);
  }

  // Normalize
  const total = terms.length;
  for (const [k, v] of tf.entries()) {
    tf.set(k, v / total);
  }

  return tf;
}

/**
 * Cosine similarity between two TF vectors.
 */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of a.entries()) {
    dot += valA * (b.get(term) ?? 0);
    normA += valA * valA;
  }
  for (const valB of b.values()) {
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find items most similar to a given item using content-based filtering.
 */
export async function getSimilarItems(
  itemId: number,
  limit = 12,
  excludeIds: number[] = []
): Promise<Item[]> {
  // First try the Python Collaborative Filtering ML model
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    const response = await fetch(`${recommenderUrl}/similar/${itemId}?limit=${limit + excludeIds.length}`, {
      signal: AbortSignal.timeout(1500)
    });
    if (response.ok) {
      const data: any = await response.json();
      if (data.similar && data.similar.length > 0) {
        const itemIds = data.similar.map((r: any) => r.item_id).filter((id: number) => !excludeIds.includes(id));
        if (itemIds.length > 0) {
          const mlItems = await db
            .select()
            .from(itemsTable)
            .where(inArray(itemsTable.id, itemIds));
          
          const mlItemMap = new Map(mlItems.map(i => [i.id, i]));
          const sortedMlItems = itemIds
            .map((id: number) => mlItemMap.get(id))
            .filter(Boolean) as Item[];
            
          if (sortedMlItems.length > 0) {
            return sortedMlItems.slice(0, limit);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch similar items from python ML, falling back to content-based", error);
  }

  // Fallback to basic Content-Based Filtering
  const [sourceItem] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, itemId));

  if (!sourceItem) return [];

  const allItems = await db
    .select()
    .from(itemsTable)
    .where(ne(itemsTable.id, itemId));

  const sourceVec = buildItemVector(sourceItem);

  const scored = allItems
    .filter((i) => !excludeIds.includes(i.id))
    .map((item) => ({
      item,
      score: cosineSimilarity(sourceVec, buildItemVector(item)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.item);
}

// ─── User Profile Vector ──────────────────────────────────────────────────────

const EVENT_WEIGHTS: Record<string, number> = {
  purchase: 5,
  rate: 4,
  watch: 3,
  click: 2,
  view: 1,
};

/**
 * Build a user profile vector from weighted average of interacted item vectors.
 */
async function buildUserProfileVector(
  userId: number
): Promise<{ vector: Map<string, number>; interactedIds: number[] }> {
  const interactions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, userId))
    .orderBy(desc(interactionsTable.createdAt))
    .limit(100);

  if (interactions.length === 0) {
    return { vector: new Map(), interactedIds: [] };
  }

  const interactedIds = [...new Set(interactions.map((i) => i.itemId))];

  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, interactedIds));

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const profileVec = new Map<string, number>();
  let totalWeight = 0;

  for (const interaction of interactions) {
    const item = itemMap.get(interaction.itemId);
    if (!item) continue;

    const weight = EVENT_WEIGHTS[interaction.eventType] ?? 1;
    const itemVec = buildItemVector(item);

    for (const [term, val] of itemVec.entries()) {
      profileVec.set(term, (profileVec.get(term) ?? 0) + val * weight);
    }
    totalWeight += weight;
  }

  // Normalize
  if (totalWeight > 0) {
    for (const [k, v] of profileVec.entries()) {
      profileVec.set(k, v / totalWeight);
    }
  }

  return { vector: profileVec, interactedIds };
}

// ─── Personalized Recommendations ────────────────────────────────────────────

/**
 * Get top-N personalized recommendations using content-based filtering.
 * Falls back to trending for users with no history.
 */
export async function getPersonalizedRecommendations(
  userId: number,
  limit = 20
): Promise<Item[]> {
  const { vector: profileVec, interactedIds } =
    await buildUserProfileVector(userId);

  if (profileVec.size === 0) {
    // Cold start: return trending
    return getTrendingItems(limit);
  }

  // Try to get recommendations from Python microservice (Layer 3 & 4)
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    const response = await fetch(`${recommenderUrl}/recommend/${userId}?limit=${limit}`, {
      signal: AbortSignal.timeout(1500)
    });
    
    if (response.ok) {
      const data: any = await response.json();
      if (data.recommendations && data.recommendations.length > 0) {
        const itemIds = data.recommendations.map((r: any) => r.item_id);
        
        // Fetch items from DB
        const mlItems = await db
          .select()
          .from(itemsTable)
          .where(inArray(itemsTable.id, itemIds));
          
        // Sort by ML scores
        const mlItemMap = new Map(mlItems.map(i => [i.id, i]));
        const sortedMlItems = data.recommendations
          .map((r: any) => mlItemMap.get(r.item_id))
          .filter(Boolean);
          
        if (sortedMlItems.length > 0) {
          // If we have enough recommendations, we return them (they are collaborative filtered)
          // For a true hybrid blend, we could blend these with the content-based scores below
          return sortedMlItems.slice(0, limit);
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch from python recommendation service, falling back to content-based", error);
  }

  const candidates = await db
    .select()
    .from(itemsTable)
    .where(
      interactedIds.length > 0
        ? notInArray(itemsTable.id, interactedIds)
        : sql`true`
    );

  const scored = candidates
    .map((item) => ({
      item,
      score: cosineSimilarity(profileVec, buildItemVector(item)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.item);
}

// ─── "Because You Watched X" ──────────────────────────────────────────────────

/**
 * Get rows for "Because you watched/interacted with X" using content-based similarity.
 * Returns up to 3 rows, one per recent unique item interaction.
 */
export async function getBecauseYouWatchedRows(userId: number): Promise<
  Array<{
    sourceItem: Item;
    similar: Item[];
  }>
> {
  const recentInteractions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, userId))
    .orderBy(desc(interactionsTable.createdAt))
    .limit(50);

  if (recentInteractions.length === 0) return [];

  // Get unique items recently interacted with (prefer watch/purchase)
  const seenItemIds = new Set<number>();
  const uniqueInteractions: typeof recentInteractions = [];

  for (const interaction of recentInteractions) {
    if (!seenItemIds.has(interaction.itemId)) {
      seenItemIds.add(interaction.itemId);
      uniqueInteractions.push(interaction);
    }
    if (uniqueInteractions.length >= 3) break;
  }

  const allInteractedIds = [
    ...new Set(recentInteractions.map((i) => i.itemId)),
  ];

  const results: Array<{ sourceItem: Item; similar: Item[] }> = [];

  for (const interaction of uniqueInteractions) {
    const [sourceItem] = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, interaction.itemId));

    if (!sourceItem) continue;

    const similar = await getSimilarItems(
      sourceItem.id,
      12,
      allInteractedIds
    );

    if (similar.length > 0) {
      results.push({ sourceItem, similar });
    }
  }

  return results;
}
