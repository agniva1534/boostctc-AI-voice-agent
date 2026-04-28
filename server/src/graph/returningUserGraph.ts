/**
 * Mode B — Returning User LangGraph
 * Flow: START → analyzer → orchestrator → speaker → END
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { analyzerNode } from "./nodes/analyzer.js";
import { orchestratorNode } from "./nodes/orchestrator.js";
import { speakerNode } from "./nodes/speaker.js";
import type { ReturningUserState } from "../state.js";

function last<T>(_prev: T, next: T): T { return next; }

const channels: Record<keyof ReturningUserState, { value: typeof last }> = {
  mode: { value: last },
  call_id: { value: last },
  user_id: { value: last },
  current_phase: { value: last },
  turn_count: { value: last },
  phase_turn_count: { value: last },
  consecutive_errors: { value: last },
  conversation_history: { value: last },
  return_acknowledged: { value: last },
  self_assessment: { value: last },
  identified_gap: { value: last },
  gap_context: { value: last },
  gap_scenario: { value: last },
  nudge_accepted: { value: last },
  next_action_commitment: { value: last },
  required_complete: { value: last },
  phase_suggestion: { value: last },
  confidence: { value: last },
  speaker_response: { value: last },
};

const graph = new StateGraph<ReturningUserState>({ channels })
  .addNode("analyzer", analyzerNode)
  .addNode("orchestrator", orchestratorNode)
  .addNode("speaker", speakerNode)
  .addEdge(START, "analyzer")
  .addEdge("analyzer", "orchestrator")
  .addEdge("orchestrator", "speaker")
  .addEdge("speaker", END);

export const returningUserGraph = graph.compile();
