#!/usr/bin/env node
/**
 * V4.9.3 — Parte K: o pacote de produção de cada aula da fundação.
 *
 * Os arquivos são GERADOS a partir das cápsulas, e não escritos à mão, e a
 * razão é a Parte S: a versão gravada não pode ensinar uma coisa e a animada
 * outra. Um roteiro escrito à parte começa igual e diverge no primeiro ajuste
 * de copy — meses depois ninguém lembra qual dos dois é o certo.
 *
 * Gerando, o roteiro é a aula. Mudar o texto da cápsula muda o roteiro na
 * próxima execução, e `--check` reprova se alguém esquecer de regerar.
 *
 * O que este script NÃO faz: inventar vídeo. Ele produz roteiro, storyboard,
 * transcrição, rascunho de legenda e requisitos de mídia. O MP4 é trabalho
 * humano, e enquanto não existir, `productionVideoAsset = NONE`.
 *
 * Uso:
 *   node scripts/build-foundation-production-packs.mjs          # escreve
 *   node scripts/build-foundation-production-packs.mjs --check  # só verifica
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v493-packs-"));
const contentRoot = path.join(rootDir, "docs/content/foundation-wave-1");
const checkOnly = process.argv.includes("--check");

/**
 * Ritmo de narração assumido para o rascunho de legenda.
 *
 * É estimativa declarada, não medição: sem áudio gravado não há timing real.
 * O locutor ajusta na edição — o rascunho existe para que ninguém precise
 * começar do zero, e para que a contagem de blocos já esteja certa.
 */
const CHARS_PER_SECOND = 14;
const MIN_CUE_SECONDS = 2.2;

