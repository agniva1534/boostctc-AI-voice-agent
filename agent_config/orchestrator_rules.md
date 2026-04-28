# Orchestrator Rules: BoostCTC Voice Agent

Session `mode` selects the experience:

- **Engagement (Mode A):** `engagement_greeting` → `value_exploration` → `socratic_taste` → `lead_capture` (terminal) **or** `engagement_wrapup` (terminal).
- **Advocacy (Mode B):** `advocacy_greeting` → `performance_review` → `personalized_nudge` (terminal).

## Transition Confidence

- Threshold: 0.7 (standard domain, educational coaching)

## Default Phase Flow

- After engagement_greeting -> go to value_exploration
- After value_exploration -> go to socratic_taste
- After socratic_taste -> go to lead_capture (if engagement_signal is "interested") OR engagement_wrapup (if "neutral" or "declined")
- After advocacy_greeting -> go to performance_review
- After performance_review -> go to personalized_nudge
- lead_capture, engagement_wrapup, and personalized_nudge are terminal

## Cross-Phase Context

When entering value_exploration from engagement_greeting: visitor_context, career_stage

When entering socratic_taste from value_exploration: career_stage, interest_area, resonance_point

When entering lead_capture from socratic_taste: interest_area, visitor_context

When entering engagement_wrapup from socratic_taste: visitor_context

When entering performance_review from advocacy_greeting: (all dashboard metrics are already in global state)

When entering personalized_nudge from performance_review: self_assessment, identified_gap, plus all dashboard metrics from global state

## Business Rules

Include these specific rules:

1. **"Mode determines starting phase"** — If mode is `"advocacy"`, set `default_phase` to `advocacy_greeting` instead of `engagement_greeting`.
2. **"No lead capture without interest"** — Block transition to `lead_capture` unless `socratic_taste.engagement_signal` is `"interested"`.
3. **"Route declined to wrapup"** — When `socratic_taste.engagement_signal` is `"neutral"` or `"declined"`, route to `engagement_wrapup`.
4. **"Socratic recommendation fallback"** — In `performance_review`, if the user can't self-identify a gap after 3 turns, the speaker should become directive and suggest one based on the lowest metric score.
5. **"Voice brevity rule"** — All Speaker responses must be under 3 sentences. Voice conversations need brevity.

## Entity Rotation Rules

No entity-bearing phases.

## Conversation Limits

- Maximum 20 turns across the entire conversation
- Conversation times out after 300 seconds (5 minutes) of inactivity (voice conversations are shorter)

## Hooks

### Pre-Conversation

- If mode is `"advocacy"`, load dashboard metrics from the metrics API using user_id
- Validate mode parameter is present

### Mid-Pipeline

- When the Analyzer flags rag_context_needed, call the RAG endpoint to retrieve relevant BoostCTC content and inject into Speaker context

### Post-Completion

- If mode is `"engagement"` and lead_capture phase completed: POST lead data (user_name, user_email, user_role) to the lead capture webhook
- Log conversation summary and outcome for analytics

### Pre-Resumption

- none (voice conversations are not resumable)

## Error Tolerance

- Max Analyzer retries: 2
- Max Speaker retries: 1
- Consecutive error threshold: 2
- Escalation action: terminate (voice calls can't tolerate long error recovery)

## Fallback Messages

- first_turn: "Hey there! I'm your guide to BoostCTC. What brings you here today?"
- standard: "Got it! Tell me a bit more about what you're thinking."
- phase_transition: "Awesome, let's explore that further."
- clarification: "I want to make sure I got that right — could you say that again?"
- entity_transition: "Thanks for sharing that! What else would you like to discuss?"
- termination: "I'm having a bit of trouble right now. You can always check out boostctc.com or email support@boostctc.com for help!"

## Resumption

- Enable resumption: no
- Voice conversations are ephemeral; each call is a fresh session.
