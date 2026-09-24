#!/usr/bin/env node
/**
 * RC2.2.12 · X/Y — verifica a assinatura de um AAB/APK de release.
 *
 *   node scripts/android-verify-signature.mjs <arquivo.aab|apk> [--out <evidência.json>]
 *
 * Usa `keytool -printcert -jarfile` (JDK; funciona para AAB, que é assinado no
 * esquema JAR). Registra só o que é PÚBLICO: dono do certificado e SHA-256.
 * Falha se:
 *   - não houver assinatura                      → UNSIGNED
 *   - a assinatura for a debug key do Android    → DEBUG_KEY_IN_RELEASE
 *   - o arquivo não existir                      → MISSING_ARTIFACT
 * Nunca lê nem imprime senha.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const SIGNATURE_SCHEMA = "longyu-android-signature/1";

/** Parse puro da saída do `keytool -printcert -jarfile`. */
export function parsePrintcert(output) {
  const text = String(output ?? "");
  const owner = text.match(/^\s*(?:Owner|Proprietário):\s*(.+)$/im)?.[1]?.trim() ?? null;
  const sha256 = text.match(/SHA256:\s*([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i)?.[1]?.toUpperCase() ?? null;
  const unsigned = /Not a signed jar file|não é um arquivo jar assinado|no certificate/i.test(text) || !sha256;
  const debugKey = /CN=Android Debug/i.test(owner ?? "") || /CN=Android Debug/i.test(text);
  return { owner, sha256, unsigned, debugKey };
}

export function signatureVerdict(parsed) {
  if (parsed.unsigned) return { ok: false, code: "UNSIGNED" };
  if (parsed.debugKey) return { ok: false, code: "DEBUG_KEY_IN_RELEASE" };
  return { ok: true, code: "SIGNED_WITH_UPLOAD_KEY" };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const file = process.argv[2];
  const outIndex = process.argv.indexOf("--out");
  const out = outIndex > 0 ? process.argv[outIndex + 1] : null;
  if (!file || !fs.existsSync(file)) {
    console.error("MISSING_ARTIFACT: informe um .aab/.apk existente");
    process.exit(2);
  }
  const result = spawnSync("keytool", ["-printcert", "-jarfile", file], { encoding: "utf8" });
  const parsed = parsePrintcert(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  const verdict = signatureVerdict(parsed);
  const evidence = {
    schema: SIGNATURE_SCHEMA,
    artifact: path.basename(file),
    artifactSha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    certificateOwner: parsed.owner,
    certificateSha256: parsed.sha256,
    result: verdict.code,
    checkedAt: new Date().toISOString(),
  };
  if (out) fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`${verdict.code} · ${evidence.artifact} · cert SHA-256 ${evidence.certificateSha256 ?? "—"}`);
  process.exit(verdict.ok ? 0 : 8);
}
