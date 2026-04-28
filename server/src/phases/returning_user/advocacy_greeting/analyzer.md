# Analyzer — advocacy_greeting (Mode B)

## Objective

Detect that the returning user has acknowledged the welcome-back greeting so the flow can move on to performance review.

---

## Fields to Extract

### return_acknowledged

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Any acknowledgment of the welcome back: "hey," "hi," "thanks," "yeah," "yep," "good," "great," "mhm," "ok," "okay," "cool," "nice," or similar brief affirmation. |
| **Type** | `boolean` |
| **Interpretation** | `true` if there is any such acknowledgment, even one word. `false` only when the user says nothing responsive or is silent. |
| **Validation** | Explicitly `true` or `false`. Use `true` liberally for any clear acknowledgment. |
| **Examples** | "Hey!" → `true`. "Thanks, good to be back" → `true`. "Mhm" → `true`. |
| **Do NOT set true if** | The message is purely a question with zero greeting — still extract per cross-phase rules and keep `return_acknowledged` false until they acknowledge. |

---

## Decline Detection (HIGHEST PRIORITY)

If the user's message contains **any clear refusal or statement of unavailability** — "no," "nope," "not now," "busy," "can't," "not a good time," "later," "maybe later," "I gotta go," "I'm in a meeting," "heading out" — then:

1. Set `return_acknowledged: true` (marks this phase complete so the graph can transition).
2. Set `phase_suggestion: "engagement_wrapup"`.

This takes priority over all other extraction. Do **not** set `performance_review` as the suggestion in this case.

---

## Cross-Phase Detection

- If the user **immediately** asks about **scores**, **progress**, **stats**, **dashboard**, **streak**, **time spent**, or **passages** in the first substantive turn, set `phase_suggestion` to `performance_review` and also set `return_acknowledged: true`.
- If they say "Hi — what's my score?" treat as acknowledgment **and** jump to performance_review.

---

## Completion

**Phase complete** when `return_acknowledged` is `true`.
