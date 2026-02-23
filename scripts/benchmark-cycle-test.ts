import { chromium } from "playwright";

async function main() {
  const url = "https://preview-evil-ai-viz-93490a60.viktor.space";
  console.log(`📸 Taking cycling screenshots of ${url}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  await page.goto(url);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/bench_cycle_1.png", fullPage: false });
  console.log("Screenshot 1 taken");
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/bench_cycle_2.png", fullPage: false });
  console.log("Screenshot 2 taken");

  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/bench_cycle_3.png", fullPage: false });
  console.log("Screenshot 3 taken");
  
  await browser.close();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
