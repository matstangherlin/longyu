import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  dismissBlockingOverlays,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";

/**
 * V4.9.2B — o runtime de mídia da aula, do catálogo ao pixel.
 *
 * O objetivo central da remessa é que publicar uma aula deixe de exigir uma
 * reconstrução do app. Estes testes são a prova disso: nenhuma aula em vídeo
 * existe no repositório, e mesmo assim o app abaixo toca uma — porque ela
 * chega por um catálogo servido em runtime, exatamente como chegaria em
 * produção. Se algum dia isso voltar a exigir build, estes testes quebram.
 *
 * O fixture é vídeo de verdade (`scripts/make-lesson-media-fixture.mjs`), não
 * um `<video>` simulado. Duração, `timeupdate`, seek e cobertura assistida só
 * significam alguma coisa quando o navegador está decodificando um arquivo.
 */

const FIXTURE = readFileSync(path.join(process.cwd(), "e2e/fixtures/lesson-media-probe.webm"));
const CATALOG_URL = "**/lessons/catalog.v1.json";
const VIDEO_PATH = "/e2e-media/lesson-probe.webm";
const CAPSULE_ID = "capsule:e2e-video:v1";
const CAPSULE_URL = `/jornada/capsula/${encodeURIComponent(CAPSULE_ID)}`;

const segment = (id: string, title: string) => ({
  id,
  kind: "EXPLAIN",
  title,
  body: "Conteúdo de apoio da aula publicada.",
});

const localized = (title: string, mediaAssetId: string) => ({
  title,
  objective: "Objetivo da aula publicada em runtime.",
  transcript: "Linha um da transcrição. Linha dois da transcrição.",
  segments: [segment("s1", `${title} — parte 1`), segment("s2", `${title} — parte 2`)],
  mediaAssetId,
});

/** Catálogo válido com uma aula em vídeo — o caso que prova o objetivo. */
function publishedCatalog(overrides: Record<string, unknown> = {}) {
  const asset = (id: string, spokenLocale: string) => ({
    id,
    version: 1,
    kind: "VIDEO",
    delivery: "DIRECT_MP4",
    url: VIDEO_PATH,
    mimeType: "video/webm",
    durationSeconds: 12,
    spokenLocale,
    captions: [
      { startSeconds: 0, endSeconds: 4, text: "Primeira legenda da aula." },
      { startSeconds: 4, endSeconds: 12, text: "Segunda legenda da aula." },
    ],
    transcript: "Transcrição do asset.",
    fallback: "INTERACTIVE_SEGMENTS",
  });

  return {
    version: 1,
    assets: [asset("media:e2e:pt:v1", "pt-BR"), asset("media:e2e:en:v1", "en")],
    capsules: [
      {
        id: CAPSULE_ID,
        topicId: "p1-o-que-e-pinyin",
        afterTopicId: "p1-o-que-e-pinyin",
        mediaType: "VIDEO_CAPSULE",
        durationSeconds: 12,
        completionRule: "MEDIA_ENDED",
        knowledgeTargets: ["chunk:nihao"],
        localized: {
          "pt-BR": localized("Aula publicada em runtime", "media:e2e:pt:v1"),
          en: localized("Runtime published lesson", "media:e2e:en:v1"),
        },
      },
    ],
    ...overrides,
  };
}

async function serveCatalog(page: Page, body: unknown) {
  await page.route(CATALOG_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  );
}

async function serveVideo(page: Page) {
  await page.route(`**${VIDEO_PATH}`, (route) =>
    route.fulfill({ status: 200, contentType: "video/webm", body: FIXTURE })
  );
}

/** Uma sessão já dentro da fundação, para a trilha do tópico estar visível. */
async function seedLearner(page: Page) {
  await seedUnlockedLessonSession(page, "p1-primeiros-hanzi", {
    learnedChunks: ["nihao"],
    learnedChars: ["ni", "hao"],
  });
}

/**
 * Nem todo motor de mídia do Playwright decodifica VP8. Onde não decodifica, o
 * comportamento CORRETO do produto não é "tela preta": é cair no fallback
 * interativo da Parte O. Os testes que dependem de decodificação verificam a
 * capacidade primeiro e afirmam o caminho certo para aquele navegador — nunca
 * pulam, porque um teste pulado não prova nada.
 */
async function canDecodeFixture(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const probe = document.createElement("video");
    return probe.canPlayType('video/webm; codecs="vp8"') === "probably";
  });
}

