#!/usr/bin/env node
/** test:delivery-pipeline — produção nunca automática; main é a fonte; sem OTA; honestidade formal e freeze. */
import { validateDeliveryPipeline } from "./lib/delivery-pipeline-gates.mjs";
import { runDeliveryMutations, swap } from "./lib/delivery-mutation-runner.mjs";

const W = (s, name, from, to) => { s.workflows[name] = swap(s.workflows[name], from, to); };
const checks = (s) => s.foundation.operationalChecks.checks;

runDeliveryMutations("test:delivery-pipeline", validateDeliveryPipeline, [
  ["#1 produção auto-publicada em push na main", (s) => W(s, "android-build.yml", "      - name: Play Console (sonda, sem upload)\n        run: node scripts/play-upload.mjs --probe", "      - name: Publica\n        run: node scripts/play-upload.mjs --channel production --aab x"), "AUTO_PRODUCTION"],
  ["release manual ganha gatilho de push", (s) => W(s, "android-release.yml", "on:\n  workflow_dispatch:", "on:\n  push:\n    branches: [main]\n  workflow_dispatch:"), "AUTO_PRODUCTION"],
  ["produção sobe publicada (não rascunho)", (s) => { const real = s.lib.resolveReleaseTarget; s.lib.resolveReleaseTarget = (input) => ({ ...real(input), status: "completed" }); }, "AUTO_PRODUCTION"],
  ["#2 release Android de branch ≠ main (workflow)", (s) => W(s, "android-release.yml", 'if [ "$GITHUB_REF" != "refs/heads/main" ]; then', 'if [ "$GITHUB_REF" = "never" ]; then'), "SOURCE_NOT_MAIN"],
  ["#2 release Android de branch ≠ main (política)", (s) => { s.lib.resolveReleaseTarget = ({ channel }) => ({ channel, track: channel, status: "draft" }); }, "SOURCE_NOT_MAIN"],
  ["#12 production vira canal padrão (workflow)", (s) => W(s, "android-release.yml", "options: [internal, closed, production]\n        default: internal", "options: [internal, closed, production]\n        default: production"), "PRODUCTION_DEFAULT"],
  ["#12 production sem opt-in (política)", (s) => { const real = s.lib.resolveReleaseTarget; s.lib.resolveReleaseTarget = (input) => real({ ...input, confirmProduction: "PUBLICAR-PRODUCAO" }); }, "PRODUCTION_DEFAULT"],
  ["#13 workflow de PR tenta upload no Play", (s) => W(s, "android-build.yml", "        run: node scripts/play-upload.mjs --probe", "        env:\n          GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}\n        run: node scripts/play-upload.mjs --channel internal --aab x"), "PR_PRODUCTION_UPLOAD"],
  ["#14 build Android aponta WebView para a produção", (s) => { s.foundation.capacitorConfig = swap(s.foundation.capacitorConfig, 'webDir: "dist",', 'webDir: "dist",\n  server: { url: "https://singular-meringue-7838cd.netlify.app" },'); }, "REMOTE_WEBVIEW"],
  ["#15 live update/OTA ativado (dependência)", (s) => { s.packageJson.dependencies["@capgo/capacitor-updater"] = "7.0.0"; }, "LIVE_UPDATE_ENABLED"],
  ["live update no capacitor.config", (s) => { s.capacitorConfig = swap(s.capacitorConfig, "  plugins: {", "  plugins: {\n    CapacitorUpdater: { autoUpdate: true },"); }, "LIVE_UPDATE_ENABLED"],
  ["manifesto declara live update", (s) => { s.delivery.liveUpdate = "ENABLED"; }, "LIVE_UPDATE_ENABLED"],
  ["#16 app baixa JS arbitrário (import remoto)", (s) => { s.srcTexts["src/lib/platform/remoteBundle.ts"] = 'export const load = () => import("https://cdn.example.com/longyu/app.js");\n'; }, "REMOTE_JS"],
  ["script dinâmico de origem variável", (s) => { const k = "src/lib/turnstile.ts"; s.srcTexts[k] = s.srcTexts[k].replace("script.src = SCRIPT_SRC;", "script.src = window.location.hash.slice(1);"); }, "REMOTE_JS"],
  ["#17 cloud formal PASS sem #273", (s) => { checks(s).cloud_auth.pass = true; }, "CLOUD_CHECK_PROMOTED"],
  ["#18 android_real_device PASS por causa da CI", (s) => { Object.assign(checks(s).android_real_device, { pass: true, environment: "github-actions" }); }, "ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE"],
  ["manifesto de entrega declara aparelho real", (s) => { s.delivery.androidRealDevice = true; }, "ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE"],
  ["#19 PWA upgrade PASS só por causa do build", (s) => { checks(s).pwa_upgrade.pass = true; }, "PWA_UPGRADE_PASS_BY_BUILD"],
  ["manifesto declara upgrade PWA verificado", (s) => { s.delivery.pwaProductionUpgradeVerified = true; }, "PWA_UPGRADE_PASS_BY_BUILD"],
  ["#20 Public Beta GO automático (manifesto)", (s) => { s.delivery.publicBetaVerdict = "GO"; }, "PUBLIC_BETA_VERDICT"],
  ["#20 Public Beta GO automático (workflow)", (s) => W(s, "android-build.yml", "| Public Beta | NO-GO |", "| Public Beta | GO |"), "PUBLIC_BETA_VERDICT"],
  ["#21 BETA_PEDAGOGY_FREEZE removido", (s) => { s.foundation.curriculumFreezeSource = swap(s.foundation.curriculumFreezeSource, "export const BETA_PEDAGOGY_FREEZE", "const OLD_FREEZE"); }, "BETA_PEDAGOGY_FREEZE_REMOVED"],
  ["#22 fingerprint muda", (s) => { s.foundation.curriculumFreezeSource = swap(s.foundation.curriculumFreezeSource, 'RC_BASE_FINGERPRINT = "c48b008c9c1e"', 'RC_BASE_FINGERPRINT = "d00000000000"'); }, "FINGERPRINT_DRIFT"],
  ["#23 currículo muda", (s) => { s.foundation.curriculumSources["src/data/journey.ts"] += "\n// nova lição\n"; }, "CURRICULUM_SOURCE_MODIFIED"],
  ["upload interno declarado sem registro", (s) => { s.delivery.androidInternalUpload = true; }, "UNPROVEN_CLAIM"],
  ["release assinado pronto sem credencial", (s) => { s.delivery.androidSignedReleaseReady = true; }, "UNPROVEN_CLAIM"],
  ["segundo sistema de deploy web", (s) => { s.workflows["web-deploy.yml"] = "on:\n  push:\n    branches: [main]\njobs:\n  d:\n    steps:\n      - run: npx netlify-cli deploy --prod\n"; }, "SECOND_WEB_DEPLOY"],
  ["doc esconde que commit não atualiza o app", (s) => { s.releaseDoc = s.releaseDoc.replaceAll("Commit na main NÃO atualiza", "Commit na main atualiza"); }, "RELEASE_DOC"],
]);
