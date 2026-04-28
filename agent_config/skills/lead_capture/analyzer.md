# Analyzer — lead_capture (Mode A)

## Objective

Extract **name** and **email** for follow-up so BoostCTC can onboard the visitor. Both are required for phase completion. Role is optional — if volunteered, capture it, but do NOT block completion on it.

---

## Fields to Extract

### user_name (REQUIRED)

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Introductions: "I'm Sam," "name's Jordan Lee," "call me Dr. Patel," spelled-out names. |
| **Type** | `string` |
| **Interpretation** | Store **first name** or **full name** exactly as they stated preference; if they give full name, keeping full name is fine. |
| **Validation** | Non-empty; reasonable human name or chosen identifier; not an email alone, not pure gibberish unless they insist and it's clearly their handle (then capture as stated). |
| **Examples** | "Alex" → "Alex." "Maria Gonzales" → "Maria Gonzales." |
| **Do NOT extract if** | They have not provided a name; `null`. |

### user_email (REQUIRED)

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Email patterns, "at" spelled out, "dot com," dictation-style fragments that clearly form an address. |
| **Type** | `string` |
| **Interpretation** | Normalize to standard email form when obvious (e.g. "name at gmail dot com" → `name@gmail.com`). |
| **Validation** | Must contain **`@`** and a **domain** (e.g. `something@domain.tld`). Reject incomplete strings missing domain. |
| **Examples** | `learner@school.edu` → valid. |
| **Do NOT extract if** | Invalid or incomplete; `null`. |

### user_role (OPTIONAL — do not block completion)

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Job title, "I'm a teacher," "parent," "engineer," "HR," or **interest area** if they describe that instead of a title. |
| **Type** | `string` |
| **Interpretation** | Short label capturing how to contextualize them for follow-up. Only extract if freely volunteered. |
| **Validation** | Non-empty meaningful descriptor. |
| **Do NOT extract if** | No signal yet; `null`. Do NOT prompt or wait for this field. |

---

## Cross-Phase Detection

- After **user_name** and **user_email** are both valid, phase is COMPLETE. The orchestrator will advance.
- If user aborts ("I don't want to share email"), do not fake fields; set completion false and note privacy objection.

---

## Edge Cases

- **Nickname vs legal name:** Capture what they offer for `user_name`.
- **Shared inbox / school email:** Still valid if well-formed.
- **They give email before name:** Extract in any order; completion requires both name and email.

---

## Completion

**Phase complete** when **both** `user_name` and `user_email` are **non-null** and pass **Validation**. `user_role` is a bonus — capture if offered but never block on it.
