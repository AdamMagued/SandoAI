# SandwichAI v2 — Repository Status

> Snapshot of what exists in the repo right now vs. what `PRD_SandwichAI_v2.md` requires.
> Updated to reflect the post-implementation state. Anything checked is verified by tests
> and/or a working build.

## Routes

| Route | Method | Status | Notes |
|---|---|---|---|
| `/` | GET | ✅ | Webcam → verdict reveal → Immortalize button → live Ticker → QR panel for judges |
| `/enterprise` | GET | ✅ | Cortex chatbot dashboard (deadpan corporate) |
| `/api/mood` | POST | ✅ | Gemini Vision → mood JSON; falls back to `contemplative` |
| `/api/weather` | GET | ✅ | **Open-Meteo** (no API key) — accepts `lat/lon` or `city`, returns condition / temp / severity / `timeOfDay`; cached fallback |
| `/api/sandwich` | POST | ✅ | Gemini Flash sandwich oracle — time-of-day-aware, returns `ingredients[]`, fans out to telemetry |
| `/api/voice` | POST | ✅ | ElevenLabs TTS, signals client to fall back to browser TTS on failure |
| `/api/therapy` | POST | ✅ | "Dr. Pumpernickel" multi-turn culinary therapist (Gemini); returns spoken reply + optional `newVerdict` |
| `/api/telemetry` | POST | ✅ | Normalizes event (incl. ingredients/timeOfDay), writes to Snowflake + (optional) MongoDB, fans to ticker |
| `/api/cortex` | POST | ✅ | Snowflake Cortex Q&A; hardcoded "99% disastrous" failsafe on error |
| `/api/ticker` | GET / POST | ✅ | SSE broadcast; POST publishes events; GET replays history then streams |
| `/api/actions/mint-sandwich` | GET / POST / OPTIONS | ✅ | Solana Action — devnet memo tx; CORS for Blinks |
| `/actions.json` | GET | ✅ | Blink mapping rule served at the root domain |

## Initiatives in the PRD

### 3.1 Core Flow — ✅ complete
- Mood detection via webcam (Gemini Vision)
- **Open-Meteo** weather context — keyless, geocode + forecast; uses browser geolocation, no Cairo hardcode
- **Time-of-day awareness** — Open-Meteo `current.time` + `is_day` drives the nutritional regime (early_morning / midday / afternoon / evening / night)
- Gemini Flash oracle with strict JSON contract — picks from a curated list of real sandwiches, returns 3-6 actual ingredients tuned to the time-of-day regime (B12 in the morning, magnesium / tryptophan late at night, etc.)
- ElevenLabs cinematic verdict + browser-TTS fallback
- Verdict reveal UI with confidence locked between 94.7–99.3%, ingredient stack, and an "I don't like this" therapy escape hatch
- **Dr. Pumpernickel therapy panel** — push-to-talk (Web Speech API) → Gemini → ElevenLabs voice playback; user can adopt the new sandwich verdict

### 3.2 Initiative Alpha — Solana — ✅ complete
- `@solana/actions` + `@solana/web3.js` installed
- `/api/actions/mint-sandwich` GET returns Action metadata for Blink clients
- POST returns a serialized devnet transaction (Memo program v2) with the verdict text
- OPTIONS preflight + `ACTIONS_CORS_HEADERS`
- `/actions.json` rule maps `/api/actions/**` to itself (required by Blinks spec)
- "Immortalize on Solana" button on the verdict screen, copies a `dial.to` Blink URL
- Failsafe copy: *"Insufficient cryptographic cheese. Your sandwich remains mortal."*

### 3.3 Initiative Beta — Snowflake — ✅ complete (was already in repo)
- Telemetry insert into `sandwich_events`
- Cortex chatbot at `/enterprise` (Cortex Complete + generated SQL execution)
- Hardcoded failsafe text matches PRD verbatim
- `queryCortex` hardened against empty / non-JSON Cortex responses

### 3.4 Initiative Gamma — DigitalOcean — ⚙️ deploy-ready
- App Platform: zero special config required; standard Next.js 16 build
- Managed MongoDB: `lib/mongo.ts` adapter — when `MONGODB_URI` is set, telemetry dual-writes
  events to a `sandwich_events` collection and the ticker hydrates its history from there on
  startup. When the env var is absent the adapter is a no-op so local dev still works.
- Sandwich Ticker: live SSE feed styled like a Wall Street threat-matrix
  (🚨 / ⚠️ / ✅ severity prefixes, scrolling marquee headline)
- QR code panel on the homepage so judges can scan and watch the live feed on their phones
- `next.config.ts` already has the PRD-mandated `ignoreBuildErrors` failsafe

## Submission checklist (PRD §8)

- [x] Public GitHub repo
- [x] **MIT LICENSE** at repo root (MLH compliance)
- [x] Solana `actions.json` valid at root domain
- [x] All failsafe error handlers in place
- [x] Sandwich Ticker has live entries (verified via `npm test` end-to-end test)
- [x] Snowflake telemetry path implemented
- [ ] Devpost submission filled with all 5 sponsor APIs (manual)
- [ ] Demo video recorded (manual)
- [ ] App live on `*.ondigitalocean.app` (deploy step)

## Failsafes (PRD §9)

| Risk | Where it lives |
|---|---|
| Snowflake API timeout | `app/api/cortex/route.ts` returns the "99% disastrous" copy |
| Solana devnet congestion | `components/ImmortalizeButton.tsx` shows "Insufficient cryptographic cheese." |
| DigitalOcean build failure | `next.config.ts` → `typescript.ignoreBuildErrors: true` |
| Gemini Vision fails | `components/Webcam.tsx` exposes the manual mood dropdown |
| ElevenLabs rate limit | `components/Webcam.tsx#playVoice` falls back to `SpeechSynthesis` |

## Environment variables

Required for full functionality (set in `.env.local` for dev, in App Platform for prod):

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash         # optional override (default in code)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
# Weather: Open-Meteo is keyless. No WEATHER_API_KEY needed.
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USER=
SNOWFLAKE_PASSWORD=
SNOWFLAKE_DATABASE=sandwich_db
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
MONGODB_URI=                         # optional; enables persistence + ticker hydration
MONGODB_DB=sandoai                   # optional, defaults to sandoai
NEXT_PUBLIC_APP_URL=http://localhost:3000   # used for fan-out fetches + Blink URLs
```

## Verification

```
npm install
npm run lint   # 0 errors
npm test       # all tests passing
npm run build  # production build succeeds
npm run dev    # http://localhost:3000
```
