/**
 * Aplica um arquivo SQL no Supabase SQL Editor via navegador (VNC).
 * Uso: npm run browser:apply:sql -- supabase/migrations/010_beta_feedback.sql
 *
 * Se pedir login, clica em Continue with GitHub e aguarda você concluir o OAuth
 * na aba Desktop do agente.
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

async function screenshot(page, name) {
  const file = `/opt/cursor/artifacts/beta-feedback-sql-${name}.png`;
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  console.log("Screenshot:", file);
}

async function dismissOverlays(page) {
  const gotIt = page.getByRole("button", { name: /got it/i }).first();
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gotIt.click({ force: true });
  }
}

async function clickGithubLogin(page) {
  const github = page.getByRole("button", { name: /continue with github/i }).first();
  if (await github.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Clicando em Continue with GitHub…");
    await github.click({ force: true });
    await page.waitForTimeout(2500);
    return true;
  }
  const link = page.getByRole("link", { name: /continue with github|github/i }).first();
  if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Clicando link GitHub…");
    await link.click({ force: true });
    await page.waitForTimeout(2500);
    return true;
  }
  return false;
}

async function waitForLoggedIn(page) {
  const deadline = Date.now() + timeoutMs;
  let lastUrl = "";
  let lastGithubClick = 0;
  while (Date.now() < deadline) {
    const url = page.url();
    if (url !== lastUrl) {
      console.log("URL atual:", url);
      lastUrl = url;
      await screenshot(page, `nav-${Date.now()}`);
    }

    // Já no projeto → SQL Editor
    if (url.includes(`/project/${ref}/`) && !url.includes("sign-in")) {
      const sqlReady =
        (await page.locator(".monaco-editor").first().isVisible().catch(() => false)) ||
        (await page.getByRole("link", { name: /sql editor/i }).first().isVisible().catch(() => false));
      if (sqlReady) return true;
      await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }

    // Em GitHub OAuth / MFA — só aguarda o usuário concluir (não reclica).
    if (
      url.includes("github.com/login") ||
      url.includes("github.com/session") ||
      url.includes("oauth/authorize") ||
      url.includes("sign-in-mfa")
    ) {
      await page.waitForTimeout(2500);
      continue;
    }

    // Saiu para support.github.com ou outra página — volta ao SQL (que redireciona ao login).
    if (url.includes("support.github.com") || url.includes("docs.github.com")) {
      console.log("Saiu do fluxo OAuth — voltando ao login Supabase…");
      await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }

    // Tela de sign-in do Supabase — clica GitHub no máx. a cada 60s.
    if (
      (url.includes("supabase.com") && (url.includes("sign-in") || url.includes("login"))) &&
      Date.now() - lastGithubClick > 60_000
    ) {
      lastGithubClick = Date.now();
      await clickGithubLogin(page).catch(() => false);
    }

    await page.waitForTimeout(2500);
  }
  return false;
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
      (await page.getByRole("button", { name: /sign in|continue with github/i }).first().isVisible().catch(() => false));

    if (needsLogin) {
      console.log("");
      console.log(">>> LOGIN NECESSÁRIO — aba Desktop deste agente <<<");
      console.log("    1) Vou abrir Continue with GitHub");
      console.log("    2) Conclua o login GitHub/Supabase nessa janela");
      console.log("    3) Assim que entrar, aplico o SQL automaticamente");
      console.log("");
      await clickGithubLogin(page);
      await screenshot(page, "02-after-github-click");
      // Prefill email conhecido do dono do projeto para acelerar o login no Desktop.
      try {
        const login = page.locator("#login_field").first();
        if (await login.isVisible({ timeout: 5000 }).catch(() => false)) {
          await login.fill("minemoostraa@gmail.com");
          await page.locator("#password").first().click({ timeout: 2000 }).catch(() => {});
          console.log("Email GitHub pré-preenchido: minemoostraa@gmail.com — digite a senha no Desktop.");
        }
      } catch {
        /* ignore */
      }
      await screenshot(page, "02b-email-prefilled");
      const loggedIn = await waitForLoggedIn(page);
      if (!loggedIn) throw new Error("Timeout aguardando login no Supabase.");
      console.log("Login detectado.");
      await screenshot(page, "03-logged-in");
    }

    await page.goto(sqlUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3000);
    await dismissOverlays(page);
    await pasteSql(page, sql);
    await screenshot(page, "04-before-run");
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(1500);

    const confirm = page.getByRole("button", { name: /run this query|run query|confirm|execute|yes/i }).last();
    if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
      console.log("Confirmando modal…");
      await confirm.click({ force: true });
    }

    await page.waitForTimeout(25000);
    await screenshot(page, "05-after-run");
    console.log("OK: SQL enviado pelo navegador.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
