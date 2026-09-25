#!/usr/bin/env node
/**
 * RC2.2.15 — validate:<área> / test:<área> da Palavra do dia.
 *
 *   node scripts/rc2-2-15-daily-vocabulary.mjs validate <área>
 *   node scripts/rc2-2-15-daily-vocabulary.mjs test <área>
 *
 * Gates em scripts/lib/rc2-2-15-gates.mjs.
 */
import assert from "node:assert/strict";
import { GATES, loadState, report } from "./lib/rc2-2-15-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = GATES[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(GATES).join("|")}>`);
  process.exit(2);
}
const name = `${mode}:${area}`;
const base = await loadState();

if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(name, failures));
  process.exit(failures.length ? 1 : 0);
}

const REL = {
  plan: "src/lib/dailyVocabularyPlan.ts",
  vocab: "src/lib/dailyVocabulary.ts",
  runtime: "src/lib/dailyVocabularyRuntime.ts",
  origins: "src/data/hanziOrigins.ts",
  store: "src/lib/store.ts",
  page: "src/features/vocabulary/DailyWordPage.tsx",
  notif: "src/lib/platform/nativeNotifications.ts",
  ptBR: "src/locales/pt-BR.ts",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
};
function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${String(from).slice(0, 100)}`);
  return String(text).split(from).join(to);
}
/** Muta s.src[key] (e o espelho em srcFiles, que o bundler lê). */
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
  if (REL[key]) s.srcFiles[REL[key]] = s.src[key];
};

const file = (rel, text) => (s) => {
  s.srcFiles[rel] = text;
};

const MUTATIONS = {
  "daily-vocabulary-notifications": [
    ["M1. vocabulário envia mais de 1 por dia", "MULTIPLE_PER_DAY", src("plan", "base.getDate() + offset));", "base.getDate() + Math.floor(offset / 2)));")],
    ["M2. vocabulário ignora a janela", "OUTSIDE_WINDOW", src("plan", "% (span + 1));", "% (span + 600));")],
    ["M3. vocabulário dispara no horário silencioso", "QUIET_HOURS_IGNORED", src("plan", '  if (startMin < DAILY_VOCABULARY_QUIET.endMin || endMin > DAILY_VOCABULARY_QUIET.startMin) return { ok: false, reason: "QUIET_HOURS" };\n', "")],
    ["M4. vocabulário colide com a ofensiva", "STREAK_COLLISION", src("plan", "      if (reminders.some((reminder) => Math.abs(reminder - candidateAt) < DAILY_VOCABULARY_SPACING_MS)) continue;\n", "")],
    ["M5. toggle OFF continua notificando", "TOGGLE_OFF_NOTIFIES", src("plan", "if (!input.enabled || !input.permissionGranted) return empty;", "if (!input.permissionGranted) return empty;")],
    ["M6. permissão negada continua agendando", "PERMISSION_IGNORED", src("plan", "if (!input.enabled || !input.permissionGranted) return empty;", "if (!input.enabled) return empty;")],
    ["M7. troca de curso mantém tradução antiga", "COURSE_MEANING_STALE", src("runtime", "const meaning = meaningForDirection(candidate, direction);", "const meaning = candidate.meaningPt;")],
    ["M8. deep link aceita lexicalId arbitrário", "DEEP_LINK_UNSAFE", src("runtime", "const candidate = dailyVocabularyCandidate(lexicalId);\n  return candidate ? `${DAILY_VOCABULARY_ROUTE}/${candidate.id}` : null;", "return lexicalId ? `${DAILY_VOCABULARY_ROUTE}/${lexicalId}` : null;")],
    ["M9. abrir o app acumula pendentes", "DUPLICATE_PENDING", src("notif", "  await cancelVocabularyNotifications();\n  if (!plan.length) return 0;", "  if (!plan.length) return 0;")],
    ["M10. 365 notificações agendadas", "HORIZON_EXCEEDED", src("plan", "const horizon = Math.max(1, Math.min(DAILY_VOCABULARY_HORIZON_DAYS, input.horizonDays ?? DAILY_VOCABULARY_HORIZON_DAYS));", "const horizon = input.horizonDays ?? DAILY_VOCABULARY_HORIZON_DAYS;")],
    ["MX1. título só com tradução", "HANZI_PINYIN_MISSING", src("plan", "const title = `${word.hanzi} · ${word.pinyin}`;", "const title = word.meaning;")],
    ["MX2. semente derivada do e-mail", "SEED_PII", src("store", "    const bytes = new Uint8Array(8);", "    const email = String(useStore.getState().accounts ?? \"\");\n    const bytes = new Uint8Array(8);")],
    ["MX3. toque confia na URL do extra", "DEEP_LINK_UNSAFE", src("notif", "extra: { kind: item.kind, lexicalId: item.lexicalId },", "extra: { kind: item.kind, lexicalId: item.lexicalId, url: item.url },")],
  ],
  "daily-vocabulary-selection": [
    ["M15. palavra avançada chega a quem começou agora", "ADVANCED_FOR_BEGINNER", src("vocab", "{ new: 1, early: 2, mid: 2, advanced: 2 }", "{ new: 4, early: 4, mid: 4, advanced: 4 }")],
    ["M16. nome próprio vira palavra do dia", "PROPER_NOUN_CANDIDATE", src("vocab", '  if (/^\\p{Lu}/u.test(entry.pinyin.trim()) || /^\\p{Lu}/u.test(entry.meaningPt.trim())) return "PROPER_NOUN";\n', "")],
    ["M17. candidato sem pinyin tonal passa", "MISSING_PINYIN_CANDIDATE", src("vocab", "      pinyin: entry.pinyin,", '      pinyin: entry.pinyin.normalize("NFD").replace(/[\\u0300-\\u036f]/g, ""),')],
    ["M18. candidato sem significado passa", "MISSING_MEANING_CANDIDATE", src("vocab", "      meaningPt: entry.meaningPt,", '      meaningPt: "",')],
    ["M19. palavra dominada enviada como nova", "MASTERED_SENT_AS_NEW", src("vocab", "  if (type === \"chunk\" ? learner.learnedChunks.includes(itemId) : learner.learnedChars.includes(itemId)) return true;\n", "")],
    ["M20. mesma palavra reaparece amanhã", "REPEATED_TOO_SOON", src("vocab", "let fresh = eligible.filter((candidate) => !everExposed.has(candidate.id));", "let fresh = eligible;")],
    ["MX4. sem candidata segura, manda qualquer uma", "NULL_NOT_SAFE", src("vocab", "  const eligible = pool.candidates.filter((candidate) => eligibility(candidate, input.learner, input.direction, context).eligible);", "  const eligible = pool.candidates;")],
  ],
  "daily-vocabulary-pedagogy": [
    ["M11. abrir a notificação marca aprendida", "OPEN_MARKS_LEARNED", src("store", "          if (index < 0 || current.exposures[index].openedAt != null) return {};", "          get().markLearned(\"chunk\", lexicalId);\n          if (index < 0 || current.exposures[index].openedAt != null) return {};")],
    ["M12. notificação marca domínio", "NOTIFICATION_MASTERY", src("store", "          const exposures = mergeDailyVocabularyAssignments(current.exposures,", "          assignments.forEach((entry) => get().gradeSrs(\"chunk\", entry.lexicalId, \"easy\"));\n          const exposures = mergeDailyVocabularyAssignments(current.exposures,")],
    ["M13. SRS criado antes da prática", "SRS_BEFORE_PRACTICE", src("page", "    markOpened(candidate.id);\n  }, [candidate.id, markOpened]);", "    markOpened(candidate.id);\n    useStore.getState().ensureSrs(candidate.srsRef.type, candidate.srsRef.itemId);\n  }, [candidate.id, markOpened]);")],
    ["M14. palavra nova vira conhecimento de prova", "EXAM_AUTO", src("store", "        const alreadyPracticed = exposure?.practicedAt != null;", "        get().markLearned(srsRef.type, srsRef.itemId);\n        const alreadyPracticed = exposure?.practicedAt != null;")],
    ["MX5. botão 'Marcar como aprendida'", "LEARNED_BUTTON", src("ptBR", 'learn: "Aprender esta palavra"', 'learn: "Marcar como aprendida"')],
  ],
  "hanzi-history-truth": [
    ["M21. mnemônico rotulado como etimologia", "MNEMONIC_AS_ETYMOLOGY", src("vocab", 'status: "PEDAGOGICAL_MNEMONIC", text, sources: [], components', 'status: "VERIFIED_HISTORICAL", text, sources: [], components')],
    ["M22. origem sem fonte passa como verificada", "UNSOURCED_HISTORY", src("origins", 'sources: [SHUOWEN_PICTOGRAPH("木"), ORACLE_BONE],', "sources: [],")],
    ["M23. componentes viram tradução da palavra", "COMPONENTS_AS_TRANSLATION", src("vocab", "      meaningPt: entry.meaningPt,", '      meaningPt: chars.map((ch) => charByHanzi.get(ch)?.meaningPt ?? ch).join(" + "),')],
    ["M24. Atlas inventa história", "ATLAS_INVENTS_HISTORY", (s) => {
      src("vocab", 'status: "COMPONENT_EXPLANATION", text: null,', 'status: "COMPONENT_EXPLANATION", text: "Na China antiga, estas peças contavam uma história.",')(s);
      src("vocab", 'status: "NONE", text: null,', 'status: "NONE", text: "Surgiu na China antiga.",')(s);
    }],
    ["M25. exemplo sem glossário consultável", "UNSAFE_EXAMPLE", src("page", "<GlossText text={example.hanzi}", "<GlossText disabled text={example.hanzi.slice(0)}")],
  ],
  "daily-vocabulary-rewards": [
    ["M26. abrir a notificação dá XP", "OPEN_GIVES_XP", src("store", "          if (index < 0 || current.exposures[index].openedAt != null) return {};", "          get().addXp(2, `daily-open:${lexicalId}`);\n          if (index < 0 || current.exposures[index].openedAt != null) return {};")],
    ["M27. repetir a prática farma XP", "XP_FARM", src("store", "if (exposure && !alreadyPracticed && !practicedToday) {", "if (exposure) {")],
    ["M28. toda palavra dá Pérola", "PEARL_PER_WORD", src("store", "        const alreadyPracticed = exposure?.practicedAt != null;", "        get().maybeClaimPearlMilestonesFromProgress();\n        const alreadyPracticed = exposure?.practicedAt != null;")],
    ["M29. toda palavra dá medalha", "MEDAL_PER_WORD", src("page", "    const outcome = complete(", "    useStore.getState().unlockAchievement(\"daily-word\");\n    const outcome = complete(")],
    ["M30. recompensa mostrada antes de ser paga", "REWARD_BEFORE_GRANT", src("page", "xp: outcome.xp", "xp: 2")],
    ["M31. ofensiva sobe só por abrir", "STREAK_ON_OPEN", src("store", "          if (index < 0 || current.exposures[index].openedAt != null) return {};", "          get().recordStudyDay({ tasks: 1 });\n          if (index < 0 || current.exposures[index].openedAt != null) return {};")],
  ],
  "daily-vocabulary-architecture": [
    ["M32. segundo SRS criado", "SECOND_SRS", file("src/lib/dailyVocabularySrs.ts", "export function nextDue(intervalDays: number) { return intervalDays * 2; }")],
    ["M33. segundo registro de vocabulário", "SECOND_REGISTRY", file("src/data/dailyWords.ts", "export const DAILY_WORDS = [{ hanzi: \"木\" }];")],
    ["M34. Firebase adicionado", "FIREBASE_ADDED", (s) => {
      s.packageJson = s.packageJson.replace('"dependencies": {', '"dependencies": {\n    "firebase": "^10.0.0",');
    }],
    ["M35. #273 alterada", "CLOUD_273_TOUCHED", (s) => {
      s.rc2CandidateSha256 = "0".repeat(64);
    }],
    ["M36. backend de push adicionado", "PUSH_BACKEND", (s) => {
      s.functions = [...s.functions, "send-daily-vocabulary-push"];
    }],
    ["M37. Atlas duplicado", "ATLAS_DUPLICATED", file("src/features/vocabulary/VocabularyAtlasPage.tsx", "export function VocabularyAtlasPage() { return null; }")],
    ["M38. CourseDirection ignorado", "COURSE_DIRECTION_IGNORED", src("page", 'const direction = activeCourseDirection() ?? "pt-zh";', 'const direction = "pt-zh";')],
    ["M39. idioma da interface traduz a palavra", "INTERFACE_LOCALE_AS_TRANSLATION", (s) => {
      src("vocab", "  const locale = instructionLocaleForDirection(direction);\n  if (!locale) return null;", "  const locale = getInterfaceLocale();\n  if (!locale) return null;")(s);
      src("vocab", 'import common5000 from "../data/corpus/common5000.json";', 'import common5000 from "../data/corpus/common5000.json";\nimport { getInterfaceLocale } from "../i18n/locale";')(s);
    }],
    ["M40. fingerprint do currículo muda", "FINGERPRINT_DRIFT", (s) => {
      s.freeze.fingerprint = "0000deadbeef";
    }],
    ["MX6. sem exceção de freeze", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "export const RC2_2_15_DAILY_VOCABULARY_EXCEPTION", "export const RC2_2_15_OTHER")],
    ["MX7. palavra do dia marcada PASS sem aparelho", "PHYSICAL_PASS_WITHOUT_EVIDENCE", (s) => {
      s.qa.dailyVocabularyNotification = "PASS";
    }],
  ],
};

const real = await gate(base);
assert.deepEqual(real, [], `${name}: o estado real precisa passar\n${report(name, real)}`);
let killed = 0;
for (const [label, code, mutate] of MUTATIONS[area] ?? []) {
  const state = structuredClone(base);
  mutate(state);
  const failures = await gate(state);
  assert.ok(
    failures.some((failure) => failure.code === code),
    `${name}: mutação "${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`
  );
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS ${name} (${killed} mutações)`);
