# Analyzer — engagement_greeting (Mode A)

## Objective

Interpret the visitor's turns and extract why they came to BoostCTC (`visitor_context`) and where they are in their journey (`career_stage`). Decide when value exploration should begin.

---

## Fields to Extract

### visitor_context

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Phrases that explain motivation or entry point: "looking for," "heard about," "interested in," "my kid needs," "want to improve," "trying to help my child," "need something for," "exploring," "here for myself." |
| **Type** | `string` |
| **Interpretation** | A short paraphrase of what brought them — one clause or sentence. Capture the user's own framing when possible. |
| **Validation** | Non-empty string that reflects their stated reason or interest. |
| **Examples** | "I'm here for myself" → "here for themselves, personal growth." "I want to get better at interviews" → "wants to improve at interviews." "Heard about you from a colleague" → "heard about BoostCTC from a colleague." |
| **Do NOT extract if** | The user only greets ("hi," "hello") with no context. Leave `null` until they explain. |

### career_stage

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Explicit or implied life/work stage. |
| **Type** | `enum`: `early` \| `mid` \| `senior` \| `student` \| `parent` \| `unknown` |
| **Interpretation** | "just starting out," "first job," "new to the workforce," "entry level" → `early`. "few years in," "mid-level," "been at it a while," "manager" → `mid`. "director," "VP," "C-suite," "executive," "leading teams for years" → `senior`. "in school," "college," "student," "class" → `student`. "my child," "son," "daughter," "kid," "for my kid" → `parent`. No usable signal → `unknown`. |
| **Validation** | Must be exactly one of the six enum values. If multiple apply, prefer the most specific. |
| **Examples** | "I'm a software engineer about two years in" → `early`. "Here for my daughter" → `parent`. "I'm in 10th grade" → `student`. "Myself" alone → `unknown`. |
| **Do NOT extract if** | No usable signal; set `null` rather than guess. |

---

## Cross-Phase Detection

- If the user mentions **specific exercises**, **daily practice**, **dashboard**, **progress tracking**, or **AI feedback** in a product sense, set `phase_suggestion` to `value_exploration` so the flow can deepen.
- Otherwise keep `phase_suggestion` null until completion.

---

## Edge Cases

- **Multiple reasons:** Concatenate or summarize into one coherent `visitor_context` string.
- **"Myself" alone:** Extract `visitor_context` as "here for themselves" and `career_stage` as `unknown` — this counts as complete.
- **Parent who is also a professional:** If primary intent is the child, use `parent`.
- **Non-English or fragments:** Extract only what is clear; leave fields `null` if unclear.

---

## Completion

**Phase complete** when **both** `visitor_context` and `career_stage` are **non-null** and valid. `career_stage: "unknown"` with a populated `visitor_context` counts as complete.

Until then, `required_complete` should be `false` and the speaker should continue to elicit missing pieces naturally.
