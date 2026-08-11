import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedOnboardedSession } from "./helpers";

/**
 * Superfície de auth para beta: rotas críticas + CTA de sair + feedback no player.
 * Login/reset reais com e-mail ficam no QA humano (entrega de e-mail).
 */
test.describe("auth surface — beta readiness", () => {
  test("login e recuperação respondem (com ou sem backend)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
    await expect(page.getByRole("heading").first()).toBeVisible();

    await page.goto("/esqueci-senha");
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /senha|recuper|indisponível/i })
    ).toBeVisible();
  });

  test("confirmar e-mail e redefinir senha respondem", async ({ page }) => {
    await page.goto("/confirmar-email");
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
    await expect(
      page.getByRole("heading", { name: /confirm|e-mail|email|indisponível/i }).or(
        page.getByText(/Confirmando seu email/i)
      )
    ).toBeVisible();

    await page.goto("/redefinir-senha");
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
    // Sem token: link inválido/expirado; com sessão: Nova senha; sem backend: indisponível.
    await expect(
      page.getByRole("heading", {
        name: /Link inválido|expirado|Nova senha|Redefinição indisponível|senha/i,
      })
    ).toBeVisible();
  });

  test("conta local mostra login/sessão e atalho de recuperação", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/conta");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Sua conta/i })).toBeVisible();
    await expect(page.getByText(/Neste dispositivo|Nuvem/i).first()).toBeVisible();
    // Conta local: formulário de entrar/criar (backend ativo) ou CTA de sessão cloud.
    await expect(
      page
        .getByRole("button", { name: /Entrar \/ criar conta|Sair da conta/i })
        .or(page.getByRole("link", { name: /Esqueci minha senha/i }))
        .first()
    ).toBeVisible();
  });

  test("feedback no player inclui versão e contexto da lição", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);
    await page.getByRole("button", { name: /Reportar problema nesta pergunta/i }).click();
    const dialog = page.getByRole("dialog", { name: /Enviar feedback/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Lição p1-o-que-e-mandarim/i)).toBeVisible();
    await expect(dialog.getByText(/Longyu · v/i)).toBeVisible();
    await expect(dialog.getByText(/contexto técnico/i)).toBeVisible();
  });
});
