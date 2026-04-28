# Orchestrator Rules

## Overview

The Orchestrator runs between the Analyzer and Speaker nodes each turn. It reads the Analyzer's output (updated state + `phase_suggestion` + `required_complete`) and decides whether to stay in the current phase or transition.

---

## Transition Logic

### When to advance the phase

1. The Analyzer sets `required_complete: true` AND the current phase's `auto_advance` is `true`.
2. The Analyzer sets `phase_suggestion` to a valid allowed_target of the current phase AND the associated condition is satisfied.
3. Both (1) and (2) are present — condition (1) takes priority.

### When NOT to advance

- `phase_suggestion` points to a phase not listed in `allowed_targets` for the current phase. Ignore it and stay.
- `required_complete` is `true` but `auto_advance` is `false` — wait for the user to explicitly signal readiness.
- The current phase has reached `max_turns` — force advance to the first `allowed_target` if one exists; otherwise terminate gracefully.
- Confidence of the Analyzer's output is below `minConfidence: 0.7` — do not transition; ask for clarification.

---

## Phase Redirect Guard

If the Analyzer suggests a phase change more than `maxAttempts: 2` times in a single turn without the conditions being met, the Orchestrator emits a `clarification` fallback message and stays in the current phase.

---

## Transition Confidence

The Analyzer returns a `confidence` value (0.0–1.0) for each extracted field. The Orchestrator averages confidence across required fields. If the average is < 0.7, the phase does not advance.

---

## Error Tolerance

- If a node raises a recoverable error, retry up to the node's `maxRetries` setting.
- If `consecutiveErrorThreshold: 3` consecutive errors occur across any nodes in the same turn, escalate to `terminate` — emit the `termination` fallback message and end the conversation.

---

## Global Limits

- `globalMaxTurns: 30` — after 30 total turns across all phases, force `graceful_wrapup` (new visitor) or `personalized_nudge` (returning user).
- `conversationTimeoutSeconds: 3600` — in-memory state TTL; expired state is cleared.

---

## Fallback Messages

| Situation | Message |
|---|---|
| first_turn | "Hey! I'm Mira, BoostCTC's voice assistant. Happy to help you learn about our platform. What brings you here today?" |
| standard | "Sorry, I didn't quite catch that. Could you say that again?" |
| phase_transition | "Great — let me make sure I'm pointing you in the right direction." |
| clarification | "Just to make sure I understand — could you tell me a bit more about that?" |
| entity_transition | "Interesting — let me focus on that for a second." |
| termination | "It was great chatting! Feel free to come back anytime. Take care!" |

---

## Resumption

- `enabled: true` — if a user reconnects within `ttlSeconds: 3600`, restore their state and resume from the last active phase.
- On resumption, the Speaker uses the `preResumption` hook slot (currently null) to optionally acknowledge the gap.

---

## Hooks

| Hook | Trigger | Default |
|---|---|---|
| preConversation | Before turn 1 | null |
| midPipeline | After Analyzer, before Speaker | null |
| postCompletion | After Speaker generates response | null |
| preResumption | When a resumed state is detected | null |
