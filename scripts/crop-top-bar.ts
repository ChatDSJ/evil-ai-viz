import { chromium } from "playwright";

async function main() {
  const url = "https://preview-evil-ai-viz-93490a60.viktor.space";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  await page.goto(url);
  await page.waitForTimeout(3000);
  
  // Crop just the top metrics bar area
  await page.screenshot({ path: "/tmp/topbar_1.png", clip: { x: 350, y: 10, width: 750, height: 55 } });
  console.log("Cropped 1");
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/topbar_2.png", clip: { x: 350, y: 10, width: 750, height: 55 } });
  console.log("Cropped 2");

  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/topbar_3.png", clip: { x: 350, y: 10, width: 750, height: 55 } });
  console.log("Cropped 3");
  
  await browser.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
