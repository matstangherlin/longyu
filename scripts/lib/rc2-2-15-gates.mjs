/**
 * RC2.2.15 — gates da Palavra do dia.
 *
 *   validateDailyVocabularyNotifications  janela, silêncio, orçamento, colisão, 1/dia, 7 dias, IDs, deep link
 *   validateDailyVocabularySelection      pool derivado, exclusões, teto, nova de verdade, histórico, null
 *   validateDailyVocabularyPedagogy       notificação ≠ aprendido; SRS só depois da prática; sem prova automática
 *   validateHanziHistoryTruth             origem com fonte ≠ dica para lembrar; sem etimologia gerada
 *   validateDailyVocabularyRewards        sem XP ao abrir; XP pequeno e idempotente; sem Pérola/medalha/ofensiva
 *   validateDailyVocabularyArchitecture   sem 2º SRS/registro/Atlas, sem Firebase/push, #273, curso, fingerprint
 *
 * Cada um devolve [{ code, where, why }]. As funções puras são EXECUTADAS a
 * partir do texto do estado (esbuild com arquivos virtuais): uma mutação no
 * código muda o comportamento testado.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256, CLOUD_CHECKS } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

export const RC2_2_15_QA_FIELDS = [
  "dailyVocabularyNotification",
  "dailyVocabularyAppClosed",
  "dailyVocabularyReboot",
  "dailyVocabularyTap",
  "dailyVocabularyPractice",
];

/** Arquivos da feature: nenhum deles pode conceder Pérola/medalha, tocar a ofensiva ou falar com backend. */
export const DAILY_FILES = ["vocab", "plan", "runtime", "bootstrap", "settings", "cards", "page"];

const FILES = {
  plan: "src/lib/dailyVocabularyPlan.ts",
  vocab: "src/lib/dailyVocabulary.ts",
  runtime: "src/lib/dailyVocabularyRuntime.ts",
  origins: "src/data/hanziOrigins.ts",
  meaningsEn: "src/i18n/overlays/vocabularyMeanings.en.ts",
  bootstrap: "src/components/vocabulary/DailyVocabularyBootstrap.tsx",
  settings: "src/components/vocabulary/DailyVocabularySettings.tsx",
  cards: "src/components/vocabulary/DailyWordCards.tsx",
  page: "src/features/vocabulary/DailyWordPage.tsx",
  notif: "src/lib/platform/nativeNotifications.ts",
  nativeBoot: "src/components/native/NativeExperienceBootstrap.tsx",
  deepLinks: "src/lib/platform/deepLinks.ts",
  store: "src/lib/store.ts",
  atlas: "src/features/hanzi/HanziAtlasPage.tsx",
  steps: "src/features/lesson/steps.tsx",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
  main: "src/main.tsx",
  routes: "src/routes.tsx",
  journeyPage: "src/features/journey/JourneyPage.tsx",
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|json)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

export async function loadState() {
  const srcFiles = Object.fromEntries(walk("src").map((rel) => [rel, read(rel)]));
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, srcFiles[rel] ?? read(rel)]));
  return {
    freeze: loadBetaPedagogyFreezeState(),
    operational: readJson("docs/release/rc1-operational-checks.json"),
    qa: readJson("docs/release/android-physical-qa.json"),
    rc2CandidateSha256: sha256(read("docs/release/rc2-candidate.json")),
    packageJson: read("package.json"),
    androidFiles: walkAll("android/app/src").concat(fs.existsSync(path.join(ROOT, "android/app/google-services.json")) ? ["android/app/google-services.json"] : []),
    functions: fs.readdirSync(path.join(ROOT, "supabase/functions")),
    migrations: fs.readdirSync(path.join(ROOT, "supabase/migrations")).map((name) => ({ name, text: read(`supabase/migrations/${name}`) })),
    srcFiles,
    src,
  };
}

function walkAll(dir, out = []) {
  if (!fs.existsSync(path.join(ROOT, dir))) return out;
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkAll(rel, out);
    else out.push(rel);
  }
  return out;
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

// ── Execução a partir do estado ───────────────────────────────────────────

