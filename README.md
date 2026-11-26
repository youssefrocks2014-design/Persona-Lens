# PersonaLens

**Live your day through someone else’s mind.**

PersonaLens is a full-stack decision-reflection and communication-practice application that examines real interpersonal dilemmas through documented historical thinker profiles — and immediately cross-checks that advice against an empirical Communication Evidence Library so users see both what helps and where a persona's style can backfire.

---

## Key Features

- **Living Your Day (Structured Situation Analysis)**:
  - Describe a difficult conversation, boundary issue, or decision alongside your desired outcome and the other person’s role.
  - One-click **"Try a Sample Situation"** pills let first-time visitors test common scenarios (`Client keeps adding unpaid work`, `Friend cancels last minute`, `Tough feedback from boss`).
  - Generates a structured 3-part analysis:
    1. **Persona View** (third-person framing, principles applied, and an honest blind-spot backfire warning).
    2. **Suggested Response Draft** in plain language with **1-click Copy**.
    3. **Evidence-Based Reality Check** citing only entries from the curated 9-item Communication Evidence Library with colored strength badges (`strong`, `moderate`, `low to limited`) and effect labels (`Helps`, `Risks`, `Neutral`).
- **Side-by-Side Compare View**:
  - Run the exact same situation through two distinct historical personas in parallel (`POST /api/analyze-compare`) and compare their framing, drafts, and empirical trade-offs side-by-side under the same Archive entry.
- **Larp Mode (Interactive Rehearsal)**:
  - Practice delivering your response in a live multi-turn simulation where Gemini roleplays the counterpart while your chosen persona offers a concise coaching note after each turn, followed by a final debrief grounded in the Evidence Library.
- **Safety Triage & Strict Boundaries**:
  - Automatically detects self-harm, abuse, or immediate danger (`isSafetyAlert: true`), displaying a calm, distinct support card without saving crisis disclosures to History.
  - Enforces primary-source fidelity (`"An interpretation based on public writings, not their actual words."`) and never invents or fabricates historical quotes.
- **Private Account History & How This Works**:
  - Firebase Google Sign-In + per-user Firestore isolation (`situations`, `analyses`, `rehearsals`) with search, persona filtering, and cascade delete.

---

## Gemini Models & AI Architecture

- **SDK**: Server-side `@google/genai` (never bundled in the browser).
- **Automatic Model Fallback Chain** (`server/modelFallback.ts`):
  1. `gemini-4-hydrogen` (`ThinkingLevel.LOW` where supported) — primary reasoning model.
  2. `gemini-3.8-flash` (`ThinkingLevel.MINIMAL`) — automatic fast failover on HTTP `503`, `429`, empty output, or per-attempt timeout.
  3. `gemini-3.5-flash-lite` — final backup model before returning a sanitized user-friendly message (never raw SDK JSON).
- **Structured Outputs**: Enforced JSON schemas (`responseMimeType: 'application/json'`, `responseSchema`) for both Living Your Day analyses and Larp Mode turns.
- **Authoritative Server Grounding & Performance**:
  - `server/catalog.ts` resolves curated persona cards (`Abraham Lincoln`, `Marcus Aurelius`, `Nelson Mandela`, `Marie Curie`, `Ibn Khaldun`, `Benjamin Franklin`, `Frederick Douglass`) and the 9-entry Evidence Library strictly on the server so clients cannot spoof evidence strength labels or persona principles.
  - `server/analysisCache.ts` provides a bounded per-user SHA-256 LRU/TTL cache + in-flight request deduplication for repeated analyses.

---

## Tech Stack & Architecture

```
Browser (React 19 + TypeScript + Tailwind CSS v4)
  ├── Firebase Auth (Google Sign-In) & Cloud Firestore (per-user collections + read-only catalogs)
  └── Fetch w/ Firebase ID Bearer Token ──▶ Express Server (server.ts, Port 3000)
                                              ├── server/auth.ts       (RS256 Firebase JWT + Google public cert cache)
                                              ├── server/rateLimit.ts  (Per-UID sliding window rate limiter)
                                              ├── server/catalog.ts    (Authoritative persona & evidence resolution)
                                              ├── server/analysisCache.ts (User-scoped SHA-256 LRU/TTL cache)
                                              ├── server/modelFallback.ts (4-hydrogen → 3.8-flash → 3.5-flash-lite)
                                              └── server/gemini.ts     (@google/genai w/ GEMINI_API_KEY in env)
```

---

## Screenshots & Demo

> Replace the placeholders below with captures from your deployment or local preview.

| View | Preview |
|---|---|
| Landing & Curated Persona Library | `![PersonaLens Overview](docs/screenshots/overview.png)` |
| Living Your Day + Reality Check | `![Analysis and Reality Check](docs/screenshots/analysis-reality-check.png)` |
| Side-by-Side Compare View | `![Compare View](docs/screenshots/compare-view.png)` |
| Larp Mode Interactive Rehearsal | `![Larp Mode Demo](docs/screenshots/larp-mode.gif)` |

---

## Local Setup & Verification

### 1. Prerequisites
- Node.js 20+ (or Bun)
- A Google Gemini API key (`GEMINI_API_KEY`)
- A Firebase project configured in `firebase-applet-config.json` (Firestore + Google Auth enabled)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your server-side key (`.env` is gitignored):

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
PORT="3000"
```

> If `GEMINI_API_KEY` is missing at runtime, `/api/health` safely reports `{ ok: true, aiConfigured: false }` and the workspace shows a non-blocking setup banner without exposing any secret configuration form in the browser.

### 4. Run Locally
```bash
npm run dev
```
Open `http://localhost:3000` (or `http://localhost:3000/?autostart=1` for local UI preview without signing in).

### 5. Build, Lint & Test Suite
```bash
# TypeScript type-check
npm run lint

# Production Vite bundle
npm run build

# Unit tests (model fallback, catalog grounding, prompt parsing, rate limiting, validation, evidence badges, Firestore rules)
npx tsx --test firestore.rules.test.ts src/**/*.test.ts server/**/*.test.ts

# Firestore security rules lint
npx eslint firestore.rules
```

---

## Repository Security Checklist

Before pushing or cloning into a fresh environment:
- Confirm `.env` is untracked (`git status`) and never committed in history (`git log --all -S "AIza"` / `git log --all -S "GEMINI_API_KEY="`).
- Verify a fresh clone starts cleanly with only `.env.example` copied to `.env`:
  ```bash
  git clone <your-repo-url> personalens-clean && cd personalens-clean
  npm install && cp .env.example .env
  npm run lint && npm run build
  ```
