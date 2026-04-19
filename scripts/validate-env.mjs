// Quick env validator. Run: `node --env-file=.env scripts/validate-env.mjs`
import { GoogleGenerativeAI } from "@google/generative-ai";

const REQUIRED = [
  "GEMINI_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "SNOWFLAKE_ACCOUNT",
  "SNOWFLAKE_USER",
  "SNOWFLAKE_PASSWORD",
];
const OPTIONAL = [
  "SNOWFLAKE_DATABASE",
  "SNOWFLAKE_SCHEMA",
  "SNOWFLAKE_WAREHOUSE",
  "MONGODB_URI",
  "MONGODB_DB",
  "NEXT_PUBLIC_APP_URL",
  "SOLANA_RPC_URL",
];

const issues = [];
const ok = [];

function checkPresence() {
  for (const key of REQUIRED) {
    const v = process.env[key];
    if (!v) {
      issues.push(`MISSING: ${key} is required`);
    } else if (v !== v.trim()) {
      issues.push(
        `WHITESPACE: ${key} has leading/trailing whitespace (raw: ${JSON.stringify(v)})`
      );
    } else {
      ok.push(`present: ${key}`);
    }
  }
  for (const key of OPTIONAL) {
    const v = process.env[key];
    if (v) ok.push(`present (optional): ${key}`);
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, reason: "missing" };
  try {
    const genAI = new GoogleGenerativeAI(key);
    const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const model = genAI.getGenerativeModel({ model: modelName });
    const r = await model.generateContent("Reply with the single word: OK");
    const text = r.response.text();
    return { ok: true, sample: text.slice(0, 60).replace(/\s+/g, " ") };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

async function checkElevenLabs() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!key) return { ok: false, reason: "missing api key" };
  try {
    const userRes = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": key },
    });
    if (!userRes.ok) {
      return { ok: false, reason: `user endpoint ${userRes.status}` };
    }
    const user = await userRes.json();
    let voiceCheck = "no voice id set";
    if (voice) {
      const vRes = await fetch(`https://api.elevenlabs.io/v1/voices/${voice}`, {
        headers: { "xi-api-key": key },
      });
      if (vRes.ok) {
        const v = await vRes.json();
        voiceCheck = `voice OK: "${v.name}"`;
      } else {
        voiceCheck = `voice ${vRes.status}`;
      }
    }
    return {
      ok: true,
      sample: `tier=${user?.subscription?.tier || "?"}, ${voiceCheck}`,
    };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

async function checkWeather() {
  // Open-Meteo is keyless. Just verify reachability.
  try {
    const geo = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=Cairo&count=1&format=json"
    );
    if (!geo.ok) return { ok: false, reason: `geocode status ${geo.status}` };
    const g = await geo.json();
    const hit = g?.results?.[0];
    if (!hit) return { ok: false, reason: "geocode returned no results" };
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`
    );
    if (!w.ok) return { ok: false, reason: `forecast status ${w.status}` };
    const d = await w.json();
    return {
      ok: true,
      sample: `Open-Meteo OK · ${hit.name} ${Math.round(d.current.temperature_2m)}°C (code ${d.current.weathercode})`,
    };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

async function checkSnowflake() {
  const required = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD"];
  for (const k of required) if (!process.env[k]) return { ok: false, reason: `missing ${k}` };
  let snowflake;
  try {
    snowflake = (await import("snowflake-sdk")).default;
  } catch (e) {
    return { ok: false, reason: `cannot import snowflake-sdk: ${e.message}` };
  }
  snowflake.configure({ logLevel: "ERROR" });
  return await new Promise((resolve) => {
    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT.trim(),
      username: process.env.SNOWFLAKE_USER.trim(),
      password: process.env.SNOWFLAKE_PASSWORD.trim(),
      database: process.env.SNOWFLAKE_DATABASE?.trim() || "sandwich_db",
      schema: process.env.SNOWFLAKE_SCHEMA?.trim() || "PUBLIC",
      warehouse: process.env.SNOWFLAKE_WAREHOUSE?.trim() || "COMPUTE_WH",
    });
    const timer = setTimeout(() => {
      try { conn.destroy(() => {}); } catch {}
      resolve({ ok: false, reason: "connect timeout (10s)" });
    }, 10000);
    conn.connect((err) => {
      if (err) {
        clearTimeout(timer);
        return resolve({ ok: false, reason: err.message });
      }
      conn.execute({
        sqlText: "SELECT CURRENT_VERSION() AS v",
        complete: (e, _stmt, rows) => {
          clearTimeout(timer);
          try { conn.destroy(() => {}); } catch {}
          if (e) return resolve({ ok: false, reason: e.message });
          resolve({ ok: true, sample: `Snowflake ${rows?.[0]?.V}` });
        },
      });
    });
  });
}

async function main() {
  checkPresence();
  const [gemini, eleven, weather, snow] = await Promise.all([
    checkGemini(),
    checkElevenLabs(),
    checkWeather(),
    checkSnowflake(),
  ]);

  console.log("\n=== PRESENCE / FORMAT ===");
  for (const o of ok) console.log("  ✓", o);
  for (const i of issues) console.log("  ✗", i);

  console.log("\n=== LIVE CHECKS ===");
  const fmt = (label, r) =>
    `  ${r.ok ? "✓" : "✗"} ${label.padEnd(14)} ${r.ok ? r.sample : `FAIL: ${r.reason}`}`;
  console.log(fmt("gemini", gemini));
  console.log(fmt("elevenlabs", eleven));
  console.log(fmt("weather", weather));
  console.log(fmt("snowflake", snow));

  const fails = [gemini, eleven, weather, snow].filter((r) => !r.ok).length;
  console.log(`\n${issues.length} format issues, ${fails} live check failures.\n`);
  process.exit(issues.length || fails ? 1 : 0);
}

main().catch((e) => {
  console.error("validator crashed:", e);
  process.exit(2);
});