function stamp(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const ms = Math.round((Math.max(0, seconds) - whole) * 1000);
  const hh = String(Math.floor(whole / 3600)).padStart(2, "0");
  const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
  const ss = String(whole % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${String(ms).padStart(3, "0")}`;
}

/** Uma fala por segmento; a duração vem do tamanho do texto. */
function cuesFor(content) {
  let cursor = 0;
  return content.segments.map((segment) => {
    const text = segment.body.replace(/\s+/g, " ").trim();
    const duration = Math.max(MIN_CUE_SECONDS, text.length / CHARS_PER_SECOND);
    const cue = { start: cursor, end: cursor + duration, text, segment };
    cursor += duration;
    return cue;
  });
}

function vtt(content) {
  const blocks = cuesFor(content).map(
    (cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`
  );
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

const KIND_DIRECTION = {
  ORIENT: "Dragão em quadro, olhando para a câmera. Sem texto na tela ainda.",
  EXPLAIN: "Dragão de lado; o texto-chave entra à direita, uma linha por vez.",
  DEMONSTRATE: "Plano fechado no que está em tela.",
  NOTICE: "Destaque sobre o elemento que muda; o resto esmaece.",
  COMPARE: "Divisão em dois: o item anterior à esquerda, o novo à direita.",
  CONTEXT: "Plano aberto com a cena de uso.",
  REPLAY: "Repetição do plano anterior, sem narração nova.",
  MICRO_CHECK: "Congelar. A pergunta entra sobre o quadro parado; sem locução por cima das opções.",
  CHECK: "Congelar com o resumo em tela.",
  TRANSITION_TO_PRACTICE: "Dragão aponta para fora do quadro; corte para o exercício.",
};

/**
 * A direção de um plano depende do que ele mostra, não só do tipo.
 *
 * "Foco no hànzì, o áudio toca aqui" num plano que só tem pinyin e nenhum
 * áudio manda o locutor fazer algo impossível — e um roteiro que descreve
 * errado o próprio plano é pior do que um roteiro sem direção.
 */
function directionFor(segment) {
  const base = KIND_DIRECTION[segment.kind] ?? "—";
  if (segment.kind !== "DEMONSTRATE" && segment.kind !== "NOTICE") return base;

  const parts = [];
  if (segment.components?.length) {
    parts.push(
      `Peças ${segment.components.map((part) => part.glyph).join(" + ")} entram separadas e depois se juntam em ${segment.hanzi ?? "—"}`
    );
  } else if (segment.hanzi) {
    parts.push(`${segment.hanzi} em tela cheia`);
  }
  if (segment.toneContour) parts.push(`traçar o contorno do ${segment.toneContour}º tom junto com a locução`);
  if (segment.pinyin && !segment.hanzi) parts.push(`pinyin ${segment.pinyin} em destaque`);
  parts.push(segment.audioText ? `o áudio em mandarim toca aqui (${segment.audioText})` : "sem áudio em mandarim neste plano");
  return `${parts.join("; ")}.`;
}

function scriptMarkdown(capsule, locale, content) {
  const localeName = locale === "en" ? "English" : "Português";
  const cues = cuesFor(content);
  const total = cues.length ? cues[cues.length - 1].end : 0;

  return [
    `# ${content.title} — roteiro (${localeName})`,
    "",
    `- **capsuleId**: \`${capsule.id}\``,
    `- **topicId**: \`${capsule.topicId}\``,
    `- **duração alvo**: ~${Math.round(capsule.durationSeconds / 60)} min (narração estimada em ${Math.round(total)}s)`,
    `- **objetivo**: ${content.objective}`,
    "",
    "> Gerado de `src/data/foundationCapsules.ts` por",
    "> `npm run build:foundation-packs`. Não edite aqui: edite a cápsula e",
    "> regere, senão a aula gravada passa a ensinar algo que a animada não",
    "> ensina.",
    "",
    "## Falas",
    "",
    ...content.segments.flatMap((segment, index) => {
      const cue = cues[index];
      const lines = [
        `### ${index + 1}. ${segment.title}  \`${segment.kind}\``,
        "",
        `**Locução:** ${segment.body}`,
        "",
        `**Em tela:** ${[
          segment.hanzi && `hànzì ${segment.hanzi}`,
          segment.pinyin && `pinyin ${segment.pinyin}`,
          segment.meaning && `significado "${segment.meaning}"`,
          segment.toneContour && `contorno do ${segment.toneContour}º tom`,
          segment.components?.length &&
            `peças ${segment.components.map((part) => `${part.glyph} (${part.label})`).join(" + ")}`,
        ]
          .filter(Boolean)
          .join(" · ") || "—"}`,
        "",
        `**Áudio mandarim:** ${segment.audioText ? `\`${segment.audioText}\`` : "—"}`,
        "",
        `**Direção:** ${directionFor(segment)}`,
        "",
        `**Tempo estimado:** ${stamp(cue.start)} → ${stamp(cue.end)}`,
        "",
      ];
      if (segment.check) {
        lines.push(
          "**Microcheck (não narrar as opções):**",
          "",
          `- Pergunta: ${segment.check.prompt}`,
          ...segment.check.options.map(
            (option, optionIndex) =>
              `- ${optionIndex === segment.check.correctIndex ? "**✔**" : "○"} ${option}`
          ),
          `- Se acertar: ${segment.check.afterCorrect}`,
          `- Se errar: ${segment.check.afterWrong}`,
          ""
        );
      }
      return lines;
    }),
  ].join("\n");
}

function storyboardMarkdown(capsule) {
  const pt = capsule.localized["pt-BR"];
  const en = capsule.localized.en;
  return [
    `# ${pt.title} — storyboard`,
    "",
    `- **capsuleId**: \`${capsule.id}\``,
    `- **planos**: ${pt.segments.length}`,
    "",
    "O storyboard é único para os dois idiomas: o que muda entre PT e EN é a",
    "locução, nunca o que aparece em tela. Se um plano precisar ser diferente",
    "em um dos idiomas, a paridade da Parte T foi quebrada e o problema está",
    "na cápsula, não aqui.",
    "",
    "| # | plano | em tela | direção | PT | EN |",
    "| --- | --- | --- | --- | --- | --- |",
    ...pt.segments.map((segment, index) => {
      const onScreen =
        [
          segment.hanzi,
          segment.pinyin,
          segment.toneContour && `tom ${segment.toneContour}`,
          segment.components?.map((part) => part.glyph).join("+"),
        ]
          .filter(Boolean)
          .join(" · ") || "—";
      return `| ${index + 1} | ${segment.kind} | ${onScreen} | ${directionFor(segment)} | ${segment.title} | ${en.segments[index]?.title ?? "—"} |`;
    }),
    "",
  ].join("\n");
}

function mediaRequirements(capsule) {
  const pt = capsule.localized["pt-BR"];
  const hasAudio = pt.segments.some((segment) => segment.audioText);
  return [
    `# ${pt.title} — requisitos de mídia`,
    "",
    `- **capsuleId**: \`${capsule.id}\``,
    `- **duração alvo**: ~${Math.round(capsule.durationSeconds / 60)} min`,
    "",
    "## Arquivos a produzir",
    "",
    `| arquivo | idioma falado | status |`,
    `| --- | --- | --- |`,
    `| \`foundation-${slugFor(capsule)}-pt-v1.mp4\` | pt-BR | **NONE** |`,
    `| \`foundation-${slugFor(capsule)}-en-v1.mp4\` | en | **NONE** |`,
    "",
    "`NONE` não é pendência esquecida: é a Parte K1. Enquanto não existir o",
    "arquivo gravado, nenhuma URL é cadastrada e a aula animada permanece a",
    "versão oficial — que já ensina o conteúdo inteiro.",
    "",
    "## Requisitos técnicos",
    "",
    "- Entrega `https` same-origin ou CDN https. `http:`, `data:` e",
    "  protocol-relative são recusados pelo catálogo, não por convenção.",
    "- Um arquivo por idioma falado. Material sem voz pode declarar",
    "  `languageNeutral` e servir os dois cursos.",
    `- Áudio em mandarim${hasAudio ? " gravado por falante nativo nos trechos marcados no roteiro" : ": não há trecho falado nesta aula"}.`,
    "- Legendas: partir de `captions-*.vtt` e ajustar ao áudio real. Os tempos",
    "  do rascunho são estimados por tamanho de texto, não medidos.",
    "",
    "## Como publicar quando o arquivo existir",
    "",
    "1. Subir os dois MP4 num host https.",
    "2. Em `public/lessons/catalog.v1.json`, acrescentar os dois assets e um",
    "   `presentationOverrides` apontando para esta `capsuleId`.",
    "3. `npm run validate:lesson-catalog`.",
    "4. Publicar o JSON.",
    "",
    "A cápsula não muda de id, de tópico, de alvos nem de regra de conclusão —",
    "o override só troca qual mídia toca. Ver `docs/authoring/lesson-catalog.md`.",
    "",
  ].join("\n");
}

function slugFor(capsule) {
  return capsule.id.replace(/^capsule:foundation:/, "").replace(/:v\d+$/, "");
}

try {
  const program = ts.createProgram(["src/data/foundationCapsules.ts", "src/data/coreInstructionSlots.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");

  const capsulesModule = require(path.join(outDir, "src/data/foundationCapsules.js"));
  const slots = require(path.join(outDir, "src/data/coreInstructionSlots.js"));

  const stale = [];
  let written = 0;

  for (const capsule of capsulesModule.FOUNDATION_WAVE_1_CAPSULES) {
    const slug = slugFor(capsule);
    const dir = path.join(contentRoot, slug);
    const slot = slots.slotForCapsuleId(capsule.id);

    const files = {
      "script-pt.md": scriptMarkdown(capsule, "pt-BR", capsule.localized["pt-BR"]),
      "script-en.md": scriptMarkdown(capsule, "en", capsule.localized.en),
      "storyboard.md": storyboardMarkdown(capsule),
      "transcript-pt.txt": `${capsule.localized["pt-BR"].transcript}\n`,
      "transcript-en.txt": `${capsule.localized.en.transcript}\n`,
      "captions-pt.vtt": vtt(capsule.localized["pt-BR"]),
      "captions-en.vtt": vtt(capsule.localized.en),
      "media-requirements.md": mediaRequirements(capsule),
      "knowledge-targets.json": `${JSON.stringify(
        {
          capsuleId: capsule.id,
          instructionSlotId: slot?.id ?? null,
          topicId: capsule.topicId,
          placement: slot?.placement ?? null,
          completionPolicy: slot?.completionPolicy ?? null,
          affectsMastery: slot?.affectsMastery ?? false,
          knowledgeTargets: capsule.knowledgeTargets,
          productionVideoAssetPt: "NONE",
          productionVideoAssetEn: "NONE",
        },
        null,
        2
      )}\n`,
    };

    if (!checkOnly) await mkdir(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) {
      const target = path.join(dir, name);
      if (checkOnly) {
        const current = await readFile(target, "utf8").catch(() => null);
        if (current !== body) stale.push(path.relative(rootDir, target));
      } else {
        await writeFile(target, body, "utf8");
        written += 1;
      }
    }
  }

  if (checkOnly) {
    if (stale.length) {
      console.error("FAIL build:foundation-packs --check — pacotes desatualizados:");
      for (const file of stale) console.error(` - ${file}`);
      console.error("Rode `npm run build:foundation-packs`.");
      process.exitCode = 1;
    } else {
      console.log(
        `PASS build:foundation-packs --check — os pacotes das ${capsulesModule.FOUNDATION_WAVE_1_CAPSULES.length} aulas refletem as cápsulas.`
      );
    }
  } else {
    console.log(`OK ${written} arquivos em docs/content/foundation-wave-1/.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
