/**
 * Aplica um arquivo SQL no Supabase SQL Editor via navegador logado.
 * Uso: SUPABASE_BROWSER_PROFILE=/tmp/longyu-supabase-browser-profile npm run browser:apply:sql -- supabase/migrations/009_profile_admin.sql
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const ref = "drjcfalvlbbeblmmyhwj";
const fileArg = process.argv[2] ?? "supabase/migrations/009_profile_admin.sql";
const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(root, fileArg);
const sql = readFileSync(sqlPath, "utf8");
const sqlUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;
const userDataDir = process.env.SUPABASE_BROWSER_PROFILE ?? "/tmp/longyu-supabase-browser-profile";

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

async function main() {
  console.log("== browser:apply:sql ==");
  console.log("Arquivo:", sqlPath);
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = browser.pages()[0] ?? (await browser.newPage());
  try {
    await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3000);
    if (page.url().includes("sign-in")) {
      throw new Error("Supabase não está logado neste perfil de navegador.");
    }
    await dismissOverlays(page);
    await pasteSql(page, sql);
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(25000);
    console.log("OK: SQL enviado.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
