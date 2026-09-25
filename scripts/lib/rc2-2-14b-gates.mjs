/**
 * RC2.2.14B — Automatic locale detection & course direction selection.
 *
 * Quatro gates sobre um estado carregado do repositório real:
 *   validateInterfaceLocaleResolution   sistema → interface, fallback EN, override manual
 *   validateCourseDirection             registro data-driven, escolha explícita, sem mexer em progresso
 *   validateCourseDirectionMigration    contas antigas, conta como autoridade, sem vazamento, #273
 *   validateMobileLanguageUx            sem seletor na landing/onboarding, Configurações mínima
 * Cada um devolve [{ code, where, why }]. Os `test:*` mutam o estado e exigem
 * o código certo. Os resolvedores são EXECUTADOS a partir do texto do estado
 * (esbuild com arquivos virtuais), para que uma mutação no código conte.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256, CLOUD_CHECKS } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

/** Onde `navigator.language(s)` já era lido antes (diagnóstico, sem decidir idioma). */
export const NAVIGATOR_LANGUAGE_ALLOWLIST = [
  "src/lib/platform/systemLocale.ts",
  "src/services/anonymousIngestionSession.ts",
  "src/lib/feedback.ts",
];
/** Componentes de UI que não podem ter lista de cursos escrita à mão. */
/** Checagens em aparelho físico que só um device real pode marcar PASS. */
export const RC2_2_14B_QA_FIELDS = ["systemLocaleDetection", "systemLocaleChange", "coursePicker"];
export const COURSE_UI_FILES = [
  "src/features/landing/CoursePickerPage.tsx",
  "src/components/i18n/CourseDirectionCards.tsx",
  "src/components/i18n/LanguageAndCourseSettings.tsx",
  "src/components/i18n/CourseDirectionChip.tsx",
  "src/features/landing/MobileWelcome.tsx",
  "src/features/onboarding/ComecarPage.tsx",
  "src/features/settings/SettingsPage.tsx",
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const FILES = {
  config: "src/i18n/config.ts",
  locale: "src/i18n/locale.ts",
  instructionLocale: "src/i18n/instructionLocale.ts",
  courseDirection: "src/i18n/courseDirection.ts",
  provider: "src/i18n/provider.tsx",
  systemLocale: "src/lib/platform/systemLocale.ts",
  state: "src/lib/courseDirectionState.ts",
  sync: "src/services/courseDirectionSync.ts",
  bootstrap: "src/components/i18n/CourseDirectionBootstrap.tsx",
  main: "src/main.tsx",
  store: "src/lib/store.ts",
  welcome: "src/features/landing/MobileWelcome.tsx",
  landing: "src/features/landing/LandingPage.tsx",
  picker: "src/features/landing/CoursePickerPage.tsx",
  cards: "src/components/i18n/CourseDirectionCards.tsx",
  chip: "src/components/i18n/CourseDirectionChip.tsx",
  languageSettings: "src/components/i18n/LanguageAndCourseSettings.tsx",
  guided: "src/features/landing/GuidedTryPage.tsx",
  comecar: "src/features/onboarding/ComecarPage.tsx",
  settingsPage: "src/features/settings/SettingsPage.tsx",
  routes: "src/routes.tsx",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
};

export async function loadState() {
  const srcFiles = Object.fromEntries(walk("src").map((rel) => [rel, read(rel)]));
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, srcFiles[rel] ?? read(rel)]));
  return {
    freeze: loadBetaPedagogyFreezeState(),
    operational: readJson("docs/release/rc1-operational-checks.json"),
    qa: readJson("docs/release/android-physical-qa.json"),
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    migrations: fs.readdirSync(path.join(ROOT, "supabase/migrations")).map((name) => ({ name, text: read(`supabase/migrations/${name}`) })),
    srcFiles,
    src,
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

/** Bundle de um módulo do estado (arquivos virtuais = texto possivelmente mutado). */
let bundleSeq = 0;
async function importFromState(s, entryKey) {
  const byAbs = new Map();
  for (const [key, rel] of Object.entries(FILES)) byAbs.set(path.join(ROOT, rel), s.src[key]);
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, FILES[entryKey])],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2214b-"));
  const file = path.join(dir, `m${bundleSeq++}.mjs`);
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** localStorage de mentira para executar os resolvedores. */
function withFakeStorage(entries, fn) {
  const store = new Map(Object.entries(entries));
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  try {
    return fn();
  } finally {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  }
}

