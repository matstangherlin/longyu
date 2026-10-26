import { expect, test } from "@playwright/test";
import { seedOnboardedSession } from "./helpers";

/**
 * R-01 / LGY-001 / LGY-036.
 * O preview de E2E é backend local, então o app não chama o Supabase.
 * As rotas provam que, se a chamada sair, ela não passa de uma por URL e
 * um 400/404 de schema não vira console.error. O no-op em loop está em
 * `npm run test:schema-drift`.
 */
test("schema ausente não derruba jornada, perfil, conta nem amigos @qa-r01", async ({ page }) => {
  const counts = { locale: 0, social: 0 };
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.route(/rest\/v1\/profiles\?[^#]*instruction_locale/, async (route) => {
    counts.locale += 1;
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: "42703", message: "column profiles.instruction_locale does not exist" }),
    });
  });
  await page.route(/rest\/v1\/(user_follows|social_activity_events)|\/rpc\/(search_public_profiles|get_public_profile)/, async (route) => {
    counts.social += 1;
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "PGRST205", message: "Could not find the table in the schema cache" }),
    });
  });

  await seedOnboardedSession(page, []);
  for (const path of ["/jornada", "/perfil", "/conta", "/amigos"]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
  }

  expect(counts.locale).toBeLessThanOrEqual(1);
  expect(counts.social).toBeLessThanOrEqual(1);
  expect(consoleErrors.filter((line) => /42703|PGRST205|instruction_locale|user_follows/.test(line))).toEqual([]);
});
