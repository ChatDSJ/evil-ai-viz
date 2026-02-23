import { chromium } from "playwright";

async function main() {
  const url = process.env.APP_URL || "http://localhost:4173";
  const path = process.argv[2] || "/";
  const filename = process.argv[3] || "screenshot.png";

  console.log(`📸 Taking screenshot of ${url}${path}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  await page.goto(`${url}${path}`);
  
  // Wait for animations to start
  await page.waitForTimeout(4000);
  
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`✅ Screenshot saved to ${filename}`);
  
  await browser.close();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
