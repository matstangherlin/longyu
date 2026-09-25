#!/usr/bin/env node
/**
 * RC2.2.14B — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-14b-locale-course-direction.mjs validate <área>
 *   node scripts/rc2-2-14b-locale-course-direction.mjs test <área>
 *
 * Gates em scripts/lib/rc2-2-14b-gates.mjs.
 */
import assert from "node:assert/strict";
import { GATES, loadState, report } from "./lib/rc2-2-14b-gates.mjs";

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

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return String(text).split(from).join(to);
}
const REL = {
  locale: "src/i18n/locale.ts",
  courseDirection: "src/i18n/courseDirection.ts",
  config: "src/i18n/config.ts",
  instructionLocale: "src/i18n/instructionLocale.ts",
};
/** Muta s.src[key] e o espelho em srcFiles (o bundler lê de lá). */
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
  if (REL[key]) s.srcFiles[REL[key]] = s.src[key];
};
const file = (rel, from, to) => (s) => {
  s.srcFiles[rel] = swap(s.srcFiles[rel], from, to);
};

const MUTATIONS = {
  "interface-locale-resolution": [
    ["BL2. idioma do sistema ignorado", "SYSTEM_LOCALE_IGNORED", src("main", "setSystemLanguageProvider(systemLanguageTags);\n", "")],
    ["BL3. pt-BR abre inglês", "PT_OPENS_EN", src("locale", 'if (primary === "pt") return "pt-BR";', 'if (primary === "pt") return "en";')],
    ["BL4. en-US abre português", "EN_OPENS_PT", src("locale", 'if (primary === "en") return "en";', 'if (primary === "en") return "pt-BR";')],
    ["BL5. idioma sem suporte quebra", "UNSUPPORTED_LOCALE_UNSAFE", src("locale", "  return SYSTEM_FALLBACK_INTERFACE_LOCALE;\n}", '  throw new Error("unsupported system language");\n}')],
    ["BL6. escolha manual sobrescrita pelo sistema", "MANUAL_OVERRIDE_OVERWRITTEN", src("locale", '  if (getInterfaceLocaleSource() === "user" && persisted) return persisted;\n', "")],
    ["BL2c. modo sistema ignora troca de idioma do aparelho", "SYSTEM_CHANGE_IGNORED", src("locale", '  if (getInterfaceLocaleSource() === "user") return resolvePreferredInterfaceLocale();\n  return followSystemInterfaceLocale();', "  return getInterfaceLocale();")],
    ["BL2d. evento languagechange desligado", "SYSTEM_CHANGE_IGNORED", src("main", "onSystemLanguageChange(refreshSystemInterfaceLocale);\n", "")],
    ["BL6b. troca do aparelho atropela escolha manual", "MANUAL_OVERRIDE_OVERWRITTEN", src("locale", '  if (getInterfaceLocaleSource() === "user") return resolvePreferredInterfaceLocale();\n', "")],
    ["BL2b. navigator.language espalhado em componente", "NAVIGATOR_LANGUAGE_SPREAD", file("src/features/landing/MobileWelcome.tsx", "export function MobileWelcome() {", "const guess = navigator.language;\nexport function MobileWelcome() {")],
  ],
  "course-direction": [
    ["BL7. curso escolhido sem confirmação", "COURSE_AUTO_SELECTED", src("picker", "useState<CourseDirectionId | null>(current)", "useState<CourseDirectionId | null>(current ?? recommended)")],
    ["BL8. picker em toda abertura", "PICKER_EVERY_OPEN", src("welcome", 'const guidedTo = hasCourseDirection() ? "/teste-guiado" : "/curso?next=%2Fteste-guiado";', 'const guidedTo = "/curso?next=%2Fteste-guiado";')],
    ["BL10. mudar curso apaga progresso", "PROGRESS_TOUCHED", src("store", "          const next = { ...s, courseDirection: id };", "          const next = { ...s, courseDirection: id, completedLessons: [] };")],
    ["BL11. cada curso cria um perfil", "PROFILE_SPLIT", src("state", "    state.setCourseDirection(id);\n", "    state.createAccount(`Aluno ${id}`);\n    state.setCourseDirection(id);\n")],
    ["BL12. teste guiado sem curso", "GUIDED_WITHOUT_COURSE", src("guided", '  if (!hasCourseDirection()) return <Navigate to="/curso?next=%2Fteste-guiado" replace />;\n', "")],
    ["BL12b. onboarding sem curso", "ONBOARDING_WITHOUT_COURSE", src("comecar", "  if (!hasCourseDirection()) {\n    const next = `/comecar${searchParams.toString() ? `?${searchParams.toString()}` : \"\"}`;\n    return <Navigate to={`/curso?next=${encodeURIComponent(next)}`} replace />;\n  }\n", "")],
    ["BL13. cadastro pergunta o curso de novo", "SIGNUP_ASKS_TWICE", src("comecar", '<CourseDirectionChip next="/comecar" />', '<select data-testid="instruction-locale-select" />')],
    ["BL16. interface e curso na mesma variável", "LOCALE_AND_COURSE_SAME_VARIABLE", src("provider", "    commitInterfaceLocale(next);\n    void activeInterfaceLocaleAdapter", "    commitInterfaceLocale(next);\n    commitInstructionLocale(next, { userOverride: false });\n    void activeInterfaceLocaleAdapter")],
    ["BL17. novo curso exige hardcode no componente", "COURSE_LIST_HARDCODED", src("cards", "availableCourseDirections().map(", '(["pt-zh", "en-zh"] as const).map((id) => courseDirectionById(id)!).map(')],
    ["BL18. hànzì muda com o curso", "TARGET_DRIFT", src("courseDirection", 'instructionLocale: "en", targetLanguage: "zh"', 'instructionLocale: "en", targetLanguage: "zh-en" as "zh"')],
    ["BL19. XP muda ao trocar curso", "PROGRESS_TOUCHED", src("state", "  applyCourseDirection(id);\n  trackFunnelEvent", "  applyCourseDirection(id);\n  state.addXp(10, `course:${id}`);\n  trackFunnelEvent")],
    ["BL7b. recomendação sem correspondência", "FALSE_RECOMMENDATION", src("courseDirection", "  return null;\n}\n\n/**\n * RC2.2.14B · AQ", '  return "en-zh";\n}\n\n/**\n * RC2.2.14B · AQ')],
  ],
  "course-direction-migration": [
    ["BL9. picker para conta já configurada", "ACCOUNT_NOT_AUTHORITY", src("courseDirection", "  if (isAvailableCourseDirection(input.accountDirection)) return input.accountDirection;\n", "")],
    ["BL14. conta A vaza curso para conta B", "ACCOUNT_COURSE_LEAK", src("store", "courseDirection: isAvailableCourseDirection(existing?.courseDirection) ? existing.courseDirection : null,", "courseDirection: fallback?.courseDirection ?? null,")],
    ["BL15. idioma do Android sobrescreve curso cloud", "DEVICE_OVERRIDES_COURSE", src("bootstrap", "  useEffect(() => {\n    bootstrapCourseDirection();", "  useEffect(() => {\n    const device = recommendedCourseDirection(systemLanguageTags());\n    if (device) applyCourseDirection(device);\n    bootstrapCourseDirection();")],
    ["BL20. #273 alterada", "CLOUD_273_TOUCHED", (s) => {
      const first = Object.keys(s.operational.checks ?? {}).find((id) => s.operational.checks[id]?.pass === false);
      s.operational.checks[first].pass = true;
    }],
    ["BI. conta antiga sem migração", "LEGACY_NOT_MIGRATED", src("courseDirection", "  return courseDirectionForInstructionLocale(input.legacyInstructionLocale);\n}", "  return null;\n}")],
    ["U. escolha antes da conta não entra na conta", "PENDING_NOT_MIGRATED", src("state", "    state.setCourseDirection(direction);\n    writePendingCourseDirection(null);\n  }\n  applyCourseDirection(direction);", "  }\n  applyCourseDirection(direction);")],
    ["T. migration Supabase desnecessária", "NEW_SUPABASE_MIGRATION", (s) => {
      s.migrations.push({ name: "20260925000000_course_direction.sql", text: "alter table public.profiles add column course_direction text;" });
    }],
  ],
  "mobile-language-ux": [
    ["BL1. landing Android volta a mostrar o dropdown de idioma", "LANDING_LANGUAGE_CONTROL", src("welcome", "<BrandLockup size={34} />", "<BrandLockup size={34} />\n          <LanguageSwitcher compact id=\"landing-interface-locale\" />")],
    ["AK. Configurações volta com dropdown", "SETTINGS_NOT_MINIMAL", src("languageSettings", '<ul className="divide-y divide-line/70', '<select data-testid="interface-locale-select" /><ul className="divide-y divide-line/70')],
    ["AL. 'Foco do curso' volta", "SETTINGS_NOT_MINIMAL", src("settingsPage", "        <LanguageAndCourseSettings />\n", '        <LanguageAndCourseSettings />\n        <div data-testid="current-course-focus" />\n')],
    ["AI. sem 'Usar idioma do sistema'", "SYSTEM_OPTION_MISSING", src("languageSettings", 'id="system"', 'id="auto"')],
    ["AA. troca de curso sem aviso", "COURSE_CHANGE_WARNING", src("languageSettings", 'data-testid="course-change-warning"', 'data-testid="course-change-note"')],
    ["AY. cartão sem papel de rádio", "A11Y_CARDS", src("cards", 'role="radio"', 'role="button"')],
    ["AZ. só bandeira identifica o idioma", "FLAG_ONLY_LABEL", src("cards", '<span className="block font-semibold text-ink">{direction.sourceNativeName}</span>', "")],
    ["AX. vibra ao detectar idioma", "HAPTIC_ON_DETECTION", src("locale", "export function resolveSystemInterfaceLocale(", 'import { haptic } from "../lib/haptics";\nexport function resolveSystemInterfaceLocale(')],
    ["QA1. checagem física do idioma some do manifesto", "QA_FIELD_MISSING", (s) => { delete s.qa.systemLocaleDetection; }],
    ["QA2. picker marcado PASS sem aparelho", "PHYSICAL_PASS_WITHOUT_EVIDENCE", (s) => { s.qa.coursePicker = "PASS"; }],
    ["AP. piscada PT → EN na abertura", "STARTUP_FLICKER", src("main", "bootstrapCourseDirection();\n", "")],
  ],
};

const real = await gate(base);
assert.deepEqual(real, [], `${name}: o estado real precisa passar\n${report(name, real)}`);
let killed = 0;
for (const [label, code, mutate] of MUTATIONS[area]) {
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
