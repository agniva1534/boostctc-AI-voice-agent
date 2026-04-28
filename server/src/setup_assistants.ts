/**
 * One-off script: creates both Vapi assistants pointing at our custom-LLM server.
 * Run with: npm run setup:vapi
 *
 * Prints the two assistant IDs to paste into:
 *   - widget/new.html
 *   - widget/returning.html
 *   - .env (VAPI_ASSISTANT_NEW_ID, VAPI_ASSISTANT_RETURNING_ID)
 */

import "dotenv/config";
import { env } from "./config.js";
import {
  NEW_VISITOR_FIRST_MESSAGE,
  RETURNING_USER_FIRST_MESSAGE,
} from "./state.js";

const VAPI_API = "https://api.vapi.ai";

async function createAssistant(payload: object): Promise<{ id: string; name: string }> {
  const resp = await fetch(`${VAPI_API}/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.vapiPrivateKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Vapi API error ${resp.status}: ${err}`);
  }
  return resp.json() as Promise<{ id: string; name: string }>;
}

const customLlmUrl = `${env.vapiServerUrl}/v1/chat/completions`;

const sharedConfig = {
  voice: {
    provider: "vapi",
    voiceId: "Emma",
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 600,
  backgroundSound: "off",
  backchannelingEnabled: false,
};

const newVisitorPayload = {
  name: "BoostCTC — Mira (New Visitor)",
  firstMessage: NEW_VISITOR_FIRST_MESSAGE,
  model: {
    provider: "custom-llm",
    url: customLlmUrl,
    model: "gpt-4o",
  },
  ...sharedConfig,
};

const returningUserPayload = {
  name: "BoostCTC — Mira (Returning User)",
  firstMessage: RETURNING_USER_FIRST_MESSAGE,
  model: {
    provider: "custom-llm",
    url: customLlmUrl,
    model: "gpt-4o",
  },
  ...sharedConfig,
};

async function main() {
  if (!env.vapiPrivateKey || env.vapiPrivateKey === "your-vapi-private-key-here") {
    console.error("ERROR: Set VAPI_PRIVATE_KEY in .env");
    process.exit(1);
  }
  if (!env.vapiServerUrl || env.vapiServerUrl.includes("your-ngrok")) {
    console.error("ERROR: Set VAPI_SERVER_URL in .env (your ngrok URL)");
    process.exit(1);
  }

  console.log(`Creating assistants pointing at: ${customLlmUrl}\n`);

  const [newAssistant, returningAssistant] = await Promise.all([
    createAssistant(newVisitorPayload),
    createAssistant(returningUserPayload),
  ]);

  console.log("=".repeat(60));
  console.log("  SETUP COMPLETE");
  console.log("=".repeat(60));
  console.log(`\n  New Visitor Assistant ID:    ${newAssistant.id}`);
  console.log(`  Returning User Assistant ID: ${returningAssistant.id}`);
  console.log(`\nAdd to .env:`);
  console.log(`  VAPI_ASSISTANT_NEW_ID=${newAssistant.id}`);
  console.log(`  VAPI_ASSISTANT_RETURNING_ID=${returningAssistant.id}`);
  console.log(`\nThen update widget/new.html and widget/returning.html with these IDs.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
