/**
 * V4.8.0 i18n runtime: default locale, parse, persist, no country inference.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const errors = [];
const assert = (cond, msg) => {
  if (!cond) errors.push(msg);
};

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
};

function transpile(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  return ts.transpileModule(source, { compilerOptions, fileName: relativePath }).outputText;
}

const memory = new Map();
globalThis.document = {
  documentElement: {
    lang: "",
    dataset: {},
  },
};
globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(String(key), String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
  clear() {
    memory.clear();
  },
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-i18n-runtime-"));
try {
  await mkdir(path.join(outDir, "src/i18n"), { recursive: true });
  await mkdir(path.join(outDir, "src/locales"), { recursive: true });
  await mkdir(path.join(outDir, "src/lib/auth"), { recursive: true });
  await mkdir(path.join(outDir, "supabase/functions/_shared"), { recursive: true });
  await writeFile(path.join(outDir, "src/i18n/config.js"), transpile("src/i18n/config.ts"));
  await writeFile(path.join(outDir, "src/i18n/locale.js"), transpile("src/i18n/locale.ts"));
  await writeFile(path.join(outDir, "src/locales/pt-BR.js"), transpile("src/locales/pt-BR.ts"));
  await writeFile(path.join(outDir, "src/locales/en.js"), transpile("src/locales/en.ts"));
  await writeFile(path.join(outDir, "src/i18n/catalog.js"), transpile("src/i18n/catalog.ts"));
  await writeFile(path.join(outDir, "src/i18n/pedagogy.js"), transpile("src/i18n/pedagogy.ts"));
  await writeFile(
    path.join(outDir, "src/lib/auth/localAuthPolicy.js"),
    "exports.BACKEND_UNAVAILABLE_MESSAGE = 'Não foi possível conectar ao Longyu agora. Tente novamente em alguns instantes.';\n"
  );
  await writeFile(
    path.join(outDir, "supabase/functions/_shared/accountDeletion.js"),
    transpile("supabase/functions/_shared/accountDeletion.ts")
  );
  await writeFile(path.join(outDir, "src/i18n/errors.js"), transpile("src/i18n/errors.ts"));

  const config = require(path.join(outDir, "src/i18n/config.js"));
  const locale = require(path.join(outDir, "src/i18n/locale.js"));
  const catalog = require(path.join(outDir, "src/i18n/catalog.js"));
  const pedagogy = require(path.join(outDir, "src/i18n/pedagogy.js"));
  const errorsMod = require(path.join(outDir, "src/i18n/errors.js"));

  locale.resetInterfaceLocaleForTests();
  assert(config.DEFAULT_LOCALE === "pt-BR", "default locale is pt-BR");
  assert(config.TARGET_LANGUAGE === "zh-CN", "target language is zh-CN");
  assert(locale.getInterfaceLocale() === "pt-BR", "bootstrap default pt-BR");
  assert(globalThis.document.documentElement.lang === "pt-BR", "HTML lang default pt-BR");
  assert(globalThis.document.documentElement.dataset.interfaceLocale === "pt-BR", "data-interface-locale default");
  assert(locale.parseInterfaceLocale("en") === "en", "parse en");
  assert(locale.parseInterfaceLocale("en-US") === "en", "en-US canonicalizes to en, not country");
  assert(locale.parseInterfaceLocale("pt") === "pt-BR", "pt canonicalizes to pt-BR");
  assert(locale.parseInterfaceLocale("fr") === "pt-BR", "unsupported → pt-BR");
  assert(locale.parseInterfaceLocale("zh-CN") === "pt-BR", "target language is not an interface locale");
  assert(locale.parseInterfaceLocale("BR") === "pt-BR", "country BR does not select Portuguese");
  assert(locale.parseInterfaceLocale("US") === "pt-BR", "country US does not select English");
  assert(locale.parseInterfaceLocale("us") === "pt-BR", "lowercase country is not a locale");

  const identitySrc = fs.readFileSync(path.join(root, "src/lib/i18n/identity.ts"), "utf8");
  assert(!/country\s*===\s*["']BR["']/.test(identitySrc), "identity never infers locale from country === BR");
  const localeSrc = fs.readFileSync(path.join(root, "src/i18n/locale.ts"), "utf8");
  assert(!/navigator\.language/.test(localeSrc), "no browser language inference");
  assert(!/country\s*===\s*["']BR["']/.test(localeSrc), "locale runtime does not read country");

  locale.setInterfaceLocale("en");
  assert(locale.getInterfaceLocale() === "en", "switch to en");
  assert(globalThis.localStorage.getItem(config.INTERFACE_LOCALE_STORAGE_KEY) === "en", "persist en");
  assert(globalThis.document.documentElement.lang === "en", "HTML lang changes to en");
  assert(globalThis.document.documentElement.dataset.interfaceLocale === "en", "data-interface-locale en");
  assert(catalog.t("navigation.journey") === "Journey", "en catalog after switch");
  assert(catalog.t("auth.signIn") === "Sign in", "auth en");
  assert(catalog.t("common.appName") === "Longyu", "product name stable");

  locale.resetInterfaceLocaleForTests();
  globalThis.localStorage.setItem(config.INTERFACE_LOCALE_STORAGE_KEY, "en");
  locale.bootstrapInterfaceLocale();
  assert(locale.getInterfaceLocale() === "en", "persist reload restores en");

  locale.resetInterfaceLocaleForTests();
  globalThis.localStorage.setItem(config.INTERFACE_LOCALE_STORAGE_KEY, "xx-ZZ");
  locale.bootstrapInterfaceLocale();
  assert(locale.getInterfaceLocale() === "pt-BR", "garbage stored locale → pt-BR");

  locale.setInterfaceLocale("en");
  const mapped = errorsMod.localizeUserMessage("Invalid login credentials");
  assert(mapped === "Incorrect email or password.", "known supabase error maps in EN");
  const mappedPt = errorsMod.localizeUserMessage("Informe um email válido e senha com pelo menos 6 caracteres.");
  assert(mappedPt === catalog.t("auth.errors.invalidEmailPassword"), "known PT error maps in EN");
  const mappedDeletion = errorsMod.localizeUserMessage("Não foi possível excluir a conta.");
  assert(mappedDeletion === catalog.t("settings.deletionFailed"), "privacy deletion error maps in EN");

  locale.setInterfaceLocale("pt-BR");
  assert(catalog.t("navigation.journey") === "Jornada", "pt-BR catalog");

  catalog.consumeMissingTranslationKeys();
  const missing = catalog.t("this.key.does.not.exist");
  assert(missing === "this.key.does.not.exist", "missing key returns the key");
  const reported = catalog.peekMissingTranslationKeys();
  assert(reported.some((item) => item.includes("this.key.does.not.exist")), "missing key is detectable");

  const overlay = {
    "pt-BR": "Olá",
    en: "Hello",
  };
  assert(pedagogy.resolveLocalizedText(overlay, "en") === "Hello", "gloss overlay en");
  assert(pedagogy.resolveLocalizedText(overlay, "pt-BR") === "Olá", "gloss overlay pt-BR");
  assert(pedagogy.resolveLocalizedText({ "pt-BR": "Olá" }, "en") === "Olá", "missing en gloss falls back to pt-BR");
  assert(pedagogy.isCanonicalZhField("hanzi"), "hanzi is canonical");
  assert(pedagogy.isLocalizableInstructionField("explanation"), "explanation is localizable");
  assert(!pedagogy.isCanonicalZhField("explanation"), "explanation is not canonical zh");

  locale.setInterfaceLocale("en");
  assert(catalog.t("placement.title") === "Placement", "EN Placement term");
  assert(catalog.t("onboarding.welcomeTitle").includes("right place for you to start"), "EN onboarding heading");
  assert(catalog.t("placement.opt.hello") === "Hello", "gloss option overlay en");
  locale.setInterfaceLocale("pt-BR");
  assert(catalog.t("placement.opt.hello") === "Olá", "gloss option overlay pt-BR");
  assert(catalog.t("placement.prompt.warmNihaoMeaning") === "O que significa esta saudação?", "PT prompt unchanged");

  const storeSrc = fs.readFileSync(path.join(root, "src/lib/store.ts"), "utf8");
  assert(!storeSrc.includes("INTERFACE_LOCALE_STORAGE_KEY"), "locale is not inside the pedagogical store");
  assert(/version:\s*20/.test(storeSrc), "pedagogical persist version unchanged");

      if (errors.length) throw new Error(errors.join("; "));
      console.log("OK test:i18n");
} catch (error) {
  errors.push(error instanceof Error ? error.stack || error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error("FAIL test:i18n:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
