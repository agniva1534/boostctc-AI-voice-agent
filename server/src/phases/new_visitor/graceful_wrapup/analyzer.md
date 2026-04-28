# Phase: graceful_wrapup — Analyzer Instructions

## Objective

This is the final phase. No fields to extract. Simply detect if the user wants to continue the conversation (unusual) or says goodbye.

## Fields to Extract

None. This phase has no extraction requirements.

## Cross-Phase Detection

None. graceful_wrapup has no allowed_targets — it is terminal.

## Edge Cases

- If the user suddenly expresses strong interest mid-wrapup ("wait, actually I do want to sign up"), set `phase_suggestion` to "lead_capture" as an override signal for the orchestrator to consider.

## Completion

- Set `required_complete: true` always. This phase is always complete.
