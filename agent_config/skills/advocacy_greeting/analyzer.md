# Analyzer — advocacy_greeting (Mode B)

## Objective

Detect that the returning user has acknowledged the welcome-back greeting so the flow can move on. Flag early exits when they jump straight to scores or progress so the orchestrator can skip ahead to the performance review.

---

## Fields to Extract

### return_acknowledged

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Any acknowledgment of the welcome back: greetings or backchannels such as “hey,” “hi,” “hello,” “thanks,” “thank you,” “yeah,” “yep,” “good,” “great,” “mhm,” “uh huh,” “ok,” “okay,” “cool,” “nice,” or similar brief affirmation that they heard you and are engaged. |
| **Type** | `boolean` |
| **Interpretation** | `true` if there is any such acknowledgment, even one word or a minimal vocal cue. |
| **Validation** | Must be explicitly `true` or `false`. Use `true` liberally for any clear acknowledgment; `false` only when the user says nothing responsive, changes topic without acknowledging, or is silent / unintelligible. |
| **Examples** | “Hey!” → `true`. “Thanks, good to be back” → `true`. “Mhm” → `true`. [User only asks a question with no ack] → `false` until they acknowledge in a later turn unless cross-phase rules apply. |
| **Do NOT set `true` if** | The message is purely a question about data with zero greeting or ack — still extract per cross-phase rules and keep `return_acknowledged` `false` if there is no welcome acknowledgment. |

---

## Cross-Phase Detection

- If the user **immediately** asks about **scores**, **progress**, **stats**, **how they’re doing**, **dashboard**, **numbers**, **grades**, **accuracy**, **streak**, **time spent**, or **passages** (in the first substantive turn or right after your greeting), set `phase_suggestion` to **`performance_review`** so the session can jump to the review phase while you still track `return_acknowledged` normally on subsequent turns if needed.
- Otherwise align `phase_suggestion` with orchestrator rules (typically stay until completion).

---

## Edge Cases

- **Acknowledgment bundled with a question:** If they say “Hi — what’s my score?” treat as acknowledgment (`return_acknowledged`: `true`) **and** set `phase_suggestion` to **`performance_review`** per cross-phase rules.
- **Only metrics question, no hi/thanks:** Still set `phase_suggestion` to **`performance_review`**; `return_acknowledged` is `false` unless they also include a normal ack.
- **Non-English or fragments:** If intent is clearly “yes / ok / thanks” in another language, `return_acknowledged` may be `true`; if unclear, `false` and note low confidence.

---

## Completion

**Phase complete** when **`return_acknowledged`** is **`true`**.

Until then, `required_complete` for this phase should be **false** and the speaker should keep the welcome warm and brief.
