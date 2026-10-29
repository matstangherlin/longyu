#!/usr/bin/env node
/**
 * QA 2026-10 · prompt 20 — LGY-016, LGY-017, LGY-033, LGY-034 · R-07.
 *
 * 1. A tabela R-07 sai de `chargeCostFor`: 1ª rodada de tema novo = 1,
 *    rodada 2 = 0, replay = 0, teste de módulo = 1.
 * 2. `describeAccess` responde para TODA atividade, e o rótulo bate com o custo.
 * 3. O horário de renovação segue o relógio certo (local × servidor em UTC).
 * 4. Estático: copy de atividade grátis não promete cobrança, `economy.ts`
 *    aponta para a política, o store cobra pelo `chargeCostFor` e cada
 *    chamador `extra_training` diz que não cobra.
 */
process.env.TZ = "America/Sao_Paulo";

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (rel) => readFile(path.join(root, rel), "utf8");
const out = await mkdtemp(path.join(os.tmpdir(), "longyu-energy-"));

/** Frase que promete Carga numa atividade grátis (o que o LGY-016 achou). */
// Histórias ficam fora: a linha da Imersão fala de sessão (cobra) e história (não) juntas.
const FREE_ACTIVITY = /(pinyin|h[àa]nz[ìi]|\bsom\b|\bfala\b|leitura)/i;
const CHARGES_VERB = /(com cargas|consom\w* cargas?|consume\w* charges?|usa(m)? (1 |uma )?cargas?|gasta\w* (1 )?cargas?|limite de cargas|with charges)/i;
const NEGATED = /(n[ãa]o|nunca|sem usar|grátis e|don't|doesn't|never|no charge)/i;
const FORBIDDEN = /(gr[áa]tis com cargas|free with charges|consomem cargas|usa uma carga por sess[ãa]o|limite de cargas no gr[áa]tis|consome cargas no plano gr[áa]tis)/i;

function copyViolations(text) {
  return text
    .split("\n")
    .filter((line) => FORBIDDEN.test(line) || (FREE_ACTIVITY.test(line) && CHARGES_VERB.test(line) && !NEGATED.test(line)));
}

/** Strings e texto JSX de uma tela (sem comentários). */
function visibleCopy(source) {
  const noComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const literals = noComments.match(/"[^"\n]*"|`[^`\n]*`|>[^<>{}\n]+</g) ?? [];
  return literals.join("\n");
}

