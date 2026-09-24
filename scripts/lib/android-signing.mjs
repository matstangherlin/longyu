/**
 * RC2.2.10 — espelho Node do contrato de assinatura de android/app/longyu-signing.gradle.
 * Usado pelo android-cli (pré-checagem honesta) e pelos validators. Nunca
 * devolve nem imprime valores — só nomes.
 */
import fs from "node:fs";
import path from "node:path";

export const SIGNING_VALUES = [
  { env: "LONGYU_ANDROID_KEYSTORE_PATH", prop: "storeFile", role: "keystore (arquivo .jks da upload key)" },
  { env: "LONGYU_ANDROID_KEYSTORE_PASSWORD", prop: "storePassword", role: "senha do keystore" },
  { env: "LONGYU_ANDROID_KEY_ALIAS", prop: "keyAlias", role: "alias da chave" },
  { env: "LONGYU_ANDROID_KEY_PASSWORD", prop: "keyPassword", role: "senha da chave" },
];

export function parseProperties(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const match = line.match(/^([^=:\s]+)\s*[=:]\s*(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

/** @returns {string[]} nomes (env) faltando; nunca valores. */
export function missingSigningValues({ env = {}, androidDir }) {
  const propsFile = path.join(androidDir, "keystore.properties");
  const props = fs.existsSync(propsFile) ? parseProperties(fs.readFileSync(propsFile, "utf8")) : {};
  const resolved = {};
  for (const value of SIGNING_VALUES) {
    const v = String(env[value.env] ?? props[value.prop] ?? "").trim();
    resolved[value.env] = v || null;
  }
  const missing = SIGNING_VALUES.filter((value) => !resolved[value.env]).map((value) => value.env);
  const keystore = resolved.LONGYU_ANDROID_KEYSTORE_PATH;
  if (keystore) {
    const abs = path.isAbsolute(keystore) ? keystore : path.join(androidDir, keystore);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) missing.push("LONGYU_ANDROID_KEYSTORE_PATH (arquivo não encontrado)");
  }
  return missing;
}
