import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedCompletedJourneyNodes,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";

/**
 * V4.9.3 — a fundação como experiência, não como estrutura.
 *
 * O princípio central da remessa é que a primeira experiência precisa parecer
 * "estão me ensinando mandarim" e não "estão testando se eu já sei". Isso é
 * uma afirmação sobre o que o aluno VÊ, nesta ordem, e por isso mora aqui e
 * não num validador: os gates provam que o currículo está ordenado; estes
 * testes provam que a ordem chega até a tela.
 */

const CAPSULES = {
  mandarin: "capsule:foundation:mandarin:v1",
  pinyin: "capsule:foundation:pinyin:v1",
  tone: "capsule:foundation:tone:v1",
  hanzi: "capsule:foundation:hanzi:v1",
  components: "capsule:foundation:hanzi-components:v1",
};

const SLOT_NODES = {
  mandarin: "node:instruction:foundation:mandarin",
  pinyin: "node:instruction:foundation:pinyin",
  tone: "node:instruction:foundation:tone",
  hanzi: "node:instruction:foundation:hanzi",
  components: "node:instruction:foundation:hanzi-components",
};

const route = (capsuleId: string) => `/jornada/capsula/${encodeURIComponent(capsuleId)}`;

async function open(page: Page, target: string) {
  await page.goto(target);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

/** RC2.3.13H+ foundation CORE AULA uses DynamicTeachingSequence (or legacy animated). */
function capsuleRoot(page: Page) {
  // lesson-capsule-dynamic wraps dynamic-teaching-sequence — don't OR both (strict mode).
  return page.getByTestId("lesson-capsule-dynamic").or(page.getByTestId("capsule-animated"));
}

function capsuleContinue(page: Page) {
  return page.getByTestId("dynamic-aula-continue").or(page.getByTestId("capsule-continue"));
}

/** Percorre a aula inteira (dynamic beats ou animated + microcheck legado). */
async function completeCapsule(page: Page, { answerCorrectly = true } = {}) {
  for (let step = 0; step < 32; step += 1) {
    if (/\/licao\//.test(page.url())) return;

    const options = page.getByTestId("capsule-micro-check-option");
    if (await options.first().isVisible().catch(() => false)) {
      const count = await options.count();
      await options.nth(answerCorrectly ? 0 : Math.max(0, count - 1)).click();
      await expect(page.getByTestId("capsule-micro-check-feedback")).toBeVisible();
    }

    const seq = page.getByTestId("dynamic-teaching-sequence");
    const advance = capsuleContinue(page);
    if (!(await advance.isVisible().catch(() => false))) {
      await page.waitForTimeout(200);
      continue;
    }

    const label = ((await advance.textContent()) ?? "").trim();
    const before = (await seq.getAttribute("data-beat-index").catch(() => null)) ?? "";
    await advance.click();
    await page.waitForTimeout(120);
    if (/\/licao\//.test(page.url())) return;

    // Bubble READY gate: first click only unlocks; second advances the beat / finishes.
    const after = (await seq.getAttribute("data-beat-index").catch(() => null)) ?? "";
    if (before === after && (await advance.isVisible().catch(() => false))) {
      await advance.click();
      await page.waitForTimeout(120);
    }
    if (/\/licao\//.test(page.url())) return;
    if (/Iniciar exercícios|Start the exercises|Concluir aula|Finish lesson/.test(label)) return;
  }
}

/** Advance dynamic AULA until a locator is visible (handles bubble READY gate). */
async function advanceDynamicUntil(page: Page, target: import("@playwright/test").Locator, maxClicks = 12) {
  const locator = target;
  for (let i = 0; i < maxClicks; i += 1) {
    if (await locator.first().isVisible().catch(() => false)) return;
    const seq = page.getByTestId("dynamic-teaching-sequence");
    const before = (await seq.getAttribute("data-beat-index").catch(() => null)) ?? "";
    const advance = capsuleContinue(page);
    await advance.click();
    await page.waitForTimeout(100);
    const after = (await seq.getAttribute("data-beat-index").catch(() => null)) ?? "";
    if (before === after) {
      await advance.click();
      await page.waitForTimeout(100);
    }
  }
}

test.describe("V4.9.3 — a aula antes da cobrança", () => {
  test("1 · o aluno novo encontra a aula do dragão antes do primeiro tópico", async ({ page }) => {
    await seedFreshJourneySession(page);
    await open(page, "/jornada");

    // A aula é renderizada ANTES do node do tópico, e é CORE, não opcional.
    const before = page.locator('[data-journey-instruction-before="p1-o-que-e-mandarim"]');
    await expect(before).toBeVisible({ timeout: 15_000 });
    const node = before.locator(`[data-journey-inline-node="${SLOT_NODES.mandarin}"]`);
    await expect(node).toHaveAttribute("data-ready", "true");
    await expect(node).toContainText("O que é mandarim?");
    await expect(node).not.toContainText("OPCIONAL");
  });

  test("2 · a aula explicativa nunca está trancada", async ({ page }) => {
    // Cinco navegações completas num teste só: o limite padrão é para um
    // fluxo, não para cinco.
    test.setTimeout(120_000);
    await seedFreshJourneySession(page);
    // O pré-requisito de uma explicação é justamente não saber ainda: um
    // aluno zerado precisa poder abrir todas as cinco.
    for (const capsuleId of Object.values(CAPSULES)) {
      await open(page, route(capsuleId));
      await expect(capsuleRoot(page)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("journey-node-locked")).toHaveCount(0);
    }
  });

  test("3 · 你好 é ouvido e explicado antes de ser perguntado", async ({ page }) => {
    await seedFreshJourneySession(page);
    await open(page, route(CAPSULES.mandarin));
    await expect(capsuleRoot(page)).toBeVisible({ timeout: 15_000 });

    // RC2.3.13H — dynamic AULA: guide → visual → mandarin example (listen) → reveal → handoff.
    // Sem microcheck na cápsula: a cobrança mora no tópico seguinte.
    const example = page.getByTestId("mandarin-example").or(page.getByTestId("capsule-language-card"));
    await advanceDynamicUntil(page, example);
    await expect(example).toContainText("你好");
    await expect(
      page.getByTestId("dynamic-aula-listen").or(page.getByRole("button", { name: /Ouvir|Listen|Play Mandarin|Ouvir mandarim/i }))
    ).toBeVisible();
    await expect(page.getByTestId("capsule-micro-check")).toHaveCount(0);

    await advanceDynamicUntil(page, page.getByText(/nǐ hǎo|Olá|Hello/i).first());
    await expect(example).toContainText(/nǐ hǎo|你好/);
    await expect(page.getByText(/Olá|Hello/i).first()).toBeVisible();

    await advanceDynamicUntil(page, page.getByTestId("dynamic-handoff"));
    await expect(page.getByTestId("dynamic-handoff").or(page.getByText(/vamos testar|let's try|practice/i).first())).toBeVisible();
  });

  test("4 · o microcheck não deixa avançar sem resposta, e errar não trava", async ({ page }) => {
    // Legacy animated microcheck path — skip when dynamic AULA replaced it.
    await seedFreshJourneySession(page);
    await open(page, route(CAPSULES.mandarin));
    const dynamic = await page.getByTestId("dynamic-teaching-sequence").isVisible().catch(() => false);
    test.skip(dynamic, "RC2.3.13H dynamic AULA has no capsule microcheck; handoff goes to topic practice.");
    for (let i = 0; i < 4; i += 1) await capsuleContinue(page).click();

    await expect(page.getByTestId("capsule-micro-check")).toHaveAttribute("data-answered", "false");
    await expect(page.getByTestId("capsule-continue")).toBeDisabled();

    // Resposta errada: reensina, revela a certa, e libera o avanço.
    const options = page.getByTestId("capsule-micro-check-option");
    await options.nth(1).click();
    const feedback = page.getByTestId("capsule-micro-check-feedback");
    await expect(feedback).toHaveAttribute("data-correct", "false");
    await expect(options.nth(0)).toHaveAttribute("data-state", "correct");
    await expect(page.getByTestId("capsule-continue")).toBeEnabled();
  });
});

test.describe("V4.9.3 — as cinco aulas e seus handoffs", () => {
  test("5 · a aula de pinyin entrega o aluno à prática de pinyin", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-o-que-e-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao"],
    });
    await seedCompletedJourneyNodes(page, [
      SLOT_NODES.pinyin,
      "node:capsule:pinyin-foundation:v1",
    ]);
    await open(page, "/jornada");

    const handoff = page.locator('[data-journey-handoff="booster:pinyin-practice:v1"]');
    await expect(handoff).toBeVisible({ timeout: 15_000 });
    await expect(handoff).toContainText("Você já sabe o que o pinyin faz");
  });

  test("6 · a aula de tons entrega o aluno ao Tone Trainer", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-o-que-e-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao"],
    });
    await seedCompletedJourneyNodes(page, [SLOT_NODES.tone]);
    await open(page, "/jornada");

    const handoff = page.locator('[data-journey-handoff="booster:tone-contour-1-3:v1"]');
    await expect(handoff).toBeVisible({ timeout: 15_000 });
    await expect(handoff).toContainText("1º e o 3º tom");
  });

  test("7 · a aula de componentes entrega o aluno ao Hànzì Builder", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-engine-2-lab", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao", "mu", "ren"],
    });
    await seedCompletedJourneyNodes(page, [SLOT_NODES.components]);
    await open(page, "/jornada");

    const handoff = page.locator('[data-journey-handoff="booster:hanzi-builder-foundations:v1"]');
    await expect(handoff).toBeVisible({ timeout: 15_000 });
    await expect(handoff).toContainText("feitos de peças");
  });

  test("8 · a frase do dragão não aparece antes da aula que a torna verdadeira", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p1-o-que-e-hanzi", {
      learnedChunks: ["nihao"],
      learnedChars: ["ni", "hao"],
    });
    // Sem a aula de tons concluída: prometer "você já sabe como os tons se
    // movem" seria mentira, então a frase não pode estar lá.
    await seedCompletedJourneyNodes(page, ["node:capsule:pinyin-foundation:v1"]);
    await open(page, "/jornada");

    await expect(page.locator('[data-journey-inline-node="booster:tone-contour-1-3:v1"]')).toHaveCount(
      1
    );
    await expect(page.locator('[data-journey-handoff="booster:tone-contour-1-3:v1"]')).toHaveCount(0);
  });
});

