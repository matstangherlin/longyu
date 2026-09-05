#!/usr/bin/env node
/**
 * V4.9.3 — Partes Y, H, I, S e T reunidas sobre o conteúdo das cinco aulas.
 *
 * Este script serve a quatro entradas de `package.json` porque as quatro
 * auditam o mesmo conteúdo, e separá-las em quatro arquivos duplicaria o
 * boilerplate de compilação sem acrescentar cobertura. Cada entrada passa
 * `--suite=` e falha sozinha:
 *
 *   core-instruction-slots      os slots são bem formados e canônicos
 *   foundation-capsules         cada aula segue o template e cabe no tempo
 *   capsule-presentation-parity vídeo e animação ensinam a mesma coisa
 *   foundation-locale-parity    PT e EN são cursos iguais, não traduções
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v493-capsules-"));

const SUITES = ["slots", "capsules", "parity", "locale"];
const requested = (process.argv.find((arg) => arg.startsWith("--suite=")) ?? "").slice(8);
if (requested && !SUITES.includes(requested)) {
  console.error(`--suite desconhecida: "${requested}" (use ${SUITES.join(", ")})`);
  process.exit(1);
}
const active = requested ? [requested] : SUITES;
const runs = (suite) => active.includes(suite);

/** Parte H — o arco de uma aula, na ordem em que um ser humano recebe. */
const REQUIRED_KINDS = [
  "ORIENT",
  "EXPLAIN",
  "DEMONSTRATE",
  "NOTICE",
  "MICRO_CHECK",
  "TRANSITION_TO_PRACTICE",
];
/** Parte I — aula curta. Acima disso o Longyu vira curso passivo de vídeo. */
const MAX_DURATION_SECONDS = 4 * 60;
const LOCALES = ["pt-BR", "en"];

