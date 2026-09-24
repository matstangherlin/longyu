#!/usr/bin/env node
/** test:release-identity — SHA como autoridade; versionCode crescente; stale/dirty guards. */
import { validateReleaseIdentity } from "./lib/delivery-pipeline-gates.mjs";
import { runDeliveryMutations, swap } from "./lib/delivery-mutation-runner.mjs";

const A = "1111111111111111111111111111111111111111";
const B = "2222222222222222222222222222222222222222";
const entry = (versionCode, extra = {}) => ({ versionCode, versionName: "0.2.0-beta.2", sha: A, channel: "internal", track: "internal", result: "UPLOADED", ...extra });

runDeliveryMutations("test:release-identity", validateReleaseIdentity, [
  ["#3 SHA ausente da metadata do artefato", (s) => { s.lib.buildProvenance = (identity, files) => { const { sha, shortSha, ...rest } = identity; return { ...rest, files }; }; }, "SHA_MISSING"],
  ["identidade aceita sem SHA", (s) => { const real = s.lib.buildIdentity; s.lib.buildIdentity = (input) => real({ ...input, sha: input.sha || "0".repeat(40) }); }, "SHA_MISSING"],
  ["version.json do web sem SHA", (s) => { s.viteBuild = s.viteBuild.replace(/commitSha/g, "commit"); }, "SHA_MISSING"],
  ["segredo aceito na proveniência", (s) => { s.lib.buildProvenance = (identity, files) => ({ ...identity, files }); }, "SECRET_IN_METADATA"],
  ["#4 web e Android 'mesma release' com SHA diferente", (s) => { s.ledger.releases.push(entry(100, { webSha: B, sameReleaseAsWeb: true })); s.delivery.lastUploadedVersionCode = 100; }, "WEB_ANDROID_SHA_MISMATCH"],
  ["#5 versionCode não cresce (estratégia)", (s) => { s.lib.computeVersionCode = () => 1; }, "VERSION_CODE_NOT_INCREASING"],
  ["#5 colisão aceita no upload", (s) => { s.lib.assertVersionCodeIncreases = (candidate) => candidate; }, "VERSION_CODE_NOT_INCREASING"],
  ["#5 ledger com versionCode repetido", (s) => { s.ledger.releases.push(entry(100), entry(100, { sha: B })); s.delivery.lastUploadedVersionCode = 100; }, "VERSION_CODE_NOT_INCREASING"],
  ["override abaixo do floor aceito no Gradle", (s) => { s.appBuildGradle = swap(s.appBuildGradle, "if (longyuVersionCode < longyuVersionFloor) {", "if (false) {"); }, "VERSION_CODE_NOT_INCREASING"],
  ["upload sem conferir versionCode do Play", (s) => { s.playUpload = swap(s.playUpload, "assertVersionCodeIncreases(provenance.versionCode, published)", "void published"); }, "VERSION_CODE_NOT_INCREASING"],
  ["versionName vira SHA", (s) => { s.packageJson.version = A; }, "VERSION_NAME"],
  ["netlify.toml com versão divergente", (s) => { s.netlifyToml = s.netlifyToml.replace(/VITE_APP_VERSION = "[^"]+"/, 'VITE_APP_VERSION = "0.9.9"'); }, "VERSION_NAME"],
  ["#24 Android compila commit diferente da release (política)", (s) => { s.lib.assertBuildMatchesRelease = () => true; }, "STALE_BUILD"],
  ["#24 guard de SHA removido do bundle:release", (s) => { s.androidCli = swap(s.androidCli, "    requireBuildMatchesRelease(git);\n", ""); }, "STALE_BUILD"],
  ["release workflow sem LONGYU_RELEASE_SHA", (s) => { s.workflows["android-release.yml"] = s.workflows["android-release.yml"].replace(/LONGYU_RELEASE_SHA/g, "RELEASE_REF"); }, "STALE_BUILD"],
  ["#25 release aceita árvore suja sem flag (política)", (s) => { s.lib.assertCleanTreeForRelease = () => ({ official: true }); }, "DIRTY_TREE_ACCEPTED"],
  ["#25 bundle:release sem checar a árvore", (s) => { s.androidCli = swap(s.androidCli, "    const guard = requireCleanTree(git);\n", "    const guard = {};\n"); }, "DIRTY_TREE_ACCEPTED"],
  ["build não oficial sobe para o Play", (s) => { s.playUpload = s.playUpload.replace(/UNOFFICIAL_BUILD/g, "OK"); }, "DIRTY_TREE_ACCEPTED"],
  ["Android não mostra versionCode do APK", (s) => { s.buildIdentityTs = s.buildIdentityTs.replace("App.getInfo()", "Promise.resolve({ version: '', build: '' })"); }, "BUILD_INFO"],
]);
