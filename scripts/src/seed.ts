import { db, itemsTable, usersTable, interactionsTable } from "@workspace/db";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import fetch from "node-fetch";

// Data paths
const dataDir = path.join(process.cwd(), "data", "ml-latest-small");
const moviesCsvPath = path.join(dataDir, "movies.csv");
const ratingsCsvPath = path.join(dataDir, "ratings.csv");

async function parseCsv(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

async function run() {
  console.log("Starting Real Dataset Seeding (MovieLens 100K)...");

  if (!fs.existsSync(moviesCsvPath)) {
    console.error(`Dataset not found at ${moviesCsvPath}`);
    console.error("Please ensure the dataset is downloaded to scripts/data/ml-latest-small");
    process.exit(1);
  }

  // 1. Clear existing data (optional but good for clean slate)
  console.log("Clearing existing data...");
  await db.delete(interactionsTable);
  await db.delete(itemsTable);
  await db.delete(usersTable);

  // 2. Parse and Insert Movies (Items)
  console.log("Parsing movies.csv...");
  const movies = await parseCsv(moviesCsvPath);
  console.log(`Found ${movies.length} movies.`);

  const itemsToInsert = [];
  const movieIdMap = new Map(); // maps ML movieId to our DB item ID

  for (const row of movies) {
    const mlMovieId = parseInt(row.movieId);
    let title = row.title;
    let releaseYear = 2000;
    
    // Extract year from title (e.g. "Toy Story (1995)")
    const yearMatch = title.match(/\((\d{4})\)$/);
    if (yearMatch) {
      releaseYear = parseInt(yearMatch[1]);
      title = title.replace(/\s\(\d{4}\)$/, "");
    }
    
    const genres = row.genres !== "(no genres listed)" ? row.genres.split("|") : [];

    itemsToInsert.push({
      id: mlMovieId, // We use the ML ID directly to make mapping ratings easier
      title: title,
      description: `${title} is a ${genres.join(", ")} movie released in ${releaseYear}.`,
      genres: genres,
      releaseYear: releaseYear,
      type: "movie",
      rating: 0, // Will be updated if needed, or kept 0
    });
  }

  console.log("Inserting movies into database...");
  for (let i = 0; i < itemsToInsert.length; i += 1000) {
    await db.insert(itemsTable).values(itemsToInsert.slice(i, i + 1000));
  }

  // 3. Parse and Insert Ratings (Interactions)
  console.log("Parsing ratings.csv...");
  const ratings = await parseCsv(ratingsCsvPath);
  console.log(`Found ${ratings.length} ratings.`);

  const usersSet = new Set<number>();
  const interactionsToInsert = [];

  for (const row of ratings) {
    const userId = parseInt(row.userId);
    const movieId = parseInt(row.movieId);
    const ratingVal = parseFloat(row.rating);
    const timestamp = parseInt(row.timestamp);

    usersSet.add(userId);

    // Map rating to event type for our recommendation engine implicit feedback
    // 4.0 - 5.0 -> purchase/watch (strong positive)
    // 3.0 - 3.5 -> click/view (mild positive)
    // < 3.0 -> we still log it as a 'view' but with the low rating attached
    let eventType = "view";
    if (ratingVal >= 4.0) eventType = "watch";
    else if (ratingVal >= 3.0) eventType = "click";

    interactionsToInsert.push({
      userId: userId,
      itemId: movieId,
      eventType: eventType,
      rating: ratingVal,
      createdAt: new Date(timestamp * 1000),
    });
  }

  // 4. Insert Users
  console.log(`Inserting ${usersSet.size} unique users...`);
  const usersToInsert = Array.from(usersSet).map(id => ({
    id: id,
    email: `user${id}@movielens.local`,
    passwordHash: "password123", // dummy
  }));
  
  for (let i = 0; i < usersToInsert.length; i += 1000) {
    await db.insert(usersTable).values(usersToInsert.slice(i, i + 1000));
  }

  // 5. Insert Interactions
  console.log(`Inserting ${interactionsToInsert.length} interactions into database... (this may take a minute)`);
  for (let i = 0; i < interactionsToInsert.length; i += 5000) {
    await db.insert(interactionsTable).values(interactionsToInsert.slice(i, i + 5000));
  }

  console.log("Database seeded successfully with Real MovieLens Data!");

  // 6. Trigger Recommendation Engine Retraining
  console.log("Triggering Python Recommendation Engine to retrain on this new data...");
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    const res = await fetch(`${recommenderUrl}/train`, { method: "POST" });
    if (res.ok) {
      console.log("Training triggered successfully! The ALS model is now learning the real collaborative filters.");
    } else {
      console.error("Failed to trigger training:", await res.text());
    }
  } catch (err: any) {
    console.error("Could not reach Python microservice (is it running?):", err.message);
  }
  
  process.exit(0);
}

run().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
