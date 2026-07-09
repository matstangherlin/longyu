import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "https://supabase.com/dashboard/project/drjcfalvlbbeblmmyhwj/sql/new";
const out = process.argv[3] ?? "/tmp/supabase-screen.png";
const profile = "/tmp/longyu-supabase-browser-profile";

const browser = await chromium.launchPersistentContext(profile, {
  headless: false,
  viewport: { width: 1600, height: 1000 },
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = browser.pages()[0] ?? (await browser.newPage());
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
await page.screenshot({ path: out, fullPage: true });
console.log("Screenshot:", out);
await browser.close();
