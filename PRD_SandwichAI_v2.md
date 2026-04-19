# 🥪 PRD: Global Decentralized Dietary Telemetry and High-Frequency Culinary Decision Engine
### (aka SandwichAI v2)

> **Hackathon:** MLH AI Hackfest 2026
> **Team Size:** 2–3
> **Deadline:** Sunday April 19, 2026 — GitHub repo link on Devpost
> **Target Prizes:** Gemini API · ElevenLabs · Snowflake API · Solana · DigitalOcean · Best Useless Hack

---

## 1. Elevator Pitch

A catastrophically overengineered, globally distributed, blockchain-enabled enterprise platform that uses multimodal AI, decentralized ledgers, and enterprise data warehousing to answer the most pressing question of our time:

> *"What sandwich should I eat?"*

A problem that takes 3 seconds to solve manually now requires 6 APIs, a blockchain, a cloud database, and a real-time global ticker.

---

## 2. Prize Targets

| Prize | Sponsor Tech Used | How We Win It |
|---|---|---|
| Best Use of Gemini API | Gemini Vision + Gemini Flash | Mood detection via webcam + sandwich reasoning |
| Best Use of ElevenLabs | ElevenLabs TTS | Dramatic voice verdict announcement |
| Best Use of Snowflake API | Snowflake Cortex AI | Enterprise sandwich telemetry dashboard |
| Best Use of Solana | Solana Actions + Blinks | Mint sandwich as NFT, share as Blink in Discord |
| DigitalOcean | App Platform + Managed MongoDB | Live deployment + real-time Sandwich Ticker |
| Best Useless Hack | All of the above | Breathtaking overkill for a trivial problem |

---

## 3. Features

### 3.1 Core Flow (already planned)
- **Mood detection** — Gemini Vision analyzes webcam snapshot → returns emotional state
- **Weather context** — OpenWeatherMap API fetches real-time local weather
- **Sandwich Oracle** — Gemini Flash reasons deeply, outputs sandwich + philosophical justification
- **Dramatic verdict** — ElevenLabs reads result in the most cinematic voice possible
- **Verdict screen** — Big animated reveal, confidence % always between 94.7–99.3%

---

### 3.2 Initiative Alpha — Solana: Immortalize on the Blockchain
**Prize target:** Best Use of Solana → Ledger Nano S Plus

When the sandwich verdict is delivered, user clicks **"Immortalize on Solana"**:
- Backend generates a Solana Action endpoint: `/api/actions/mint-sandwich?id=123`
- GET handler returns metadata (sandwich name, icon, description) for Blink clients
- POST handler returns a serialized devnet transaction for wallet signature
- App copies a Blink URL to clipboard
- User pastes URL into Discord → it unfurls into an interactive card with a "Mint Sandwich" button
- Judges watch a BLT get minted onto an immutable blockchain in real time

**Why this wins:** Demonstrates Solana Actions + Blinks, high-frequency transactions, social interoperability. The absurdity of permanently recording a sandwich on a blockchain is peak "Useless Hack."

**Failsafe:** If devnet is congested, Blink UI shows: *"Insufficient cryptographic cheese. Transaction failed. Your sandwich remains mortal."*

---

### 3.3 Initiative Beta — Snowflake: Enterprise Sandwich Intelligence
**Prize target:** Best Use of Snowflake API → Raspberry Pi 4

Every sandwich generation event is logged to Snowflake as structured telemetry:
```
{ timestamp, geolocation, mood, weather_severity, gemini_reasoning_text, sandwich_output }
```

A second tab — **"Enterprise Dietary Network Operations Platform"** — features a Cortex AI chatbot where you ask:
- *"Why did the AI suggest tuna salad during thunderstorms?"*
- *"What is the root cause of excessive carbohydrate deployment on Mondays?"*
- *"Analyze global sandwich anomalies from the last 24 hours"*

Snowflake Cortex Analyst converts these to SQL, runs them, returns insights. Deadpan corporate tone throughout.

**Sandwich Absurdity Index (SAI)** tracked by Cortex:
```
SAI = α(mood_variance) + β(weather_severity) + γ(reasoning_entropy)
```

**Failsafe:** If Cortex API fails mid-demo, hardcoded response fires:
> *"CRITICAL ERROR: Cortex AI has determined 99% of your sandwich decisions are statistically disastrous. System refusing to compute further to preserve global culinary integrity."*

---

### 3.4 Initiative Gamma — DigitalOcean: Production Deployment + Sandwich Ticker
**Prize target:** DigitalOcean → Retro Wireless Mouse

- Deploy full app on **DigitalOcean App Platform** (direct GitHub integration, auto CI/CD)
- **Managed MongoDB** cluster stores real-time sandwich events globally
- **Sandwich Ticker** — scrolling marquee on the homepage, styled like a Wall Street stock terminal or threat matrix:

