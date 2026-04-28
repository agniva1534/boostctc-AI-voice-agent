# Analyzer — performance_review (Mode B)

## Objective

Capture the user's own read on their progress (`self_assessment`) and classify their biggest growth opportunity (`identified_gap`) so the next phase can give a targeted recommendation.

---

## Fields to Extract

### self_assessment

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Opinions, feelings, or summaries about how they're doing: proud, frustrated, surprised, "could be better," what feels hard, what they want to improve, whether numbers match how they feel. |
| **Type** | `string` |
| **Interpretation** | Short paraphrase of their take in natural language (one or two clauses). |
| **Validation** | Non-empty; must reflect their stated view, not only repeating your last question. |
| **Examples** | "I thought I'd be higher on quizzes" → capture that. "Communication feels easier than analysis" → capture that contrast. |
| **Inference rule:** | If the user says "yeah," "that sounds right," "probably," "makes sense," "I agree," or any agreement when the speaker just named a specific gap area — treat the agreement itself as the self-assessment. Capture it as: "Agrees that [gap area] is their biggest opportunity." Do NOT keep `self_assessment` null just because they responded with a single-word affirmative. |
| **Do NOT extract if** | They say nothing responsive or give a pure yes/no with zero context AND no gap was named by the speaker. |

### identified_gap

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Where they believe they need the most growth, or where they agree the biggest opportunity is. |
| **Type** | `enum`: `critical_thinking` \| `communication` \| `consistency` \| `mcq_accuracy` \| `overall` |
| **Interpretation** | Map from user language. If they name multiple areas, pick the **single** one they emphasize most. |
| **Validation** | Exactly one of the five enum values. |
| **Mapping:** | "Thinking, analysis, reasoning, depth" → `critical_thinking`. "Writing, speaking, expressing, clarity, tone" → `communication`. "Consistent, regular, habit, streak, routine" → `consistency`. "Quizzes, MCQ, accuracy" → `mcq_accuracy`. "Everything, all areas, general" → `overall`. |
| **Inference rule:** | If the user **agrees** when the speaker suggests a gap based on lowest scores ("yeah," "that sounds right," "probably," "makes sense"), set `identified_gap` to that category. |
| **Do NOT extract if** | No usable signal; use `null` rather than guess. |

---

## Completion

**Phase complete** when **both** `self_assessment` and `identified_gap` are **non-null** and valid.
