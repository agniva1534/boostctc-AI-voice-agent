# Analyzer — socratic_taste (Mode A)

## Objective

Capture the visitor’s **actual reflection** in response to a Socratic prompt and classify **engagement** so the orchestrator can route to **lead capture** (interested), continue nurturing (neutral), or **wrap up** gracefully (declined).

---

## Fields to Extract

### reflection_response

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Their answer to the reflective question: steps they’d take, values, tradeoffs, hypotheticals, or honest “I don’t know” with any elaboration. |
| **Type** | `string` |
| **Interpretation** | Extract their **thought or opinion** in their own spirit — paraphrase only for clarity, do not add ideas they did not imply. |
| **Validation** | Non-empty when they engaged with the question at any level, including “I’d ask someone else” or “I’d double-check online” as substantive reflection. |
| **Examples** | Question about skeptical AI answers → “I’d verify with another source and ask how it knows.” |
| **Do NOT extract if** | They refuse the exercise without content (“skip”) — set `null` or minimal string per pipeline; note in edge handling. If they only say “yes” to *doing* the taste without answering yet, `reflection_response` may still be incomplete until they answer the Socratic prompt. |

### engagement_signal

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Clear intent toward next step after the taste, or hesitation, or refusal. |
| **Type** | `enum`: `interested` \| `neutral` \| `declined` |
| **Interpretation** | “Yes,” “sure,” “sounds great,” “I’d love to,” “sign me up,” “let’s do it,” “how do I join” → `interested`. “Maybe,” “I’ll think about it,” “not sure,” “need to talk to my spouse,” “send me info later” → `neutral`. “No thanks,” “not now,” “not interested,” “I’m good” (closing) → `declined`. |
| **Validation** | Exactly one enum value. If mixed signals, prefer the **latest** explicit stance. |
| **Examples** | “Sounds cool but I need time” → `neutral`. “This is exactly what I want, sign me up” → `interested`. |
| **Do NOT extract if** | They have not yet responded to the coaching beat after reflection; wait — do not default to `neutral` without some signal. |

---

## Cross-Phase Detection

- **`interested`:** Orchestrator should favor transition to **lead_capture** when product rules allow.
- **`declined`:** Favor **engagement_wrapup** or a soft exit path.
- **`neutral`:** May stay for one more light prompt or move to wrapup per registry; analyzer only signals the enum.

---

## Edge Cases

- **They answer the reflection but do not state next-step intent:** Set `reflection_response`; leave `engagement_signal` `null` until they react to the follow-up invitation **or** infer cautiously from tone if they already said “let’s sign up” in the same turn (then `interested`).
- **Very short answers:** Still capture as `reflection_response` if substantive; “I don’t know” alone can count with low specificity.
- **Hostile or off-topic:** Low confidence; minimal extraction; do not invent engagement.

---

## Completion

**Phase complete** when **both** `reflection_response` and `engagement_signal` are **non-null** and valid. If your pipeline treats “reflection only” as incomplete, keep `required_complete` false until `engagement_signal` is known.
