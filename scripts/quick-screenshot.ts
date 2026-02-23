import { type ChildProcess, spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

async function waitForServer(url: string, maxWait: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 304) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function startPreviewServer(): ChildProcess {
  const server = spawn("bun", ["run", "preview"], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});
  return server;
}

async function main() {
  console.log("🚀 Starting preview server...");
  const server = startPreviewServer();

  try {
    const ready = await waitForServer(PREVIEW_URL, 30000);
    if (!ready) {
      console.error("❌ Server failed to start");
      process.exit(1);
    }

    console.log("📸 Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // Collect console messages
    const logs: string[] = [];
    page.on("console", msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    await page.goto(PREVIEW_URL);
    
    // Wait for boot sequence + progressive reveal to complete
    // The boot sequence takes ~8 seconds, then phases reveal every 5 seconds
    // Phase 6 (location map) = boot + 6*5s = ~38s
    // Let's wait enough for the map to appear
    console.log("⏳ Waiting for boot sequence + map reveal (45s)...");
    await page.waitForTimeout(45000);

    await page.screenshot({ path: resolve(projectRoot, "screenshots", "map-test.png"), fullPage: false });
    console.log("✅ Screenshot saved to screenshots/map-test.png");

    // Print any errors
    const errors = logs.filter(l => l.startsWith("[error]") || l.includes("Error"));
    if (errors.length > 0) {
      console.log("\n⚠️ Console errors:");
      for (const e of errors) console.log(e);
    }

    await browser.close();
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
