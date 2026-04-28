import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.resolve(__dirname, "..");

interface ValidationResult {
  file: string;
  status: "pass" | "fail";
  error?: string;
}

const results: ValidationResult[] = [];

function check(file: string, condition: boolean, errorMsg: string) {
  if (!condition) {
    results.push({ file, status: "fail", error: errorMsg });
  } else {
    results.push({ file, status: "pass" });
  }
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(CONFIG_DIR, relativePath));
}

function readJson(relativePath: string): any {
  const raw = fs.readFileSync(path.join(CONFIG_DIR, relativePath), "utf-8");
  return JSON.parse(raw);
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(CONFIG_DIR, relativePath), "utf-8");
}

// --- Validate state_schema.json ---
const SCHEMA_PATH = "state_schema.json";
check(SCHEMA_PATH, fileExists(SCHEMA_PATH), "state_schema.json not found");
try {
  const schema = readJson(SCHEMA_PATH);
  check(SCHEMA_PATH, !!schema.global_fields, "Missing global_fields");
  check(SCHEMA_PATH, !!schema.phases, "Missing phases");
  check(SCHEMA_PATH, !!schema.global_fields?.mode, "Missing mode field");
  const expectedPhases = [
    "engagement_greeting",
    "value_exploration",
    "socratic_taste",
    "lead_capture",
    "engagement_wrapup",
    "advocacy_greeting",
    "performance_review",
    "personalized_nudge",
  ];
  for (const p of expectedPhases) {
    check(SCHEMA_PATH, !!schema.phases[p], `Missing phase: ${p}`);
  }
} catch (e: any) {
  results.push({ file: SCHEMA_PATH, status: "fail", error: e.message });
}

// --- Validate phase_registry.json ---
const REGISTRY_PATH = "phase_registry.json";
check(REGISTRY_PATH, fileExists(REGISTRY_PATH), "phase_registry.json not found");
try {
  const registry = readJson(REGISTRY_PATH);
  check(REGISTRY_PATH, !!registry.phases, "Missing phases object");
  check(REGISTRY_PATH, !!registry.default_phase, "Missing default_phase");

  const phases = Object.keys(registry.phases);
  const expectedPhases = [
    "engagement_greeting",
    "value_exploration",
    "socratic_taste",
    "lead_capture",
    "engagement_wrapup",
    "advocacy_greeting",
    "performance_review",
    "personalized_nudge",
  ];
  for (const p of expectedPhases) {
    check(REGISTRY_PATH, phases.includes(p), `Missing phase: ${p}`);
  }

  for (const [name, phase] of Object.entries(registry.phases) as any[]) {
    check(REGISTRY_PATH, typeof phase.max_turns === "number", `${name}: missing max_turns`);
    check(REGISTRY_PATH, Array.isArray(phase.allowed_targets), `${name}: missing allowed_targets`);
  }
} catch (e: any) {
  results.push({ file: REGISTRY_PATH, status: "fail", error: e.message });
}

// --- Validate orchestrator_rules.md ---
const RULES_PATH = "orchestrator_rules.md";
check(RULES_PATH, fileExists(RULES_PATH), "orchestrator_rules.md not found");
try {
  const rules = readText(RULES_PATH);
  check(RULES_PATH, rules.includes("Transition Confidence"), "Missing Transition Confidence section");
  check(RULES_PATH, rules.includes("Fallback"), "Missing Fallback section");
  check(RULES_PATH, rules.includes("Error"), "Missing Error section");
} catch (e: any) {
  results.push({ file: RULES_PATH, status: "fail", error: e.message });
}

// --- Validate prompt templates ---
const TEMPLATES = [
  "prompts/analyzer_template.md",
  "prompts/speaker_template.md",
  "prompts/summary_template.md",
];
for (const t of TEMPLATES) {
  check(t, fileExists(t), `${t} not found`);
  try {
    const content = readText(t);
    check(t, content.length > 200, `${t} is too short (< 200 chars)`);
    if (t.includes("analyzer")) {
      check(t, content.includes("{{active_phase_name}}"), `${t}: missing {{active_phase_name}} placeholder`);
      check(t, content.includes("rag_context_needed"), `${t}: missing rag_context_needed field`);
    }
    if (t.includes("speaker")) {
      check(t, content.includes("{{active_phase_name}}"), `${t}: missing {{active_phase_name}} placeholder`);
      check(t, content.includes("3 sentences"), `${t}: missing brevity rule`);
    }
    if (t.includes("summary")) {
      check(t, content.includes("{{conversation_summary}}"), `${t}: missing {{conversation_summary}} placeholder`);
    }
  } catch (e: any) {
    results.push({ file: t, status: "fail", error: e.message });
  }
}

// --- Validate skill files ---
const SKILL_PHASES = [
  "engagement_greeting",
  "value_exploration",
  "socratic_taste",
  "lead_capture",
  "engagement_wrapup",
  "advocacy_greeting",
  "performance_review",
  "personalized_nudge",
];
for (const phase of SKILL_PHASES) {
  for (const file of ["analyzer.md", "speaker.md"]) {
    const skillPath = `skills/${phase}/${file}`;
    check(skillPath, fileExists(skillPath), `${skillPath} not found`);
    try {
      const content = readText(skillPath);
      check(skillPath, content.length > 100, `${skillPath} is too short (< 100 chars)`);
    } catch (e: any) {
      results.push({ file: skillPath, status: "fail", error: e.message });
    }
  }
}

// --- Report ---
const failures = results.filter((r) => r.status === "fail");
const passes = results.filter((r) => r.status === "pass");

console.log(`\n=== Config Validation ===`);
console.log(`Passed: ${passes.length}`);
console.log(`Failed: ${failures.length}`);

if (failures.length > 0) {
  console.log(`\nFailures:`);
  for (const f of failures) {
    console.log(`  FAIL  ${f.file}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log(`\nAll checks passed!`);
  process.exit(0);
}
