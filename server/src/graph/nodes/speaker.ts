/**
 * Speaker node: generates Mira's spoken response using GPT-4o.
 * Retrieves relevant knowledge snippets via cosine RAG before generating.
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { config, env } from "../../config.js";
import { retrieve, formatChunks } from "../../rag/retriever.js";
import { logEvent } from "../../tracing.js";
import type { NewVisitorState, ReturningUserState } from "../../state.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../prompts");
const PHASES_DIR = resolve(__dirname, "../../phases");
const REGISTRY_DIR = resolve(__dirname, "../../registry");
const DATA_DIR = resolve(__dirname, "../../data");

const speakerLLM = new ChatOpenAI({
  openAIApiKey: env.openaiApiKey,
  modelName: config.speaker.model,
  temperature: config.speaker.temperature,
  maxRetries: config.speaker.maxRetries,
  tags: ["speaker"],
});

interface PhaseEntry {
  display_name: string;
  purpose: string;
}
interface PhaseRegistry {
  phases: Record<string, PhaseEntry>;
}

const registryCache: Record<string, PhaseRegistry> = {};
async function loadRegistry(mode: string): Promise<PhaseRegistry> {
  if (registryCache[mode]) return registryCache[mode];
  const raw = await readFile(
    resolve(REGISTRY_DIR, `${mode}.phase_registry.json`),
    "utf8"
  );
  registryCache[mode] = JSON.parse(raw);
  return registryCache[mode];
}

async function loadTemplate(): Promise<string> {
  return readFile(resolve(PROMPTS_DIR, "speaker_template.md"), "utf8");
}

async function loadPhaseSkill(mode: string, phase: string): Promise<string> {
  try {
    return await readFile(
      resolve(PHASES_DIR, mode, phase, "speaker.md"),
      "utf8"
    );
  } catch {
    return "Respond naturally and warmly, staying true to Mira's voice.";
  }
}

async function loadUserStats(userId: string): Promise<string> {
  try {
    const users = JSON.parse(
      await readFile(resolve(DATA_DIR, "users.json"), "utf8")
    ) as Record<string, unknown>;
    const user = users[userId];
    if (!user) return "(no user stats available)";
    return JSON.stringify(user, null, 2);
  } catch {
    return "(user stats not available)";
  }
}

function buildHistory(
  history: { role: string; content: string }[],
  turns: number
): string {
  const slice = history.slice(-turns * 2);
  if (!slice.length) return "(none)";
  return slice.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
}

function buildExtractedState(state: NewVisitorState | ReturningUserState): string {
  if (state.mode === "new_visitor") {
    return [
      `career_stage: ${state.career_stage}`,
      `visitor_context: ${state.visitor_context ?? "(not yet known)"}`,
      `interest_area: ${state.interest_area ?? "null"}`,
      `resonance_point: ${state.resonance_point ?? "null"}`,
      `reflection_response: ${state.reflection_response ?? "null"}`,
      `engagement_signal: ${state.engagement_signal}`,
      `user_name: ${state.user_name ?? "null"}`,
      `user_email: ${state.user_email ?? "null"}`,
    ].join("\n");
  } else {
    return [
      `user_id: ${state.user_id}`,
      `return_acknowledged: ${state.return_acknowledged}`,
      `self_assessment: ${state.self_assessment ?? "null"}`,
      `identified_gap: ${state.identified_gap ?? "null"}`,
      `nudge_accepted: ${state.nudge_accepted ?? "null"}`,
      `next_action_commitment: ${state.next_action_commitment ?? "null"}`,
    ].join("\n");
  }
}

function buildSpeakerTask(state: NewVisitorState | ReturningUserState): string {
  const phase = state.current_phase;
  const phaseN = state.phase_turn_count;

  if (phaseN <= 1) {
    return `Turn 1 in ${phase}. This is the FIRST turn of this phase. Deliver the opening message as specified in the phase instructions above.`;
  }
  return `Turn ${phaseN} in ${phase}. Respond to the user's latest message. Follow the phase-specific instructions above — use the phase turn count to determine which part of the phase you are in.`;
}

const COMM_KEYWORDS = ["communicat", "speak", "present", "express", "writ", "articul", "explain", "meeting", "talk"];
const CT_KEYWORDS = ["critical think", "problem solv", "logic", "analys", "reason", "decision"];
const TECH_KEYWORDS = ["system design", "code", "software", "engineer", "database", "oop", "object"];

function classifyPainPoint(text: string): "communication" | "critical_thinking" | "technical" | "general" {
  const lower = text.toLowerCase();
  if (TECH_KEYWORDS.some((k) => lower.includes(k))) return "technical";
  if (COMM_KEYWORDS.some((k) => lower.includes(k))) return "communication";
  if (CT_KEYWORDS.some((k) => lower.includes(k))) return "critical_thinking";
  return "general";
}

async function buildRagQuery(state: NewVisitorState | ReturningUserState): Promise<string> {
  if (state.mode === "returning_user") {
    const gap = state.identified_gap ?? "communication critical thinking";
    return `BoostCTC exercise practice ${gap} dashboard`;
  }

  const interestArea = state.interest_area ?? "";
  const resonancePoint = state.resonance_point ?? "";
  const visitorContext = state.visitor_context ?? "";
  const phase = state.current_phase;

  if (phase === "engagement_greeting") {
    return `BoostCTC platform overview what is BoostCTC for ${state.career_stage}`;
  }

  if (phase === "value_exploration") {
    return `BoostCTC methodology Daily Practice AI Feedback Continuous Progress Socratic Guide career ${state.career_stage}`;
  }

  if (phase === "socratic_taste") {
    if (interestArea === "communication") {
      return "BoostCTC communication exercises reading comprehension passage AI feedback practice";
    }
    if (interestArea === "ai_literacy") {
      return "BoostCTC AI literacy exercises critical thinking prompting tools";
    }
    if (interestArea === "leadership") {
      return "BoostCTC leadership EQ communication exercises soft skills";
    }
    return "BoostCTC critical thinking exercises daily practice AI feedback Socratic method";
  }

  if (interestArea) {
    return `BoostCTC ${interestArea} exercises ${resonancePoint} ${state.career_stage}`.trim();
  }

  return `BoostCTC platform features exercises ${visitorContext} ${state.career_stage}`.trim();
}

export async function speakerNode(
  state: NewVisitorState | ReturningUserState
): Promise<NewVisitorState | ReturningUserState> {
  try {
    const [template, phaseSkill, registry] = await Promise.all([
      loadTemplate(),
      loadPhaseSkill(state.mode, state.current_phase),
      loadRegistry(state.mode),
    ]);

    const phaseEntry = registry.phases[state.current_phase];
    const ragQuery = await buildRagQuery(state);
    const chunks = await retrieve(ragQuery, config.rag.topK);
    const knowledgeSnippets = formatChunks(chunks);

    const userStats =
      state.mode === "returning_user"
        ? await loadUserStats(state.user_id)
        : "(N/A — new visitor mode)";

    const prompt = template
      .replace("{{current_phase}}", state.current_phase)
      .replace("{{phase_goal}}", phaseEntry?.purpose ?? "")
      .replace("{{phase_turn_count}}", String(state.phase_turn_count))
      .replace("{{phase_skill_speaker}}", phaseSkill)
      .replace("{{knowledge_snippets}}", knowledgeSnippets)
      .replace("{{user_stats}}", userStats)
      .replace(
        "{{conversation_history}}",
        buildHistory(state.conversation_history, config.speaker.historyTurns)
      )
      .replace("{{history_turns}}", String(config.speaker.historyTurns))
      .replace("{{extracted_state}}", buildExtractedState(state))
      .replace("{{speaker_task}}", buildSpeakerTask(state));

    const runMeta = {
      call_id: state.call_id,
      mode: state.mode,
      phase: state.current_phase,
      phase_turn: state.phase_turn_count,
      turn: state.turn_count,
      rag_query: ragQuery,
      rag_chunks_returned: chunks.length,
    };

    const response = await speakerLLM.invoke(
      [new SystemMessage(prompt), new HumanMessage("Respond now as Mira.")],
      {
        runName: `speaker:${state.mode}:${state.current_phase}`,
        metadata: runMeta,
        tags: ["speaker", state.mode, state.current_phase],
      }
    );

    const speaker_response = (response.content as string).trim();

    // Log speaker output for observability
    void logEvent(
      `speaker:response:${state.current_phase}`,
      { phase: state.current_phase, rag_query: ragQuery, chunks_used: chunks.length },
      { response: speaker_response },
      { call_id: state.call_id, mode: state.mode, phase: state.current_phase, turn: state.turn_count }
    );

    console.log(
      `[Speaker] call=${state.call_id} phase=${state.current_phase} ` +
      `turn=${state.phase_turn_count} rag_chunks=${chunks.length} ` +
      `response_chars=${speaker_response.length}`
    );

    // Add assistant message to history
    const updated_history = [
      ...state.conversation_history,
      { role: "assistant" as const, content: speaker_response },
    ];

    return { ...state, speaker_response, conversation_history: updated_history };
  } catch (err) {
    console.error("[Speaker] Error:", err);
    void logEvent(
      "speaker:error",
      { phase: state.current_phase, call_id: state.call_id },
      { error: String(err) },
      { call_id: state.call_id, mode: state.mode, phase: state.current_phase }
    );
    const fallback = config.fallbackMessages.standard;
    return {
      ...state,
      speaker_response: fallback,
      consecutive_errors: state.consecutive_errors + 1,
    };
  }
}
