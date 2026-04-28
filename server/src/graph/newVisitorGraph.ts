/**
 * Mode A — New Visitor LangGraph
 * Flow: START → analyzer → orchestrator → speaker → END
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { analyzerNode } from "./nodes/analyzer.js";
import { orchestratorNode } from "./nodes/orchestrator.js";
import { speakerNode } from "./nodes/speaker.js";
import type { NewVisitorState } from "../state.js";

// LangGraph requires a channels definition mapping each key to a reducer.
// For our flat state with immutable-replacement semantics, each field reduces
// by taking the latest value (simple override reducer).
function last<T>(_prev: T, next: T): T { return next; }

const channels: Record<keyof NewVisitorState, { value: typeof last }> = {
  mode: { value: last },
  call_id: { value: last },
  current_phase: { value: last },
  turn_count: { value: last },
  phase_turn_count: { value: last },
  consecutive_errors: { value: last },
  conversation_history: { value: last },
  career_stage: { value: last },
  visitor_context: { value: last },
  interest_area: { value: last },
  resonance_point: { value: last },
  reflection_response: { value: last },
  engagement_signal: { value: last },
  user_name: { value: last },
  user_email: { value: last },
  farewell_acknowledged: { value: last },
  required_complete: { value: last },
  phase_suggestion: { value: last },
  confidence: { value: last },
  speaker_response: { value: last },
};

const graph = new StateGraph<NewVisitorState>({ channels })
  .addNode("analyzer", analyzerNode)
  .addNode("orchestrator", orchestratorNode)
  .addNode("speaker", speakerNode)
  .addEdge(START, "analyzer")
  .addEdge("analyzer", "orchestrator")
  .addEdge("orchestrator", "speaker")
  .addEdge("speaker", END);

export const newVisitorGraph = graph.compile();
