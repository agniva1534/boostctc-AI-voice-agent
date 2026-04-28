# Analyzer — socratic_taste (Mode A)

## Objective

Capture the visitor's **actual reflection** in response to the Socratic prompt (`reflection_response`) and classify their **engagement** (`engagement_signal`) so the orchestrator can route to lead capture (interested), continue nurturing (neutral), or wrap up gracefully (declined).

---

## Fields to Extract

### reflection_response

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Their answer to the reflective question: steps they'd take, values, tradeoffs, hypotheticals, or an honest "I don't know" with any elaboration. |
| **Type** | `string` |
| **Interpretation** | Extract their thought or opinion in their own spirit. Paraphrase only for clarity; do not add ideas they did not imply. |
| **Validation** | Non-empty when they engaged with the question at any level. "I'd ask someone else" or "I'd double-check online" count as substantive. |
| **Examples** | Question about skeptical AI answers → "I'd verify with another source and ask how it knows." |
| **Do NOT extract if** | They refuse the exercise without content ("skip"), or say only "yes" to doing the exercise without answering yet. |

### engagement_signal

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Clear intent toward next step after the taste, or hesitation, or refusal. |
| **Type** | `enum`: `interested` \| `neutral` \| `declined` \| `unknown` |
| **Interpretation** | "Yes," "sure," "sounds great," "I'd love to," "sign me up," "let's do it," "how do I join" → `interested`. "Maybe," "I'll think about it," "not sure," "send me info later" → `neutral`. "No thanks," "not now," "not interested," "I'm good" (closing) → `declined`. Has not yet responded to the coaching beat → `unknown`. |
| **Validation** | Exactly one enum value. If mixed signals, prefer the **latest** explicit stance. |
| **Examples** | "Sounds cool but I need time" → `neutral`. "This is exactly what I want, sign me up" → `interested`. |
| **Do NOT extract if** | They have not yet responded; wait — do not default to `neutral` without some signal. |

---

## Routing Rules (MANDATORY — set these whenever engagement_signal is known)

These rules fire **immediately** the moment `engagement_signal` becomes non-null and non-unknown. Do not wait for additional turns.

| engagement_signal | phase_suggestion | required_complete |
|---|---|---|
| `interested` | `lead_capture` | `true` |
| `declined` | `engagement_wrapup` | `true` |
| `neutral` | *(leave null)* | `false` |
| `unknown` | *(leave null)* | `false` |

**Affirmatives that mean `interested`:** "yes," "yeah," "sure," "absolutely," "definitely," "sounds good," "let's do it," "sign me up," "I'm in," or any clear agreement to the setup/signup ask.

**CRITICAL:** If the speaker has already delivered the closing pitch ("Should I get you set up?" or similar) AND the user responds with any affirmative, IMMEDIATELY set `engagement_signal: interested`, `phase_suggestion: lead_capture`, and `required_complete: true`. Do NOT wait for `reflection_response` to be non-null — the exercise already happened in prior turns.

---

## Edge Cases

- **They answer the reflection but do not state next-step intent:** Set `reflection_response`; leave `engagement_signal: unknown` until they react to the follow-up invitation.
- **Very short answers:** Still capture as `reflection_response` if substantive; "I don't know" alone can count with low specificity.
- **They say "yes" to the exercise question without answering yet:** Set `engagement_signal: interested` but keep `reflection_response: null`.

---

## Completion

**Phase complete** (`required_complete: true`) when `engagement_signal` is `interested` or `declined`. Do not require `reflection_response` to be non-null if the user has already moved past the exercise and is responding to the signup ask.
