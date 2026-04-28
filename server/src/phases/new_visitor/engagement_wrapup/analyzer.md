# Analyzer — engagement_wrapup (Mode A)

## Objective

Detect that the visitor has acknowledged the closing so the session can end cleanly.

---

## Fields to Extract

### farewell_acknowledged

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Any post-closing response: "yes," "ok," "bye," "thanks," "sounds good," "see you," "appreciate it," laughter, or brief affirmation. |
| **Type** | `boolean` |
| **Interpretation** | `true` if the user produces any substantive turn acknowledging the goodbye. |
| **Validation** | Boolean only. |
| **Examples** | "Bye!" → `true`. "Thanks, talk later" → `true`. Silence → `false`. |

---

## Cross-Phase Detection

This phase is terminal. Keep `phase_suggestion` null — do not advance to sales phases after a firm goodbye.

---

## Edge Cases

- **They ask a new question after goodbye:** `farewell_acknowledged` may be `true` for the prior beat; note new intent for routing.
- **They change their mind ("Actually I want to sign up"):** Set `farewell_acknowledged: true` and note intent to re-engage.

---

## Completion

**Phase complete** when `farewell_acknowledged` is `true`.
