import { type ChildProcess, spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const PREVIEW_PORT = 4174;
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

async function main() {
  console.log("🚀 Starting preview server...");
  const server = spawn("bun", ["run", "preview", "--port", String(PREVIEW_PORT)], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});

  try {
    const ready = await waitForServer(PREVIEW_URL, 30000);
    if (!ready) {
      console.error("❌ Server failed to start");
      process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // Collect ALL console messages
    const logs: string[] = [];
    page.on("console", msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
    });

    // Also monitor network for tile requests
    const tileRequests: string[] = [];
    page.on("request", req => {
      const url = req.url();
      if (url.includes("openfreemap") || url.includes("maplibre") || url.includes("pbf") || url.includes("tile")) {
        tileRequests.push(`REQ: ${url}`);
      }
    });
    page.on("requestfailed", req => {
      const url = req.url();
      tileRequests.push(`FAILED: ${url} - ${req.failure()?.errorText || "unknown"}`);
    });
    page.on("response", res => {
      const url = res.url();
      if (url.includes("openfreemap") || url.includes("maplibre") || url.includes("pbf") || url.includes("tile")) {
        tileRequests.push(`RESP ${res.status()}: ${url}`);
      }
    });

    await page.goto(PREVIEW_URL);
    
    // Wait for map to have time to load
    console.log("⏳ Waiting 50s for boot + map...");
    await page.waitForTimeout(50000);

    // Take full screenshot
    await page.screenshot({ path: resolve(projectRoot, "screenshots", "map-debug-full.png"), fullPage: false });
    
    // Try to find and screenshot just the map area
    // The UserLocationMap is bottom: 8%, right: 2%, width: 280px, height: 240px
    await page.screenshot({ 
      path: resolve(projectRoot, "screenshots", "map-debug-crop.png"),
      clip: { x: 1920 - 280 - 40, y: 1080 - 240 - 90, width: 320, height: 280 }
    });

    console.log("\n📋 Tile-related network requests:");
    for (const r of tileRequests) console.log(r);

    console.log("\n📋 Map-related console logs:");
    for (const l of logs) {
      if (l.toLowerCase().includes("map") || l.toLowerCase().includes("tile") || l.toLowerCase().includes("webgl") || l.toLowerCase().includes("openfreemap") || l.includes("Error") || l.includes("error")) {
        console.log(l);
      }
    }
    
    console.log("\n✅ Screenshots saved");
    await browser.close();
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