test.describe("V4.9.3 — os dois cursos e a identidade pedagógica", () => {
  test("9 · o caminho completo da fundação em português", async ({ page }) => {
    test.setTimeout(150_000);
    await seedFreshJourneySession(page);
    for (const capsuleId of Object.values(CAPSULES)) {
      await open(page, route(capsuleId));
      await expect(capsuleRoot(page)).toBeVisible({ timeout: 15_000 });
      await completeCapsule(page);
      // Concluir a aula leva ao tópico dela, não a um beco.
      await expect(page).toHaveURL(/\/licao\//, { timeout: 15_000 });
    }
  });

  test("10 · o mesmo caminho canônico em inglês", async ({ page }) => {
    test.setTimeout(150_000);
    await seedFreshJourneySession(page);
    await page.addInitScript(() => {
      localStorage.setItem("longyu:instruction-locale", "en");
      localStorage.setItem("longyu:instruction-locale-user-override", "1");
    });
    for (const capsuleId of Object.values(CAPSULES)) {
      await open(page, route(capsuleId));
      const capsule = page.getByTestId("lesson-capsule");
      // A identidade não muda com o idioma: mesmo id, mesmos alvos.
      await expect(capsule).toHaveAttribute("data-capsule-id", capsuleId);
      await expect(capsuleRoot(page)).toBeVisible({ timeout: 15_000 });
      await completeCapsule(page);
      await expect(page).toHaveURL(/\/licao\//, { timeout: 15_000 });
    }
  });

  test("11 · trocar de idioma não reseta o progresso da instrução", async ({ page }) => {
    await seedFreshJourneySession(page);
    await open(page, route(CAPSULES.mandarin));
    await completeCapsule(page);

    const donePt = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("longyu:journey-node-completions:v1") ?? "[]")
    );
    expect(donePt).toContain("node:instruction:foundation:mandarin");

    await page.evaluate(() => {
      localStorage.setItem("longyu:instruction-locale", "en");
      localStorage.setItem("longyu:instruction-locale-user-override", "1");
    });
    await open(page, "/jornada");

    const doneEn = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("longyu:journey-node-completions:v1") ?? "[]")
    );
    // O progresso é do slot, não da apresentação: o idioma é roupa.
    expect(doneEn).toContain("node:instruction:foundation:mandarin");
  });

  test("12 · mídia publicada troca a apresentação, nunca a identidade", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-mandarim");
    await page.route("**/lessons/catalog.v1.json", (routeCall) =>
      routeCall.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: 1,
          assets: [
            {
              id: "media:foundation-pinyin:pt:v1",
              version: 1,
              kind: "VIDEO",
              delivery: "DIRECT_MP4",
              // O arquivo não existe: o player vai falhar e oferecer a versão
              // interativa. O que este teste mede é o que acontece com a
              // IDENTIDADE, não com os bytes.
              url: "https://cdn.exemplo.com/foundation-pinyin-pt-v1.mp4",
              durationSeconds: 90,
              spokenLocale: "pt-BR",
              captions: [],
              transcript: "t",
              fallback: "INTERACTIVE_SEGMENTS",
            },
          ],
          presentationOverrides: [
            {
              capsuleId: CAPSULES.pinyin,
              localized: { "pt-BR": { mediaAssetId: "media:foundation-pinyin:pt:v1" } },
            },
          ],
        }),
      })
    );
    // O vídeo precisa falhar AGORA, não quando o DNS do CI desistir.
    //
    // Um `<video>` carregando segura o evento `load` da janela enquanto procura
    // o recurso, e `page.goto` espera esse evento. No Firefox a espera por um
    // host inexistente estourava os 30s da navegação e derrubava o cenário —
    // não por causa do produto, mas por causa do relógio do resolvedor. Cortar
    // a requisição entrega ao player exatamente o mesmo desfecho (mídia
    // indisponível → versão interativa) de forma determinística.
    await page.route("https://cdn.exemplo.com/**", (routeCall) => routeCall.abort());
    await open(page, route(CAPSULES.pinyin));

    const capsule = page.getByTestId("lesson-capsule");
    await expect(capsule).toHaveAttribute("data-capsule-id", CAPSULES.pinyin);
    // Os alvos são os do currículo, não os do manifesto.
    await expect(page.locator("[data-capsule-targets]")).toHaveAttribute(
      "data-capsule-targets",
      "concept:pinyin-map"
    );
  });

  test("13 · override inválido falha fechado e a animação embutida continua", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-mandarim");
    await page.route("**/lessons/catalog.v1.json", (routeCall) =>
      routeCall.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: 1,
          assets: [
            {
              id: "media:hostil:pt:v1",
              version: 1,
              kind: "VIDEO",
              delivery: "DIRECT_MP4",
              url: "javascript:alert(1)",
              durationSeconds: 90,
              spokenLocale: "pt-BR",
              captions: [],
              transcript: "t",
              fallback: "INTERACTIVE_SEGMENTS",
            },
          ],
          presentationOverrides: [
            {
              capsuleId: CAPSULES.pinyin,
              // Duas tentativas ao mesmo tempo: URL insegura e redefinição de
              // currículo. Nenhuma das duas pode encostar na aula.
              topicId: "p1-o-que-e-tom",
              knowledgeTargets: ["chunk:nihao"],
              localized: { "pt-BR": { mediaAssetId: "media:hostil:pt:v1" } },
            },
          ],
        }),
      })
    );
    await open(page, route(CAPSULES.pinyin));

    await expect(capsuleRoot(page)).toBeVisible({ timeout: 15_000 });
    // Dynamic AULA may omit data-capsule-targets chrome; identity still on lesson-capsule.
    const targets = page.locator("[data-capsule-targets]");
    if ((await targets.count()) > 0) {
      await expect(targets).toHaveAttribute("data-capsule-targets", "concept:pinyin-map");
    } else {
      await expect(page.getByTestId("lesson-capsule")).toHaveAttribute("data-capsule-id", CAPSULES.pinyin);
    }
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });
});

