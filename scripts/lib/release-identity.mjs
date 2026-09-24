/**
 * RC2.2.10B — identidade canônica de build/release do Longyu.
 *
 * Autoridade técnica: o COMMIT SHA. Web e Android de uma mesma release saem do
 * MESMO SHA de `main`. Timestamp (`builtAt`) é só informativo, nunca identidade.
 *
 * Funções puras + leitura de git. Sem imports relativos (os validators carregam
 * este módulo isolado para exercitar o comportamento).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const IDENTITY_SCHEMA = "longyu-build-identity/1";
export const SOURCE_OF_TRUTH_BRANCH = "main";
export const PLATFORMS = ["web", "android"];
export const BUILD_TYPES = ["debug", "release"];
/** Canais formais (docs/RELEASE_PIPELINE.md). Não se misturam. */
export const RELEASE_CHANNELS = ["dev", "internal", "closed", "production"];
/** Track do Google Play por canal. `dev` nunca sobe para o Play. */
export const PLAY_TRACK_BY_CHANNEL = { internal: "internal", closed: "alpha", production: "production" };
/** Destino automático máximo enquanto o Longyu estiver em Beta. */
export const MAX_AUTOMATIC_CHANNEL = "internal";

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function readGitState(root = process.cwd()) {
  const sha = safeGit(root, ["rev-parse", "HEAD"]);
  const branch =
    process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.BRANCH || safeGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]) || "";
  const dirty = safeGit(root, ["status", "--porcelain", "--untracked-files=no"]) !== "";
  const firstParentCount = Number(safeGit(root, ["rev-list", "--count", "--first-parent", "HEAD"]) || 0);
  return { sha, branch, dirty, firstParentCount };
}

function safeGit(root, args) {
  try {
    return git(root, args);
  } catch {
    return "";
  }
}

export function shortSha(sha) {
  return /^[0-9a-f]{7,40}$/.test(String(sha ?? "")) ? String(sha).slice(0, 7) : "";
}

/**
 * versionCode determinístico e crescente ao longo de `main`:
 *   floor (android/version.properties) + nº de commits first-parent até o SHA.
 * Squash-merge mantém `main` linear, então cada merge soma 1. Mesmo SHA → mesmo
 * versionCode (reupload do mesmo commit é recusado, nunca sobrescrito).
 */
export function computeVersionCode({ floor, firstParentCount }) {
  if (!Number.isInteger(floor) || floor < 1) throw new Error(`versionCode floor inválido: ${floor}`);
  if (!Number.isInteger(firstParentCount) || firstParentCount < 1) throw new Error(`contagem de commits inválida: ${firstParentCount}`);
  return floor + firstParentCount;
}

/** Nenhuma colisão silenciosa: o novo versionCode precisa superar TODOS os anteriores. */
export function assertVersionCodeIncreases(candidate, previousCodes = []) {
  const max = previousCodes.length ? Math.max(...previousCodes) : 0;
  if (!(Number.isInteger(candidate) && candidate > max)) {
    throw new Error(`VERSION_CODE_NOT_INCREASING: ${candidate} ≤ ${max} (último publicado)`);
  }
  return candidate;
}

/** versionName legível (package.json); nunca o SHA. */
export function assertVersionName(versionName) {
  const ok = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(String(versionName ?? "")) && !/[0-9a-f]{12,}/.test(String(versionName));
  if (!ok) throw new Error(`versionName inválido: ${versionName}`);
  return versionName;
}

export function buildIdentity(input) {
  const { sha, branch, version, platform, buildType, environment, versionCode, versionName, workflowRun, builtAt } = input;
  if (!/^[0-9a-f]{40}$/.test(String(sha ?? ""))) throw new Error("SHA_MISSING: identidade de build exige o commit SHA completo");
  if (!PLATFORMS.includes(platform)) throw new Error(`plataforma inválida: ${platform}`);
  if (!BUILD_TYPES.includes(buildType)) throw new Error(`buildType inválido: ${buildType}`);
  const identity = {
    schema: IDENTITY_SCHEMA,
    authority: "sha",
    sha,
    shortSha: shortSha(sha),
    branch: branch || "",
    version,
    platform,
    buildType,
    environment: environment || "",
    workflowRun: workflowRun || null,
    builtAt: builtAt || null,
  };
  if (platform === "android") {
    identity.versionName = assertVersionName(versionName ?? version);
    if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error(`versionCode ausente/ inválido: ${versionCode}`);
    identity.versionCode = versionCode;
  }
  return identity;
}

