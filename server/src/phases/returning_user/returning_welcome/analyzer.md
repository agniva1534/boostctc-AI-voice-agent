# Phase: returning_welcome — Analyzer Instructions

## Objective

Confirm the user acknowledges the welcome and is ready to talk about their progress. Set acknowledged_return to true.

## Fields to Extract

### acknowledged_return (required)

- **What to look for:** Any response to the welcome message — even "yeah", "hi", "hey", "sure", "I'm back".
- **Type:** boolean
- **Interpretation:** Any non-refusal response counts as acknowledged (true). Silence or "I need to go" = false.
- **Validation:** boolean
- **Examples:**
  - "Hey Mira!" → Extract: true
  - "Yeah it's me" → Extract: true
  - "I'm busy actually" → Extract: false
- **Do NOT extract if:** No response has been given yet.

## Cross-Phase Detection

- Once acknowledged_return is true, set `phase_suggestion` to "performance_review".

## Completion

- Set `required_complete: true` ONLY when `acknowledged_return` is true.
