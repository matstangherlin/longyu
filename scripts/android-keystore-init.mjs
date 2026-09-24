#!/usr/bin/env node
/**
 * RC2.2.12 · T/U — cria a UPLOAD KEY do Longyu com o keytool, com segurança.
 *
 *   npm run android:keystore:init -- --path <arquivo.jks> --alias <alias> --confirm CRIAR-UPLOAD-KEY
 *
 * Regras (nenhuma é opcional):
 * - Sem `--confirm CRIAR-UPLOAD-KEY`, NÃO executa: só explica o que faria.
 * - NUNCA inventa, gera ou imprime senha. O `keytool` pergunta as senhas no
 *   terminal (entrada interativa, fora do histórico do shell). Não aceitamos
 *   senha por argumento de linha de comando.
 * - O arquivo precisa ficar FORA do repositório e não pode já existir
 *   (nunca sobrescreve uma chave).
 * - Depois de criar: imprime só o que é público (SHA-256 do certificado) e o
 *   checklist de backup de docs/ANDROID_SIGNING.md.
 *
 * Esta é a upload key. A chave que assina o app nos aparelhos é a do Google
 * (Play App Signing) e nunca sai do Google.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CONFIRM_TOKEN = "CRIAR-UPLOAD-KEY";
export const KEYTOOL_ARGS = ["-genkeypair", "-v", "-keyalg", "RSA", "-keysize", "4096", "-validity", "10000"];
const FORBIDDEN_ARGS = ["--storepass", "--keypass", "--password", "-storepass", "-keypass"];

function arg(argv, name) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

/**
 * Plano puro (testável): decide se pode rodar e com quais argumentos.
 * Nunca contém senha.
 */
export function planKeystoreInit({ argv, repoRoot, exists = fs.existsSync }) {
  const problems = [];
  if (argv.some((token) => FORBIDDEN_ARGS.includes(token) || /pass(word)?=/i.test(token))) {
    problems.push("PASSWORD_ON_COMMAND_LINE: senha nunca vai por argumento; o keytool pergunta no terminal");
  }
  const target = arg(argv, "path") ?? process.env.LONGYU_ANDROID_KEYSTORE_PATH;
  const alias = arg(argv, "alias") ?? process.env.LONGYU_ANDROID_KEY_ALIAS;
  if (!target) problems.push("MISSING_PATH: informe --path (ou LONGYU_ANDROID_KEYSTORE_PATH)");
  if (!alias) problems.push("MISSING_ALIAS: informe --alias (ou LONGYU_ANDROID_KEY_ALIAS)");
  let absolute = null;
  if (target) {
    absolute = path.resolve(target);
    const rel = path.relative(repoRoot, absolute);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) problems.push("KEYSTORE_INSIDE_REPO: guarde o .jks fora do repositório");
    if (exists(absolute)) problems.push("KEYSTORE_EXISTS: já existe um arquivo nesse caminho; nunca sobrescrevemos uma chave");
  }
  const confirmed = arg(argv, "confirm") === CONFIRM_TOKEN;
  const keytoolArgs = absolute && alias ? [...KEYTOOL_ARGS, "-keystore", absolute, "-alias", alias] : null;
  return { ok: problems.length === 0, confirmed, problems, keytoolArgs, absolute, alias };
}

/** SHA-256 público do certificado a partir da saída do `keytool -list -v`. */
export function parseCertSha256(output) {
  return String(output ?? "").match(/SHA256:\s*([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i)?.[1]?.toUpperCase() ?? null;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const plan = planKeystoreInit({ argv: process.argv.slice(2), repoRoot });
  if (!plan.ok) {
    for (const problem of plan.problems) console.error(`android:keystore:init — ${problem}`);
    process.exit(2);
  }
  if (!plan.confirmed) {
    console.log("android:keystore:init — modo explicação (nada foi criado).");
    console.log(`  criaria: ${plan.absolute} · alias ${plan.alias} · RSA 4096 · validade 10000 dias`);
    console.log(`  o keytool pediria as duas senhas no terminal. Para executar: --confirm ${CONFIRM_TOKEN}`);
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(plan.absolute), { recursive: true });
  // stdio herdado: as senhas são digitadas direto no keytool, este script não as vê.
  const created = spawnSync("keytool", plan.keytoolArgs, { stdio: "inherit" });
  if (created.error || created.status !== 0) {
    console.error("keytool falhou; nenhuma chave foi registrada.");
    process.exit(created.status ?? 1);
  }
  console.log("\nUpload key criada. Próximos passos (docs/ANDROID_SIGNING.md §9):");
  console.log("  1. SHA-256 público do certificado: keytool -list -v -keystore <arquivo> -alias <alias> (pede a senha)");
  console.log("  2. Backup offline 1 e 2 (checklist) ANTES de qualquer upload.");
  console.log("  3. Cadastre os 4 valores (ou os secrets do GitHub). Nunca cole a senha em chat, issue ou commit.");
}
