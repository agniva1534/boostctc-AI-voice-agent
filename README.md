# BoostCTC Voice Agent

LangGraph + TypeScript voice agent for BoostCTC, integrated with Vapi custom-LLM and a local cosine-similarity RAG index.

## What This Project Does

- Runs a real-time voice coaching agent with two conversational modes.
- Uses a structured pipeline (`Analyzer -> Orchestrator -> Speaker`) instead of a single prompt.
- Retrieves relevant product/domain context from local embedded docs.

## Table of Contents

- [Architecture](#architecture)
- [Modes](#modes)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Useful Commands](#useful-commands)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Data and Security Notes](#data-and-security-notes)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Architecture

```text
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

| Mode | Vapi Assistant | Phase Flow |
|---|---|---|
| New Visitor | `VAPI_ASSISTANT_NEW_ID` | Greeting -> Value exploration -> Socratic taste -> Lead capture / Wrap-up |
| Returning User | `VAPI_ASSISTANT_RETURNING_ID` | Welcome back -> Performance review (Socratic) -> Personalized nudge |

## Prerequisites

- Node.js 20+
- npm 10+ (or compatible with lockfile)
- `cloudflared` CLI (for local public tunnel during setup/dev)
- Vapi account + API keys
- OpenAI API key

## Quick Start

### 1) Install dependencies

```bash
cd server
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Fill required values in `server/.env` (see table below).

### 3) Build the RAG index (first time or when knowledge base changes)

```bash
npm run ingest
```

### 4) Create Vapi assistants (first time only)

In one terminal:

```bash
cd server
npm run server
```

In another terminal:

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

Copy the generated `https://*.trycloudflare.com` URL into `VAPI_SERVER_URL` in `server/.env`, then run:

```bash
cd server
npm run setup:vapi
```

This prints assistant IDs. Save them to:

- `VAPI_ASSISTANT_NEW_ID`
- `VAPI_ASSISTANT_RETURNING_ID`

### 5) Daily development

```bash
cd server
npm run dev
```

## Environment Variables

Defined in `server/.env` (use `server/.env.example` as template):

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | API key used for generation + embeddings |
| `VAPI_PRIVATE_KEY` | Yes | Server-side Vapi key for assistant setup and backend integration |
| `VAPI_PUBLIC_KEY` | Yes | Public key used by widget/client integration |
| `VAPI_SERVER_URL` | Yes (for Vapi setup/dev) | Public URL Vapi calls for the custom LLM endpoint |
| `VAPI_ASSISTANT_NEW_ID` | Yes (runtime) | Assistant ID for new-visitor mode |
| `VAPI_ASSISTANT_RETURNING_ID` | Yes (runtime) | Assistant ID for returning-user mode |
| `PORT` | No | Express server port (default `3000`) |
| `LANGCHAIN_API_KEY` | Optional | LangSmith tracing key |
| `LANGCHAIN_TRACING_V2` | Optional | Enable tracing (`true`/`false`) |
| `LANGCHAIN_PROJECT` | Optional | LangSmith project name |

## Useful Commands

From `server/`:

| Command | Description |
|---|---|
| `npm run ingest` | Embed `knowledge_base/**` and regenerate `src/rag/vectors.json` |
| `npm run dev` | Start server with watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app |
| `npm run setup:vapi` | Create or update Vapi assistants |
| `npm run typecheck` | Run TypeScript checks without emit |

## API Endpoints

- `POST /v1/chat/completions`  
  Vapi custom-LLM endpoint. Accepts Vapi-style chat payloads and returns streamed LLM output.

- `POST /api/lead`  
  Saves a lead record to local CSV (`server/data/leads.csv`) during local development.

## Troubleshooting

- **`OPENAI_API_KEY not set`**  
  Ensure `server/.env` exists and includes `OPENAI_API_KEY`.

- **Vapi setup fails with missing assistant IDs**  
  Run `npm run setup:vapi` after setting `VAPI_SERVER_URL` and keys.

- **Tunnel URL expired / calls stop arriving**  
  Restart `cloudflared`, update `VAPI_SERVER_URL`, and rerun assistant setup.

- **RAG returns weak or stale results**  
  Re-run `npm run ingest` after editing `knowledge_base/**`.

- **Port already in use**  
  Change `PORT` in `.env` or stop the conflicting process.

## Data and Security Notes

- Do not commit `.env` files or local lead data.
- This repository ignores sensitive/local artifacts via `.gitignore`.
- If secrets were ever exposed, rotate them before production use.
- Use synthetic or anonymized data only in public repos.

## Project Structure

```text
server/src/
  graph/                  LangGraph workflows and nodes
  phases/                 Analyzer/Speaker prompt modules by phase
  prompts/                Shared prompt templates
  rag/                    Ingest + retrieval
  registry/               Phase registries and state schemas
  server/                 Express routes and handlers

widget/                   Browser voice UI
knowledge_base/           Public/domain docs used for RAG
agent_config/             Config/prompt assets
legacy/                   Old Python implementation (reference)
```

## Contributing

1. Fork and create a feature branch.
2. Keep changes focused and documented.
3. Run type checks/build before opening PR.
4. Never commit secrets or user data.

## License

This project is licensed under the MIT License - see [`LICENSE`](./LICENSE).
