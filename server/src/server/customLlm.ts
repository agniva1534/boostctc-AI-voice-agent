/**
 * Vapi custom-LLM endpoint: POST /v1/chat/completions
 *
 * Vapi sends an OpenAI-compatible request containing the full conversation
 * history plus a `call` metadata object. We:
 *  1. Map assistant ID → mode (new_visitor / returning_user)
 *  2. Load or create per-call AgentState from the state cache
 *  3. Append the latest user message to the state's history
 *  4. Run the appropriate LangGraph pipeline
 *  5. Stream the speaker_response back as SSE tokens
 */

import type { Request, Response } from "express";
import { env, config } from "../config.js";
import {
  initialNewVisitorState,
  initialReturningUserState,
} from "../state.js";
import type { NewVisitorState, ReturningUserState } from "../state.js";
import { newVisitorGraph } from "../graph/newVisitorGraph.js";
import { returningUserGraph } from "../graph/returningUserGraph.js";

// ---- In-memory state cache keyed by Vapi call.id -------------------------

type AgentState = NewVisitorState | ReturningUserState;

interface CacheEntry {
  state: AgentState;
  expiresAt: number;
}

const stateCache = new Map<string, CacheEntry>();

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of stateCache) {
    if (entry.expiresAt < now) stateCache.delete(key);
  }
}

function getOrCreate(callId: string, mode: "new_visitor" | "returning_user"): AgentState {
  pruneCache();
  const cached = stateCache.get(callId);
  if (cached) return cached.state;

  const fresh =
    mode === "new_visitor"
      ? initialNewVisitorState(callId)
      : initialReturningUserState(callId);

  stateCache.set(callId, {
    state: fresh,
    expiresAt: Date.now() + config.resumption.ttlSeconds * 1000,
  });
  return fresh;
}

function saveState(callId: string, state: AgentState) {
  stateCache.set(callId, {
    state,
    expiresAt: Date.now() + config.resumption.ttlSeconds * 1000,
  });
}

/** Expose read-only state for the /api/state endpoint */
export function getCallState(callId: string): AgentState | null {
  pruneCache();
  return stateCache.get(callId)?.state ?? null;
}

/**
 * Returns the most recently active new_visitor state that is in or past
 * the socratic_taste phase — used as a fallback when the frontend cannot
 * reliably provide a callId.
 */
export function getMostRecentNewVisitorState(): AgentState | null {
  pruneCache();
  const PRIORITY_PHASES = ["lead_capture", "socratic_taste", "engagement_wrapup", "value_exploration"];
  let best: AgentState | null = null;
  let bestScore = -1;

  for (const entry of stateCache.values()) {
    const s = entry.state;
    if (s.mode !== "new_visitor") continue;
    const score = PRIORITY_PHASES.indexOf(s.current_phase);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best;
}

// ---- Vapi message shape --------------------------------------------------

interface VapiMessage {
  role: string;
  content: string;
}

interface VapiCall {
  id: string;
  assistantId?: string;
}

interface VapiRequest {
  messages: VapiMessage[];
  call?: VapiCall;
  model?: string;
  stream?: boolean;
  [key: string]: unknown;
}

// ---- Mode detection ------------------------------------------------------

function detectMode(req: VapiRequest): "new_visitor" | "returning_user" {
  const assistantId = req.call?.assistantId ?? "";
  if (assistantId === env.vapiAssistantReturningId && env.vapiAssistantReturningId) {
    return "returning_user";
  }
  return "new_visitor";
}

// ---- SSE streaming helpers -----------------------------------------------

function sendSseChunk(res: Response, content: string) {
  const chunk = {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: config.speaker.model,
    choices: [
      {
        index: 0,
        delta: { content },
        finish_reason: null,
      },
    ],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

function sendSseDone(res: Response) {
  const done = {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: config.speaker.model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  res.write(`data: ${JSON.stringify(done)}\n\n`);
  res.write("data: [DONE]\n\n");
}

function sendJsonResponse(res: Response, content: string) {
  res.json({
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: config.speaker.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

// ---- Main handler --------------------------------------------------------

export async function customLlmHandler(req: Request, res: Response) {
  const body = req.body as VapiRequest;
  const callId = body.call?.id ?? `anon-${Date.now()}`;
  const mode = detectMode(body);
  const isStream = body.stream !== false; // default to streaming

  // Extract the last user message from Vapi's messages array
  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  let state = getOrCreate(callId, mode);

  // If Vapi sent a user message, append it to conversation history
  if (lastUser) {
    state = {
      ...state,
      conversation_history: [
        ...state.conversation_history,
        { role: "user" as const, content: lastUser.content },
      ],
    } as AgentState;
  }

  try {
    // Run LangGraph pipeline
    let finalState: AgentState;
    if (state.mode === "new_visitor") {
      finalState = (await newVisitorGraph.invoke(
        state as NewVisitorState
      )) as NewVisitorState;
    } else {
      finalState = (await returningUserGraph.invoke(
        state as ReturningUserState
      )) as ReturningUserState;
    }

    saveState(callId, finalState);

    const response = finalState.speaker_response || config.fallbackMessages.standard;

    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Stream word by word for natural TTS pacing
      const words = response.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = i === words.length - 1 ? words[i] : words[i] + " ";
        sendSseChunk(res, chunk);
        // Small delay to allow SSE framing
        await new Promise((r) => setTimeout(r, 5));
      }
      sendSseDone(res);
      res.end();
    } else {
      sendJsonResponse(res, response);
    }
  } catch (err) {
    console.error("[customLlm] Pipeline error:", err);
    const fallback = config.fallbackMessages.standard;
    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.flushHeaders();
      sendSseChunk(res, fallback);
      sendSseDone(res);
      res.end();
    } else {
      sendJsonResponse(res, fallback);
    }
  }
}
