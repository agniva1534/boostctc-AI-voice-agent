/**
 * leads.ts — Append captured leads to a CSV file.
 *
 * File: server/data/leads.csv
 * Columns: timestamp, call_id, name, email, career_stage, interest_area,
 *           resonance_point, reflection_response
 */

import { appendFile, writeFile, access } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const LEADS_FILE = resolve(__dirname, "../../data/leads.csv");

const CSV_HEADER =
  "timestamp,call_id,name,email,career_stage,interest_area,resonance_point,reflection_response\n";

function esc(val: string | null | undefined): string {
  const s = (val ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

async function ensureFile() {
  try {
    await access(LEADS_FILE);
  } catch {
    // File doesn't exist — create it with header
    await writeFile(LEADS_FILE, CSV_HEADER, "utf8");
  }
}

export interface LeadRecord {
  call_id: string;
  name: string;
  email: string;
  career_stage?: string | null;
  interest_area?: string | null;
  resonance_point?: string | null;
  reflection_response?: string | null;
}

export async function saveLead(lead: LeadRecord): Promise<void> {
  await ensureFile();

  const row = [
    esc(new Date().toISOString()),
    esc(lead.call_id),
    esc(lead.name),
    esc(lead.email),
    esc(lead.career_stage),
    esc(lead.interest_area),
    esc(lead.resonance_point),
    esc(lead.reflection_response),
  ].join(",") + "\n";

  await appendFile(LEADS_FILE, row, "utf8");
  console.log(`[Leads] Saved: ${lead.name} <${lead.email}>`);
}