try {
  const program = ts.createProgram(["src/lib/energyPolicy.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir: out,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) process.exit(1);
  await writeFile(path.join(out, "package.json"), "{\"type\":\"commonjs\"}\n");
  const api = createRequire(import.meta.url)(path.join(out, "src/lib/energyPolicy.js"));

  // ——— 1. R-07 ———
  assert.equal(api.chargeCostFor("lesson", { lessonCompleted: false }), 1, "R-07: 1ª rodada de tema novo = 1");
  assert.equal(api.chargeCostFor("lesson", { lessonCompleted: true }), 0, "R-07: rodada 2 de tema iniciado = 0");
  assert.equal(api.chargeCostFor("lesson", { lessonCompleted: true }), 0, "R-07: replay = 0");
  assert.equal(api.chargeCostFor("module_challenge"), 1, "R-07: teste de módulo = 1");
  assert.equal(api.chargeCostFor("immersion_session"), 1, "sessão de escuta nova = 1");
  assert.equal(api.chargeCostFor("immersion_session", { sessionCompleted: true }), 0, "reouvir hoje = 0");
  assert.equal(api.chargeCostFor("immersion_session", { freeStory: true }), 0, "história = 0");
  assert.equal(api.chargeCostFor("premium_preview"), 1, "prévia do Pro = 1");
  const FREE = ["extra_training", "essential_review", "library", "atlas", "settings", "account", "progress"];
  for (const activity of FREE) assert.equal(api.chargeCostFor(activity), 0, `${activity} nunca cobra`);

  // ——— 2. describeAccess para todas ———
  const ALL = ["lesson", "module_challenge", "immersion_session", "premium_preview", ...FREE];
  const pt = (await read("src/locales/pt-BR.ts")).match(/energyAccess: \{([\s\S]*?)\n {2}\},/)?.[1] ?? "";
  const en = (await read("src/locales/en.ts")).match(/energyAccess: \{([\s\S]*?)\n {2}\},/)?.[1] ?? "";
  assert.ok(pt && en, "energyAccess existe em pt-BR e en");
  for (const activity of ALL) {
    for (const context of [{}, { lessonCompleted: true }, { sessionCompleted: true }, { freeStory: true }, { isPro: true }]) {
      const access = api.describeAccess(activity, context);
      const cost = api.chargeCostFor(activity, context);
      assert.equal(access.free, cost === 0, `${activity} ${JSON.stringify(context)}: free ⇔ custo 0`);
      const expected = context.isPro ? "Pro" : cost > 0 ? "Usa 1 Carga" : "Grátis";
      assert.equal(access.label, expected, `${activity} ${JSON.stringify(context)}: rótulo`);
      const leaf = access.reasonKey.split(".").pop();
      for (const [name, block] of [["pt-BR", pt], ["en", en]]) {
        assert.match(block, new RegExp(`\\n {6}${leaf}: "`), `${name}: energyAccess.reason.${leaf}`);
        assert.match(block, new RegExp(`\\n {6}${access.labelKey.split(".").pop()}: "`), `${name}: ${access.labelKey}`);
      }
    }
  }
  assert.equal(api.describeAccess("extra_training").label, "Grátis", "Pinyin/Hànzì/Som/Fala/Leitura: Grátis");
  assert.equal(api.describeAccess("immersion_session", { freeStory: true }).reasonKey, "energyAccess.reason.story");

  // ——— LGY-033: a vitória para antes de um começo pago ———
  const next = { nextIsFree: false, nextLessonCompleted: false, isPro: false, charges: 0 };
  assert.equal(api.victoryWaitsForCharge(next), true, "0 Cargas + tema novo: a vitória para e avisa");
  assert.equal(api.victoryWaitsForCharge({ ...next, charges: 1 }), false, "com Carga: segue");
  assert.equal(api.victoryWaitsForCharge({ ...next, nextIsFree: true }), false, "rodada 2–4 / Reforço +: segue");
  assert.equal(api.victoryWaitsForCharge({ ...next, nextLessonCompleted: true }), false, "próximo já concluído: replay grátis");
  assert.equal(api.victoryWaitsForCharge({ ...next, isPro: true }), false, "Pro: segue");

  // ——— 3. Horário de renovação (LGY-034) ———
  const now = new Date("2026-10-27T15:30:00-03:00");
  const local = api.nextChargeRefillAt(now, "local");
  assert.equal(api.chargeRefillClockLabel(local), "00:00", "conta local: meia-noite local");
  assert.equal(local.getDate(), 28);
  const server = api.nextChargeRefillAt(now, "utc");
  assert.equal(server.toISOString(), "2026-10-28T00:00:00.000Z", "nuvem: meia-noite UTC");
  assert.equal(api.chargeRefillClockLabel(server), "21:00", "nuvem em Brasília: 21:00");
  const lateNight = api.nextChargeRefillAt(new Date("2026-10-27T22:10:00-03:00"), "utc");
  assert.equal(lateNight.toISOString(), "2026-10-29T00:00:00.000Z", "depois das 21:00 o servidor já virou o dia");

  // ——— 4. Estático ———
  const surfaces = [
    "src/features/pinyin/PinyinLabPage.tsx",
    "src/features/hanzi/HanziPage.tsx",
    "src/features/hanzi/HanziTrainingSession.tsx",
    "src/features/som/SomPage.tsx",
    "src/features/fala/FalaPage.tsx",
    "src/features/leitura/LeituraPage.tsx",
  ];
  for (const rel of surfaces) {
    const source = await read(rel);
    assert.deepEqual(copyViolations(visibleCopy(source)), [], `${rel}: copy de treino grátis não promete Carga`);
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      if (!line.includes('consumeCharge("extra_training"')) return;
      const context = lines.slice(Math.max(0, index - 8), index).join("\n");
      assert.match(context, /não cobra Carga/, `${rel}:${index + 1}: chamador extra_training diz que não cobra`);
    });
  }
  for (const rel of [
    "src/locales/pt-BR.ts",
    "src/locales/en.ts",
    "src/data/planFeatures.ts",
    "src/lib/proAccess.ts",
    "src/product/featureTruth.ts",
    "src/data/economy.ts",
    "src/lib/energyPolicy.ts",
  ]) {
    assert.deepEqual(copyViolations(await read(rel)), [], `${rel}: nenhuma promessa de cobrança em atividade grátis`);
  }

  // Controles negativos: o texto antigo tem de ser pego.
  assert.equal(copyViolations('<Pill>{access.pro ? "Pro liberado" : "Grátis com Cargas"}</Pill>').length, 1, "pega \"Grátis com Cargas\"");
  assert.equal(copyViolations("// - Pinyin Lab, Hànzì Builder e sessões de áudio da Imersão consomem Cargas.").length, 1, "pega o comentário antigo do economy.ts");
  assert.equal(copyViolations('"Som e pinyin ficam disponíveis com limite de Cargas no grátis."').length, 1, "pega o motivo antigo do proAccess");
  assert.equal(copyViolations('"Som e pinyin ficam liberados e não usam Carga."').length, 0, "negação passa");

  const economy = await read("src/data/economy.ts");
  assert.match(economy, /src\/lib\/energyPolicy\.ts/, "economy.ts aponta para a política");
  assert.doesNotMatch(economy, /em sequência, pode gastar 1 Carga/, "erro não gasta Carga (MISTAKE_CHARGE_COST = 0)");
  const policy = await read("src/lib/energyPolicy.ts");
  assert.doesNotMatch(policy.match(/PROGRESSION_ACTIVITIES[^\n]*/)?.[0] ?? "", /extra_training/, "extra_training fora da progressão");
  const store = await read("src/lib/store.ts");
  assert.match(store, /chargeCostFor\(activityType/, "store cobra pelo chargeCostFor");

  const immersion = await read("src/features/immersion/ImmersionPage.tsx");
  assert.doesNotMatch(immersion, /Imersão pausada no plano grátis/, "LGY-017: banner não diz que a Imersão toda pausou");
  assert.match(immersion, /hub\.immersionNoChargesTitle/, "LGY-017: banner em i18n");
  assert.match(immersion, /consumeCharge\("immersion_session", sessionKey\)/, "só a sessão de escuta cobra");

  const landing = await read("src/components/pro/EnergySoftLanding.tsx");
  assert.match(landing, /canUsePracticeTool\(tool/, "R-19: paywall filtra pelo portão da página");
  assert.match(landing, /claimableMission \?/, "R-19: Conseguir Carga só com missão resgatável");
  assert.match(landing, /energyAccess\.refillAt/, "LGY-034: horário de renovação no paywall");

  const victory = await read("src/features/lesson/LessonPlayer.tsx");
  assert.match(victory, /victoryWaitsForCharge/, "LGY-033: vitória sabe que o próximo passo espera Carga");
  assert.match(victory, /navigate\(victoryExitPath\)/, "LGY-033: CTA usa a saída que respeita a Carga");
} finally {
  await rm(out, { recursive: true, force: true });
}

console.log("test:energy-policy PASS");
