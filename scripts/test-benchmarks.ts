import { runTest } from "./auth";

runTest("Benchmark Cycling Test", async (helper) => {
  const { page } = helper;
  
  // Navigate to the viz page
  await page.goto(helper.baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  
  // Take initial screenshot
  await page.screenshot({ path: "/tmp/benchmark_screenshot_1.png", fullPage: true });
  
  // Wait for benchmark to cycle
  await page.waitForTimeout(5500);
  await page.screenshot({ path: "/tmp/benchmark_screenshot_2.png", fullPage: true });
  
  console.log("Screenshots taken!");
}).catch(() => process.exit(1));