```
🚨 ALERT: USER IN CAIRO — MOOD: EXISTENTIAL — HEAVY RAIN — DEPLOYING GRILLED CHEESE PROTOCOL
✅ UPDATE: USER IN TOKYO — MOOD: JOYFUL — CLEAR SKIES — EXECUTING PB&J SEQUENCE
⚠️  WARNING: USER IN LONDON — MOOD: MELANCHOLIC — OVERCAST — TUNA MELT IMMINENT
```

- Judges get a QR code / live URL on their phones — they see the ticker update in real time as the presenter demos
- App runs on `*.ondigitalocean.app` with auto SSL

**Failsafe:** If build fails, set `next.config.js` to ignore ESLint + TypeScript errors so it deploys regardless.

---

## 4. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js + Tailwind CSS |
| Mood Detection | Gemini Vision API (webcam snapshot) |
| Sandwich Brain | Gemini 1.5 Flash API |
| Voice | ElevenLabs TTS API |
| Weather | OpenWeatherMap free API |
| Blockchain | Solana Actions SDK + Blinks (devnet) |
| Data Warehouse | Snowflake Python API + Cortex AI |
| Database | DigitalOcean Managed MongoDB |
| Hosting | DigitalOcean App Platform |

---

## 5. Team Split

### Developer 1 — Cloud Infra & Sandwich Ticker (DigitalOcean Lead)
- Connect GitHub repo to DigitalOcean App Platform
- Scope all API keys as runtime environment variables
- Provision Managed MongoDB cluster
- Build real-time Sandwich Ticker UI (SSE or polling)
- Ensure `MIT` license in repo (required for MLH compliance)

### Developer 2 — Blockchain & Web3 (Solana Lead)
- Install `@solana/actions` SDK
- Build `/api/actions` GET + POST endpoints
- Configure `actions.json` at root domain
- Build "Immortalize on Solana" button + Blink URL copy
- Handle devnet wallet signing flow

### Developer 3 — AI Pipeline & Enterprise Dashboard (Snowflake + Gemini Lead)
- Ensure Gemini outputs deterministic JSON alongside natural language
- Connect Snowflake Python API, pipe Gemini payloads to telemetry table
- Build Enterprise Dashboard UI
- Connect Cortex Agent REST API for natural language → SQL
- Write the hardcoded failsafe response

---

## 6. User Flow

```
User opens app (live on DigitalOcean)
    → Sandwich Ticker scrolling in background
    → Clicks "What should I eat?"
    → Webcam snapshot → Gemini Vision detects mood
    → Weather API fetches local conditions
    → Gemini Flash reasons about sandwich (outputs JSON + text)
    → JSON piped to Snowflake + MongoDB simultaneously
    → ElevenLabs dramatically announces verdict
    → User clicks "Immortalize on Solana"
    → Blink URL copied → pasted into Discord → minted on devnet
    → User opens Enterprise tab
    → Asks Cortex AI "why did this happen?"
    → Cortex returns SQL insight with deadpan corporate analysis
    → Judge's phone shows new entry on Sandwich Ticker
    → Everyone wins
```

---

## 7. Demo Script (for judging — 3 minutes)

**Minute 1 — The Core**
Make a sad face at webcam. App detects "deeply melancholic." Weather: overcast. Gemini thinks. ElevenLabs booms: *"YOUR SANDWICH IS: Grilled Cheese. Warm. Simple. Like the hug you will never receive."* Judges laugh.

**Minute 2 — The Blockchain**
Click "Immortalize on Solana." Paste Blink URL into Discord on second monitor. Link unfurls. Click "Mint Sandwich." Wallet signs. Transaction executes on devnet. A grilled cheese is now permanently on the blockchain.

**Minute 3 — The Enterprise**
Open Enterprise Dashboard. Type: *"Analyze all sandwich anomalies. Why does sadness correlate with grilled cheese?"* Cortex returns SQL insight. Meanwhile — hand judges QR code. They open the app on their phones. They see their own sandwich on the live Ticker.

**Closing line:** *"This is not a sandwich app. This is a globally distributed, blockchain-enabled, AI-powered culinary intelligence ecosystem. It is also completely useless. Thank you."*

---

## 8. Submission Checklist

- [ ] GitHub repo public, MIT license added
- [ ] Devpost submission filled with all 5 sponsor APIs mentioned
- [ ] Demo video recorded (2 min max)
- [ ] App live on DigitalOcean (not localhost)
- [ ] Solana `actions.json` valid at root domain
- [ ] Snowflake telemetry table has real data in it
- [ ] Sandwich Ticker has live entries
- [ ] All failsafe error handlers in place
- [ ] Submitted before Sunday deadline

---

## 9. Failsafe Summary

| Risk | Failsafe |
|---|---|
| Snowflake API timeout | Hardcoded: *"99% of your decisions are statistically disastrous"* |
| Solana devnet congestion | *"Insufficient cryptographic cheese. Your sandwich remains mortal."* |
| DigitalOcean build failure | Set `next.config.js` to ignore ESLint + TS errors |
| Gemini Vision fails | Fall back to manual mood selector dropdown |
| ElevenLabs rate limit | Fall back to browser `SpeechSynthesis` API |
