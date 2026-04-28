# Analyzer — personalized_nudge (Mode B)

## Objective

Determine whether the user accepts the coaching nudge and capture a concrete **next-action commitment** so the phase can close with clarity.

---

## Fields to Extract

### nudge_accepted

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Clear acceptance or decline of doing something now or soon. |
| **Type** | `boolean` |
| **Interpretation** | `true` for agreement: e.g. “yes,” “yeah,” “yep,” “sure,” “ok,” “okay,” “let’s do it,” “let’s go,” “sounds good,” “I’m in,” “definitely,” “for sure.” `false` for decline or deferral: e.g. “no,” “not now,” “maybe later,” “not today,” “I can’t right now,” “I’ll pass.” |
| **Validation** | Must be `true` or `false`. If they are ambiguous (“maybe,” “I don’t know”), leave as `null` until they clarify or give a stronger signal in a follow-up turn. |
| **Examples** | “Sure, I’ll try a passage” → `true`. “Not right now” → `false`. |
| **Do NOT guess** | Do not flip to `true` on silence or unrelated topic. |

### next_action_commitment

| Aspect | Guidance |
|--------|----------|
| **What to look for** | What they will do next, even if small: try a passage, focus on critical thinking, do MCQs, commit to ten minutes, come back tomorrow, etc. |
| **Type** | `string` |
| **Interpretation** | Short paraphrase of their plan or stance in their own framing. |
| **Validation** | Non-empty after trimming. |
| **Examples** | “I’ll try a passage” → extract that. “I’ll focus on critical thinking today” → extract that. If they **decline** the nudge, capture the deferral as the commitment: e.g. “Will come back later” or “Not doing a session today” so the field remains non-empty when completing. |
| **Do NOT extract if** | No statement of intent at all; use `null` until they answer. |

---

## Cross-Phase Detection

- This phase has **no** forward targets in the registry; keep `phase_suggestion` aligned with orchestrator wrap-up rules (typically **stay** until complete, then conversation may end).

---

## Edge Cases

- **Accept without specifics:** Ask one brief clarifying question in the speaker; keep `next_action_commitment` `null` until they name something concrete or agree to a default you offered (“a quick passage”) with confirmation.
- **Decline but vague:** Still set `nudge_accepted` to `false` and set `next_action_commitment` from their deferral language.
- **Changes mind mid-phase:** Prefer the **latest** explicit boolean and commitment.

---

## Completion

**Phase complete** when **both** `nudge_accepted` and `next_action_commitment` are **non-null** and valid per the rules above.

Until then, `required_complete` should be **false** and the speaker should seek a micro-commitment or a clear deferral.
