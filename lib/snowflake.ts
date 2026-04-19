import snowflake from "snowflake-sdk";

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
  await new Promise<void>((resolve, reject) => {
    conn.connect((err) => (err ? reject(err) : resolve()));
  });

  await new Promise<void>((resolve, reject) => {
    conn.execute({
      sqlText: `INSERT INTO sandwich_events (id, timestamp, mood, weather, sandwich, reasoning, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
      binds: [
        event.id,
        event.timestamp,
        event.mood,
        event.weather,
        event.sandwich,
        event.reasoning,
        event.confidence,
      ],
      complete: (err) => (err ? reject(err) : resolve()),
    });
  });

  conn.destroy(() => {});
}

export interface CortexResult {
  sql?: string;
  insight: string;
}

export async function queryCortex(question: string): Promise<CortexResult> {
  const conn = getConnection();
  await new Promise<void>((resolve, reject) => {
    conn.connect((err) => (err ? reject(err) : resolve()));
  });

  try {
    // Use Snowflake Cortex Analyst via SQL function
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      conn.execute({
        sqlText: `SELECT SNOWFLAKE.CORTEX.COMPLETE(
          'mistral-large',
          ARRAY_CONSTRUCT(
            OBJECT_CONSTRUCT('role', 'system', 'content', 'You are a deadpan enterprise data analyst for a global sandwich intelligence platform. Given a question about sandwich data, generate a SQL query against the sandwich_events table (columns: id, timestamp, mood, weather, sandwich, reasoning, confidence, created_at) and provide a brief corporate-toned insight. Respond in JSON: {"sql": "SELECT ...", "insight": "Corporate analysis text"}'),
            OBJECT_CONSTRUCT('role', 'user', 'content', ?)
          )
        ) AS response`,
        binds: [question],
        complete: (err, _stmt, rows) =>
          err ? reject(err) : resolve(rows as Record<string, unknown>[]),
      });
    });

    const raw = rows?.[0]?.RESPONSE as string;
    const cleaned = raw?.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    // Run the generated SQL if present
    if (parsed.sql) {
      const dataRows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        conn.execute({
          sqlText: parsed.sql,
          complete: (err, _stmt, rows) =>
            err ? reject(err) : resolve(rows as Record<string, unknown>[]),
        });
      });
      parsed.data = dataRows;
    }

    conn.destroy(() => {});
    return parsed;
  } catch {
    conn.destroy(() => {});
    throw new Error("Cortex query failed");
  }
}