async function openPublishedCapsule(page: Page) {
  await page.goto(CAPSULE_URL);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

test.describe("V4.9.2B — catálogo de aulas em runtime", () => {
  test("1 · aula publicada abre sem que o app tenha sido reconstruído", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await openPublishedCapsule(page);

    // A aula não existe em nenhum arquivo TypeScript do repositório.
    await expect(page.getByTestId("lesson-capsule")).toHaveAttribute("data-capsule-id", CAPSULE_ID);
    await expect(page.getByRole("heading", { name: "Aula publicada em runtime" })).toBeVisible();
  });

  test("2 · o vídeo publicado é realmente decodificado e avança", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await openPublishedCapsule(page);

    if (!(await canDecodeFixture(page))) {
      // Sem codec, o contrato é o fallback — e ele precisa aparecer sozinho.
      await expect(page.getByTestId("capsule-animated")).toBeVisible({ timeout: 15_000 });
      return;
    }

    await expect(page.getByTestId("capsule-video-player")).toBeVisible();
    const advanced = await page.evaluate(async () => {
      const video = document.querySelector("video");
      if (!video) return { duration: 0, played: 0 };
      video.muted = true;
      await new Promise((resolve) => {
        if (video.readyState >= 1) resolve(null);
        else video.addEventListener("loadedmetadata", () => resolve(null), { once: true });
      });
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { duration: video.duration, played: video.currentTime };
    });
    expect(advanced.duration).toBeGreaterThan(10);
    expect(advanced.played).toBeGreaterThan(0.3);
  });

  test("3 · a aula publicada aparece na trilha, depois do tópico que a ancora", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const published = page.locator(`[data-journey-inline-node="node:published:${CAPSULE_ID}"]`);
    await expect(published).toBeVisible({ timeout: 15_000 });
    // Conteúdo publicado sem code review acrescenta; nunca tranca ninguém.
    await expect(published).toHaveAttribute("data-ready", "true");
    await expect(published).toContainText("Aula publicada em runtime");
  });

  test("4 · URL insegura no catálogo derruba a aula, não o app", async ({ page }) => {
    await seedLearner(page);
    const hostile = publishedCatalog();
    (hostile.assets as Array<{ url: string }>)[0].url = "javascript:alert(1)";
    await serveCatalog(page, hostile);
    await openPublishedCapsule(page);

    // A cápsula inteira é recusada: o asset PT é inválido.
    await expect(page.getByTestId("lesson-capsule")).toHaveCount(0);
    await expect(page.getByText(/Cápsula indisponível|Lesson capsule unavailable/)).toBeVisible();
  });

  test("5 · catálogo ausente mantém a Jornada e a cápsula embutida intactas", async ({ page }) => {
    await seedLearner(page);
    await page.route(CATALOG_URL, (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto("/jornada/capsula/capsule%3Apinyin-foundation%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByTestId("lesson-capsule")).toHaveAttribute(
      "data-capsule-id",
      "capsule:pinyin-foundation:v1"
    );
    await expect(page.getByTestId("capsule-animated")).toBeVisible();
  });

  test("6 · catálogo corrompido não tira nenhuma aula embutida do ar", async ({ page }) => {
    await seedLearner(page);
    await page.route(CATALOG_URL, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{isto não é json" })
    );
    await page.goto("/jornada/capsula/capsule%3Apinyin-foundation%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("capsule-animated")).toBeVisible();
  });

  test("7 · versão de catálogo não suportada é ignorada por inteiro", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog({ version: 99 }));
    await serveVideo(page);
    await openPublishedCapsule(page);
    await expect(page.getByText(/Cápsula indisponível|Lesson capsule unavailable/)).toBeVisible();
  });

  test("8 · a aula publicada fala o idioma do curso, não o do último aluno", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await page.addInitScript(() => {
      localStorage.setItem("longyu:instruction-locale", "en");
      localStorage.setItem("longyu:instruction-locale-user-override", "1");
    });
    await openPublishedCapsule(page);

    await expect(page.getByRole("heading", { name: "Runtime published lesson" })).toBeVisible();
    const src = await page.locator("video").getAttribute("src").catch(() => null);
    if (src) expect(src).toContain(VIDEO_PATH);
  });
});

