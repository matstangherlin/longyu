#!/usr/bin/env node
/**
 * RC2.2.10B — upload de AAB assinado para o Google Play (Android Publisher API v3).
 *
 * Sem dependências: JWT RS256 com node:crypto + fetch. Credencial ÚNICA:
 * GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (secret do GitHub; nunca em arquivo do repo).
 *
 *   node scripts/play-upload.mjs --probe
 *       → só diz se a credencial existe: READY ou BLOCKED_PLAY_CREDENTIALS (exit 0)
 *   node scripts/play-upload.mjs --aab <arquivo> --provenance <arquivo> --channel internal
 *       [--notes-file <arquivo>] [--confirm-production PUBLICAR-PRODUCAO] [--out <registro.json>]
 *
 * Política (scripts/lib/release-identity.mjs → resolveReleaseTarget):
 *   - só de refs/heads/main, só por workflow_dispatch (GITHUB_REF / GITHUB_EVENT_NAME);
 *   - canal padrão = internal (status completed);
 *   - closed → track "alpha" como RASCUNHO; production só com o opt-in explícito
 *     e também como RASCUNHO: o rollout final é humano, no Play Console;
 *   - versionCode precisa superar todo versionCode já presente nas tracks
 *     (colisão nunca é silenciosa).
 * Saídas: exit 5 BLOCKED_PLAY_CREDENTIALS · exit 6 política/guard · exit 1 erro da API.
 * Nunca imprime a credencial, o token nem a chave privada.
 */
import { createSign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertVersionCodeIncreases, resolveReleaseTarget } from "./lib/release-identity.mjs";
import { ANDROID_APPLICATION_ID } from "./lib/android-package-identity.mjs";

export const EXIT_BLOCKED_PLAY = 5;
export const EXIT_POLICY = 6;
const PACKAGE_NAME = ANDROID_APPLICATION_ID;
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const UPLOAD_API = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

export function readServiceAccount(env = process.env) {
  const raw = env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type !== "service_account" || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.private_key))}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`token OAuth recusado (HTTP ${response.status})`);
  return (await response.json()).access_token;
}

async function api(token, method, url, body, headers = {}) {
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body && !(body instanceof Uint8Array) ? { "content-type": "application/json" } : {}), ...headers },
    body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Play API ${method} ${url.replace(/\?.*$/, "")} → HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function writeRecord(out, record) {
  if (out) fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record));
}

async function main() {
  const account = readServiceAccount();
  const configured = account !== null;
  if (process.argv.includes("--probe")) {
    console.log(configured ? "PLAY_CREDENTIALS: READY" : "PLAY_CREDENTIALS: BLOCKED_PLAY_CREDENTIALS (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON não configurado)");
    return;
  }

  const channel = arg("channel") ?? "internal";
  const out = arg("out");
  let target;
  try {
    target = resolveReleaseTarget({
      channel,
      ref: process.env.GITHUB_REF ?? "",
      event: process.env.GITHUB_EVENT_NAME ?? "",
      confirmProduction: arg("confirm-production") ?? "",
    });
  } catch (error) {
    console.error(String(error.message));
    process.exit(EXIT_POLICY);
  }

  const provenance = JSON.parse(fs.readFileSync(arg("provenance"), "utf8"));
  const base = {
    packageName: provenance.packageName,
    versionCode: provenance.versionCode,
    versionName: provenance.versionName,
    sha: provenance.sha,
    channel,
    track: target.track,
  };
  if (provenance.buildType !== "release" || provenance.official === false) {
    console.error("UNOFFICIAL_BUILD: só AAB release oficial (árvore limpa, SHA conferido) sobe para o Play");
    process.exit(EXIT_POLICY);
  }
  // RC2.2.16 · B/O — o package lido do AAB compilado precisa ser o do app no Play.
  if (provenance.packageName !== PACKAGE_NAME || provenance.bundleInspection?.legacyIdFound !== false) {
    console.error(`PACKAGE_MISMATCH: AAB ${provenance.packageName ?? "sem package inspecionado"} ≠ Play ${PACKAGE_NAME}; nenhum upload feito`);
    process.exit(EXIT_POLICY);
  }
  if (!/^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/.test(String(provenance.signingCertificateSha256 ?? "")) || provenance.signatureResult !== "SIGNED_WITH_UPLOAD_KEY") {
    console.error("SIGNATURE_EVIDENCE_MISSING: proveniência sem certificado da upload key; nenhum upload feito");
    process.exit(EXIT_POLICY);
  }
  if (!account) {
    writeRecord(out, { ...base, result: "BLOCKED_PLAY_CREDENTIALS" });
    console.error("BLOCKED_PLAY_CREDENTIALS: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ausente ou inválido. O AAB assinado continua disponível como artifact.");
    process.exit(EXIT_BLOCKED_PLAY);
  }

  const aab = fs.readFileSync(arg("aab"));
  const notesFile = arg("notes-file");
  const notes = notesFile && fs.existsSync(notesFile) ? fs.readFileSync(notesFile, "utf8").trim().slice(0, 500) : "";
  const token = await accessToken(account);
  const edit = await api(token, "POST", `${API}/${PACKAGE_NAME}/edits`, {});
  const tracks = await api(token, "GET", `${API}/${PACKAGE_NAME}/edits/${edit.id}/tracks`);
  const published = (tracks.tracks ?? []).flatMap((track) => (track.releases ?? []).flatMap((release) => (release.versionCodes ?? []).map(Number)));
  try {
    assertVersionCodeIncreases(provenance.versionCode, published);
  } catch (error) {
    await api(token, "DELETE", `${API}/${PACKAGE_NAME}/edits/${edit.id}`).catch(() => undefined);
    writeRecord(out, { ...base, result: "VERSION_CODE_NOT_INCREASING" });
    console.error(String(error.message));
    process.exit(EXIT_POLICY);
  }
  const bundle = await api(token, "POST", `${UPLOAD_API}/${PACKAGE_NAME}/edits/${edit.id}/bundles?uploadType=media`, new Uint8Array(aab), {
    "content-type": "application/octet-stream",
  });
  if (Number(bundle.versionCode) !== provenance.versionCode) throw new Error(`Play leu versionCode ${bundle.versionCode}, proveniência diz ${provenance.versionCode}`);
  await api(token, "PUT", `${API}/${PACKAGE_NAME}/edits/${edit.id}/tracks/${target.track}`, {
    track: target.track,
    releases: [
      {
        name: `${provenance.versionName} (${provenance.versionCode}) ${provenance.shortSha}`,
        versionCodes: [String(provenance.versionCode)],
        status: target.status,
        ...(notes ? { releaseNotes: [{ language: "pt-BR", text: notes }] } : {}),
      },
    ],
  });
  await api(token, "POST", `${API}/${PACKAGE_NAME}/edits/${edit.id}:commit`);
  writeRecord(out, { ...base, status: target.status, result: "UPLOADED", uploadedAt: new Date().toISOString() });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`play-upload: ${String(error?.message ?? error)}`);
    process.exit(1);
  });
}
