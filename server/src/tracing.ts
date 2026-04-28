/**
 * tracing.ts — LangSmith observability initializer.
 *
 * Import this module FIRST in server/index.ts and dev.ts (before any LangChain
 * code runs). It:
 *   1. Validates the API key is present
 *   2. Sets all required LangSmith env vars
 *   3. Exports a `tracerClient` for manual run tagging
 *   4. Exports `wrapWithTrace` — wraps any async fn in a named LangSmith run
 *
 * Tracing is a no-op when LANGCHAIN_TRACING_V2 != "true", so it is safe in
 * all environments.
 */

import "dotenv/config";
import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";

// ---- Validate and propagate env vars ----------------------------------------

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY ?? "";
const TRACING_ENABLED = process.env.LANGCHAIN_TRACING_V2 === "true";
const PROJECT = process.env.LANGCHAIN_PROJECT ?? "boostctc-voice-agent";
const ENDPOINT = process.env.LANGCHAIN_ENDPOINT ?? "https://api.smith.langchain.com";

if (TRACING_ENABLED && (!LANGSMITH_API_KEY || LANGSMITH_API_KEY === "YOUR_LANGSMITH_API_KEY_HERE")) {
  console.warn(
    "[LangSmith] LANGCHAIN_TRACING_V2=true but LANGSMITH_API_KEY is missing or placeholder. " +
    "Set it in .env to enable tracing."
  );
}

// LangChain reads these from process.env at module-load time for @langchain/core >= 0.2
process.env.LANGSMITH_API_KEY = LANGSMITH_API_KEY;
process.env.LANGCHAIN_TRACING_V2 = String(TRACING_ENABLED);
process.env.LANGCHAIN_PROJECT = PROJECT;
process.env.LANGCHAIN_ENDPOINT = ENDPOINT;

// ---- Client -----------------------------------------------------------------

export const tracerClient = new Client({
  apiKey: LANGSMITH_API_KEY,
  apiUrl: ENDPOINT,
});

// ---- Helpers ----------------------------------------------------------------

/**
 * Log a structured event to LangSmith as a child run of the current trace.
 * Use this for non-LLM events you want visible (e.g., phase transitions,
 * RAG retrievals, lead saves).
 *
 * @param name  Short label shown in the LangSmith UI
 * @param input Any serialisable data (inputs / state snapshot)
 * @param output Any serialisable result or note
 * @param metadata Extra key-value tags (call_id, mode, phase, etc.)
 */
export async function logEvent(
  name: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  if (!TRACING_ENABLED) return;
  try {
    const runId = await tracerClient.createRun({
      name,
      run_type: "chain",
      inputs: input,
      project_name: PROJECT,
      extra: { metadata },
    });
    await tracerClient.updateRun(runId as unknown as string, { outputs: output, end_time: Date.now() });
  } catch {
    // Never crash the server over a tracing failure
  }
}

/**
 * Wrap an async function so every call appears as a named LangSmith run.
 * Metadata is merged in at call time via the options arg.
 *
 * Usage:
 *   const tracedFn = wrapWithTrace("analyzerNode", myFn);
 *   await tracedFn(state, { metadata: { call_id: "...", phase: "..." } });
 */
export function wrapWithTrace<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  if (!TRACING_ENABLED) return fn;
  return traceable(fn, { name, run_type: "chain" }) as (...args: TArgs) => Promise<TReturn>;
}

if (TRACING_ENABLED) {
  console.log(`[LangSmith] Tracing enabled → project: "${PROJECT}" endpoint: ${ENDPOINT}`);
} else {
  console.log("[LangSmith] Tracing disabled (set LANGCHAIN_TRACING_V2=true to enable)");
}
