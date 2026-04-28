# Analyzer — lead_capture (Mode A)

## Objective

Extract **name** and **email** for follow-up so BoostCTC can onboard the visitor.

---

## Fields to Extract

### user_name (REQUIRED)

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Introductions: "I'm Sam," "name's Jordan Lee," "call me Dr. Patel," spelled-out names. |
| **Type** | `string` |
| **Interpretation** | Store first name or full name exactly as they stated preference. |
| **Validation** | Non-empty; reasonable human name. |
| **Examples** | "Alex" → "Alex." "Maria Gonzales" → "Maria Gonzales." |
| **Do NOT extract if** | They have not provided a name; `null`. |

### user_email (REQUIRED)

| Aspect | Guidance |
|--------|----------|
| **What to look for** | Email patterns, "at" spelled out, "dot com," dictation-style fragments that clearly form an address. |
| **Type** | `string` |
| **Interpretation** | Normalize to standard email form (e.g. "name at gmail dot com" → `name@gmail.com`). |
| **Validation** | Must contain `@` and a domain (e.g. `something@domain.tld`). |
| **Examples** | `learner@school.edu` → valid. |
| **Do NOT extract if** | Invalid or incomplete; `null`. |

---

## Cross-Phase Detection

After **user_name** and **user_email** are both valid, phase is COMPLETE. The orchestrator will advance.

---

## Edge Cases

- **Nickname vs legal name:** Capture what they offer.
- **They give email before name:** Extract in any order; completion requires both.
- **They abort:** Set completion false; respect their decision.

---

## Completion

**Phase complete** when **both** `user_name` and `user_email` are **non-null** and pass validation.