test.describe("V4.9.3 — a aula sem depender de animação", () => {
  test("14 · a aula inteira é navegável por teclado e legível por leitor de tela", async ({
    page,
  }) => {
    await seedFreshJourneySession(page);
    await open(page, route(CAPSULES.tone));
    await expect(capsuleRoot(page)).toBeVisible({ timeout: 15_000 });

    // Avançar dois segmentos, só com teclado.
    for (let i = 0; i < 2; i += 1) {
      await capsuleContinue(page).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
    }

    // Dynamic AULA: visual example / fallback is accessible. Legacy: tone contour SVG.
    const contour = page.locator("[data-tone-contour]").first();
    const visual = page.getByTestId("visual-example").or(page.getByTestId("visual-fallback")).first();
    await advanceDynamicUntil(page, visual.or(contour));
    if (await contour.isVisible().catch(() => false)) {
      await expect(contour).toHaveAttribute("role", "img");
      const label = await contour.getAttribute("aria-label");
      expect(Boolean(label && label.length > 8)).toBe(true);
    } else {
      await expect(visual).toBeVisible();
      const label = ((await visual.getAttribute("aria-label")) ?? (await visual.innerText()) ?? "").trim();
      expect(label.length > 4).toBe(true);
    }

    // Finish remaining beats by keyboard; dynamic AULA has no microcheck.
    for (let i = 0; i < 5; i += 1) {
      const advance = capsuleContinue(page);
      if (!(await advance.isVisible().catch(() => false))) break;
      await advance.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      if (await page.getByTestId("dynamic-handoff").isVisible().catch(() => false)) break;
      if (await page.getByTestId("capsule-micro-check").isVisible().catch(() => false)) break;
    }

    const check = page.getByTestId("capsule-micro-check");
    if (await check.isVisible().catch(() => false)) {
      const first = page.getByTestId("capsule-micro-check-option").first();
      await first.focus();
      await expect(first).toBeFocused();
      await page.keyboard.press("Enter");
      const feedback = page.getByTestId("capsule-micro-check-feedback");
      await expect(feedback).toHaveAttribute("role", "status");
      await expect(feedback).toHaveAttribute("aria-live", "polite");
    } else {
      await expect(page.getByTestId("dynamic-handoff").or(capsuleContinue(page))).toBeVisible();
    }

    const transcriptToggle = page.getByTestId("capsule-transcript-toggle");
    if (await transcriptToggle.isVisible().catch(() => false)) {
      await transcriptToggle.click();
      const transcript = page.getByTestId("capsule-transcript");
      await expect(transcript).toBeVisible();
      await expect(transcript).toHaveAttribute("role", "region");
      expect((await transcript.textContent())?.length ?? 0).toBeGreaterThan(40);
    } else {
      // Dynamic AULA teacher lines are the accessible lesson body.
      await expect(page.locator("[data-guided-lesson-title], [data-testid='dynamic-teaching-sequence']").first()).toBeVisible();
    }
  });
});
