# Analyzer — engagement_wrapup (Mode A)

## Objective

Detect that the visitor has **acknowledged** a graceful closing turn so the session can end cleanly without assuming prolonged dialogue.

---

## Fields to Extract

### farewell_acknowledged

| Aspect | Guidance |
|--------|----------|
| **What to look for** | **Any** post-closing response: “yes,” “ok,” “okay,” “bye,” “thanks,” “thank you,” “sounds good,” “got it,” “see you,” “appreciate it,” laughter, short affirmations, or another brief reply after the assistant’s wrap-up. |
| **Type** | `boolean` |
| **Interpretation** | If the user produces **any** substantive turn that acknowledges the goodbye or thanks — including minimal words — set **`true`**. |
| **Validation** | Boolean only. |
| **Examples** | “Bye!” → `true`. “Thanks, talk later” → `true`. Silence / empty message → `false` if your pipeline treats non-response as false. |
| **Do NOT extract if** | N/A for boolean; use `false` when there is **no** user response or the message is unrelated noise with no acknowledgment (per orchestrator policy). |

---

## Cross-Phase Detection

- This phase is typically **terminal**. Phase suggestion should be **`stay`** or **`end`** per registry — **do not** advance to sales phases after a firm goodbye unless the user **reopens** intent (orchestrator may restart engagement).

---

## Edge Cases

- **They ask a new question after goodbye:** `farewell_acknowledged` may still be `true` for the prior beat; orchestrator may reopen an earlier phase — note **new intent** in analyzer notes for routing.
- **Only emoji or “👍”:** Treat as acknowledgment → `true` if your pipeline accepts it.
- **They say nothing:** `false` if the schema requires explicit user turn; otherwise follow product convention for timeout.

---

## Completion

**Phase complete** when `farewell_acknowledged` is **`true`** **or** when the product defines completion as assistant-delivered final message only. Align `required_complete` with your orchestrator: if acknowledgment is required, completion requires **`true`**.
