# Analyzer — engagement_greeting (Mode A)

## Objective

Interpret the visitor’s first substantive turns and extract why they came to BoostCTC and where they are in their journey (career stage). Support a warm, tailored greeting phase and decide when value exploration should begin.

---

## Fields to Extract

### visitor_context

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Phrases that explain motivation or entry point: “looking for,” “heard about,” “interested in,” “my kid needs,” “want to improve,” “came across,” “saw you,” “trying to help my child,” “need something for,” “exploring options for.” |
| **Type** | `string` |
| **Interpretation** | A short paraphrase of what brought them (one clause or sentence). Capture the user’s own framing when possible. |
| **Validation** | Non-empty string after trimming; must reflect stated reason or interest, not generic filler alone. |
| **Examples** | “Looking for AI literacy for my team” → “Looking for AI literacy resources for their team.” “Heard about you from a colleague” → “Heard about BoostCTC from a colleague.” |
| **Do NOT extract if** | The user only greets (“hi,” “hello,” “hey”) or gives no reason yet. In that case set to `null` until they explain. |

### career_stage

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Explicit or implied life/work stage: early career, mid-career, senior roles, school/college, or parent speaking for a child. |
| **Type** | `enum`: `early` \| `mid` \| `senior` \| `student` \| `parent` |
| **Interpretation** | Map synonyms and implications: “just starting out,” “first job,” “new to the workforce” → `early`. “Few years in,” “mid-level,” “been at it a while” → `mid`. “Executive,” “director,” “VP,” “C-suite,” “leading teams for years” → `senior`. “In school,” “college,” “student,” “class” → `student`. “My child,” “son,” “daughter,” “kid,” “for my kid” → `parent`. |
| **Validation** | Must be exactly one of the five enum values. If multiple apply, prefer the most specific (e.g. parent over mid if they are clearly here for a child). |
| **Examples** | “I’m a teacher” without career length → infer `mid` only if they imply experience; if unclear, wait for clarification or use best single fit from context. “Here for my daughter” → `parent`. |
| **Do NOT extract if** | No usable signal; set `null` rather than guess from silence. |

---

## Cross-Phase Detection

- If the user mentions **specific exercises**, **daily practice**, **dashboard**, **progress tracking**, or **AI feedback** in a product sense, set `phase_suggestion` to **`value_exploration`** (or equivalent id your registry uses) so the flow can deepen into value.
- Otherwise keep the phase suggestion aligned with orchestrator rules until **Completion** is met.

---

## Edge Cases

- **Multiple reasons:** Concatenate or summarize into one coherent `visitor_context` string.
- **Vague “help with career”:** Still extract a minimal context string if they imply professional growth; note ambiguity in orchestrator notes if needed.
- **Parent who is also a professional:** If primary intent is the child, use `parent`.
- **Non-English or fragments:** Extract only what is clear; leave fields `null` if unclear.

---

## Completion

**Phase complete** when **both** `visitor_context` and `career_stage` are **non-null** and valid per the rules above.

Until then, `required_complete` for this phase should be **false** and the speaker should continue to elicit missing pieces naturally.
