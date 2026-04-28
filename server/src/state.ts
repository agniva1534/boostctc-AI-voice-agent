import { z } from "zod";

// ---- Shared ----------------------------------------------------------------

export const ConversationMessage = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export type ConversationMessage = z.infer<typeof ConversationMessage>;

// ---- New Visitor Mode (Mode A) ---------------------------------------------

export const CareerStage = z.enum([
  "early",
  "mid",
  "senior",
  "student",
  "parent",
  "unknown",
]);
export type CareerStage = z.infer<typeof CareerStage>;

export const InterestArea = z.enum([
  "ai_literacy",
  "critical_thinking",
  "communication",
  "leadership",
  "all",
]);
export type InterestArea = z.infer<typeof InterestArea>;

export const EngagementSignal = z.enum([
  "interested",
  "neutral",
  "declined",
  "unknown",
]);
export type EngagementSignal = z.infer<typeof EngagementSignal>;

export const NewVisitorState = z.object({
  // Mode metadata
  mode: z.literal("new_visitor"),
  call_id: z.string(),
  current_phase: z.string(),
  turn_count: z.number(),
  phase_turn_count: z.number(),
  consecutive_errors: z.number(),
  conversation_history: z.array(ConversationMessage),

  // engagement_greeting fields
  career_stage: CareerStage,
  visitor_context: z.string().nullable(),

  // value_exploration fields
  interest_area: InterestArea.nullable(),
  resonance_point: z.string().nullable(),

  // socratic_taste fields
  reflection_response: z.string().nullable(),
  engagement_signal: EngagementSignal,

  // lead_capture fields
  user_name: z.string().nullable(),
  user_email: z.string().nullable(),

  // engagement_wrapup fields
  farewell_acknowledged: z.boolean().nullable(),

  // Orchestrator control
  required_complete: z.boolean(),
  phase_suggestion: z.string().nullable(),
  confidence: z.number(),

  // Speaker output (populated each turn)
  speaker_response: z.string(),
});
export type NewVisitorState = z.infer<typeof NewVisitorState>;

// Mira's firstMessage is delivered by Vapi itself before the server is ever
// invoked. Seed the conversation history with it so the analyzer/speaker know
// the pitch has already been said, and start phase_turn_count at 1 so the
// first LLM-driven turn is treated as Turn 2 (never re-delivers the pitch).
export const NEW_VISITOR_FIRST_MESSAGE =
  "Hey, welcome to BoostCTC! Here's the thing most people don't realize — it's not about being smart, it's about being able to think clearly and communicate that thinking under pressure. That's the gap that holds careers back, causes students to underperform, and makes meetings feel unproductive. We close that gap with daily AI-coached exercises — Socratic scenarios, critical thinking drills, communication practice — and in this very call, I'm going to walk you through one so you can feel it firsthand, not just hear about it. But first, quick question: are you here for yourself, for your kid, or for a classroom?";

export function initialNewVisitorState(callId: string): NewVisitorState {
  return {
    mode: "new_visitor",
    call_id: callId,
    current_phase: "engagement_greeting",
    turn_count: 1,
    phase_turn_count: 1,
    consecutive_errors: 0,
    conversation_history: [
      { role: "assistant", content: NEW_VISITOR_FIRST_MESSAGE },
    ],
    career_stage: "unknown",
    visitor_context: null,
    interest_area: null,
    resonance_point: null,
    reflection_response: null,
    engagement_signal: "unknown",
    user_name: null,
    user_email: null,
    farewell_acknowledged: null,
    required_complete: false,
    phase_suggestion: null,
    confidence: 1.0,
    speaker_response: "",
  };
}

// ---- Returning User Mode (Mode B) -----------------------------------------

export const IdentifiedGap = z.enum([
  "critical_thinking",
  "communication",
  "consistency",
  "mcq_accuracy",
  "overall",
]);
export type IdentifiedGap = z.infer<typeof IdentifiedGap>;

export const ReturningUserState = z.object({
  // Mode metadata
  mode: z.literal("returning_user"),
  call_id: z.string(),
  user_id: z.string(),
  current_phase: z.string(),
  turn_count: z.number(),
  phase_turn_count: z.number(),
  consecutive_errors: z.number(),
  conversation_history: z.array(ConversationMessage),

  // advocacy_greeting fields
  return_acknowledged: z.boolean(),

  // performance_review fields
  self_assessment: z.string().nullable(),
  identified_gap: IdentifiedGap.nullable(),

  // gap_deepdive fields
  gap_context: z.string().nullable(),
  gap_scenario: z.string().nullable(),

  // personalized_nudge fields
  nudge_accepted: z.boolean().nullable(),
  next_action_commitment: z.string().nullable(),

  // Orchestrator control
  required_complete: z.boolean(),
  phase_suggestion: z.string().nullable(),
  confidence: z.number(),

  // Speaker output (populated each turn)
  speaker_response: z.string(),
});
export type ReturningUserState = z.infer<typeof ReturningUserState>;

// Same pattern as new visitor: Vapi's firstMessage is already spoken.
export const RETURNING_USER_FIRST_MESSAGE =
  "Hey, welcome back! I'm Mira — I can actually see how your recent sessions have been going. Got a minute to chat about it?";

export function initialReturningUserState(
  callId: string,
  userId = "sughosh-demo"
): ReturningUserState {
  return {
    mode: "returning_user",
    call_id: callId,
    user_id: userId,
    current_phase: "advocacy_greeting",
    turn_count: 1,
    phase_turn_count: 1,
    consecutive_errors: 0,
    conversation_history: [
      { role: "assistant", content: RETURNING_USER_FIRST_MESSAGE },
    ],
    return_acknowledged: false,
    self_assessment: null,
    identified_gap: null,
    gap_context: null,
    gap_scenario: null,
    nudge_accepted: null,
    next_action_commitment: null,
    required_complete: false,
    phase_suggestion: null,
    confidence: 1.0,
    speaker_response: "",
  };
}

export type AgentState = NewVisitorState | ReturningUserState;
