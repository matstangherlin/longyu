import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession, waitForLazyPage } from "./helpers";

const VIEWPORTS = [
  { label: "320×568", width: 320, height: 568 },
  { label: "390×844", width: 390, height: 844 },
  { label: "768×1024", width: 768, height: 1024 },
  { label: "1024×768", width: 1024, height: 768 },
  { label: "1440×900", width: 1440, height: 900 },
  { label: "1920×1080", width: 1920, height: 1080 },
] as const;

const PRINCIPAL_WEBKIT = new Set(["390×844", "1024×768"]);

function skipHeavyMatrix(browserName: string, label: string) {
  if (browserName === "chromium") return false;
  if (browserName === "webkit") return !PRINCIPAL_WEBKIT.has(label);
  return label !== "390×844" && label !== "1024×768";
}

async function openBusiness(page: Page) {
  await page.goto("/business", { waitUntil: "domcontentloaded" });
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-business-page]")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Mandarim para a sua equipe/i })).toBeVisible();
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const scrolling = document.scrollingElement ?? document.documentElement;
    return {
      overflow: scrolling.scrollWidth > scrolling.clientWidth + 1,
      scrollWidth: scrolling.scrollWidth,
      clientWidth: scrolling.clientWidth,
    };
  });
  expect(
    overflow.overflow,
    `overflow horizontal ${overflow.scrollWidth} > ${overflow.clientWidth}`
  ).toBe(false);
}

async function assertTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const root = document.querySelector("[data-business-page]");
    if (!root) return ["missing data-business-page"];
    return [...root.querySelectorAll<HTMLElement>("a[href], button, select, summary, [data-business-cta]")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= 1 && r.height >= 1;
      })
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width < 44 - 0.5 || r.height < 44 - 0.5;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${(el.textContent || el.getAttribute("aria-label") || el.getAttribute("name") || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 48)} ${Math.round(r.width)}×${Math.round(r.height)}`;
      });
  });
  expect(small, small.join(" · ")).toEqual([]);
}

async function fillValidLead(page: Page, email = "ana.silva@empresa.com.br") {
  await page.locator("#contato").scrollIntoViewIfNeeded();
  await page.getByLabel("Nome", { exact: true }).fill("Ana");
  await page.getByLabel("Sobrenome").fill("Silva");
  await page.getByLabel("E-mail corporativo").fill(email);
  await page.getByLabel("Empresa").fill("Operação Brasil China");
  await page.getByLabel("Cargo").fill("People Partner");
  await page.getByLabel("Número de colaboradores").selectOption("51-200");
  await page.getByLabel("País").fill("Brasil");
  await page.getByLabel("Objetivo").selectOption("work_with_chinese_teams");
  await page.getByLabel("Quando pretende começar?").selectOption("this_quarter");
  await page.getByLabel("Mensagem").fill("Piloto para o time de qualidade.");
}

test.describe("V4.4 /business — guest, copy e formulário", () => {
  test("guest vê a página pública sem chrome do app", async ({ page }) => {
    await openBusiness(page);
    await expect(page.getByRole("navigation", { name: "Principal" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Longyu Business|Treinamento de mandarim para equipes/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Longyu Enterprise/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/BYD/i);
    await expect(page.locator("[data-business-page]")).not.toContainText(/R\$\s*\d/);
    await expect(page.getByRole("link", { name: /Falar com vendas/i }).first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/i);
    await expect(page).toHaveTitle(/Treinamento de Mandarim para Empresas/i);
  });

  test("aluno logado também acessa /business", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await openBusiness(page);
    await expect(page.getByRole("heading", { name: /Mandarim para a sua equipe/i })).toBeVisible();
  });

  test("/pro aponta para Business sem misturar checkout", async ({ page }) => {
    await page.goto("/pro");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const block = page.locator("[data-pro-business]");
    await expect(block).toBeVisible();
    await expect(block.getByRole("link", { name: /Conhecer Business/i })).toHaveAttribute("href", "/business");
    await expect(block).not.toContainText(/Assinar/);
    await expect(page.getByRole("heading", { name: /30 dias grátis/i })).toBeVisible();
  });

  test("e-mail inválido, honeypot e labels de teclado", async ({ page }) => {
    await openBusiness(page);
    await fillValidLead(page, "nao-e-email");
    await page.getByRole("button", { name: /Falar com vendas/i }).click();
    await expect(page.getByText(/e-mail de trabalho válido/i)).toBeVisible();

    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toBeHidden();

    await page.getByLabel("Nome", { exact: true }).focus();
    await expect(page.getByLabel("Nome", { exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Sobrenome")).toBeFocused();
  });

  test("lead válido dispara envio (preview local valida; produção usa Edge)", async ({ page }) => {
    await openBusiness(page);
    await fillValidLead(page);
    await page.getByRole("button", { name: /Falar com vendas/i }).click();
    await expect(page.locator("[data-business-lead-status]")).toBeVisible();
    await expect(page.locator("[data-business-lead-status]")).toContainText(
      /Recebemos seu pedido|site principal do Longyu|Muitos envios|Não foi possível enviar/i
    );
  });
});

for (const viewport of VIEWPORTS) {
  test.describe(`V4.4 /business ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("sem overflow horizontal, CTAs ≥44px, form sem overlap", async ({ page, browserName }) => {
      test.skip(skipHeavyMatrix(browserName, viewport.label), "matriz completa só no Chromium");
      await openBusiness(page);
      await assertNoHorizontalOverflow(page);
      await assertTouchTargets(page);

      const form = page.locator("[data-business-form]");
      await form.scrollIntoViewIfNeeded();
      const overlap = await page.evaluate(() => {
        const submit = document.querySelector("[data-business-cta='form-submit']") as HTMLElement | null;
        const email = document.querySelector('input[name="workEmail"]') as HTMLElement | null;
        if (!submit || !email) return { ok: false, reason: "missing" };
        const a = submit.getBoundingClientRect();
        const b = email.getBoundingClientRect();
        const hit =
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return { ok: !hit, submit: [a.top, a.bottom], email: [b.top, b.bottom] };
      });
      expect(overlap.ok, `CTA sobre o e-mail ${JSON.stringify(overlap)}`).toBe(true);
      await assertNoHorizontalOverflow(page);
    });
  });
}
