# Analyzer — personalized_nudge (Mode B)

## Objective

Determine whether the user accepts the coaching nudge (`nudge_accepted`) and capture a concrete next-action commitment (`next_action_commitment`) so the phase can close with clarity.

---

## Fields to Extract

### nudge_accepted

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Clear acceptance or decline of doing something now or soon. |
| **Type** | `boolean` |
| **Interpretation** | `true` for "yes," "yeah," "yep," "sure," "ok," "let's do it," "sounds good," "I'm in," "definitely." `false` for "no," "not now," "maybe later," "not today," "I can't right now," "I'll pass." |
| **Validation** | `true` or `false`. If ambiguous ("maybe"), leave `null` until they clarify. |

### next_action_commitment

| Aspect | Guidance |
|--------|----------|
| **What to look for** | What they will do next, even if small: try a passage, focus on critical thinking, do MCQs, commit to ten minutes, come back tomorrow. |
| **Type** | `string` |
| **Interpretation** | Short paraphrase of their plan in their own framing. If they **decline**, capture the deferral: "Will come back later" or "Not doing a session today." |
| **Validation** | Non-empty after trimming. |
| **Inference rule (IMPORTANT):** | If `nudge_accepted` is `true` but the user gave a bare affirmative ("yes," "yeah," "sure," "ok," "sounds good," "let's do it," "definitely") without naming a specific action, **infer** the commitment from `identified_gap`: `critical_thinking` → "will do a critical thinking passage today"; `communication` → "will try a communication exercise today"; `consistency` → "will do a 10-minute session today"; `mcq_accuracy` → "will do a focused MCQ session today"; `overall` → "will do a session today". Set `next_action_commitment` to the inferred string — do NOT leave it `null` in this case. |
| **Do NOT extract if** | No statement of intent AND `nudge_accepted` is still `null`; keep `null` until they answer. |

---

## Completion

**Phase complete** when **both** `nudge_accepted` and `next_action_commitment` are **non-null** and valid.
