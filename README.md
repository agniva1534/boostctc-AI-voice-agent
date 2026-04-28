# BoostCTC Voice Agent

LangGraph TypeScript voice agent for BoostCTC — two modes, GPT-4o, Vapi custom-LLM, cosine RAG.

## Quick Start

### 1. Install & configure

```bash
cd server
npm install
cp .env.example .env
# Edit .env and fill in:
#   OPENAI_API_KEY
#   VAPI_PRIVATE_KEY
#   VAPI_PUBLIC_KEY
```

### 2. Build the RAG index

```bash
cd server
npm run ingest
# Embeds 15 knowledge_base/**/*.md files via text-embedding-3-small
# Writes src/rag/vectors.json (22 vectors)
```

### 3. First-time only: create Vapi assistants

Only needs to be run once. First start the server briefly, then run setup:

```bash
cd server
npm run server &        # start Express on :3000

# In another terminal, expose it publicly (one-time):
cloudflared tunnel --url http://127.0.0.1:3000 &
# Copy the https://xxx.trycloudflare.com URL it prints, set in .env:
# VAPI_SERVER_URL=https://xxx.trycloudflare.com

npm run setup:vapi      # creates assistants, prints IDs → add to .env
```

### 4. Every day: single command to start

```bash
cd server
npm run dev
# Starts server, tunnel, auto-updates Vapi assistant URLs, opens browser
# App at: http://localhost:3000
```

That's it. No manual URL copying. Press Ctrl+C to stop everything.

---

## Architecture

```
User Browser
  └─ Vapi Web SDK (voice I/O)
       └─ POST /v1/chat/completions  ←→  Express Server (Node 20, TS)
                                           ├─ LangGraph pipeline (per Vapi call.id)
                                           │    ├─ Analyzer node (gpt-4o-mini, temp 0)
                                           │    ├─ Orchestrator node (phase routing)
                                           │    └─ Speaker node (gpt-4o, temp 0.65)
                                           │         └─ RAG retriever (cosine, top-4)
                                           │              └─ src/rag/vectors.json
                                           └─ Per-call state cache (TTL 1h)
```

## Modes

| Mode | Vapi Assistant | Phase flow |
|---|---|---|
| New Visitor | `VAPI_ASSISTANT_NEW_ID` | Greeting → Value exploration → Socratic taste → Lead capture / Wrap-up |
| Returning User | `VAPI_ASSISTANT_RETURNING_ID` | Welcome back → Performance review (Socratic) → Personalized nudge |

## File structure

```
server/src/
  config.ts               Global config (models, limits, thresholds)
  state.ts                Zod schemas for NewVisitorState / ReturningUserState
  graph/
    newVisitorGraph.ts    Mode A LangGraph
    returningUserGraph.ts Mode B LangGraph
    nodes/
      analyzer.ts         Extracts structured fields from user utterance
      orchestrator.ts     Phase transition logic (orchestrator_rules.md)
      speaker.ts          Generates Mira's spoken response with RAG context
  phases/                 analyzer.md + speaker.md per phase
  registry/               Phase registries, state schemas, orchestrator rules
  prompts/                Framework templates (analyzer_template.md, speaker_template.md)
  rag/
    ingest.ts             Embedding ingestion script
    retriever.ts          Cosine similarity retriever
    vectors.json          Generated vector index (22 embeddings)
  data/users.json         Sughosh demo returning-user profile
  server/
    index.ts              Express app entry point
    customLlm.ts          /v1/chat/completions handler
  setup_assistants.ts     One-off Vapi assistant creation script

widget/
  index.html              Landing page (mode selection)
  new.html                New visitor voice page (teal theme)
  returning.html          Returning user page (violet theme + stats strip)
  style.css               Unified stylesheet (no framework)
  orb.png                 Animated AI orb

legacy/                   Original Python/Vapi files (reference only)
```

## npm scripts

| Command | Description |
|---|---|
| `npm run ingest` | Embed knowledge_base and write vectors.json |
| `npm run dev` | Start server with tsx --watch (hot reload) |
| `npm run build` | TypeScript compile to dist/ |
| `npm start` | Run compiled dist/ |
| `npm run setup:vapi` | Create both Vapi assistants |
| `npm run typecheck` | Type check without emitting |
