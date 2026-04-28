# Analyzer — value_exploration (Mode A)

## Objective

Capture which BoostCTC capability resonates most and **what specifically clicked** for the visitor, so the speaker can personalize the “Contributor to CEO” story, methodology, and Socratic Guide— and so the flow can move into a live **Socratic taste** when they are ready to try it.

---

## Fields to Extract

### interest_area

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Stated or implied focus: AI, thinking, communication, leadership, or a desire for everything. |
| **Type** | `enum`: `ai_literacy` \| `critical_thinking` \| `communication` \| `leadership` \| `all` |
| **Interpretation** | “AI,” “prompting,” “using tools responsibly,” “AI literacy” → `ai_literacy`. “Thinking,” “analysis,” “evaluating arguments,” “not trusting answers blindly” → `critical_thinking`. “Speaking,” “writing,” “presenting,” “explaining ideas” → `communication`. “Leading,” “managing,” “influence,” “executive presence” → `leadership`. “Everything,” “all of it,” “the whole package,” “general skills” → `all`. |
| **Validation** | Exactly one enum value. If two areas tie, pick the **primary** one they emphasized first; if truly equal, prefer the more specific over `all`. |
| **Examples** | “I want to get better at presenting” → `communication`. “AI stuff for my classroom” → `ai_literacy`. |
| **Do NOT extract if** | No skill angle yet; leave `null`. |

### resonance_point

| Aspect | Guidance |
|--------|----------|
| **What to look for** | The **specific** hook: a feature name, the career path story, daily practice, AI feedback, continuous progress, Socratic coaching, “contributor to CEO,” or another concrete element they reacted to. |
| **Type** | `string` |
| **Interpretation** | Short phrase or sentence capturing **what clicked** — not a full recap of the whole chat. |
| **Validation** | Non-empty after trim; must map to something they actually said or clearly agreed with. |
| **Examples** | “The daily practice idea resonates” → “Daily practice rhythm.” “Love the CEO path story” → “Contributor-to-CEO career story.” |
| **Do NOT extract if** | They only nod vaguely (“sounds good”) with no identifiable hook; wait or set `null`. |

---

## Cross-Phase Detection

- If the user asks **how to sign up**, **whether they can try it**, **free trial**, **get started**, **create an account**, or similar intent to begin, set `phase_suggestion` to **`socratic_taste`** (or your registry’s id) so they can experience the method before lead capture when the product flow allows.

---

## Edge Cases

- **Educator vs parent vs professional:** `interest_area` is about **skill theme**, not audience label; audience may appear in `resonance_point` if they cite “for my students” etc.
- **They ask FAQ-only questions:** Extract resonance only if they express what landed; otherwise leave fields null and note FAQ handling for RAG/orchestrator.
- **They want everything:** Map `interest_area` to `all` and capture their words in `resonance_point` if they explain why.

---

## Completion

**Phase complete** when **both** `interest_area` and `resonance_point` are **non-null** and valid.
