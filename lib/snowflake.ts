import * as snowflake from "snowflake-sdk";

// Suppress noisy SDK logs
snowflake.configure({ logLevel: "ERROR" });

export interface SandwichEvent {
  id: string;
  timestamp: string;
  mood: string;
  weather: string;
  sandwich: string;
  reasoning: string;
  confidence: number;
  geolocation?: string;
  ingredients?: string[];
  timeOfDay?: string;
}

function getConnection() {
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    password: process.env.SNOWFLAKE_PASSWORD!,
    database: process.env.SNOWFLAKE_DATABASE ?? "sandwich_db",
    schema: process.env.SNOWFLAKE_SCHEMA ?? "PUBLIC",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE ?? "COMPUTE_WH",
  });
}

export async function insertEvent(event: SandwichEvent): Promise<void> {
  const conn = getConnection();
  try {
    await new Promise<void>((resolve, reject) => {
      conn.connect((err) => (err ? reject(err) : resolve()));
    });

    await new Promise<void>((resolve, reject) => {
      conn.execute({
        sqlText: `INSERT INTO sandwich_events (id, timestamp, mood, weather, sandwich, reasoning, confidence, geolocation)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        binds: [
          event.id,
          event.timestamp,
          event.mood,
          event.weather,
          event.sandwich,
          event.reasoning,
          event.confidence,
          event.geolocation ?? null,
        ],
        complete: (err) => (err ? reject(err) : resolve()),
      });
    });
  } finally {
    conn.destroy(() => {});
  }
}

export interface CortexResult {
  sql?: string;
  insight: string;
}

export async function queryCortex(question: string): Promise<CortexResult> {
  const conn = getConnection();
  try {
    await new Promise<void>((resolve, reject) => {
      conn.connect((err) => (err ? reject(err) : resolve()));
    });

    const systemPrompt = `You are a deadpan enterprise data analyst for a global sandwich intelligence platform. Given a question about sandwich data, generate a SQL query against the sandwich_events table (columns: id, timestamp, mood, weather, sandwich, reasoning, confidence, created_at) and provide a brief corporate-toned insight. Respond in JSON only: {"sql": "SELECT ...", "insight": "Corporate analysis text"}`;
    const fullPrompt = `${systemPrompt}\n\nQuestion: ${question}`;

    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      conn.execute({
        sqlText: `SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large', ?) AS response`,
        binds: [fullPrompt],
        complete: (err, _stmt, rows) =>
          err ? reject(err) : resolve(rows as Record<string, unknown>[]),
      });
    });

    const raw = rows?.[0]?.RESPONSE;
    if (typeof raw !== "string" || raw.length === 0) {
      throw new Error("Cortex returned empty response");
    }
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: { sql?: string; insight: string; data?: Record<string, unknown>[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Cortex returned non-JSON response");
    }

    if (parsed.sql) {
      const dataRows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        conn.execute({
          sqlText: parsed.sql!,
          complete: (err, _stmt, rows) =>
            err ? reject(err) : resolve(rows as Record<string, unknown>[]),
        });
      });
      parsed.data = dataRows;
    }

    return parsed;
  } catch (err) {
    console.error("Cortex error:", err);
    throw new Error("Cortex query failed");
  } finally {
    conn.destroy(() => {});
  }
}