/** Nome identificável de artefato (nunca só app-release.aab). */
export function artifactBaseName(identity) {
  const flavor = identity.buildType === "debug" ? "-debug" : "";
  return identity.platform === "web"
    ? `longyu-web-${identity.shortSha}`
    : `longyu-android${flavor}-${identity.versionName}-${identity.shortSha}`;
}

/**
 * Proveniência: responde "qual código está dentro deste APK/AAB?".
 * Só metadados públicos — nunca caminho do keystore, senha, base64 ou token.
 */
export function buildProvenance(identity, files) {
  const provenance = {
    ...identity,
    sourceOfTruth: SOURCE_OF_TRUTH_BRANCH,
    files: files.map((file) => ({ name: file.name, sha256: file.sha256, bytes: file.bytes })),
  };
  for (const key of Object.keys(provenance)) {
    if (/keystore|password|secret|token|alias|base64|credential/i.test(key)) throw new Error(`campo proibido na proveniência: ${key}`);
  }
  if (!provenance.sha) throw new Error("SHA_MISSING: proveniência sem SHA");
  return provenance;
}

/** Stale build: o que foi compilado precisa ser o SHA esperado da release. */
export function assertBuildMatchesRelease({ headSha, bundleSha, expectedSha }) {
  if (!/^[0-9a-f]{40}$/.test(String(headSha ?? ""))) throw new Error("STALE_BUILD: HEAD desconhecido");
  if (expectedSha && expectedSha !== headSha) throw new Error(`STALE_BUILD: release espera ${shortSha(expectedSha)}, workspace está em ${shortSha(headSha)}`);
  if (bundleSha !== headSha) throw new Error(`STALE_BUILD: bundle web embutido é ${shortSha(bundleSha) || "?"}, HEAD é ${shortSha(headSha)}`);
  return true;
}

/** Release oficial exige árvore limpa; só a flag explícita aceita sujeira (e marca como não oficial). */
export function assertCleanTreeForRelease({ dirty, allowDirty }) {
  if (dirty && !allowDirty) {
    throw new Error("DIRTY_TREE: release oficial recusada com mudanças rastreadas não commitadas (use --allow-dirty só para teste local; o artefato sai marcado official=false)");
  }
  return { official: !dirty };
}

/**
 * Canal/track permitidos. Produção só com opt-in explícito, da `main`, e
 * nunca por evento automático (push/pull_request).
 */
export function resolveReleaseTarget({ channel, ref, event, confirmProduction }) {
  if (!RELEASE_CHANNELS.includes(channel) || channel === "dev") throw new Error(`canal inválido para o Play: ${channel}`);
  if (ref !== `refs/heads/${SOURCE_OF_TRUTH_BRANCH}`) throw new Error(`SOURCE_NOT_MAIN: release Android só sai de ${SOURCE_OF_TRUTH_BRANCH} (veio ${ref})`);
  if (event !== "workflow_dispatch") throw new Error(`AUTO_RELEASE_FORBIDDEN: release só por acionamento manual (veio ${event})`);
  if (channel === "production" && confirmProduction !== "PUBLICAR-PRODUCAO") {
    throw new Error("PRODUCTION_NOT_CONFIRMED: produção exige confirm_production=PUBLICAR-PRODUCAO");
  }
  return {
    channel,
    track: PLAY_TRACK_BY_CHANNEL[channel],
    // Produção e closed entram como rascunho: o rollout final é humano no Play Console.
    status: channel === "internal" ? "completed" : "draft",
  };
}

export function readVersionFloor(root = process.cwd()) {
  const text = fs.readFileSync(path.join(root, "android", "version.properties"), "utf8");
  const match = text.match(/^versionCode\s*=\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : NaN;
}