try {
  const program = ts.createProgram(
    [
      "src/data/coreInstructionSlots.ts",
      "src/data/foundationCapsules.ts",
      "src/data/pedagogicalSpine.ts",
      "src/data/lessonCatalogSchema.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");

  const slots = require(path.join(outDir, "src/data/coreInstructionSlots.js"));
  const capsulesModule = require(path.join(outDir, "src/data/foundationCapsules.js"));
  const spine = require(path.join(outDir, "src/data/pedagogicalSpine.js"));
  const schema = require(path.join(outDir, "src/data/lessonCatalogSchema.js"));

  const failures = [];
  let assertions = 0;
  const check = (condition, message) => {
    assertions += 1;
    if (!condition) failures.push(message);
  };

  const capsules = capsulesModule.FOUNDATION_WAVE_1_CAPSULES;
  const manifest = new Set(spine.KNOWLEDGE_TARGET_MANIFEST.map((target) => target.id));
  const byId = new Map(capsules.map((capsule) => [capsule.id, capsule]));

  // ── validate:core-instruction-slots ────────────────────────────────────
  if (runs("slots")) {
    const slotList = slots.FOUNDATION_INSTRUCTION_SLOTS;
    check(slotList.length === 5, `esperado 5 slots de fundação, encontrado ${slotList.length}`);

    const seen = new Set();
    for (const slot of slotList) {
      check(!seen.has(slot.id), `slot duplicado: ${slot.id}`);
      seen.add(slot.id);

      // A identidade mora em código: um slot sem cápsula embutida seria um
      // buraco no currículo que só a rede preenche.
      check(byId.has(slot.capsuleId), `${slot.id}: cápsula "${slot.capsuleId}" não existe`);
      check(
        slot.fallbackCapsuleId && byId.has(slot.fallbackCapsuleId),
        `${slot.id}: fallback precisa ser uma cápsula embutida`
      );
      check(
        slot.completionPolicy === "INSTRUCTION_COMPLETED",
        `${slot.id}: instrução não pode ter política de conclusão de avaliação`
      );
      // O invariante mais importante do tipo inteiro.
      check(slot.affectsMastery === false, `${slot.id}: instrução não pode dar mastery`);
      check(slot.knowledgeTargets.length > 0, `${slot.id}: slot sem alvo não ensina nada`);
      for (const target of slot.knowledgeTargets) {
        check(manifest.has(target), `${slot.id}: alvo "${target}" fora do manifesto`);
      }
      if (slot.placement === "BETWEEN_PASSES") {
        check(
          typeof slot.beforePass === "number" && slot.beforePass >= 1,
          `${slot.id}: BETWEEN_PASSES precisa dizer antes de qual pass`
        );
      }

      // Parte A1 — o catálogo nunca pode ocupar este id.
      check(
        slots.reservedCoreCapsuleIds().has(slot.capsuleId),
        `${slot.id}: a cápsula precisa estar entre os ids reservados`
      );
    }

    // Um slot por cápsula e uma cápsula por slot: sem órfãos dos dois lados.
    for (const capsule of capsules) {
      check(
        Boolean(slots.slotForCapsuleId(capsule.id)),
        `cápsula "${capsule.id}" não preenche nenhum slot — seria conteúdo sem lugar`
      );
    }
  }

  // ── validate:foundation-capsules ───────────────────────────────────────
  if (runs("capsules")) {
    check(capsules.length === 5, `esperado 5 cápsulas de fundação, encontrado ${capsules.length}`);

    for (const capsule of capsules) {
      check(
        capsule.mediaType === "ANIMATED_CAPSULE",
        `${capsule.id}: a wave 1 é animada — nenhum vídeo gravado existe ainda`
      );
      check(
        capsule.durationSeconds <= MAX_DURATION_SECONDS,
        `${capsule.id}: ${capsule.durationSeconds}s passa do limite de ${MAX_DURATION_SECONDS}s`
      );

      for (const locale of LOCALES) {
        const content = capsule.localized[locale];
        check(Boolean(content), `${capsule.id}: falta o conteúdo ${locale}`);
        if (!content) continue;

        const kinds = content.segments.map((segment) => segment.kind);

        // Parte H — os seis degraus, todos presentes e na ordem.
        let cursor = -1;
        for (const required of REQUIRED_KINDS) {
          const at = kinds.indexOf(required, cursor + 1);
          check(at > cursor, `${capsule.id}/${locale}: falta ou está fora de ordem: ${required}`);
          if (at > cursor) cursor = at;
        }

        // O microcheck precisa ser real, não decorativo.
        const microChecks = content.segments.filter((segment) => segment.kind === "MICRO_CHECK");
        check(microChecks.length >= 1, `${capsule.id}/${locale}: sem microcheck`);
        for (const segment of microChecks) {
          const item = segment.check;
          check(Boolean(item), `${capsule.id}/${locale}/${segment.id}: MICRO_CHECK sem pergunta`);
          if (!item) continue;
          check(item.options.length >= 2, `${capsule.id}/${locale}/${segment.id}: menos de 2 opções`);
          check(
            item.correctIndex >= 0 && item.correctIndex < item.options.length,
            `${capsule.id}/${locale}/${segment.id}: correctIndex fora das opções`
          );
          check(
            new Set(item.options).size === item.options.length,
            `${capsule.id}/${locale}/${segment.id}: opções repetidas`
          );
          // Errar precisa reensinar. Sem isto, o microcheck vira só um "não".
          check(
            Boolean(item.afterWrong?.trim()),
            `${capsule.id}/${locale}/${segment.id}: errar precisa reensinar em uma frase`
          );
          check(
            Boolean(item.afterCorrect?.trim()),
            `${capsule.id}/${locale}/${segment.id}: acertar precisa fechar o raciocínio`
          );
        }

        // Parte U — a transcrição é a mesma aula para quem não pode ouvir.
        check(
          content.transcript.trim().length > 80,
          `${capsule.id}/${locale}: transcrição curta demais para substituir a aula`
        );
        for (const segment of content.segments) {
          check(segment.title.trim().length > 0, `${capsule.id}/${locale}/${segment.id}: sem título`);
          check(segment.body.trim().length > 0, `${capsule.id}/${locale}/${segment.id}: sem corpo`);
        }
      }

      for (const target of capsule.knowledgeTargets) {
        check(manifest.has(target), `${capsule.id}: alvo "${target}" fora do manifesto`);
      }
    }
  }

  // ── validate:capsule-presentation-parity ───────────────────────────────
  //
  // Parte S. Hoje nenhuma aula tem vídeo, então este é um contrato sobre o
  // FUTURO: quando o vídeo chegar, ele não pode ensinar outra coisa. A prova
  // é feita simulando a publicação — um override real atravessando o mesmo
  // parser que roda em produção — e comparando o que sai com o que entrou.
  if (runs("parity")) {
    for (const capsule of capsules) {
      const parsed = schema.parseLessonCatalog({
        version: 1,
        assets: LOCALES.map((locale) => ({
          id: `media:parity:${locale}:v1`,
          version: 1,
          kind: "VIDEO",
          delivery: "DIRECT_MP4",
          url: "https://cdn.exemplo.com/aula.mp4",
          durationSeconds: capsule.durationSeconds,
          spokenLocale: locale,
          captions: [],
          transcript: "t",
          fallback: "INTERACTIVE_SEGMENTS",
        })),
        presentationOverrides: [
          {
            capsuleId: capsule.id,
            localized: Object.fromEntries(
              LOCALES.map((locale) => [locale, { mediaAssetId: `media:parity:${locale}:v1` }])
            ),
          },
        ],
      });

      check(
        parsed.problems.length === 0,
        `${capsule.id}: publicar vídeo para esta aula seria recusado: ${JSON.stringify(parsed.problems)}`
      );
      check(
        parsed.presentationOverrides.length === 1,
        `${capsule.id}: o override de vídeo precisa ser aceito`
      );
      // O que o override NÃO pode carregar. Se um dia algum destes campos
      // aparecer no tipo, esta asserção quebra e alguém precisa justificar.
      const override = parsed.presentationOverrides[0] ?? {};
      for (const forbidden of ["topicId", "knowledgeTargets", "completionRule", "priority"]) {
        check(
          !(forbidden in override),
          `${capsule.id}: override carregou "${forbidden}" — identidade não é apresentação`
        );
      }
      for (const locale of LOCALES) {
        const entry = override.localized?.[locale] ?? {};
        check(
          Object.keys(entry).length === 1 && "mediaAssetId" in entry,
          `${capsule.id}/${locale}: o override só pode dizer qual mídia tocar`
        );
      }
    }
  }

  // ── validate:foundation-locale-parity ──────────────────────────────────
  //
  // Parte T. PT e EN não precisam ser tradução literal — as explicações usam a
  // intuição de cada idioma. O que não pode variar é o chinês, a competência
  // ensinada e o tamanho da aula.
  if (runs("locale")) {
    for (const capsule of capsules) {
      const pt = capsule.localized["pt-BR"];
      const en = capsule.localized.en;
      if (!pt || !en) continue;

      check(
        pt.segments.length === en.segments.length,
        `${capsule.id}: PT tem ${pt.segments.length} segmentos e EN tem ${en.segments.length}`
      );
      pt.segments.forEach((segment, index) => {
        const other = en.segments[index];
        if (!other) return;
        check(
          segment.id === other.id,
          `${capsule.id}: segmento ${index + 1} tem ids diferentes (${segment.id} × ${other.id})`
        );
        check(
          segment.kind === other.kind,
          `${capsule.id}/${segment.id}: PT é ${segment.kind} e EN é ${other.kind}`
        );
        // O chinês é a mesma língua nos dois cursos. Se o hànzì, o pinyin ou o
        // contorno do tom divergem, os dois cursos deixaram de ensinar a mesma
        // coisa e a paridade virou aparência.
        check(
          (segment.hanzi ?? "") === (other.hanzi ?? ""),
          `${capsule.id}/${segment.id}: hànzì difere entre PT e EN`
        );
        check(
          (segment.pinyin ?? "") === (other.pinyin ?? ""),
          `${capsule.id}/${segment.id}: pinyin difere entre PT e EN`
        );
        check(
          (segment.audioText ?? "") === (other.audioText ?? ""),
          `${capsule.id}/${segment.id}: o áudio falado difere entre PT e EN`
        );
        check(
          (segment.toneContour ?? 0) === (other.toneContour ?? 0),
          `${capsule.id}/${segment.id}: o contorno de tom difere entre PT e EN`
        );
        check(
          (segment.components ?? []).map((part) => part.glyph).join("") ===
            (other.components ?? []).map((part) => part.glyph).join(""),
          `${capsule.id}/${segment.id}: as peças do hànzì diferem entre PT e EN`
        );
        // O rótulo da peça é tradução legítima; o glifo não.
        (segment.components ?? []).forEach((part, partIndex) => {
          const otherPart = other.components?.[partIndex];
          check(
            Boolean(otherPart?.label?.trim()),
            `${capsule.id}/${segment.id}: peça ${part.glyph} sem rótulo em EN`
          );
        });
        if (segment.check && other.check) {
          check(
            segment.check.options.length === other.check.options.length,
            `${capsule.id}/${segment.id}: número de opções difere entre PT e EN`
          );
          check(
            segment.check.correctIndex === other.check.correctIndex,
            `${capsule.id}/${segment.id}: a resposta certa está em posições diferentes`
          );
        } else {
          check(
            Boolean(segment.check) === Boolean(other.check),
            `${capsule.id}/${segment.id}: um idioma tem microcheck e o outro não`
          );
        }
      });

      // Duração é a mesma porque é a mesma aula; o objetivo existe nos dois.
      check(Boolean(pt.objective?.trim()), `${capsule.id}: objetivo PT ausente`);
      check(Boolean(en.objective?.trim()), `${capsule.id}: objetivo EN ausente`);
      check(Boolean(pt.title?.trim()) && Boolean(en.title?.trim()), `${capsule.id}: título ausente`);
    }
  }

  const label = requested ? `validate:foundation-capsules --suite=${requested}` : "validate:foundation-capsules";
  if (failures.length) {
    console.error(`FAIL ${label}`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${label} — ${assertions} asserções em: ${active.join(", ")}.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