test.describe("V4.9.2B — player, transcrição e fallback", () => {
  test("9 · vídeo que não carrega vira caminho, não spinner", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    // O arquivo existe no catálogo mas não no servidor: o caso real de um
    // deploy de mídia incompleto.
    await page.route(`**${VIDEO_PATH}`, (route) => route.fulfill({ status: 500, body: "" }));
    await openPublishedCapsule(page);

    // O produto não troca a aula por baixo do aluno: ele diz o que houve e
    // oferece as duas saídas. Ambas precisam existir — só o aviso seria um
    // beco sem saída com texto bonito.
    const error = page.getByTestId("capsule-media-error");
    await expect(error).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("capsule-media-retry")).toBeVisible();
    await expect(page.getByTestId("capsule-media-fallback")).toBeVisible();
  });

  test("10 · a versão interativa leva a aula até a conclusão", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await page.route(`**${VIDEO_PATH}`, (route) => route.abort("failed"));
    await openPublishedCapsule(page);

    await page.getByTestId("capsule-media-fallback").click({ timeout: 20_000 });
    await expect(page.getByTestId("capsule-fallback-notice")).toBeVisible();

    // Dois segmentos publicados: o primeiro clique avança, e o segundo botão
    // precisa ser o de concluir — senão a cápsula CORE ficaria sem saída.
    const advance = page.getByTestId("capsule-continue");
    await expect(advance).toBeVisible();
    await advance.click();
    await expect(page.getByTestId("capsule-continue")).toContainText(
      /Iniciar exercícios|Start the exercises/
    );
  });

  test("11 · a transcrição abre e mostra as legendas com marca de tempo", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await openPublishedCapsule(page);

    await page.getByTestId("capsule-transcript-toggle").click();
    const transcript = page.getByTestId("capsule-transcript");
    await expect(transcript).toBeVisible();
    await expect(transcript).toContainText("Primeira legenda da aula.");
    await expect(transcript).toContainText("0:00");
  });

  test("12 · texto de autoria é texto, nunca HTML executado", async ({ page }) => {
    await seedLearner(page);
    const injected = publishedCatalog();
    const ptLocalized = (injected.capsules as Array<{ localized: Record<string, { transcript: string }> }>)[0]
      .localized["pt-BR"];
    ptLocalized.transcript = '<img src=x onerror="window.__xss=1">TEXTO';
    (injected.assets as Array<{ captions: unknown[] }>)[0].captions = [];
    await serveCatalog(page, injected);
    await serveVideo(page);
    await openPublishedCapsule(page);

    await page.getByTestId("capsule-transcript-toggle").click();
    const transcript = page.getByTestId("capsule-transcript");
    // A tag aparece escrita, e nenhum elemento foi criado a partir dela.
    await expect(transcript).toContainText("<img src=x");
    await expect(transcript.locator("img")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test("13 · arrastar até o fim não conclui a aula", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await openPublishedCapsule(page);

    if (!(await canDecodeFixture(page))) {
      await expect(page.getByTestId("capsule-animated")).toBeVisible({ timeout: 15_000 });
      return;
    }

    const player = page.getByTestId("capsule-video-player");
    await expect(player).toBeVisible();
    await page.evaluate(async () => {
      const video = document.querySelector("video");
      if (!video) return;
      await new Promise((resolve) => {
        if (video.readyState >= 1) resolve(null);
        else video.addEventListener("loadedmetadata", () => resolve(null), { once: true });
      });
      video.currentTime = video.duration - 0.2;
    });
    await page.waitForTimeout(600);

    // Pular para o fim não pode virar conclusão: a cobertura é a união dos
    // trechos que realmente passaram.
    await expect(player).toHaveAttribute("data-completed", "false");
    const coverage = Number(await player.getAttribute("data-coverage"));
    expect(coverage).toBeLessThan(0.9);
  });

  test("14 · retomada não é oferecida a quem mal começou", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    // Progresso de 1 segundo: retomar não devolveria nada ao aluno.
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      {
        key: "longyu:media-playback-progress:v1",
        value: {
          [`${CAPSULE_ID}::media:e2e:pt:v1::1::pt-BR`]: {
            capsuleId: CAPSULE_ID,
            mediaAssetId: "media:e2e:pt:v1",
            mediaVersion: 1,
            instructionLocale: "pt-BR",
            currentTimeSeconds: 1,
            durationSeconds: 12,
            watchedRanges: [{ start: 0, end: 1 }],
            maxPositionSeconds: 1,
            completed: false,
            updatedAt: Date.now(),
          },
        },
      }
    );
    await openPublishedCapsule(page);

    if (!(await canDecodeFixture(page))) {
      await expect(page.getByTestId("capsule-animated")).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(page.getByTestId("capsule-video-player")).toBeVisible();
    await expect(page.getByTestId("capsule-media-resume")).toHaveCount(0);
  });

  test("15 · a cápsula animada não baixa o runtime de vídeo", async ({ page }) => {
    await seedLearner(page);
    await page.route(CATALOG_URL, (route) => route.fulfill({ status: 404, body: "" }));

    const chunks: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.endsWith(".js")) chunks.push(url);
    });

    await page.goto("/jornada/capsula/capsule%3Apinyin-foundation%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("capsule-animated")).toBeVisible();

    // Parte X: quem estuda pela cápsula animada não paga pelo player de vídeo.
    expect(chunks.filter((url) => /VideoCapsulePlayer/i.test(url))).toHaveLength(0);
  });

  test("16 · a cápsula embutida continua a mesma com catálogo publicado no ar", async ({ page }) => {
    await seedLearner(page);
    await serveCatalog(page, publishedCatalog());
    await serveVideo(page);
    await page.goto("/jornada/capsula/capsule%3Apinyin-foundation%3Av1");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByTestId("lesson-capsule")).toHaveAttribute(
      "data-capsule-id",
      "capsule:pinyin-foundation:v1"
    );
    await expect(page.getByTestId("capsule-animated")).toBeVisible();
    // O primeiro segmento é de orientação e não traz hànzì; o segundo é onde
    // 你好 aparece. É esse conteúdo que o catálogo publicado não pode alterar.
    await page.getByTestId("capsule-continue").click();
    await expect(page.getByTestId("capsule-language-card")).toContainText("你好");
  });
});
