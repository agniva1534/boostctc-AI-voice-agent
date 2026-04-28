/**
 * dev.ts — One-command development launcher.
 *
 * What it does:
 *   1. Starts the Express server (index.ts via child process)
 *   2. Starts cloudflared quick tunnel → captures the public HTTPS URL
 *   3. Updates both Vapi assistants to point at the new URL (idempotent)
 *   4. Opens http://localhost:<PORT> in the browser
 *
 * Usage: npm run dev
 */

import "./tracing.js"; // must be first — sets LangSmith env vars before LangChain loads
import "dotenv/config";
import { spawn, ChildProcess } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { env } from "./config.js";
import {
  NEW_VISITOR_FIRST_MESSAGE,
  RETURNING_USER_FIRST_MESSAGE,
} from "./state.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ENV_FILE = resolve(__dirname, "../.env");
const PORT = env.port;

// ---- helpers ---------------------------------------------------------------

function spawnChild(cmd: string, args: string[], label: string): ChildProcess {
  const child = spawn(cmd, args, { stdio: "pipe" });
  child.stdout?.on("data", (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`[${label}] ${d}`));
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

async function waitForHealth(port: number, timeout = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(`http://localhost:${port}/health`);
      if (r.ok) return;
    } catch {}
    await sleep(400);
  }
  throw new Error(`Server did not come up on port ${port} within ${timeout}ms`);
}

async function startTunnel(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const cf = spawn("cloudflared", [
      "tunnel", "--url", `http://127.0.0.1:${port}`,
    ], { stdio: "pipe" });

    const timer = setTimeout(() => {
      cf.kill();
      reject(new Error("Timed out waiting for cloudflared URL (30s)"));
    }, 30_000);

    const onData = (data: Buffer) => {
      const line = data.toString();
      // cloudflared prints URL in log line like:
      // INF | https://xyz.trycloudflare.com |
      const m = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) {
        clearTimeout(timer);
        // Forward subsequent output quietly
        cf.stdout?.removeListener("data", onData);
        cf.stderr?.removeListener("data", onData);
        cf.stdout?.on("data", () => {});
        cf.stderr?.on("data", () => {});
        // Keep the process alive; kill on parent exit
        process.on("exit", () => cf.kill());
        process.on("SIGINT", () => { cf.kill(); process.exit(0); });
        resolve(m[0]);
      }
    };

    cf.stdout?.on("data", onData);
    cf.stderr?.on("data", onData);
    cf.on("error", reject);
    cf.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`cloudflared exited with code ${code}`));
    });
  });
}

async function updateVapiAssistant(
  assistantId: string,
  customLlmUrl: string,
  firstMessage: string
): Promise<void> {
  if (!assistantId) return;
  const resp = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.vapiPrivateKey}`,
    },
    body: JSON.stringify({
      model: { provider: "custom-llm", url: customLlmUrl, model: "gpt-4o" },
      firstMessage,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.warn(`  [Vapi] Could not update assistant ${assistantId}: ${err}`);
  }
}

async function patchEnvFile(url: string): Promise<void> {
  let content = await readFile(ENV_FILE, "utf8").catch(() => "");
  if (content.includes("VAPI_SERVER_URL=")) {
    content = content.replace(/^VAPI_SERVER_URL=.*/m, `VAPI_SERVER_URL=${url}`);
  } else {
    content += `\nVAPI_SERVER_URL=${url}\n`;
  }
  await writeFile(ENV_FILE, content, "utf8");
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function openBrowser(url: string) {
  const { platform } = process;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
}

// ---- main ------------------------------------------------------------------

async function main() {
  console.log("\n🔧  BoostCTC Voice Agent — dev startup\n");

  // 1. Start Express server
  console.log("  1/4  Starting Express server...");
  // tsx binary is in server/node_modules/.bin/tsx
  const tsxBin = resolve(__dirname, "../node_modules/.bin/tsx");
  const serverScript = resolve(__dirname, "server/index.ts");
  const server = spawnChild(tsxBin, [serverScript], "server");
  process.on("exit", () => server.kill());
  process.on("SIGINT", () => { server.kill(); process.exit(0); });

  await waitForHealth(PORT);
  console.log(`       ✓ Server up on http://localhost:${PORT}`);

  // 2. Start cloudflared tunnel
  console.log("  2/4  Starting Cloudflare tunnel...");
  let publicUrl: string;
  try {
    publicUrl = await startTunnel(PORT);
    console.log(`       ✓ Tunnel URL: ${publicUrl}`);
  } catch (e) {
    console.error(`       ✗ Tunnel failed: ${e}`);
    console.log(`       ⚠  Vapi will not receive calls. The app still works locally.`);
    console.log(`\n  Open: http://localhost:${PORT}\n`);
    openBrowser(`http://localhost:${PORT}`);
    return;
  }

  // 3. Update .env and Vapi assistants
  console.log("  3/4  Updating Vapi assistants...");
  const customLlmUrl = `${publicUrl}/v1/chat/completions`;
  await patchEnvFile(publicUrl);

  const newId  = env.vapiAssistantNewId;
  const retId  = env.vapiAssistantReturningId;

  if (!newId || !retId) {
    console.log(`       ⚠  No assistant IDs found in .env. Run: npm run setup:vapi`);
  } else {
    await Promise.all([
      updateVapiAssistant(newId, customLlmUrl, NEW_VISITOR_FIRST_MESSAGE),
      updateVapiAssistant(retId, customLlmUrl, RETURNING_USER_FIRST_MESSAGE),
    ]);
    console.log(`       ✓ Both assistants updated → ${customLlmUrl}`);
  }

  // 4. Open browser
  console.log("  4/4  Opening browser...\n");
  openBrowser(`http://localhost:${PORT}`);

  console.log("═".repeat(60));
  console.log(`  App:     http://localhost:${PORT}`);
  console.log(`  Tunnel:  ${publicUrl}`);
  console.log(`  Vapi custom-LLM: ${customLlmUrl}`);
  console.log("═".repeat(60));
  console.log("\n  Press Ctrl+C to stop.\n");

  // Keep process alive (server child keeps running)
  await new Promise(() => {});
}

main().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});