const localeValue = (text, ns, key) => {
  const start = String(text).indexOf(`\n  ${ns}: {`);
  if (start < 0) return undefined;
  const end = String(text).indexOf("\n  },", start);
  return new RegExp(`\\n    ${key}: "([^"]*)"`).exec(String(text).slice(start, end))?.[1];
};

function fnBody(text, signature) {
  const start = String(text).indexOf(signature);
  if (start < 0) return "";
  let depth = 0;
  let i = String(text).indexOf("{", start + signature.length - 1);
  for (let j = i; j < text.length; j += 1) {
    if (text[j] === "{") depth += 1;
    else if (text[j] === "}" && --depth === 0) return text.slice(i, j + 1);
  }
  return "";
}

// ── 1 · Interface: sistema → idioma ────────────────────────────────────────
export async function validateInterfaceLocaleResolution(s) {
  const { failures, fail } = collector();
  let mod;
  try {
    mod = await importFromState(s, "locale");
  } catch (error) {
    fail("LOCALE_MODULE_BROKEN", "locale.ts", String(error?.message ?? error).slice(0, 160));
    return failures;
  }
  const cases = [
    [["pt-BR"], "pt-BR", "PT_OPENS_EN"],
    [["pt-PT"], "pt-BR", "PT_OPENS_EN"],
    [["pt"], "pt-BR", "PT_OPENS_EN"],
    [["en-US"], "en", "EN_OPENS_PT"],
    [["en-GB"], "en", "EN_OPENS_PT"],
    [["en"], "en", "EN_OPENS_PT"],
    [["es-ES", "pt-BR"], "pt-BR", "PT_OPENS_EN"],
  ];
  for (const [tags, expected, code] of cases) {
    let got;
    try {
      got = mod.resolveSystemInterfaceLocale(tags);
    } catch (error) {
      got = `throw ${error?.message}`;
    }
    if (got !== expected) fail(code, "resolveSystemInterfaceLocale", `${tags.join(",")} → ${got} (esperado ${expected})`);
  }
  for (const tags of [["es-ES"], ["fr-FR"], ["de"], ["zh-CN"], ["ja"]]) {
    let got;
    try {
      got = mod.resolveSystemInterfaceLocale(tags);
    } catch (error) {
      got = `throw ${error?.message}`;
    }
    if (got !== "en") fail("UNSUPPORTED_LOCALE_UNSAFE", "resolveSystemInterfaceLocale", `${tags[0]} → ${got} (fallback EN, sem crash)`);
  }
  // Override manual vence o sistema; modo sistema acompanha.
  mod.setSystemLanguageProvider(() => ["pt-BR"]);
  const manual = withFakeStorage({ "longyu:interface-locale": "en", "longyu:interface-locale-source": "user" }, () => mod.resolvePreferredInterfaceLocale());
  if (manual !== "en") fail("MANUAL_OVERRIDE_OVERWRITTEN", "resolvePreferredInterfaceLocale", `escolha manual EN virou ${manual}`);
  const legacy = withFakeStorage({ "longyu:interface-locale": "en" }, () => mod.resolvePreferredInterfaceLocale());
  if (legacy !== "en") fail("MANUAL_OVERRIDE_OVERWRITTEN", "resolvePreferredInterfaceLocale", `escolha salva antes da RC2.2.14B virou ${legacy}`);
  const system = withFakeStorage({ "longyu:interface-locale": "en", "longyu:interface-locale-source": "system" }, () => mod.resolvePreferredInterfaceLocale());
  if (system !== "pt-BR") fail("SYSTEM_LOCALE_IGNORED", "resolvePreferredInterfaceLocale", `modo sistema com aparelho PT abriu ${system}`);
  const fresh = withFakeStorage({}, () => mod.resolvePreferredInterfaceLocale());
  if (fresh !== "pt-BR") fail("SYSTEM_LOCALE_IGNORED", "resolvePreferredInterfaceLocale", `primeira abertura em aparelho PT abriu ${fresh}`);

  // Idioma do aparelho muda com o app aberto: modo sistema acompanha, manual não.
  if (typeof mod.refreshSystemInterfaceLocale !== "function") {
    fail("SYSTEM_CHANGE_IGNORED", "locale.ts", "refreshSystemInterfaceLocale existe");
  } else {
    const seen = [];
    const off = mod.subscribeInterfaceLocale((locale) => seen.push(locale));
    mod.setSystemLanguageProvider(() => ["en-US"]);
    withFakeStorage({ "longyu:interface-locale": "pt-BR", "longyu:interface-locale-source": "system" }, () => mod.refreshSystemInterfaceLocale());
    if (seen.at(-1) !== "en") fail("SYSTEM_CHANGE_IGNORED", "refreshSystemInterfaceLocale", `modo sistema: aparelho mudou para EN e a interface não acompanhou (${seen.join(",") || "sem aviso"})`);
    seen.length = 0;
    const kept = withFakeStorage({ "longyu:interface-locale": "pt-BR", "longyu:interface-locale-source": "user" }, () => mod.refreshSystemInterfaceLocale());
    if (kept !== "pt-BR" || seen.length > 0) fail("MANUAL_OVERRIDE_OVERWRITTEN", "refreshSystemInterfaceLocale", `escolha manual PT virou ${seen.at(-1) ?? kept} quando o aparelho mudou`);
    off();
    mod.setSystemLanguageProvider(() => ["pt-BR"]);
  }

  const main = stripComments(s.src.main);
  if (!/setSystemLanguageProvider\(systemLanguageTags\);\s*bootstrapInterfaceLocale\(\);/.test(main))
    fail("SYSTEM_LOCALE_IGNORED", "main.tsx", "idioma do sistema registrado antes do bootstrap");
  if (!/function resolveInterfaceLocale\(\): SupportedLocale \{\s*return resolvePreferredInterfaceLocale\(\);/.test(stripComments(s.src.locale)))
    fail("SYSTEM_LOCALE_IGNORED", "locale.ts", "bootstrap usa o resolvedor canônico");
  if (!/onSystemLanguageChange\(refreshSystemInterfaceLocale\)/.test(main) || !/"languagechange"/.test(s.src.systemLocale))
    fail("SYSTEM_CHANGE_IGNORED", "main.tsx", "evento languagechange ligado ao resolvedor");
  if (!/navigator\.languages/.test(s.src.systemLocale)) fail("SYSTEM_LOCALE_IGNORED", "systemLocale.ts", "Web e WebView do Android leem navigator.languages");
  for (const [rel, text] of Object.entries(s.srcFiles)) {
    if (NAVIGATOR_LANGUAGE_ALLOWLIST.includes(rel)) continue;
    if (/navigator\.languages?\b/.test(stripComments(text))) fail("NAVIGATOR_LANGUAGE_SPREAD", rel, "idioma do sistema só via systemLocale.ts");
  }
  return failures;
}

// ── 2 · Curso: registro, escolha explícita, progresso intacto ──────────────
export async function validateCourseDirection(s) {
  const { failures, fail } = collector();
  let mod;
  try {
    mod = await importFromState(s, "courseDirection");
  } catch (error) {
    fail("COURSE_MODULE_BROKEN", "courseDirection.ts", String(error?.message ?? error).slice(0, 160));
    return failures;
  }
  const ids = mod.availableCourseDirections().map((d) => d.id);
  if (!ids.includes("pt-zh") || !ids.includes("en-zh")) fail("COURSE_MISSING", "courseDirection.ts", `pt-zh e en-zh disponíveis (tem ${ids.join(", ")})`);
  for (const future of ["es-zh", "fr-zh", "de-zh"])
    if (!mod.COURSE_DIRECTIONS.some((d) => d.id === future)) fail("FUTURE_COURSE_UNREGISTERED", "courseDirection.ts", `${future} registrado (indisponível)`);
  for (const d of mod.COURSE_DIRECTIONS) if (d.targetLanguage !== "zh") fail("TARGET_DRIFT", d.id, "mandarim é o alvo de todo curso (hànzì/pinyin/áudio iguais)");
  if (mod.resolveCourseDirection({}) !== null) fail("COURSE_AUTO_SELECTED", "resolveCourseDirection", "sem escolha → null (nunca inferido do sistema)");
  if (mod.recommendedCourseDirection(["es-ES"]) !== null) fail("FALSE_RECOMMENDATION", "recommendedCourseDirection", "sem correspondência → sem recomendação");
  if (mod.recommendedCourseDirection(["pt-BR"]) !== "pt-zh" || mod.recommendedCourseDirection(["en-US"]) !== "en-zh")
    fail("FALSE_RECOMMENDATION", "recommendedCourseDirection", "pt → pt-zh, en → en-zh");

  const picker = stripComments(s.src.picker);
  if (!/useState<CourseDirectionId \| null>\(current\)/.test(picker) || !/disabled=\{!selected\}/.test(picker))
    fail("COURSE_AUTO_SELECTED", "CoursePickerPage.tsx", "recomendado é destaque; a pessoa confirma");
  if (/useState<CourseDirectionId \| null>\([^)]*recommended/.test(picker)) fail("COURSE_AUTO_SELECTED", "CoursePickerPage.tsx", "recomendação não vira seleção");
  if (!/availableCourseDirections\(\)\.map\(/.test(s.src.cards)) fail("COURSE_LIST_HARDCODED", "CourseDirectionCards.tsx", "renderiza COURSE_DIRECTIONS.filter(available)");
  for (const rel of COURSE_UI_FILES)
    if (/["'`](pt|en|es|fr|de)-zh["'`]/.test(stripComments(s.srcFiles[rel] ?? ""))) fail("COURSE_LIST_HARDCODED", rel, "sem lista de cursos escrita no componente");

  const welcome = stripComments(s.src.welcome);
  if (!/const guidedTo = hasCourseDirection\(\) \? "\/teste-guiado" : "\/curso\?next=%2Fteste-guiado";/.test(welcome))
    fail("PICKER_EVERY_OPEN", "MobileWelcome.tsx", "curso já escolhido → direto ao teste guiado");
  if (!/if \(!hasCourseDirection\(\)\) return <Navigate to="\/curso\?next=%2Fteste-guiado" replace \/>;/.test(stripComments(s.src.guided)))
    fail("GUIDED_WITHOUT_COURSE", "GuidedTryPage.tsx", "sem curso não entra no teste guiado");
  const comecar = stripComments(s.src.comecar);
  if (!/if \(!hasCourseDirection\(\)\) return <Navigate to="\/curso\?next=%2Fcomecar" replace \/>;/.test(comecar))
    fail("ONBOARDING_WITHOUT_COURSE", "ComecarPage.tsx", "onboarding pede o curso antes");
  if (/<select|LanguageSwitcher|interface-locale-select|instruction-locale-select/.test(comecar) || !/<CourseDirectionChip next="\/comecar" \/>/.test(comecar))
    fail("SIGNUP_ASKS_TWICE", "ComecarPage.tsx", "onboarding/cadastro só mostram o curso (Alterar discreto)");

  const provider = stripComments(s.src.provider);
  const setLocale = /const setLocale = useCallback\(\(next: SupportedLocale\) => \{([\s\S]*?)\}, \[\]\);/.exec(provider)?.[1] ?? "";
  if (!setLocale || /followInterfaceLocale|commitInstructionLocale|setInstructionLocale/.test(setLocale))
    fail("LOCALE_AND_COURSE_SAME_VARIABLE", "provider.tsx", "trocar a interface nunca troca o curso");

  const state = stripComments(s.src.state);
  const choose = fnBody(state, "export function chooseCourseDirection(");
  if (/addXp|gradeSrs|ensureSrs|completedLessons|learnedChars|lessonMastery|streak|resetProgress|createAccount|switchAccount/.test(choose))
    fail("PROGRESS_TOUCHED", "courseDirectionState.ts", "trocar curso só muda a instrução");
  const storeSetter = /setCourseDirection: \(id\) => \{([\s\S]*?)\n      \},/.exec(stripComments(s.src.store))?.[1] ?? "";
  if (!storeSetter || /completedLessons|srs|xpTotal|learnedChars|lessonMasteryById|streak/.test(storeSetter))
    fail("PROGRESS_TOUCHED", "store.ts", "setCourseDirection só grava courseDirection");
  if (/createAccount|switchAccount|makeAccount|accounts\[/.test(storeSetter) || /createAccount|switchAccount/.test(choose))
    fail("PROFILE_SPLIT", "store.ts", "pt-zh e en-zh são o MESMO aluno");
  if (!/haptic\("selection"\)/.test(s.src.cards)) fail("COURSE_HAPTICS_MISSING", "CourseDirectionCards.tsx", "toque leve na escolha");
  return failures;
}

// ── 3 · Migração, autoridade da conta, isolamento ──────────────────────────
export async function validateCourseDirectionMigration(s) {
  const { failures, fail } = collector();
  const mod = await importFromState(s, "courseDirection");
  if (mod.resolveCourseDirection({ legacyInstructionLocale: "pt-BR" }) !== "pt-zh" || mod.resolveCourseDirection({ legacyInstructionLocale: "en" }) !== "en-zh")
    fail("LEGACY_NOT_MIGRATED", "resolveCourseDirection", "instructionLocale pt → pt-zh, en → en-zh sem modal");
  if (mod.resolveCourseDirection({ accountDirection: "en-zh", pendingDirection: "pt-zh", legacyInstructionLocale: "pt-BR" }) !== "en-zh")
    fail("ACCOUNT_NOT_AUTHORITY", "resolveCourseDirection", "conta vence escolha pendente e migração");
  const state = stripComments(s.src.state);
  if (!/accountDirection: onboarded \? state\.courseDirection : null/.test(state) || !/account\?\.authMode !== "cloud"/.test(state))
    fail("ACCOUNT_NOT_AUTHORITY", "courseDirectionState.ts", "curso da conta; conta cloud não herda instrução do aparelho");
  if (/resolveSystemInterfaceLocale|systemLanguageTags|recommendedCourseDirection/.test(state) || /resolveSystemInterfaceLocale|systemLanguageTags|recommendedCourseDirection/.test(stripComments(s.src.bootstrap)))
    fail("DEVICE_OVERRIDES_COURSE", "courseDirectionState.ts / CourseDirectionBootstrap.tsx", "idioma do aparelho nunca decide o curso");
  if (!/state\.setCourseDirection\(direction\);\s*writePendingCourseDirection\(null\);/.test(fnBody(state, "export function bootstrapCourseDirection(")))
    fail("PENDING_NOT_MIGRATED", "courseDirectionState.ts", "escolha antes da conta entra na conta e sai do aparelho");
  const store = stripComments(s.src.store);
  if (!/courseDirection: isAvailableCourseDirection\(existing\?\.courseDirection\) \? existing\.courseDirection : null,/.test(store))
    fail("ACCOUNT_COURSE_LEAK", "store.ts", "conta cloud nunca herda o curso de outra conta (fallback)");
  if (!/courseDirection: isAvailableCourseDirection\(account\.courseDirection\) \? account\.courseDirection : null,/.test(store) || !/courseDirection: s\.courseDirection \?\? null,/.test(store))
    fail("ACCOUNT_COURSE_LEAK", "store.ts", "curso salvo e carregado POR conta");
  const bootstrap = stripComments(s.src.bootstrap);
  if (!/state\.currentAccountId !== cloudAccountId\(found\.userId\)/.test(bootstrap) || !/fetchCourseDirectionFromProfile/.test(bootstrap))
    fail("CLOUD_COURSE_IGNORED", "CourseDirectionBootstrap.tsx", "perfil cloud é a autoridade, só para a própria conta");
  if (!/\.update\(\{ instruction_locale: locale, native_language: locale/.test(stripComments(s.src.sync)))
    fail("CLOUD_COURSE_IGNORED", "courseDirectionSync.ts", "curso vai para profiles.instruction_locale existente");
  for (const migration of s.migrations)
    if (/course_direction/i.test(migration.text)) fail("NEW_SUPABASE_MIGRATION", migration.name, "usa a coluna instruction_locale que já existe");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  for (const id of CLOUD_CHECKS) if (s.operational.checks?.[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "rc2-candidate.json", "o candidate da #273 não muda");
  if (!/export const RC2_2_14B_LOCALE_COURSE_DIRECTION_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_14B_LOCALE_COURSE_DIRECTION_EXCEPTION");
  return failures;
}

// ── 4 · UX de idioma no celular ────────────────────────────────────────────
export async function validateMobileLanguageUx(s) {
  const { failures, fail } = collector();
  const welcome = stripComments(s.src.welcome);
  if (/LanguageSwitcher|<select|landing-locale|setLocale|interface-locale-select/.test(welcome))
    fail("LANDING_LANGUAGE_CONTROL", "MobileWelcome.tsx", "sem seletor de idioma na landing do celular/app");
  if (!/if \(isNativeApp\(\) \|\| !wide\) return <MobileWelcome \/>;/.test(stripComments(s.src.landing)))
    fail("LANDING_LANGUAGE_CONTROL", "LandingPage.tsx", "Android nunca vê o seletor da landing de desktop");
  const settings = stripComments(s.src.settingsPage);
  const learning = settings.slice(settings.indexOf("\n    aprendizagem: ("), settings.indexOf("\n    som: ("));
  if (!/<LanguageAndCourseSettings \/>/.test(learning) || /LanguageSwitcher|CourseLanguageSwitcher|current-course-focus|target-language-card|courseFocus/.test(learning))
    fail("SETTINGS_NOT_MINIMAL", "SettingsPage.tsx", "Aprendizagem: Idioma do aplicativo + Curso, sem blocos redundantes");
  const lang = stripComments(s.src.languageSettings);
  if (/<select/.test(lang) || !/data-testid="settings-interface-locale-row"/.test(lang) || !/data-testid="settings-course-row"/.test(lang))
    fail("SETTINGS_NOT_MINIMAL", "LanguageAndCourseSettings.tsx", "duas linhas que abrem folhas, sem dropdown");
  if (!/id="system"/.test(lang) || !/t\("course\.detected"/.test(lang)) fail("SYSTEM_OPTION_MISSING", "LanguageAndCourseSettings.tsx", '"Usar idioma do sistema" + detectado');
  if (localeValue(s.src.ptBR, "course", "changeWarning") !== "Seu progresso em mandarim será mantido. Apenas as explicações e traduções serão exibidas em {language}." || !/data-testid="course-change-warning"/.test(lang))
    fail("COURSE_CHANGE_WARNING", "LanguageAndCourseSettings.tsx", "aviso curto: progresso mantido");
  if (localeValue(s.src.ptBR, "course", "settingsNote") !== "Isso muda as explicações e traduções. Seu progresso é mantido.")
    fail("COURSE_CHANGE_WARNING", "pt-BR.ts", "nota do curso em Configurações");
  if (localeValue(s.src.ptBR, "course", "pickerTitle") !== "Como você quer aprender mandarim?" || localeValue(s.src.en, "course", "pickerTitle") !== "How do you want to learn Mandarin?")
    fail("PICKER_COPY", "locales", "título da escolha do curso (PT/EN)");
  const cards = stripComments(s.src.cards);
  if (!/role="radio"/.test(cards) || !/aria-checked=\{selected\}/.test(cards) || !/aria-label=\{aria\}/.test(cards) || !/role="radiogroup"/.test(cards))
    fail("A11Y_CARDS", "CourseDirectionCards.tsx", "cartões são rádios com rótulo (recomendado, selecionado)");
  if (!/\{direction\.sourceNativeName\}/.test(cards) || !/aria-hidden="true">\s*\{direction\.flag\}/.test(cards))
    fail("FLAG_ONLY_LABEL", "CourseDirectionCards.tsx", "bandeira é apoio; o texto identifica o idioma");
  for (const key of ["locale", "courseDirection", "state", "bootstrap"])
    if (/haptics"|haptic\(/.test(stripComments(s.src[key]))) fail("HAPTIC_ON_DETECTION", FILES[key], "detectar idioma não vibra");
  const main = stripComments(s.src.main);
  const order = ["setSystemLanguageProvider(systemLanguageTags)", "bootstrapInterfaceLocale()", "bootstrapCourseDirection()", "createRoot("].map((token) => main.indexOf(token));
  if (order.some((index) => index < 0) || order.some((index, i) => i > 0 && index < order[i - 1]))
    fail("STARTUP_FLICKER", "main.tsx", "interface e curso resolvidos antes do primeiro render");
  // Detecção no Android e picker com háptico só contam com aparelho real.
  const physical = s.qa?.formalPass === true && Boolean(s.qa?.deviceModel) && s.qa?.isEmulator === false;
  for (const field of RC2_2_14B_QA_FIELDS) {
    if (!(field in (s.qa ?? {}))) fail("QA_FIELD_MISSING", "android-physical-qa.json", field);
    else if (s.qa[field] === "PASS" && !physical) fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "android-physical-qa.json", `${field}=PASS sem aparelho físico`);
  }
  return failures;
}

export const GATES = {
  "interface-locale-resolution": validateInterfaceLocaleResolution,
  "course-direction": validateCourseDirection,
  "course-direction-migration": validateCourseDirectionMigration,
  "mobile-language-ux": validateMobileLanguageUx,
};
