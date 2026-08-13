import { chromium } from "playwright-core";
import { execSync } from "node:child_process";

const chromePath = execSync(
  "find / -maxdepth 6 -iname 'headless_shell' -o -iname 'chrome' 2>/dev/null | grep -i playwright | head -1",
)
  .toString()
  .trim();

const browser = await chromium.launch({ executablePath: chromePath || undefined });
const errors = [];

for (const [label, roleBadge] of [
  ["Log in as Customer", "Customer"],
  ["Log in as Seller", "Seller"],
  ["Log in as Merchant", "Merchant"],
  ["Log in as Admin", "Administrator"],
]) {
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("401")) errors.push(`[${label}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${label}] ${String(err)}`));

  await page.goto("http://localhost:5173/login");
  await page.waitForSelector("text=Dev quick login (seeded accounts)");
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page.waitForSelector(`text=${roleBadge}`);
  console.log(`${label} -> dashboard confirmed, role badge "${roleBadge}" visible`);
  await page.close();
}

await browser.close();

if (errors.length) {
  console.error("Browser console errors detected:");
  for (const e of errors) console.error(" -", e);
  throw new Error(`${errors.length} browser console error(s) detected`);
}
console.log("\nALL DEMO LOGIN CHECKS PASSED");
