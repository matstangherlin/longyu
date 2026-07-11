/**
 * Abre o Supabase SQL Editor no navegador (VNC) e aplica SQL da conta de teste + Pro.
 * Use quando SUPABASE_ACCESS_TOKEN não estiver disponível no ambiente.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const ref = "drjcfalvlbbeblmmyhwj";
const sqlFiles = [
  path.join(root, "supabase/migrations/006_economy_server.sql"),
  path.join(root, "supabase/migrations/007_internal_test_pro.sql"),
  path.join(root, "supabase/migrations/008_server_entitlement_rpc.sql"),
  path.join(root, "supabase/seed/test-account.sql"),
];
const sql = sqlFiles.map((file) => readFileSync(file, "utf8")).join("\n\n");
const sqlUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;

const timeoutMs = Number(process.env.BROWSER_DEPLOY_TIMEOUT_MS ?? 600_000);

async function waitForLoggedIn(page) {
  const deadline = Date.now() + timeoutMs;
  let lastUrl = "";
  while (Date.now() < deadline) {
    const url = page.url();
    if (url !== lastUrl) {
      console.log("URL atual:", url);
      lastUrl = url;
    }
    if (url.includes(`/project/${ref}/`) && !url.includes("sign-in")) {
      const sqlReady =
        (await page.locator(".monaco-editor textarea").first().isVisible().catch(() => false)) ||
        (await page.getByRole("link", { name: /sql editor/i }).first().isVisible().catch(() => false));
      if (sqlReady) return true;
    }
    if (url.includes("sign-in") || url.includes("login")) {
      await page.waitForTimeout(3000);
      continue;
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

async function screenshot(page, name) {
  const file = `/tmp/test-account-sql-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log("Screenshot:", file);
}

async function openSqlEditor(page) {
  await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(4000);

  if (!page.url().includes("/sql")) {
    const sqlNav = page.getByRole("link", { name: /sql editor/i }).first();
    if (await sqlNav.isVisible().catch(() => false)) {
      await sqlNav.click();
      await page.waitForTimeout(2000);
    }
  }

  const newQuery = page.getByRole("button", { name: /new query/i }).first();
  if (await newQuery.isVisible().catch(() => false)) {
    await newQuery.click();
    await page.waitForTimeout(1000);
  }
}

async function runSql(page) {
  await openSqlEditor(page);

  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor({ state: "attached", timeout: 120_000 });
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(sql);
  await page.waitForTimeout(800);

  const runButton = page.getByRole("button", { name: /^Run$/i }).first();
  await runButton.waitFor({ state: "visible", timeout: 30_000 });
  await runButton.click();

  const confirm = page.getByRole("button", { name: /run query/i }).last();
  if (await confirm.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Confirmando modal de segurança…");
    await confirm.click();
  }

  await page.waitForTimeout(20000);
  const body = await page.locator("body").innerText();
  const hasError =
    (/error|failed|permission denied/i.test(body) &&
      !/success|completed|rows affected/i.test(body)) ||
    (await page.getByText(/potential issue detected/i).isVisible().catch(() => false));
  return { hasError, snippet: body.slice(0, 3000) };
}

async function main() {
  console.log("== browser:apply:test-account-sql ==");
  console.log("Abrindo navegador no display", process.env.DISPLAY ?? ":1");
  console.log("URL:", sqlUrl);
  console.log("Se pedir login, entre com sua conta Supabase no VNC do agente.");

  const userDataDir = "/tmp/longyu-supabase-test-account-profile";
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = browser.pages()[0] ?? (await browser.newPage());

  try {
    await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(4000);
    await screenshot(page, "01-initial");

    const currentUrl = page.url();
    const needsLogin =
      currentUrl.includes("sign-in") ||
      currentUrl.includes("login") ||
      (await page.getByRole("button", { name: /sign in/i }).isVisible().catch(() => false));

    if (needsLogin) {
      console.log("");
      console.log(">>> FAÇA LOGIN NO NAVEGADOR DO AGENTE (aba Desktop/VNC) <<<");
      console.log("    Aguardando até 10 minutos…");
      console.log("");
      const loggedIn = await waitForLoggedIn(page);
      if (!loggedIn) {
        throw new Error("Timeout aguardando login no Supabase.");
      }
      console.log("Login detectado.");
      await screenshot(page, "02-logged-in");
    }

    console.log("Aplicando SQL (economia + Pro + conta teste)…");
    await screenshot(page, "03-before-sql");
    const result = await runSql(page);
    await screenshot(page, "04-after-run");
    if (result.hasError) {
      console.error("Possível erro no SQL Editor:");
      console.error(result.snippet);
      process.exit(1);
    }

    console.log("OK: SQL aplicado pelo navegador.");
    console.log("Rode: npm run seed:test-account && npm run verify:test-account");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
