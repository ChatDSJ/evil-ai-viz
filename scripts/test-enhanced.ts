import { chromium } from "playwright";

async function main() {
  const url = process.env.APP_URL || "http://localhost:4173";
  console.log(`📸 Taking screenshots of enhanced viz at ${url}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(url);
  
  // Wait for boot sequence + initial components
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "screenshots/01-initial.png" });
  console.log("✓ Screenshot 1: Initial state");

  // Wait for visitor info bar reveal
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "screenshots/02-with-info.png" });
  console.log("✓ Screenshot 2: With visitor info");

  // Wait for the OS dialog to appear (8s delay)
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "screenshots/03-dialog.png" });
  console.log("✓ Screenshot 3: OS dialog");

  // Wait for mouse to click and installation to begin
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "screenshots/04-installing.png" });
  console.log("✓ Screenshot 4: Installing");

  // Wait for install complete
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "screenshots/05-complete.png" });
  console.log("✓ Screenshot 5: Complete");

  await browser.close();
  console.log("\n✅ All screenshots captured!");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
