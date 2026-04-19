import type { Collection, MongoClient as MongoClientType } from "mongodb";
import type { SandwichEvent } from "@/lib/snowflake";

/**
 * Optional MongoDB persistence for the live sandwich ticker.
 *
 * If `MONGODB_URI` is unset (e.g. local dev without a cluster) every helper
 * here is a graceful no-op — the rest of the app keeps working off the
 * in-memory ticker bus and Snowflake.
 *
 * When configured (e.g. DigitalOcean Managed MongoDB) we dual-write each
 * sandwich event to a `sandwich_events` collection so the feed survives
 * server restarts and so a fresh SSE client can still see recent activity.
 */

declare global {
  var __sandoMongoClient: Promise<MongoClientType> | undefined;
}

export function isMongoConfigured(): boolean {
  return !!process.env.MONGODB_URI;
}

async function getClient(): Promise<MongoClientType | null> {
  if (!isMongoConfigured()) return null;
  if (!globalThis.__sandoMongoClient) {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI!, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 4000,
    });
    globalThis.__sandoMongoClient = client.connect();
  }
  return globalThis.__sandoMongoClient;
}

async function getCollection(): Promise<Collection<SandwichEvent> | null> {
  const client = await getClient();
  if (!client) return null;
  const dbName = process.env.MONGODB_DB || "sandoai";
  return client.db(dbName).collection<SandwichEvent>("sandwich_events");
}

export async function persistEvent(event: SandwichEvent): Promise<boolean> {
  try {
    const col = await getCollection();
    if (!col) return false;
    await col.updateOne(
      { id: event.id },
      { $set: event },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error("Mongo persist error:", err);
    return false;
  }
}

export async function loadRecentEvents(limit = 25): Promise<SandwichEvent[]> {
  try {
    const col = await getCollection();
    if (!col) return [];
    const rows = await col
      .find({}, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    // Return oldest-first so SSE replay is chronological.
    return rows.reverse() as SandwichEvent[];
  } catch (err) {
    console.error("Mongo load error:", err);
    return [];
  }
}

export async function closeMongo(): Promise<void> {
  if (!globalThis.__sandoMongoClient) return;
  try {
    const client = await globalThis.__sandoMongoClient;
    await client.close();
  } catch {
    // ignore
  } finally {
    globalThis.__sandoMongoClient = undefined;
  }
}