let seq = 0;
const bundleCache = new Map();
async function importFromState(s, entryKey, extraEntry) {
  const cacheKey = sha256(JSON.stringify([entryKey, extraEntry ?? "", Object.keys(FILES).map((key) => s.src[key])]));
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const byAbs = new Map();
  for (const [key, rel] of Object.entries(FILES)) byAbs.set(path.join(ROOT, rel), s.src[key]);
  const entry = extraEntry
    ? { stdin: { contents: extraEntry, resolveDir: path.join(ROOT, "src"), loader: "ts", sourcefile: "gate-entry.ts" } }
    : { entryPoints: [path.join(ROOT, FILES[entryKey])] };
  const result = await esbuild.build({
    ...entry,
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": "{}" },
    plugins: [
      {
        name: "state-files",
        setup(build) {
          build.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = byAbs.get(args.path) ?? s.srcFiles[path.relative(ROOT, args.path).split(path.sep).join("/")];
            if (text == null) return undefined;
            return { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2215-"));
  const file = path.join(dir, `m${seq++}.mjs`);
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    const mod = await import(pathToFileURL(file).href);
    bundleCache.set(cacheKey, mod);
    return mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function fnBody(text, signature) {
  const source = String(text);
  const start = source.indexOf(signature);
  if (start < 0) return "";
  let depth = 0;
  const open = source.indexOf("{", start + signature.length - 1);
  for (let j = open; j < source.length; j += 1) {
    if (source[j] === "{") depth += 1;
    else if (source[j] === "}" && --depth === 0) return source.slice(open, j + 1);
  }
  return "";
}

/** Corpo de uma ação do store (`nome: (args) => { … }` ou `nome: (args) =>\n set(…)`). */
function storeAction(storeText, name) {
  const source = String(storeText);
  const marker = `\n      ${name}: (`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const next = source.slice(start + marker.length).search(/\n      [a-zA-Z]+: \(/);
  return next < 0 ? source.slice(start) : source.slice(start, start + marker.length + next);
}

const localeValue = (text, ns, key) => {
  const start = String(text).indexOf(`\n  ${ns}: {`);
  if (start < 0) return undefined;
  const end = String(text).indexOf("\n  },", start);
  return new RegExp(`\\n    ${key}: "([^"]*)"`).exec(String(text).slice(start, end))?.[1];
};

function localDay(offset, hour, minute = 0) {
  const base = new Date(2026, 8, 25, 0, 0, 0, 0);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, hour, minute, 0, 0).getTime();
}

const minuteOfDay = (at) => new Date(at).getHours() * 60 + new Date(at).getMinutes();

function sampleWords(n = 12) {
  return Array.from({ length: n }, (_, i) => ({ id: `v_w${i}`, hanzi: "木林森明好人口山水日月火"[i % 12], pinyin: "mù", meaning: `sentido ${i}`, hint: null }));
}

function basePlanInput(extra = {}) {
  return {
    now: localDay(0, 9),
    enabled: true,
    permissionGranted: true,
    window: { startMin: 18 * 60, endMin: 21 * 60 },
    interfaceLocale: "pt-BR",
    seed: "gate-seed",
    candidates: sampleWords(),
    assignments: [],
    history: [],
    studyReminders: [],
    ...extra,
  };
}

// ── 1 · Notificações ──────────────────────────────────────────────────────

export async function validateDailyVocabularyNotifications(s) {
  const { failures, fail } = collector();
  let plan;
  try {
    plan = await importFromState(s, "plan");
  } catch (error) {
    fail("PLAN_MODULE_BROKEN", "dailyVocabularyPlan.ts", String(error?.message ?? error).slice(0, 160));
    return failures;
  }
  const base = plan.planDailyVocabularyNotifications(basePlanInput());
  const list = base.notifications;
  if (list.length === 0) fail("NOT_SCHEDULED", "planDailyVocabularyNotifications", "janela válida + permissão + opt-in agenda algo");
  const perDay = new Map();
  for (const n of list) perDay.set(n.dayKey, (perDay.get(n.dayKey) ?? 0) + 1);
  if ([...perDay.values()].some((count) => count > 1)) fail("MULTIPLE_PER_DAY", "planDailyVocabularyNotifications", "no máximo 1 palavra por dia");
  if (new Set(list.map((n) => n.id)).size !== list.length || list.some((n) => n.id < 8100 || n.id > 8106))
    fail("MULTIPLE_PER_DAY", "vocabularyNotificationId", "IDs 8100–8106, um por dia do calendário");
  for (const n of list) {
    const minute = minuteOfDay(n.at);
    if (minute < 18 * 60 || minute > 21 * 60) fail("OUTSIDE_WINDOW", n.dayKey, `enviada às ${minute} min (janela 18:00–21:00)`);
  }
  // Horizonte: nunca além de 7 dias, nem pedindo 365.
  const huge = plan.planDailyVocabularyNotifications(basePlanInput({ horizonDays: 365, candidates: sampleWords(400).map((w, i) => ({ ...w, id: `v_x${i}` })) }));
  if (huge.notifications.length > 7) fail("HORIZON_EXCEEDED", "planDailyVocabularyNotifications", `${huge.notifications.length} agendadas (máx. 7)`);
  // Silêncio: janela no silêncio é recusada e não agenda nada.
  const quiet = plan.validateDailyVocabularyWindow({ startMin: 23 * 60, endMin: 23 * 60 + 30 });
  if (quiet.ok || quiet.reason !== "QUIET_HOURS") fail("QUIET_HOURS_IGNORED", "validateDailyVocabularyWindow", "23:00–23:30 cai no silêncio");
  if (plan.planDailyVocabularyNotifications(basePlanInput({ window: { startMin: 23 * 60, endMin: 23 * 60 + 30 } })).notifications.length > 0)
    fail("QUIET_HOURS_IGNORED", "planDailyVocabularyNotifications", "não dispara escondido no silêncio");
  const short = plan.validateDailyVocabularyWindow({ startMin: 18 * 60, endMin: 18 * 60 + 1 });
  if (short.ok) fail("OUTSIDE_WINDOW", "validateDailyVocabularyWindow", "janela de 1 min é recusada (mín. 30)");
  // Colisão com lembrete de ofensiva: ≥ 90 min; sem espaço → pula o dia.
  const reminders = [localDay(0, 20), localDay(1, 20), localDay(2, 21)].map((at) => ({ at }));
  const withStreak = plan.planDailyVocabularyNotifications(basePlanInput({ studyReminders: reminders }));
  for (const n of withStreak.notifications)
    if (reminders.some((r) => Math.abs(r.at - n.at) < 90 * 60 * 1000)) fail("STREAK_COLLISION", n.dayKey, "vocabulário a < 90 min do lembrete de ofensiva");
  const tight = plan.planDailyVocabularyNotifications(
    basePlanInput({ window: { startMin: 20 * 60, endMin: 20 * 60 + 30 }, studyReminders: [{ at: localDay(0, 20, 15) }], horizonDays: 1 })
  );
  if (tight.notifications.length > 0) fail("STREAK_COLLISION", "janela esgotada", "20:00–20:30 com ofensiva às 20:15 → pula o dia");
  // Orçamento: ≤ 2 automáticas em 24 h.
  const all = [...withStreak.notifications.map((n) => n.at), ...reminders.map((r) => r.at)].sort((a, b) => a - b);
  for (let i = 0; i < all.length; i += 1) {
    const inWindow = all.filter((t) => t >= all[i] && t - all[i] < 24 * 60 * 60 * 1000).length;
    if (inWindow > 2) fail("BUDGET_EXCEEDED", "planDailyVocabularyNotifications", `${inWindow} notificações em 24 h`);
  }
  // Opt-in e permissão.
  if (plan.planDailyVocabularyNotifications(basePlanInput({ enabled: false })).notifications.length > 0)
    fail("TOGGLE_OFF_NOTIFIES", "planDailyVocabularyNotifications", "desligado não agenda");
  if (plan.planDailyVocabularyNotifications(basePlanInput({ permissionGranted: false })).notifications.length > 0)
    fail("PERMISSION_IGNORED", "planDailyVocabularyNotifications", "sem permissão do Android não agenda");
  const boot = stripComments(s.src.bootstrap);
  if (!/if \(!prefs\.enabled \|\| !direction \|\| state\.accountSetupComplete !== true\) \{\s*if \(android\) await cancelVocabularyNotifications\(\);/.test(boot))
    fail("TOGGLE_OFF_NOTIFIES", "DailyVocabularyBootstrap.tsx", "desligar cancela as palavras pendentes");
  const cancelBody = fnBody(stripComments(s.src.notif), "export async function cancelVocabularyNotifications(");
  if (!/DAILY_VOCABULARY_IDS/.test(cancelBody) || /ALL_REMINDER_IDS/.test(cancelBody))
    fail("TOGGLE_OFF_NOTIFIES", "cancelVocabularyNotifications", "cancela só vocabulário (ofensiva fica)");
  const applyBody = fnBody(stripComments(s.src.notif), "export async function applyVocabularyPlan(");
  if (!/await cancelVocabularyNotifications\(\);\s*if \(!plan\.length\) return 0;/.test(applyBody))
    fail("DUPLICATE_PENDING", "applyVocabularyPlan", "cancela os 7 IDs antes de agendar (abrir 10× não acumula)");
  // Determinismo.
  if (JSON.stringify(plan.planDailyVocabularyNotifications(basePlanInput())) !== JSON.stringify(base))
    fail("NOT_DETERMINISTIC", "planDailyVocabularyNotifications", "mesma entrada, mesmo plano");
  // Hànzì + pinyin no título; significado no corpo.
  for (const n of list) {
    if (!/^[一-鿿]+ · \S/.test(n.title)) fail("HANZI_PINYIN_MISSING", n.dayKey, `título "${n.title}"`);
    if (!n.body.startsWith("sentido")) fail("MEANING_MISSING", n.dayKey, "significado no início do corpo");
  }
  // Curso: significado vem do CourseDirection (reagenda ao trocar).
  if (!/courseDirection,/.test(boot) || !/planWordsFor\(rankedForState\(state, direction, today\), direction\)/.test(boot))
    fail("COURSE_MEANING_STALE", "DailyVocabularyBootstrap.tsx", "reagenda com o curso atual");
  if (!/const meaning = meaningForDirection\(candidate, direction\);/.test(stripComments(s.src.runtime)))
    fail("COURSE_MEANING_STALE", "planWordFor", "significado pelo curso");
  // Deep link: só lexicalId do pool; URL do extra nunca é confiada.
  const nativeBoot = stripComments(s.src.nativeBoot);
  if (!/if \(extra\.kind === "daily_vocabulary"\) \{\s*const wordRoute = dailyVocabularyRouteFor\(extra\.lexicalId\);/.test(nativeBoot))
    fail("DEEP_LINK_UNSAFE", "NativeExperienceBootstrap.tsx", "toque valida o lexicalId");
  if (/extra: \{[^}]*url/.test(fnBody(stripComments(s.src.notif), "function vocabularyNotification(")))
    fail("DEEP_LINK_UNSAFE", "nativeNotifications.ts", "notificação de vocabulário sem URL no extra");
  const route = stripComments(s.src.runtime);
  if (!/const candidate = dailyVocabularyCandidate\(lexicalId\);\s*return candidate \?/.test(route))
    fail("DEEP_LINK_UNSAFE", "dailyVocabularyRouteFor", "rota só para id do pool");
  if (!/if \(typeof id !== "string" \|\| !\/\^v_\[a-z0-9_\]\{1,40\}\$\/\.test\(id\)\) return null;/.test(stripComments(s.src.vocab)))
    fail("DEEP_LINK_UNSAFE", "dailyVocabularyCandidate", "id validado antes de procurar");
  // Semente sem PII.
  const seedBody = fnBody(stripComments(s.src.store), "function opaqueSeed(");
  if (!seedBody || /email|username|\.name\b/.test(seedBody)) fail("SEED_PII", "opaqueSeed", "semente aleatória local, sem e-mail/nome");
  return failures;
}

// ── 2 · Seleção ───────────────────────────────────────────────────────────

const SELECTION_ENTRY = `
export * from "./lib/dailyVocabulary";
export { planDailyVocabularyNotifications } from "./lib/dailyVocabularyPlan";
export { planWordsFor } from "./lib/dailyVocabularyRuntime";
export { ALL_LESSONS } from "./data/journey";
export { CHUNKS } from "./data/chunks";
export { CHARACTERS } from "./data/characters";
export { VOCABULARY } from "./data/vocabulary";
`;

async function selectionModule(s) {
  return importFromState(s, "vocab", SELECTION_ENTRY);
}

export async function validateDailyVocabularySelection(s) {
  const { failures, fail } = collector();
  let m;
  try {
    m = await selectionModule(s);
  } catch (error) {
    fail("SELECTION_MODULE_BROKEN", "dailyVocabulary.ts", String(error?.message ?? error).slice(0, 200));
    return failures;
  }
  const pool = m.buildDailyVocabularyPool();
  if (pool.candidates.length < 60) fail("POOL_TOO_SMALL", "buildDailyVocabularyPool", `${pool.candidates.length} candidatos`);
  for (const c of pool.candidates) {
    if (/^\p{Lu}/u.test(c.pinyin) || /^\p{Lu}/u.test(c.meaningPt)) fail("PROPER_NOUN_CANDIDATE", c.id, `${c.hanzi} (${c.meaningPt})`);
    if (!/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(c.pinyin)) fail("MISSING_PINYIN_CANDIDATE", c.id, `${c.hanzi} "${c.pinyin}"`);
    if (!c.meaningPt?.trim()) fail("MISSING_MEANING_CANDIDATE", c.id, c.hanzi);
    if (!c.srsRef) fail("NO_REVIEW_TARGET", c.id, "só entra o que a Revisão sabe revisar");
  }
  for (const id of ["v_beijing", "v_zhongguo", "v_baxi", "v_shanghai"])
    if (pool.candidates.some((c) => c.id === id)) fail("PROPER_NOUN_CANDIDATE", id, "cidade/país não é palavra do dia");
  // Teach-before-test: nada estreia em revisão/transferência.
  const lessons = m.ALL_LESSONS;
  for (const c of pool.candidates) {
    if (c.firstLessonIndex == null) continue;
    const lesson = lessons[c.firstLessonIndex];
    if (lesson?.isReview === true || lesson?.curriculumRole === "review" || lesson?.curriculumRole === "transfer")
      fail("EXAM_POLLUTION", c.id, `estreia em ${lesson.id} (prova)`);
  }
  const learner = (n, extra = {}) => ({ completedLessons: lessons.slice(0, n).map((l) => l.id), learnedChars: [], learnedChunks: [], srs: {}, ...extra });
  // Iniciante: só o básico, curto.
  const fresh = m.rankDailyVocabulary({ learner: learner(0), direction: "pt-zh", history: [], todayKey: "2026-09-25" });
  if (fresh.length === 0) fail("NULL_FOR_NEW_LEARNER", "rankDailyVocabulary", "conta nova tem palavra segura");
  for (const r of fresh)
    if (!["seed", "beginner", "review"].includes(r.candidate.level) || r.candidate.chars.length > 2)
      fail("ADVANCED_FOR_BEGINNER", r.candidate.id, `${r.candidate.hanzi} (${r.candidate.level}) para quem acabou de começar`);
  // Já sabe → não é nova (evidência de SRS, não só lição concluída).
  const mid = learner(20);
  const midRanked = m.rankDailyVocabulary({ learner: mid, direction: "pt-zh", history: [], todayKey: "2026-09-25" });
  const top = midRanked[0]?.candidate;
  if (top) {
    const knownChunk = learner(20, top.srsRef.type === "chunk" ? { learnedChunks: [top.srsRef.itemId] } : { learnedChars: [top.srsRef.itemId] });
    if (m.rankDailyVocabulary({ learner: knownChunk, direction: "pt-zh", history: [], todayKey: "2026-09-25" }).some((r) => r.candidate.id === top.id))
      fail("MASTERED_SENT_AS_NEW", top.id, "aprendida não volta como nova");
    const srsKey = `${top.srsRef.type}:${top.srsRef.itemId}:significado`;
    const withSrs = learner(20, { srs: { [srsKey]: { reps: 3 } } });
    if (m.rankDailyVocabulary({ learner: withSrs, direction: "pt-zh", history: [], todayKey: "2026-09-25" }).some((r) => r.candidate.id === top.id))
      fail("MASTERED_SENT_AS_NEW", top.id, "com revisão feita no SRS não é nova");
  }
  // 30 dias: nenhuma palavra repete como nova.
  let history = [];
  const seen = new Set();
  for (let day = 0; day < 30; day += 1) {
    const date = new Date(2026, 8, 1 + day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const pick = m.rankDailyVocabulary({ learner: learner(40), direction: "pt-zh", history, todayKey: key })[0]?.candidate;
    if (!pick) break;
    if (seen.has(pick.id)) fail("REPEATED_TOO_SOON", pick.id, `${pick.hanzi} voltou como nova no dia ${day + 1}`);
    seen.add(pick.id);
    history = [...history, { dateKey: key, lexicalId: pick.id }];
  }
  // Tudo sabido → null (nada é enviado; nunca "qualquer palavra").
  const all = learner(lessons.length, {
    learnedChunks: pool.candidates.filter((c) => c.srsRef.type === "chunk").map((c) => c.srsRef.itemId),
    learnedChars: pool.candidates.filter((c) => c.srsRef.type === "char").map((c) => c.srsRef.itemId),
  });
  const none = m.rankDailyVocabulary({ learner: all, direction: "pt-zh", history: [], todayKey: "2026-09-25" });
  if (none.length > 0) fail("NULL_NOT_SAFE", "rankDailyVocabulary", "sem candidata segura devolve lista vazia");
  const emptyPlan = m.planDailyVocabularyNotifications({
    ...basePlanInput(),
    candidates: m.planWordsFor(none, "pt-zh"),
  });
  if (emptyPlan.notifications.length > 0) fail("NULL_NOT_SAFE", "planDailyVocabularyNotifications", "sem candidata, sem notificação");
  // Curso EN: só palavras com significado revisado em inglês.
  const en = m.rankDailyVocabulary({ learner: learner(20), direction: "en-zh", history: [], todayKey: "2026-09-25" });
  for (const r of en) if (!r.candidate.meaningEn) fail("COURSE_MEANING_MISSING", r.candidate.id, "en-zh sem significado em inglês");
  return failures;
}

// ── 3 · Pedagogia ─────────────────────────────────────────────────────────

const LEARN_CALLS = /markLearned\(|gradeSrs\(|ensureSrs\(|addXp\(|grantPracticeRoundXp\(|recordStudyDay\(/;

export async function validateDailyVocabularyPedagogy(s) {
  const { failures, fail } = collector();
  const store = stripComments(s.src.store);
  const opened = storeAction(store, "markDailyVocabularyOpened");
  if (!opened) fail("OPEN_MARKS_LEARNED", "store", "markDailyVocabularyOpened existe");
  if (LEARN_CALLS.test(opened)) fail("OPEN_MARKS_LEARNED", "markDailyVocabularyOpened", "abrir só grava openedAt");
  const sync = storeAction(store, "syncDailyVocabularyAssignments");
  if (LEARN_CALLS.test(sync) || /mastery|learnedChars|learnedChunks/.test(sync)) fail("NOTIFICATION_MASTERY", "syncDailyVocabularyAssignments", "agendar não ensina nem domina");
  const boot = stripComments(s.src.bootstrap);
  if (LEARN_CALLS.test(boot) || /lessonMastery|learnedChars:/.test(boot)) fail("NOTIFICATION_MASTERY", "DailyVocabularyBootstrap.tsx", "o plano não mexe em progresso");
  const practice = storeAction(store, "completeDailyVocabularyPractice");
  if (!/get\(\)\.ensureSrs\(srsRef\.type, srsRef\.itemId, undefined, domain\)/.test(practice))
    fail("SRS_NOT_FED", "completeDailyVocabularyPractice", "a prática entra na Revisão existente");
  if (/markLearned\(|gradeSrs\(/.test(practice)) fail("EXAM_AUTO", "completeDailyVocabularyPractice", "não vira conhecimento assumido para provas");
  const page = stripComments(s.src.page);
  // SRS só no fim da prática (último passo).
  const finalBlock = /if \(index \+ 1 < steps\.length\) \{[\s\S]*?return;\s*\}\s*\/\/[^\n]*\n\s*const outcome = complete\(/.test(s.src.page) || /if \(index \+ 1 < steps\.length\) \{[\s\S]*?return;\s*\}\s*const outcome = complete\(/.test(page);
  if (!finalBlock || (page.match(/complete\(\{/g) ?? []).length !== 1) fail("SRS_BEFORE_PRACTICE", "DailyWordPage.tsx", "Revisão só depois do último passo");
  if (/ensureSrs|gradeSrs|markLearned/.test(page)) fail("SRS_BEFORE_PRACTICE", "DailyWordPage.tsx", "a página não mexe no SRS direto");
  if (!/useEffect\(\(\) => \{\s*markOpened\(candidate\.id\);\s*\}, \[candidate\.id, markOpened\]\);/.test(page))
    fail("OPEN_MARKS_LEARNED", "DailyWordPage.tsx", "abrir registra só a abertura");
  // CTA ensina, não "marca como aprendida".
  const learn = localeValue(s.src.ptBR, "dailyWord", "learn") ?? "";
  if (!/Aprender esta palavra/.test(learn) || /Marcar|aprendida/i.test(learn)) fail("LEARNED_BUTTON", "pt-BR", `CTA "${learn}"`);
  // Micro-prática com passos reais (2–4 interações).
  const kinds = [...String(fnBody(page, "export function dailyWordPracticeSteps(")).matchAll(/kind: "([a-z_]+)"/g)].map((x) => x[1]);
  if (kinds.length < 2 || kinds.length > 4) fail("PRACTICE_TOO_LONG", "dailyWordPracticeSteps", `${kinds.length} passos (2–4)`);
  if (!/<StepRenderer/.test(page)) fail("SECOND_ENGINE", "DailyWordPage.tsx", "usa o StepRenderer da lição");
  return failures;
}

// ── 4 · História / etimologia ─────────────────────────────────────────────

const HISTORY_ENTRY = `
export { characterStory, buildDailyVocabularyPool, safeExample, meaningForDirection, dailyVocabularyCandidate, wordComponents } from "./lib/dailyVocabulary";
export { HANZI_ORIGIN_NOTES } from "./data/hanziOrigins";
export { HANZI_EVOLUTIONS } from "./data/hanziPedagogy";
export { CHUNKS } from "./data/chunks";
export { CHARACTERS } from "./data/characters";
export { VOCABULARY } from "./data/vocabulary";
`;

export async function validateHanziHistoryTruth(s) {
  const { failures, fail } = collector();
  let m;
  try {
    m = await importFromState(s, "vocab", HISTORY_ENTRY);
  } catch (error) {
    fail("HISTORY_MODULE_BROKEN", "dailyVocabulary.ts", String(error?.message ?? error).slice(0, 200));
    return failures;
  }
  // Origem verificada precisa de fonte; só onde já existe modelo de evolução.
  const evolutionHanzi = new Set(Object.values(m.HANZI_EVOLUTIONS).map((e) => e.hanzi));
  for (const [hanzi, note] of Object.entries(m.HANZI_ORIGIN_NOTES)) {
    if (note.status !== "VERIFIED_HISTORICAL") fail("UNSOURCED_HISTORY", hanzi, "origem é VERIFIED_HISTORICAL");
    if (!Array.isArray(note.sources) || note.sources.length === 0 || note.sources.some((src) => !src.title || !src.detail))
      fail("UNSOURCED_HISTORY", hanzi, "origem sem fonte registrada");
    if (!evolutionHanzi.has(hanzi)) fail("UNSOURCED_HISTORY", hanzi, "origem só onde o Longyu já tem o modelo de evolução");
  }
  // Mnemônico continua mnemônico.
  const mnemonicChar = m.CHARACTERS.find((c) => c.mnemonicPt && !m.HANZI_ORIGIN_NOTES[c.hanzi]);
  if (mnemonicChar) {
    const story = m.characterStory(mnemonicChar.hanzi, "pt-zh");
    if (story.status !== "PEDAGOGICAL_MNEMONIC") fail("MNEMONIC_AS_ETYMOLOGY", mnemonicChar.hanzi, `mnemônico virou ${story.status}`);
    if (story.sources.length > 0) fail("MNEMONIC_AS_ETYMOLOGY", mnemonicChar.hanzi, "mnemônico não tem fonte histórica");
  }
  const tip = localeValue(s.src.ptBR, "dailyWord", "mnemonic");
  if (tip !== "Dica para lembrar") fail("MNEMONIC_AS_ETYMOLOGY", "pt-BR", `rótulo do mnemônico "${tip}"`);
  const page = stripComments(s.src.page);
  if (!/story\.status === "PEDAGOGICAL_MNEMONIC" && story\.text \? \([\s\S]*?t\("dailyWord\.mnemonic"\)/.test(page))
    fail("MNEMONIC_AS_ETYMOLOGY", "DailyWordPage.tsx", "mnemônico aparece como Dica para lembrar");
  if (!/story\.status === "VERIFIED_HISTORICAL" && story\.text \? \([\s\S]*?t\("dailyWord\.origin"\)[\s\S]*?daily-word-origin-source/.test(page))
    fail("UNSOURCED_HISTORY", "DailyWordPage.tsx", "Origem mostra a fonte");
  const atlas = stripComments(s.src.atlas);
  if (!/data-testid="atlas-mnemonic"[\s\S]{0,300}Dica para lembrar/.test(atlas)) fail("MNEMONIC_AS_ETYMOLOGY", "HanziAtlasPage.tsx", "Atlas rotula o mnemônico");
  // Sem história inventada: caractere sem origem nem mnemônico não ganha texto.
  const plain = m.CHARACTERS.find((c) => !c.mnemonicPt && !m.HANZI_ORIGIN_NOTES[c.hanzi]);
  if (plain) {
    const story = m.characterStory(plain.hanzi, "pt-zh");
    if (story.text) fail("ATLAS_INVENTS_HISTORY", plain.hanzi, `texto "${story.text}" sem fonte nem mnemônico`);
  }
  if (/join\(|\+ " \+ "|` \+ `/.test(fnBody(stripComments(s.src.vocab), "export function characterStory(")))
    fail("ATLAS_INVENTS_HISTORY", "characterStory", "não monta narrativa combinando peças");
  // Palavra multi-caractere: significado é o da PALAVRA.
  for (const word of m.buildDailyVocabularyPool().candidates.filter((c) => c.chars.length > 1).slice(0, 40)) {
    const vocab = m.VOCABULARY.find((v) => v.id === word.id);
    if (!vocab || m.meaningForDirection(word, "pt-zh") !== vocab.meaningPt.trim())
      fail("COMPONENTS_AS_TRANSLATION", word.id, "significado vem do VOCABULARY, não dos caracteres");
  }
  if (!/daily-word-components-note/.test(page) || !/meaningForDirection\(candidate, direction\)/.test(page))
    fail("COMPONENTS_AS_TRANSLATION", "DailyWordPage.tsx", "componentes com aviso; título com o significado da palavra");
  // Exemplo: só frase cadastrada, sempre consultável (GlossText).
  const known = new Set([...m.CHARACTERS.flatMap((c) => (c.exampleWords ?? []).map((e) => e.hanzi)), ...m.CHUNKS.map((c) => c.hanzi)]);
  for (const word of m.buildDailyVocabularyPool().candidates) {
    const example = m.safeExample(word, "pt-zh");
    if (example && (!known.has(example.hanzi) || !example.hanzi.includes(word.hanzi))) fail("UNSAFE_EXAMPLE", word.id, `exemplo "${example.hanzi}" não cadastrado`);
  }
  if (!/<GlossText text=\{example\.hanzi\}/.test(page)) fail("UNSAFE_EXAMPLE", "DailyWordPage.tsx", "exemplo consultável com GlossText");
  return failures;
}

// ── 5 · Recompensas ───────────────────────────────────────────────────────

export async function validateDailyVocabularyRewards(s) {
  const { failures, fail } = collector();
  const store = stripComments(s.src.store);
  const opened = storeAction(store, "markDailyVocabularyOpened");
  if (/addXp\(|grantPracticeRoundXp\(/.test(opened)) fail("OPEN_GIVES_XP", "markDailyVocabularyOpened", "abrir não dá XP");
  const practice = storeAction(store, "completeDailyVocabularyPractice");
  if (!/if \(exposure && !alreadyPracticed && !practicedToday\) \{[\s\S]*?dailyVocabularyRewardKey\(state\.currentAccountId, exposure\.dateKey, lexicalId\)[\s\S]*?grantPracticeRoundXp\(key, DAILY_VOCABULARY_XP\)/.test(practice))
    fail("XP_FARM", "completeDailyVocabularyPractice", "XP só na 1ª prática do dia, com chave idempotente");
  if (/addXp\(/.test(practice)) fail("XP_FARM", "completeDailyVocabularyPractice", "XP passa pela chave idempotente");
  const xp = Number(/export const DAILY_VOCABULARY_XP = (\d+);/.exec(s.src.plan)?.[1] ?? NaN);
  if (!(xp >= 2 && xp <= 3)) fail("XP_FARM", "DAILY_VOCABULARY_XP", `XP ${xp} (2–3)`);
  if (!/return `daily-vocab:\$\{accountId\}:\$\{dateKey\}:\$\{lexicalId\}`;/.test(s.src.plan)) fail("XP_FARM", "dailyVocabularyRewardKey", "daily-vocab:conta:dia:palavra");
  for (const key of DAILY_FILES) {
    const text = stripComments(s.src[key]);
    if (/pearl|Pearl|claimPearl|maybeClaimPearl/.test(text.replace(/pearls=\{0\}/g, ""))) fail("PEARL_PER_WORD", FILES[key], "nenhuma Pérola pela palavra");
    if (/unlockAchievement|unlockBadge|badges:|awardBadge/.test(text)) fail("MEDAL_PER_WORD", FILES[key], "nenhuma medalha pela palavra");
    // Ler a ofensiva (para espaçar dos lembretes) é permitido; escrever, não.
    if (/recordStudyDay|dailyWordStreak|DailyWordStreak|streak\s*\+\+|streak\s*\+=|set\(\{[^}]*\bstreak\b/.test(text)) fail("STREAK_ON_OPEN", FILES[key], "palavra do dia não mexe na ofensiva");
  }
  if (/pearl/i.test(practice + opened)) fail("PEARL_PER_WORD", "store", "ações da palavra sem Pérola");
  if (/badge|achievement/i.test(practice + opened)) fail("MEDAL_PER_WORD", "store", "ações da palavra sem medalha");
  if (/recordStudyDay|\bstreak\b/i.test(opened)) fail("STREAK_ON_OPEN", "markDailyVocabularyOpened", "abrir não conta como dia de estudo");
  if (/recordStudyDay|\bstreak\b/i.test(practice)) fail("STREAK_ON_OPEN", "completeDailyVocabularyPractice", "sem exceção especial na ofensiva");
  const page = stripComments(s.src.page);
  if (!/xp: outcome\.xp/.test(page) || !/pearls=\{0\}/.test(page)) fail("REWARD_BEFORE_GRANT", "DailyWordPage.tsx", "mostra só o XP que o store pagou");
  return failures;
}

// ── 6 · Arquitetura ───────────────────────────────────────────────────────

export async function validateDailyVocabularyArchitecture(s) {
  const { failures, fail } = collector();
  for (const rel of Object.keys(s.srcFiles)) {
    if (/daily.*srs|dailyVocabularySrs|DailyVocabularySRS/i.test(rel)) fail("SECOND_SRS", rel, "a Revisão é o SRS existente");
    if (/^src\/data\/.*(daily|palavra)/i.test(rel)) fail("SECOND_REGISTRY", rel, "sem base lexical nova");
    if (/^src\/features\/(?!hanzi\/HanziAtlasPage).*Atlas.*\.tsx$/.test(rel)) fail("ATLAS_DUPLICATED", rel, "o Atlas é um só");
  }
  for (const key of DAILY_FILES) {
    const text = stripComments(s.src[key]);
    if (/intervalDays\s*[*=]|easeFactor|nextReviewAt\s*=/.test(text)) fail("SECOND_SRS", FILES[key], "sem agenda de revisão própria");
    if (/supabase|fetch\(|firebase/i.test(text)) fail("PUSH_BACKEND", FILES[key], "tudo local");
  }
  const vocab = stripComments(s.src.vocab);
  if (!/import \{ VOCABULARY \} from "\.\.\/data\/vocabulary";/.test(vocab) || /export const [A-Z_]*(WORDS|VOCAB|DAILY)[A-Z_]* = \[/.test(vocab))
    fail("SECOND_REGISTRY", "dailyVocabulary.ts", "candidatos derivados do VOCABULARY");
  if (/"(firebase|@capacitor\/push-notifications|@capacitor-firebase\/[^"]+)"\s*:/.test(s.packageJson)) fail("FIREBASE_ADDED", "package.json", "sem Firebase/push");
  if (s.androidFiles.some((f) => /google-services\.json|FirebaseMessagingService/.test(f))) fail("FIREBASE_ADDED", "android", "sem FCM");
  if (s.functions.some((name) => /push|notif|vocab/i.test(name))) fail("PUSH_BACKEND", "supabase/functions", "sem backend de push");
  for (const migration of s.migrations)
    if (/vocab|palavra_do_dia/i.test(migration.text) && /cron|notification|push/i.test(migration.text)) fail("PUSH_BACKEND", migration.name, "sem cron/migration para a palavra do dia");
  for (const id of CLOUD_CHECKS) if (s.operational.checks?.[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "rc2-candidate.json", "o candidate da #273 não muda");
  // Curso decide o significado; interface só a chamada.
  if (!/export function meaningForDirection\([^\n]*\n\s*const locale = instructionLocaleForDirection\(direction\);/.test(vocab))
    fail("COURSE_DIRECTION_IGNORED", "meaningForDirection", "significado pelo CourseDirection");
  if (/from "\.\.\/i18n\/locale"|getInterfaceLocale|useI18n/.test(vocab + stripComments(s.src.runtime)))
    fail("INTERFACE_LOCALE_AS_TRANSLATION", "dailyVocabulary.ts", "idioma da interface não traduz a palavra");
  const page = stripComments(s.src.page);
  if (!/activeCourseDirection\(\)/.test(page) || !/meaningForDirection\(candidate, direction\)/.test(page))
    fail("COURSE_DIRECTION_IGNORED", "DailyWordPage.tsx", "página usa o curso");
  if (/meaningForDirection\([^)]*locale\b/.test(page + stripComments(s.src.cards))) fail("INTERFACE_LOCALE_AS_TRANSLATION", "DailyWordPage.tsx", "tradução pelo curso");
  if (!/<StepRenderer/.test(page)) fail("SECOND_SRS", "DailyWordPage.tsx", "micro-prática com os passos da lição");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  if (!/export const RC2_2_15_DAILY_VOCABULARY_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_15_DAILY_VOCABULARY_EXCEPTION");
  const physical = s.qa?.formalPass === true && Boolean(s.qa?.deviceModel) && s.qa?.isEmulator === false;
  for (const field of RC2_2_15_QA_FIELDS) {
    if (!(field in (s.qa ?? {}))) fail("QA_FIELD_MISSING", "android-physical-qa.json", field);
    else if (s.qa[field] === "PASS" && !physical) fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "android-physical-qa.json", `${field}=PASS sem aparelho`);
  }
  if (!/"\/palavra-do-dia"/.test(s.src.deepLinks)) fail("DEEP_LINK_UNSAFE", "deepLinks.ts", "rota aprovada na allowlist");
  if (!/<DailyVocabularyBootstrap \/>/.test(s.src.main)) fail("NOT_RECONCILED", "main.tsx", "reconciliação a cada abertura/retorno");
  return failures;
}

export const GATES = {
  "daily-vocabulary-notifications": validateDailyVocabularyNotifications,
  "daily-vocabulary-selection": validateDailyVocabularySelection,
  "daily-vocabulary-pedagogy": validateDailyVocabularyPedagogy,
  "hanzi-history-truth": validateHanziHistoryTruth,
  "daily-vocabulary-rewards": validateDailyVocabularyRewards,
  "daily-vocabulary-architecture": validateDailyVocabularyArchitecture,
};
