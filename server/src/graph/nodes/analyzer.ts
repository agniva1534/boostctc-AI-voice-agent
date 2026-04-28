/**
 * Analyzer node: extracts structured state fields from the user's latest message.
 * Uses gpt-4o-mini (temp 0) to parse intent deterministically.
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { config, env } from "../../config.js";
import { logEvent } from "../../tracing.js";
import type { NewVisitorState, ReturningUserState } from "../../state.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../prompts");
const PHASES_DIR = resolve(__dirname, "../../phases");
const REGISTRY_DIR = resolve(__dirname, "../../registry");

const analyzerLLM = new ChatOpenAI({
  openAIApiKey: env.openaiApiKey,
  modelName: config.analyzer.model,
  temperature: config.analyzer.temperature,
  maxRetries: config.analyzer.maxRetries,
  // LangSmith picks up run metadata via tags and metadata fields
  tags: ["analyzer"],
});

async function loadTemplate(): Promise<string> {
  return readFile(resolve(PROMPTS_DIR, "analyzer_template.md"), "utf8");
}

async function loadPhaseSkill(mode: string, phase: string): Promise<string> {
  try {
    return await readFile(
      resolve(PHASES_DIR, mode, phase, "analyzer.md"),
      "utf8"
    );
  } catch {
    return `No specific instructions for phase ${phase}. Extract what is relevant.`;
  }
}

async function loadPhaseRegistry(mode: string): Promise<string> {
  const file = resolve(
    REGISTRY_DIR,
    `${mode}.phase_registry.json`
  );
  const raw = JSON.parse(await readFile(file, "utf8"));
  // Build a compact summary for the prompt
  const lines = Object.entries(raw.phases as Record<string, { display_name: string; purpose: string; allowed_targets: string[] }>).map(
    ([id, p]) =>
      `- **${p.display_name}** (id: ${id}): ${p.purpose} → allowed transitions: [${p.allowed_targets.join(", ")}]`
  );
  return lines.join("\n");
}

function buildHistory(
  history: { role: string; content: string }[],
  turns: number
): string {
  const slice = history.slice(-turns * 2);
  if (!slice.length) return "(none)";
  return slice.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
}

function getRequiredFields(mode: string, phase: string): string[] {
  const maps: Record<string, Record<string, string[]>> = {
    new_visitor: {
      engagement_greeting: ["career_stage", "visitor_context"],
      value_exploration: ["interest_area", "resonance_point"],
      socratic_taste: ["reflection_response", "engagement_signal"],
      lead_capture: ["user_name", "user_email"],
      engagement_wrapup: ["farewell_acknowledged"],
    },
    returning_user: {
      advocacy_greeting: ["return_acknowledged"],
      performance_review: ["self_assessment", "identified_gap"],
      personalized_nudge: ["nudge_accepted", "next_action_commitment"],
    },
  };
  return maps[mode]?.[phase] ?? [];
}

function getOptionalFields(mode: string, phase: string): string[] {
  const maps: Record<string, Record<string, string[]>> = {
    new_visitor: {
      engagement_greeting: [],
      value_exploration: [],
      socratic_taste: [],
      lead_capture: [],
      engagement_wrapup: [],
    },
    returning_user: {
      advocacy_greeting: [],
      performance_review: [],
      personalized_nudge: [],
    },
  };
  return maps[mode]?.[phase] ?? [];
}

interface AnalyzerOutput {
  extracted: Record<string, unknown>;
  required_complete: boolean;
  phase_suggestion: string | null;
  confidence: number;
  reasoning: string;
}

export async function analyzerNode(
  state: NewVisitorState | ReturningUserState
): Promise<NewVisitorState | ReturningUserState> {
  const userMessage =
    state.conversation_history.length > 0
      ? state.conversation_history[state.conversation_history.length - 1]
      : null;

  // First turn with no user message — skip analysis
  if (!userMessage || userMessage.role !== "user") {
    return { ...state, required_complete: false, phase_suggestion: null, confidence: 1.0 };
  }

  try {
    const [template, phaseSkill, registrySummary] = await Promise.all([
      loadTemplate(),
      loadPhaseSkill(state.mode, state.current_phase),
      loadPhaseRegistry(state.mode),
    ]);

    const required = getRequiredFields(state.mode, state.current_phase);
    const optional = getOptionalFields(state.mode, state.current_phase);

    const prompt = template
      .replace("{{current_phase}}", state.current_phase)
      .replace("{{phase_turn_count}}", String(state.phase_turn_count))
      .replace("{{required_fields}}", required.join(", ") || "(none)")
      .replace("{{optional_fields}}", optional.join(", ") || "(none)")
      .replace("{{phase_registry_summary}}", registrySummary)
      .replace("{{phase_skill_analyzer}}", phaseSkill)
      .replace(
        "{{conversation_history}}",
        buildHistory(state.conversation_history, config.analyzer.historyTurns)
      )
      .replace("{{history_turns}}", String(config.analyzer.historyTurns))
      .replace("{{user_message}}", userMessage.content);

    const runMeta = {
      call_id: state.call_id,
      mode: state.mode,
      phase: state.current_phase,
      phase_turn: state.phase_turn_count,
      turn: state.turn_count,
    };

    const response = await analyzerLLM.invoke(
      [new SystemMessage(prompt), new HumanMessage("Extract and return JSON now.")],
      {
        runName: `analyzer:${state.mode}:${state.current_phase}`,
        metadata: runMeta,
        tags: ["analyzer", state.mode, state.current_phase],
      }
    );

    const raw = (response.content as string).trim();
    // Strip markdown fences if model wraps output
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed: AnalyzerOutput = JSON.parse(jsonStr);

    // Merge extracted fields into state
    const updated = { ...state } as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed.extracted ?? {})) {
      if (value !== null && value !== undefined && key in updated) {
        updated[key] = value;
      }
    }
    updated.required_complete = parsed.required_complete ?? false;
    updated.phase_suggestion = parsed.phase_suggestion ?? null;
    updated.confidence = parsed.confidence ?? 1.0;
    updated.consecutive_errors = 0;

    // Log extraction result for observability
    void logEvent(
      `analyzer:extracted:${state.current_phase}`,
      { user_message: userMessage.content, phase: state.current_phase },
      {
        extracted: parsed.extracted,
        required_complete: parsed.required_complete,
        phase_suggestion: parsed.phase_suggestion ?? null,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning ?? "",
      },
      runMeta
    );

    console.log(
      `[Analyzer] call=${state.call_id} phase=${state.current_phase} ` +
      `turn=${state.phase_turn_count} complete=${parsed.required_complete} ` +
      `suggestion=${parsed.phase_suggestion ?? "none"} confidence=${parsed.confidence}`
    );

    return updated as NewVisitorState | ReturningUserState;
  } catch (err) {
    console.error("[Analyzer] Error:", err);
    void logEvent(
      "analyzer:error",
      { phase: state.current_phase, call_id: state.call_id },
      { error: String(err) },
      { call_id: state.call_id, mode: state.mode, phase: state.current_phase }
    );
    const consecutive_errors = state.consecutive_errors + 1;
    return { ...state, consecutive_errors, required_complete: false };
  }
}
