# Analyzer — value_exploration (Mode A)

## Objective

Capture which BoostCTC capability resonates most (`interest_area`) and what specifically clicked for the visitor (`resonance_point`), so the speaker can personalize the pitch and the flow can move into a live Socratic taste when they are ready.

---

## Fields to Extract

### interest_area

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Stated or implied focus: AI, thinking, communication, leadership, or a desire for everything. |
| **Type** | `enum`: `ai_literacy` \| `critical_thinking` \| `communication` \| `leadership` \| `all` |
| **Interpretation** | "AI," "prompting," "using AI tools," "AI literacy" → `ai_literacy`. "Thinking," "analysis," "evaluating arguments," "reasoning," "problem solving" → `critical_thinking`. "Speaking," "writing," "presenting," "explaining ideas," "interviews," "meetings," "expression" → `communication`. "Leading," "managing," "influence," "executive presence," "soft skills" → `leadership`. "Everything," "all of it," "the whole package," "general skills" → `all`. |
| **Validation** | Exactly one enum value. If two areas tie, pick the **primary** one they emphasized first; if truly equal, prefer the more specific over `all`. |
| **Examples** | "I want to get better at presenting" → `communication`. "AI stuff for my classroom" → `ai_literacy`. "I struggle with interviews" → `communication`. |
| **Do NOT extract if** | No skill angle yet; leave `null`. |

### resonance_point

| Aspect | Guidance |
|--------|----------|
| **What to look for** | A moment where the **user** explicitly reacts positively to a specific BoostCTC concept: daily practice, AI feedback loop, continuous progress tracking, Socratic coaching, or the "contributor to CEO" arc. |
| **Type** | `string` |
| **Interpretation** | Short phrase capturing what the user said they liked — must be anchored in the user's own words, not inferred from the speaker's description. |
| **Validation** | Non-empty; must quote or closely paraphrase the user's positive reaction to a feature. |
| **Examples** | "The daily practice idea resonates" → "Daily practice rhythm." "Love the AI feedback concept" → "Instant AI feedback loop." "That career path story clicked" → "Contributor-to-CEO arc." |
| **Do NOT extract if** | The user only describes their **own pain point or problem** (e.g., "I can't explain clearly under pressure"). That is a pain point, NOT a resonance point — keep `null` and let the speaker explain BoostCTC's solution before expecting a positive reaction. |
| **Do NOT infer** | Do not infer `resonance_point` from the speaker's last message. The user must have explicitly said something positive about a BoostCTC feature in their own words. If the speaker said "daily practice helps" and the user only described their problem, `resonance_point` stays `null`. |

---

## Cross-Phase Detection — HIGHEST PRIORITY

These rules fire BEFORE checking required fields. Set them immediately and do NOT wait for `interest_area` or `resonance_point` to be filled.

### Rule A — User agrees to try the Socratic exercise (most common loop cause)

If the **immediately preceding speaker turn** (the LAST assistant message in conversation history) was a **direct invitation to try the exercise** — specifically phrases like "curious about trying," "give you a quick taste," "want to give it a try," "want me to walk you through one," "ready to give it a shot," "want to try it?" — AND the user responds with **any affirmative**:

Do NOT fire this rule if the speaker only mentioned "Socratic method" or "Socratic coaching" as part of a general description without asking the user to try it right now.

- "yes," "yeah," "yep," "sure," "ok," "okay," "sounds good," "why not," "let's do it," "absolutely," "definitely," "go for it," "I'm ready," or any one-word agreement

Then IMMEDIATELY:
1. Set `phase_suggestion: "socratic_taste"`
2. Set `required_complete: true`
3. If `interest_area` is still `null`, set it to `"all"` (default)
4. If `resonance_point` is still `null`, set it to `"interested in trying the Socratic method"`

**This rule must fire even if the user's response is only one word. Do NOT wait for more information.**

### Rule B — User self-initiates

If the user asks **how to sign up**, **whether they can try it**, **free trial**, **get started**, or expresses any intent to begin, set `phase_suggestion: "socratic_taste"` and `required_complete: true`. Apply the same `interest_area` / `resonance_point` defaults above.

---

## Edge Cases

- **Educator vs parent vs professional:** `interest_area` is about **skill theme**, not audience label.
- **They ask FAQ-only questions:** Extract resonance only if they express what landed; otherwise leave fields null.
- **They want everything:** Map `interest_area` to `all` and capture their words in `resonance_point`.

---

## Completion

**Phase complete** when **both** `interest_area` and `resonance_point` are **non-null** and valid, OR when `phase_suggestion: "socratic_taste"` is set via the cross-phase rules above.
