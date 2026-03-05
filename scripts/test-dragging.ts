/**
 * Playwright test for Draggable window dragging.
 *
 * This test catches the race condition that existed in the original delta-based
 * onPointerMove implementation. When move events arrive faster than React commits
 * renders, the functional updater `(prev) => prev + (e.clientX - state.startX)`
 * reads a stale `state.startX` (already overwritten by a later move event), causing
 * deltas to cancel each other and the window to appear frozen mid-drag.
 *
 * The fix: absolute positioning from a fixed drag origin, so each move event
 * independently computes the correct absolute position with no mutable intermediate.
 *
 * Run with:  bun run test scripts/test-dragging.ts
 * (preview server must serve dist-drag-test — see test-dragging runner below)
 */
import { type ChildProcess, spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TMP_DIR = join(ROOT, "tmp");
const PREVIEW_PORT = 4174; // different port from the main app
const APP_URL = `http://localhost:${PREVIEW_PORT}/drag-test.html`;

const DRAG_DISTANCE_X = 250;
const DRAG_DISTANCE_Y = 120;
const ALLOWED_ERROR_PX = 15;

async function waitForServer(url: string, maxWait = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 304) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startPreviewServer(): ChildProcess {
  return spawn(
    "bunx",
    ["vite", "preview", "--outDir", "dist-drag-test", "--port", String(PREVIEW_PORT)],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
}

async function screenshot(page: import("playwright").Page, name: string) {
  await mkdir(TMP_DIR, { recursive: true });
  const path = join(TMP_DIR, name);
  await page.screenshot({ path });
  console.log(`  📸 ${path}`);
}

async function main() {
  console.log("\n🧪 Window Dragging Test\n");

  const server = startPreviewServer();
  server.stderr?.on("data", () => {}); // suppress vite banner noise

  let browser: import("playwright").Browser | null = null;

  try {
    const ready = await waitForServer(APP_URL);
    if (!ready) throw new Error("Preview server did not start in time");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // All three panes are available immediately (no boot sequence)
    const pane = page.locator('[data-testid="pane-pane-a"]');
    await pane.waitFor({ state: "visible", timeout: 5000 });

    const before = await pane.boundingBox();
    if (!before) throw new Error("Could not read initial bounding box");

    const cx = before.x + before.width / 2;
    const cy = before.y + before.height / 2;

    console.log(
      `  Pane A at (${before.x.toFixed(0)}, ${before.y.toFixed(0)})`
    );
    console.log(
      `  Dragging from centre (${cx.toFixed(0)}, ${cy.toFixed(0)}) ` +
        `→ (+${DRAG_DISTANCE_X}, +${DRAG_DISTANCE_Y}) over 60 steps @ ~8ms each`
    );
    console.log(
      `  (125 events/sec — faster than typical React commit cadence, ` +
        `which triggers the stale-ref race condition in delta-based code)`
    );

    await screenshot(page, "drag-test-before.png");

    await page.mouse.move(cx, cy);
    await page.mouse.down();

    const STEPS = 60;
    for (let i = 1; i <= STEPS; i++) {
      await page.mouse.move(
        cx + (DRAG_DISTANCE_X * i) / STEPS,
        cy + (DRAG_DISTANCE_Y * i) / STEPS
      );
      await page.waitForTimeout(8);
    }

    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = await pane.boundingBox();
    if (!after) throw new Error("Could not read final bounding box");

    const dx = after.x - before.x;
    const dy = after.y - before.y;

    await screenshot(page, "drag-test-after.png");

    console.log(`\n  Result:   moved (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
    console.log(
      `  Expected: (~${DRAG_DISTANCE_X}±${ALLOWED_ERROR_PX}, ~${DRAG_DISTANCE_Y}±${ALLOWED_ERROR_PX})`
    );

    const xOk = Math.abs(dx - DRAG_DISTANCE_X) <= ALLOWED_ERROR_PX;
    const yOk = Math.abs(dy - DRAG_DISTANCE_Y) <= ALLOWED_ERROR_PX;

    if (!xOk || !yOk) {
      throw new Error(
        `Drag stopped early or jumped: got (${dx.toFixed(1)}, ${dy.toFixed(1)}). ` +
          `Likely cause: delta+mutable-ref race condition in onPointerMove.`
      );
    }

    console.log("\n✅ PASSED — pane followed the pointer correctly\n");
  } catch (err) {
    console.error("\n❌ FAILED:", err instanceof Error ? err.message : err, "\n");
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
