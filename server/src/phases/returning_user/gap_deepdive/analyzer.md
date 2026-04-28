# Analyzer — gap_deepdive (Mode B)

## Objective

Extract the user's own explanation of *why* a skill gap exists (`gap_context`) and *when/where* it shows up in their life (`gap_scenario`). These fields power the personalized recommendation in `personalized_nudge`.

---

## Fields to Extract

### gap_context

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Any explanation of why they find the identified gap challenging: beliefs ("I overthink"), habits ("I procrastinate"), environment ("no one at work gives feedback"), or patterns ("I know the answer but can't find the words"). |
| **Type** | `string` |
| **Interpretation** | Paraphrase in 1–2 clauses in their own framing. Capture the root they name, not just a restatement of the gap itself. |
| **Examples** | "It's not that I don't know — I just freeze under pressure" → "Freezes under pressure despite knowing the material". "I never get feedback so I don't know if I'm improving" → "Lacks feedback loops to track improvement". |
| **Agreement inference (IMPORTANT):** | If the speaker's previous turn offered a summary or interpretation (e.g., "It sounds like this is more about a general feeling of uncertainty...") and the user **agrees** ("yeah," "pretty much," "sort of," "I guess," "that's right," "yeah exactly," "mhm"), treat the speaker's summary as the `gap_context`. Capture it in plain language: "General feeling of uncertainty, not tied to specific situations." This IS a valid gap_context — do not keep `null` just because the user only said "yeah." |
| **Do NOT extract if** | They only say "I don't know" with zero preceding speaker summary to agree with. Keep `null` and let the speaker probe more. |

### gap_scenario

| Aspect | Guidance |
|--------|----------|
| **What to look for** | A specific setting, role, task, or moment where the gap becomes visible or painful: "in team meetings," "when writing performance reviews," "when I have to explain my reasoning to my manager," "in interviews," "when students push back on me." |
| **Type** | `string` |
| **Interpretation** | Short descriptive phrase. Even a vague context ("at work," "in school") is valid and extractable. |
| **Examples** | "I freeze when my boss asks me to explain my decisions on the spot" → "When explaining decisions to manager on the spot". "Mostly when I'm writing anything long" → "Writing long-form content". |
| **Inference rule:** | If they give a context implicitly (e.g., "I'm a developer so I don't do much presenting") → infer `gap_scenario: "low-presenting technical environment"`. If they mention a role ("I'm a team lead"), use that as context. |
| **Do NOT extract if** | No situational signal at all. Keep `null` until they provide one. |

---

## Early Completion

If the user answers both "why" and "when" in a single turn, set **both** fields immediately and mark `required_complete: true`. Do not ask for what you already have.

If the user has already given a specific scenario (from `performance_review` conversation history), extract it retroactively into `gap_scenario` now.

---

## Completion

**Phase complete** when `gap_context` is **non-null**. (`gap_scenario` is strongly preferred but not strictly required — if the user gives a clear "why" but no specific situation, the phase can still complete after `max_turns`.)
