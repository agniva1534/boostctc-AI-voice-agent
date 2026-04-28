/**
 * BoostCTC Voice Agent — Express server
 * Exposes:
 *   GET  /              — serves widget/index.html landing page
 *   POST /v1/chat/completions  — Vapi custom-LLM endpoint
 *   GET  /health        — health check
 */

import "../tracing.js"; // must be first — sets LangSmith env vars before LangChain loads
import "dotenv/config";
import express from "express";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { env } from "../config.js";
import { customLlmHandler, getCallState, getMostRecentNewVisitorState } from "./customLlm.js";
import { saveLead } from "./leads.js";
import { loadIndex } from "../rag/retriever.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WIDGET_DIR = resolve(__dirname, "../../../widget");

const app = express();

app.use(express.json({ limit: "1mb" }));

// CORS — allow Vapi and local widget
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// Vapi custom-LLM
app.post("/v1/chat/completions", customLlmHandler);

// ---- Lead capture APIs -------------------------------------------------------

/** GET /api/state/:callId — returns current phase and key fields for the widget */
app.get("/api/state/:callId", (req, res) => {
  const state = getCallState(req.params.callId);
  if (!state) return res.status(404).json({ error: "call not found" });

  if (state.mode === "new_visitor") {
    return res.json({
      phase: state.current_phase,
      career_stage: state.career_stage,
      interest_area: state.interest_area,
    });
  } else {
    return res.json({ phase: state.current_phase });
  }
});

/** POST /api/lead — saves a lead to leads.csv, enriched with call state */
app.post("/api/lead", async (req, res) => {
  const { callId, name, email } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  // Try exact callId lookup first; fall back to most recent active call when
  // the frontend couldn't capture the callId from Vapi's SDK events.
  const resolvedId = (callId && callId !== "unknown") ? callId : null;
  const state =
    (resolvedId ? getCallState(resolvedId) : null) ??
    getMostRecentNewVisitorState();

  const enriched =
    state?.mode === "new_visitor"
      ? {
          career_stage: state.career_stage,
          interest_area: state.interest_area,
          resonance_point: state.resonance_point,
          reflection_response: state.reflection_response,
        }
      : {};

  const effectiveCallId = resolvedId ?? state?.call_id ?? "unknown";

  try {
    await saveLead({ call_id: effectiveCallId, name, email, ...enriched });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[leads] Failed to save:", err);
    return res.status(500).json({ error: "failed to save lead" });
  }
});

// Serve widget (landing page + voice pages)
app.use(express.static(WIDGET_DIR));
app.get("/", (_req, res) => res.sendFile(join(WIDGET_DIR, "index.html")));

// Start
async function main() {
  await loadIndex();

  await new Promise<void>((resolve) => {
    app.listen(env.port, () => resolve());
  });

  console.log(`\n🚀  BoostCTC Voice Agent`);
  console.log(`    App:        http://localhost:${env.port}`);
  console.log(`    Health:     http://localhost:${env.port}/health`);
  console.log(`    Custom LLM: http://localhost:${env.port}/v1/chat/completions\n`);
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
