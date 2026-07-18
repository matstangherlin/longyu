/**
 * Aplica um arquivo SQL no Supabase SQL Editor via navegador (VNC).
 * Uso: npm run browser:apply:sql -- supabase/migrations/010_beta_feedback.sql
 *
 * Se pedir login, entre na janela Chromium do Desktop/VNC do agente.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const ref = "drjcfalvlbbeblmmyhwj";
const fileArg = process.argv[2] ?? "supabase/migrations/010_beta_feedback.sql";
const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(root, fileArg);
const sql = readFileSync(sqlPath, "utf8");
const sqlUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;
const userDataDir = process.env.SUPABASE_BROWSER_PROFILE ?? "/tmp/longyu-supabase-browser-profile";
const timeoutMs = Number(process.env.BROWSER_DEPLOY_TIMEOUT_MS ?? 1_800_000);

async function waitForLoggedIn(page) {
  const deadline = Date.now() + timeoutMs;
  let lastUrl = "";
  let lastReload = 0;
  while (Date.now() < deadline) {
    const now = Date.now();
    if (now - lastReload > 15_000) {
      lastReload = now;
      await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    const url = page.url();
    if (url !== lastUrl) {
      console.log("URL atual:", url);
      lastUrl = url;
    }
    if (url.includes(`/project/${ref}/`) && !url.includes("sign-in")) {
      const sqlReady =
        (await page.locator(".monaco-editor").first().isVisible().catch(() => false)) ||
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

async function dismissOverlays(page) {
  const gotIt = page.getByRole("button", { name: /got it/i }).first();
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gotIt.click({ force: true });
  }
}

async function pasteSql(page, text) {
  const editorSurface = page.locator(".monaco-editor").first();
  await editorSurface.waitFor({ state: "visible", timeout: 120_000 });
  await editorSurface.click();
  const injected = await page.evaluate((value) => {
    const editors = window.monaco?.editor?.getEditors?.();
    if (editors?.length) {
      editors[0].setValue(value);
      return true;
    }
    return false;
  }, text);
  if (!injected) throw new Error("Não foi possível inserir SQL no Monaco Editor.");
}

async function screenshot(page, name) {
  const file = `/opt/cursor/artifacts/beta-feedback-sql-${name}.png`;
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  console.log("Screenshot:", file);
}

async function main() {
  console.log("== browser:apply:sql ==");
  console.log("Arquivo:", sqlPath);
  console.log("Display:", process.env.DISPLAY ?? ":1");
  console.log("URL:", sqlUrl);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = browser.pages()[0] ?? (await browser.newPage());

  try {
    await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3000);
    await screenshot(page, "01-initial");

    const needsLogin =
      page.url().includes("sign-in") ||
      page.url().includes("login") ||
      (await page.getByRole("button", { name: /sign in/i }).isVisible().catch(() => false));

    if (needsLogin) {
      console.log("");
      console.log(">>> LOGIN NECESSÁRIO no Chromium do Desktop/VNC do agente <<<");
      console.log("    Entre com a conta Supabase do projeto Longyu.");
      console.log("    Aguardando até 30 minutos…");
      console.log("");
      const loggedIn = await waitForLoggedIn(page);
      if (!loggedIn) throw new Error("Timeout aguardando login no Supabase.");
      console.log("Login detectado.");
      await screenshot(page, "02-logged-in");
    }

    await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3000);
    await dismissOverlays(page);
    await pasteSql(page, sql);
    await screenshot(page, "03-before-run");
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(1500);

    const confirm = page.getByRole("button", { name: /run query|confirm|execute|yes/i }).last();
    if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
      console.log("Confirmando modal…");
      await confirm.click({ force: true });
    }

    await page.waitForTimeout(25000);
    await screenshot(page, "04-after-run");
    console.log("OK: SQL enviado pelo navegador.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
