# Analyzer — performance_review (Mode B)

## Objective

Capture the user’s own read on their progress and classify their biggest growth opportunity into a single gap category for the next phase. Stay aligned with dashboard metrics in context, but **do not** compute “lowest metric” here — that is for the speaker when coaching.

---

## Fields to Extract

### self_assessment

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Opinions, feelings, or summaries about how they’re doing: proud, frustrated, surprised, “could be better,” “doing fine,” what feels hard, what they want to improve, whether numbers match how they feel. |
| **Type** | `string` |
| **Interpretation** | Short paraphrase of their take in natural language (one or two clauses). |
| **Validation** | Non-empty after trimming; must reflect their stated view, not only repeating your last question. |
| **Examples** | “I thought I’d be higher on quizzes” → capture that. “Communication feels easier than analysis” → capture that contrast. |
| **Do NOT extract if** | They only restate your numbers with no opinion; wait for a reflective answer or follow the speaker’s next prompt. |

### identified_gap

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Where they believe they need the most growth, or where they agree the biggest opportunity is after you reflect their words back. |
| **Type** | `enum`: `critical_thinking` \| `communication` \| `consistency` \| `mcq_accuracy` \| `overall` |
| **Interpretation** | Map from user language (see table below). If they name multiple areas, pick the **single** area they emphasize as biggest opportunity; if tied, prefer the one they mention last or stress most. |
| **Validation** | Must be exactly one of the five enum values. |
| **Examples** | “My analysis is weak” → `critical_thinking`. “I ramble in written responses” → `communication`. “I don’t practice enough” / “I’m irregular” → `consistency`. “I miss MCQs” / “quiz scores” → `mcq_accuracy`. “Everything” / “all of it” / “overall” → `overall`. |
| **Do NOT extract if** | No usable signal; use `null` rather than guess. |

**Mapping cheat sheet**

| User language (examples) | Enum value |
|--------------------------|------------|
| Thinking, analysis, reasoning, depth, “figuring out why,” argumentation | `critical_thinking` |
| Writing, speaking, expressing, clarity, tone, structure | `communication` |
| Consistent, regular, showing up, habit, streak, routine, time on task | `consistency` |
| Quizzes, MCQ, multiple choice, accuracy, test-style items | `mcq_accuracy` |
| Everything, all areas, general, not sure which single area | `overall` |

**Inference rule (system behavior):** If the user **cannot** name a gap, **metric comparison and “lowest area” suggestion are performed in the speaker turn**, not in this analyzer. After the assistant has **directly suggested** a gap based on scores (per speaker skill), you may set `identified_gap` to that same category when the user **clearly agrees** (e.g. “yeah,” “that sounds right,” “probably,” “I guess so,” “makes sense”) without contradicting.

---

## Cross-Phase Detection

- None specific for this phase; normal advance is to **`personalized_nudge`** when completion criteria are met.

---

## Edge Cases

- **User disagrees with your suggested gap:** Do not force the old enum; update `identified_gap` to the area they argue for if it fits the mapping.
- **Vague “I need to work harder”:** Treat as `consistency` only if they tie it to showing up or routine; otherwise leave `identified_gap` `null` until clarified.
- **Contradictory statements:** Prefer their **most recent** clear statement and lower confidence in `notes`.

---

## Completion

**Phase complete** when **both** `self_assessment` and `identified_gap` are **non-null** and valid per the rules above.

Until then, `required_complete` should be **false** and the speaker should continue the Socratic → directive strategy as defined in the speaker skill.
