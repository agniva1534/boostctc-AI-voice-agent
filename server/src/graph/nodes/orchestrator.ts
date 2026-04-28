/**
 * Orchestrator node: reads analyzer output and decides phase transitions.
 * Implements the rules from registry/orchestrator_rules.md.
 */

import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "../../config.js";
import { logEvent } from "../../tracing.js";
import type { NewVisitorState, ReturningUserState } from "../../state.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REGISTRY_DIR = resolve(__dirname, "../../registry");

interface PhaseEntry {
  allowed_targets: string[];
  conditions: Record<string, string>;
  max_turns: number | null;
  auto_advance: boolean;
  order: number;
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

function evaluateCondition(
  condition: string,
  state: NewVisitorState | ReturningUserState
): boolean {
  if (condition === "all_required_complete") return state.required_complete;

  // Simple equality: "field == value"
  const eqMatch = condition.match(/^(\w+)\s*==\s*(.+)$/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    return String((state as Record<string, unknown>)[field]) === value.trim();
  }

  // Not-null: "field != null"
  const neMatch = condition.match(/^(\w+)\s*!=\s*null$/);
  if (neMatch) {
    const [, field] = neMatch;
    return (state as Record<string, unknown>)[field] !== null;
  }

  return false;
}

export async function orchestratorNode(
  state: NewVisitorState | ReturningUserState
): Promise<NewVisitorState | ReturningUserState> {
  const registry = await loadRegistry(state.mode);
  const currentPhase = registry.phases[state.current_phase];

  if (!currentPhase) {
    console.error(`[Orchestrator] Unknown phase: ${state.current_phase}`);
    return state;
  }

  const turn_count = state.turn_count + 1;
  const phase_turn_count = state.phase_turn_count + 1;

  // Global turn limit → force wrapup
  if (turn_count >= config.limits.globalMaxTurns) {
    const terminalPhase =
      state.mode === "new_visitor" ? "engagement_wrapup" : "personalized_nudge";
    return {
      ...state,
      turn_count,
      phase_turn_count: 1,
      current_phase: terminalPhase,
    };
  }

  // Error threshold
  if (state.consecutive_errors >= config.errorTolerance.consecutiveErrorThreshold) {
    const terminalPhase =
      state.mode === "new_visitor" ? "engagement_wrapup" : "personalized_nudge";
    return {
      ...state,
      turn_count,
      phase_turn_count: 1,
      current_phase: terminalPhase,
      consecutive_errors: 0,
    };
  }

  // Confidence too low → stay and clarify
  if (state.confidence < config.transitions.minConfidence && state.turn_count > 0) {
    return { ...state, turn_count, phase_turn_count, phase_suggestion: null };
  }

  // Max turns in current phase → force advance to first allowed target
  if (
    currentPhase.max_turns !== null &&
    phase_turn_count >= currentPhase.max_turns &&
    currentPhase.allowed_targets.length > 0
  ) {
    const next = currentPhase.allowed_targets[0];
    console.log(`[Orchestrator] Max turns reached in ${state.current_phase} → ${next}`);
    return {
      ...state,
      turn_count,
      phase_turn_count: 1,
      current_phase: next,
      required_complete: false,
      phase_suggestion: null,
    };
  }

  const traceMeta = { call_id: state.call_id, mode: state.mode };

  // Evaluate phase_suggestion from analyzer
  if (
    state.phase_suggestion &&
    currentPhase.allowed_targets.includes(state.phase_suggestion)
  ) {
    const condition = currentPhase.conditions[state.phase_suggestion];
    if (!condition || evaluateCondition(condition, state)) {
      const next = state.phase_suggestion;
      console.log(`[Orchestrator] Analyzer suggestion accepted: ${state.current_phase} → ${next}`);
      void logEvent(
        "orchestrator:phase_transition",
        { from: state.current_phase, trigger: "phase_suggestion" },
        { to: next },
        { ...traceMeta, from: state.current_phase, to: next, trigger: "suggestion" }
      );
      return {
        ...state,
        turn_count,
        phase_turn_count: 1,
        current_phase: next,
        required_complete: false,
        phase_suggestion: null,
      };
    }
  }

  // Auto-advance on required_complete
  if (
    state.required_complete &&
    currentPhase.auto_advance &&
    currentPhase.allowed_targets.length > 0
  ) {
    // Find first allowed target whose condition is met
    for (const target of currentPhase.allowed_targets) {
      const condition = currentPhase.conditions[target];
      if (!condition || evaluateCondition(condition, state)) {
        console.log(`[Orchestrator] Auto-advance: ${state.current_phase} → ${target}`);
        void logEvent(
          "orchestrator:phase_transition",
          { from: state.current_phase, trigger: "auto_advance" },
          { to: target },
          { ...traceMeta, from: state.current_phase, to: target, trigger: "auto_advance" }
        );
        return {
          ...state,
          turn_count,
          phase_turn_count: 1,
          current_phase: target,
          required_complete: false,
          phase_suggestion: null,
        };
      }
    }
  }

  // Stay in current phase
  console.log(`[Orchestrator] call=${state.call_id} staying in ${state.current_phase} turn=${phase_turn_count}`);
  return { ...state, turn_count, phase_turn_count };
}
