#!/usr/bin/env node
/**
 * RC2.2.16 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-16-play-internal-beta.mjs validate <área>
 *   node scripts/rc2-2-16-play-internal-beta.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação (1–44 da RC2.2.16 + extras)
 *            é pega com o código certo. Gates em scripts/lib/rc2-2-16-gates.mjs.
 */
import assert from "node:assert/strict";
import { FROZEN_ANDROID_APPLICATION_ID as ID, GATES, LEGACY_IDS, loadState, report } from "./lib/rc2-2-16-gates.mjs";

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

const OLD = LEGACY_IDS[0];
const SHA = "a".repeat(40);
const CERT = (byte) => Array(32).fill(byte).join(":");
function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 80)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};
const MAIN_ACTIVITY = `android/app/src/main/java/${ID.split(".").join("/")}/MainActivity.java`;
const ledgerRow = (versionCode) => ({ packageName: ID, versionCode, versionName: "0.2.0-beta.1", sha: SHA, track: "internal", uploadedAt: "2026-09-26T10:00:00Z", source: "MANUAL_INTERNAL_UPLOAD" });
/** Evidência completa de instalação pela Play num aparelho físico (para isolar a falha testada). */
const playEvidence = (s) => {
  Object.assign(s.json.physicalQa, { deviceModel: "SM-A525F", isEmulator: false, tester: "owner", androidVersion: "14", sha: SHA, testedAt: "2026-09-26T11:00:00Z" });
  s.json.ledger.releases = [ledgerRow(539)];
  Object.assign(s.json.physicalQa.playBuild, {
    installSource: "PLAY",
    installEvidence: { packageName: ID, installer: "com.android.vending", result: "INSTALLED_FROM_PLAY" },
    installedFromPlay: "PASS",
    playTrack: "internal",
    playVersionCode: 539,
    playVersionName: "0.2.0-beta.1",
    playSigningFingerprint: CERT("BB"),
    uploadSigningFingerprint: CERT("AA"),
  });
};
const passWithout = (key) => (s) => {
  playEvidence(s);
  s.json.physicalQa.playBuild.tests[key] = { result: "PASS", testedAt: null, evidence: null };
};

const MUTATIONS = {
  "android-release-identity": [
    ["1. Gradle volta para o package antigo", "GRADLE_APPLICATION_ID_MISMATCH", src("appGradle", `applicationId "${ID}"`, `applicationId "${OLD}"`)],
    ["2. Capacitor volta para o package antigo", "CAPACITOR_APP_ID_MISMATCH", src("capacitorConfig", `appId: "${ID}"`, `appId: "${OLD}"`)],
    ["3. namespace diverge do applicationId", "NAMESPACE_MISMATCH", src("appGradle", `namespace = "${ID}"`, 'namespace = "longyu.noba.app"')],
    ["4. package Java diverge", "JAVA_PACKAGE_MISMATCH", (s) => { s.java[MAIN_ACTIVITY] = swap(s.java[MAIN_ACTIVITY], `package ${ID};`, `package ${OLD};`); }],
    ["4b. Java no diretório antigo", "JAVA_PACKAGE_MISMATCH", (s) => { s.java[`android/app/src/main/java/${OLD.split(".").join("/")}/Extra.java`] = `package ${ID};\n`; }],
    ["5. strings.xml package diverge", "STRINGS_PACKAGE_MISMATCH", src("stringsXml", `<string name="package_name">${ID}</string>`, `<string name="package_name">${OLD}</string>`)],
    ["5b. strings.xml esquema diverge", "STRINGS_PACKAGE_MISMATCH", src("stringsXml", `<string name="custom_url_scheme">${ID}</string>`, `<string name="custom_url_scheme">${OLD}</string>`)],
    ["6. deep link antigo volta (constante)", "DEEP_LINK_SCHEME_MISMATCH", src("deepLinks", `LONGYU_APP_SCHEME = "${ID}"`, `LONGYU_APP_SCHEME = "${OLD}"`)],
    ["6b. deep link antigo aceito em paralelo", "DEEP_LINK_SCHEME_MISMATCH", src("deepLinks", "if (url.protocol === `${LONGYU_APP_SCHEME}:`) {", `if (url.protocol === \`\${LONGYU_APP_SCHEME}:\` || url.protocol === "${OLD}:") {`)],
    ["6c. lembrete com esquema antigo", "DEEP_LINK_SCHEME_MISMATCH", src("reminderPlan", `REMINDER_URL_RISK = "${ID}://jornada"`, `REMINDER_URL_RISK = "${OLD}://jornada"`)],
    ["7. release manifest com package antigo", "RELEASE_MANIFEST_OLD_PACKAGE", (s) => { s.json.nativeFoundation.appId = OLD; }],
    ["7b. manifesto do Play com package antigo", "RELEASE_MANIFEST_OLD_PACKAGE", (s) => { s.json.playInternal.releaseIdentity.packageName = OLD; }],
    ["8. bundle final contém o id antigo", "BUNDLE_LEGACY_ID", (s) => { s.artifacts.push({ name: "x.provenance.json", packageName: ID, bundleInspection: { packageName: ID, legacyIdFound: true } }); }],
    ["8b. bundle final com package antigo", "BUNDLE_PACKAGE_MISMATCH", (s) => { s.artifacts.push({ name: "y.provenance.json", packageName: OLD, bundleInspection: { packageName: OLD, legacyIdFound: false } }); }],
    ["8c. inspetor deixa de achar o id antigo", "INSPECTOR_BROKEN", src("inspector", 'if (inspection.legacyIdFound) return { ok: false, code: "LEGACY_ID_IN_BUNDLE" };', "")],
    ["8d. android-cli deixa de inspecionar o bundle", "BUNDLE_CHECK_REMOVED", src("androidCli", "const inspection = requireBundleIdentity(source, identity);", "const inspection = { packageName: ANDROID_APPLICATION_ID, legacyIdFound: false };")],
    ["9. freeze do package removido", "PACKAGE_FREEZE_REMOVED", (s) => { s.json.packageIdentity.frozen = false; }],
    ["9b. id canônico trocado", "PACKAGE_ID_CHANGED", src("identityLib", `ANDROID_APPLICATION_ID = "${ID}"`, 'ANDROID_APPLICATION_ID = "longyu.noba.app"')],
    ["9c. ledger com package diferente", "PLAY_PACKAGE_MISMATCH", (s) => { s.json.ledger.releases = [{ ...ledgerRow(539), packageName: OLD }]; }],
    ["N1. id antigo no runtime", "OLD_PACKAGE_IN_RUNTIME", (s) => { s.legacySweep.push({ file: "src/lib/platform/x.ts", lines: [`1:const s = "${OLD}://"`], text: null }); }],
    ["N2. id antigo em config", "OLD_PACKAGE_IN_CONFIG", (s) => { s.legacySweep.push({ file: "android/app/src/main/res/xml/file_paths.xml", lines: [`1:${OLD}`], text: null }); }],
    ["N3. id antigo em fonte Android", "OLD_PACKAGE_IN_ANDROID_SOURCE", (s) => { s.legacySweep.push({ file: "android/app/src/main/java/longyu/noba/com/X.java", lines: [`1:${OLD}`], text: null }); }],
    ["N4. id antigo em teste", "OLD_PACKAGE_IN_TESTS", (s) => { s.legacySweep.push({ file: "scripts/test-x.mjs", lines: [`1:${OLD}`], text: null }); }],
    ["N5. doc sem marcação SUPERSEDED", "OLD_PACKAGE_IN_DOCS", (s) => { s.legacySweep.push({ file: "docs/X.md", lines: [`1:${OLD}`], text: `Package ${OLD}` }); }],
    ["K. FileProvider com authority literal", "PROVIDER_AUTHORITY_HARDCODED", src("manifestXml", 'android:authorities="${applicationId}.fileprovider"', `android:authorities="${ID}.fileprovider"`)],
    ["helper adb com package antigo", "TOOL_PACKAGE_MISMATCH", src("devices", `export const PACKAGE_ID = "${ID}";`, `export const PACKAGE_ID = "${OLD}";`)],
    ["applicationIdSuffix muda o bundle", "GRADLE_APPLICATION_ID_MISMATCH", src("appGradle", `applicationId "${ID}"`, `applicationId "${ID}"\n        applicationIdSuffix ".beta"`)],
  ],
  "signed-aab": [
    ["10. release sem keystore passa (Gradle)", "RELEASE_WITHOUT_KEYSTORE", src("signingGradle", "throw new GradleException(", "logger.warn(")],
    ["10b. bundle:release sem pré-checagem", "RELEASE_WITHOUT_KEYSTORE", src("androidCli", "    requireSigning();\n    const git = readGitState(root);\n    const guard", "    const git = readGitState(root);\n    const guard")],
    ["11. debug key assina release (Gradle)", "DEBUG_KEY_ACCEPTED", src("signingGradle", "signingConfigs.longyuRelease : null", "signingConfigs.longyuRelease : signingConfigs.debug")],
    ["11b. verificador aceita a debug key", "DEBUG_KEY_ACCEPTED", src("verifySignature", 'if (parsed.debugKey) return { ok: false, code: "DEBUG_KEY_IN_RELEASE" };', "")],
    ["11c. pin da upload key ignorado", "UPLOAD_CERT_PIN_BROKEN", src("verifySignature", 'if (expectedCertSha256 && parsed.sha256 !== String(expectedCertSha256).toUpperCase()) return { ok: false, code: "UPLOAD_CERT_MISMATCH" };', "")],
    ["12. keystore rastreado", "KEYSTORE_TRACKED", (s) => { s.tracked.push("android/app/keys/longyu-upload.jks"); }],
    ["13. senha aparece em log", "PASSWORD_LOGGED", src("androidCli", "function requireSigning() {", "function requireSigning() {\n  console.log(process.env.LONGYU_ANDROID_KEYSTORE_PASSWORD);")],
    ["13b. workflow ecoa o base64", "PASSWORD_LOGGED", src("releaseWorkflow", "umask 077", 'umask 077\n          echo "$KS_B64"')],
    ["14. base64/keystore vira artifact", "KEYSTORE_BASE64_ARTIFACT", src("releaseWorkflow", "            release-artifacts/play-upload-record.json", "            release-artifacts/play-upload-record.json\n            ${{ runner.temp }}/longyu-upload.jks")],
    ["14b. keystore temporário não é apagado", "KEYSTORE_BASE64_ARTIFACT", src("releaseWorkflow", 'run: rm -f "$RUNNER_TEMP/longyu-upload.jks"', "run: echo mantido")],
    ["15. alias ausente do contrato", "SIGNING_ALIAS_MISSING", src("releaseWorkflow", '[ -n "$KEY_ALIAS" ] || missing="$missing LONGYU_ANDROID_KEY_ALIAS"', "true")],
    ["16. evidência do certificado ausente", "CERT_EVIDENCE_MISSING", src("androidCli", "recorded.signingCertificateSha256 = signature.certificateSha256;", "")],
    ["16b. SIGNED_AAB_READY sem evidência", "CERT_EVIDENCE_MISSING", (s) => { s.json.playInternal.states.SIGNED_AAB_READY = true; }],
    ["16c. proveniência sem package", "PROVENANCE_INCOMPLETE", src("androidCli", "packageName: bundleInspection.packageName,", "")],
    ["16d. release local sem certificado", "PROVENANCE_INCOMPLETE", (s) => { s.artifacts.push({ name: "r.provenance.json", buildType: "release", packageName: ID, bundleInspection: { packageName: ID, legacyIdFound: false }, sha: SHA, builtAt: "x", files: [] }); }],
    ["17. versionCode igual é aceito", "VERSION_CODE_NOT_INCREASING", src("releaseIdentity", "if (!(Number.isInteger(candidate) && candidate > max)) {", "if (!(Number.isInteger(candidate) && candidate >= max)) {")],
    ["17b. ledger com versionCode repetido", "VERSION_CODE_NOT_INCREASING", (s) => { s.json.ledger.releases = [ledgerRow(539), ledgerRow(539)]; }],
    ["17c. candidato não supera o último enviado", "VERSION_CODE_NOT_INCREASING", (s) => { s.json.ledger.releases = [ledgerRow(540)]; s.json.playInternal.versionCode = 540; }],
  ],
  "play-internal-readiness": [
    ["18. production automática por push", "AUTO_PRODUCTION_BY_PUSH", src("releaseWorkflow", "on:\n  workflow_dispatch:", "on:\n  push:\n    branches: [main]\n  workflow_dispatch:")],
    ["18b. workflow de PR envia ao Play", "AUTO_PRODUCTION_BY_PUSH", src("buildWorkflow", "run: node scripts/play-upload.mjs --probe", "run: node scripts/play-upload.mjs --probe && node scripts/play-upload.mjs --aab x.aab --provenance p.json")],
    ["19. production sem confirmação (workflow)", "PRODUCTION_WITHOUT_CONFIRMATION", src("releaseWorkflow", 'if [ "$CHANNEL" = "production" ] && [ "$CONFIRM" != "PUBLICAR-PRODUCAO" ]; then', "if false; then")],
    ["19b. production sem confirmação (código)", "PRODUCTION_WITHOUT_CONFIRMATION", src("releaseIdentity", 'if (channel === "production" && confirmProduction !== "PUBLICAR-PRODUCAO") {', "if (false) {")],
    ["20. artifact tratado como upload ao Play", "ARTIFACT_IS_NOT_PLAY_UPLOAD", (s) => { Object.assign(s.json.playInternal, { internalUploaded: true, internalUpload: { source: "GITHUB_ARTIFACT" }, versionCode: 539, sha: SHA }); }],
    ["21. upload interno declarado sem evidência", "INTERNAL_UPLOAD_WITHOUT_EVIDENCE", (s) => { Object.assign(s.json.playInternal, { internalUploaded: true, internalUpload: { source: "MANUAL_INTERNAL_UPLOAD" }, versionCode: 539, sha: SHA }); }],
    ["22. package diferente no Play tratado como OK", "PLAY_PACKAGE_MISMATCH", (s) => { s.json.playConsole.packageName.value = "com.noba.longyu"; }],
    ["23. developer verification inventada", "DEVELOPER_VERIFICATION_INVENTED", (s) => { s.json.playConsole.developerIdentityVerified.value = true; }],
    ["23b. developer verification pela automação", "DEVELOPER_VERIFICATION_INVENTED", (s) => { Object.assign(s.json.playConsole.developerIdentityVerified, { value: true, checkedBy: "agent", checkedAt: "2026-09-25" }); s.json.playInternal.developerIdentityVerified = true; }],
    ["24. package registration inventada", "PACKAGE_REGISTRATION_INVENTED", (s) => { s.json.playConsole.packageRegistered.value = "REGISTERED"; }],
    ["AR. estado fora de ordem", "STATE_ORDER_VIOLATION", (s) => { s.json.playInternal.states.CLOSED_BETA_READY = true; }],
    ["B. PACKAGE_ALIGNED sem confirmação visual", "PACKAGE_NOT_OWNER_CONFIRMED", (s) => { s.json.playInternal.states.PACKAGE_ALIGNED = true; }],
    ["Y. primeiro upload sem backup", "FIRST_UPLOAD_WITHOUT_BACKUP", (s) => {
      s.json.playConsole.packageName.ownerConfirmed = { confirmed: true, checkedBy: "owner", checkedAt: "2026-09-26" };
      Object.assign(s.json.playInternal.states, { PACKAGE_ALIGNED: true, SIGNING_READY: true });
    }],
    ["AK. app signing = upload cert", "APP_SIGNING_EVIDENCE_MISSING", (s) => {
      s.json.playConsole.packageName.ownerConfirmed = { confirmed: true, checkedBy: "owner", checkedAt: "2026-09-26" };
      Object.assign(s.json.playInternal, { uploadCertificateSha256: CERT("AA"), appSigningCertificateSha256: CERT("AA") });
      Object.assign(s.json.playInternal.states, { PACKAGE_ALIGNED: true, SIGNING_READY: true, SIGNED_AAB_READY: true, PLAY_APP_SIGNING_READY: true });
    }],
    ["31. Play install PASS sem instalação pela Play", "PLAY_INSTALL_WITHOUT_PLAY", (s) => { s.json.physicalQa.playBuild.installedFromPlay = "PASS"; }],
    ["31b. verificador aceita instalação por adb", "PLAY_INSTALL_WITHOUT_PLAY", src("devices", 'if (installer !== PLAY_STORE_INSTALLER) return { ok: false, code: "NOT_INSTALLED_FROM_PLAY" };', "")],
    ["31c. Play assina com a upload key", "PLAY_INSTALL_WITHOUT_PLAY", (s) => { playEvidence(s); s.json.physicalQa.playBuild.playSigningFingerprint = CERT("AA"); }],
    ["32. PASS físico só com adb", "PHYSICAL_PASS_ADB_ONLY", (s) => {
      playEvidence(s);
      Object.assign(s.json.physicalQa.playBuild, { installSource: "ADB", installedFromPlay: "NOT_RUN" });
      s.json.physicalQa.playBuild.tests.firstLaunch = { result: "PASS", testedAt: "2026-09-26", evidence: "vídeo" };
    }],
    ["33. TTS PASS sem teste", "TTS_PASS_WITHOUT_TEST", passWithout("tts")],
    ["34. speech PASS sem teste", "SPEECH_PASS_WITHOUT_TEST", passWithout("speech")],
    ["35. haptics PASS sem teste", "HAPTICS_PASS_WITHOUT_TEST", passWithout("haptics")],
    ["36. notification PASS sem teste", "NOTIFICATION_PASS_WITHOUT_TEST", passWithout("notifications")],
    ["37. upgrade PASS sem N→N+1", "UPGRADE_WITHOUT_N_PLUS_1", (s) => { playEvidence(s); Object.assign(s.json.physicalQa.playBuild, { playUpgrade: "PASS", playUpgradeFromVersionCode: 539, playUpgradeToVersionCode: 540 }); }],
    ["AW. QA físico completo sem os testes", "PHYSICAL_QA_INCOMPLETE", (s) => {
      playEvidence(s);
      s.json.playConsole.packageName.ownerConfirmed = { confirmed: true, checkedBy: "owner", checkedAt: "2026-09-26" };
      for (const key of ["PACKAGE_ALIGNED", "SIGNING_READY", "SIGNED_AAB_READY", "PLAY_APP_SIGNING_READY", "INTERNAL_UPLOAD_COMPLETE", "PLAY_INSTALL_COMPLETE", "PHYSICAL_QA_COMPLETE"]) s.json.playInternal.states[key] = true;
    }],
    ["CK. smoke de produção vira certificação cloud", "CLOUD_273_TOUCHED", (s) => { s.json.playInternal.releaseCandidateCloudCertification = true; }],
  ],
  "play-policy-readiness": [
    ["25. Android abre checkout Stripe", "ANDROID_EXTERNAL_CHECKOUT", src("subscription", 'if (isNativeApp()) return { status: "not_implemented", message: ANDROID_CHECKOUT_UNAVAILABLE_MESSAGE };\n  if (!isSupabaseBackendEnabled())', "if (!isSupabaseBackendEnabled())")],
    ["25b. outra tela chama o checkout direto", "ANDROID_EXTERNAL_CHECKOUT", (s) => { s.src.srcCheckoutUsers.push("src/features/loja/LojaPage.tsx"); }],
    ["26. Qi pago por mecanismo incompatível", "PAID_CURRENCY_WITHOUT_BILLING", src("shopData", 'export type ShopCurrency = "qi" | "pearl";', 'export type ShopCurrency = "qi" | "pearl" | "brl";')],
    ["26b. checkout passa a vender pacote de Qi", "PAID_CURRENCY_WITHOUT_BILLING", src("billing", 'Extract<ProductPlan, "pro" | "family">', 'Extract<ProductPlan, "pro" | "family" | "qi_pack">')],
    ["27. Pro Android com compra externa silenciosa", "ANDROID_PRO_EXTERNAL_PURCHASE", src("proPage", "const purchasesAvailable = isInAppPurchaseAvailable();", "const purchasesAvailable = true;")],
    ["27b. disponibilidade de compra ignora a plataforma", "ANDROID_PRO_EXTERNAL_PURCHASE", src("subscription", "return !isNativeApp();", "return true;")],
    ["28. compra digital sem contrato de billing", "BILLING_CONTRACT_MISSING", (s) => { s.json.billingAudit.surfaces.find((row) => row.id === "subscribe_pro").androidAvailable = true; }],
    ["28b. decisão de billing apagada", "BILLING_CONTRACT_MISSING", (s) => { s.json.billingAudit.decision = "ENABLED"; }],
    ["29. entitlement web para de valer no Android", "WEB_ENTITLEMENT_BROKEN_ON_ANDROID", (s) => { s.src.entitlements["src/lib/entitlements.ts"] += "\nexport function androidPro() { if (isNativeApp()) return false; }\n"; }],
    ["30. status de monetização omitido do relatório", "MONETIZATION_STATUS_OMITTED", (s) => { s.src.report = s.src.report.split("ANDROID_IN_APP_PURCHASE").join("monetização"); }],
    ["BP. privacidade atrás de login", "PRIVACY_REQUIRES_LOGIN", src("routes", '      { path: "privacidade", element: <PrivacyPage /> },\n', "")],
    ["BP2. URL de privacidade sem HTTPS", "PRIVACY_URL_INVALID", (s) => { s.json.playInternal.privacyPolicyUrl = "http://singular-meringue-7838cd.netlify.app/privacidade"; }],
    ["BQ. exclusão sem backend", "ACCOUNT_DELETION_WITHOUT_PATH", src("deleteAccountFn", "admin.auth.admin.deleteUser(", "admin.auth.admin.getUserById(")],
    ["BR. credencial de revisor no Git", "APP_ACCESS_MISSING", (s) => { s.src.playChecklist += "\nsenha: Revisor2026!\n"; }],
    ["BS. Data Safety omite streak", "DATA_SAFETY_INCOMPLETE", (s) => { s.json.dataSafety.items = s.json.dataSafety.items.filter((item) => item.data !== "streak"); }],
    ["BU. entrada sem evidência", "DATA_SAFETY_ENTRY_INCOMPLETE", (s) => { delete s.json.dataSafety.items[0].evidence; }],
    ["BT. áudio declarado como armazenado errado", "AUDIO_PRIVACY_WRONG", (s) => { s.json.dataSafety.items.find((item) => item.data === "microphoneAudio").audioStored = true; }],
    ["BT2. código passa a gravar áudio", "AUDIO_PRIVACY_WRONG", (s) => { s.src.speech += "\nconst recorder = new MediaRecorder(stream);\n"; }],
    ["BV. SDK de anúncios", "ADS_DECLARATION_WRONG", (s) => { s.dependencies["@capacitor-community/admob"] = "7.0.0"; }],
    ["BW. classificação preenchida pela automação", "CONTENT_RATING_AUTOMATED", (s) => { s.json.playInternal.contentRating = "SUBMITTED"; }],
    ["BX. público infantil sem revisão", "TARGET_AUDIENCE_CHILDREN_UNREVIEWED", (s) => { s.json.playInternal.targetAudience = { decidedBy: "owner", ages: "children 5-12" }; }],
    ["CF. listagem promete IA", "STORE_LISTING_OVERCLAIM", src("playChecklist", "> • **Imersão:** pequenas cenas de conversa com personagens fixos.", "> • **Imersão:** conversas com IA sobre qualquer assunto.")],
    ["CF2. listagem promete offline total", "STORE_LISTING_OVERCLAIM", src("playChecklist", "> O Longyu está em beta:", "> Funciona 100% offline. O Longyu está em beta:")],
  ],
  "play-beta-regression": [
    ["38. #273 alterada (candidate)", "CLOUD_273_TOUCHED", (s) => { s.rc2CandidateSha256 = "f".repeat(64); }],
    ["38b. #273 alterada (cloud check)", "CLOUD_273_TOUCHED", (s) => { s.json.operational.checks.cloud_sync.pass = true; }],
    ["39. currículo muda", "CURRICULUM_COUNT_DRIFT", (s) => { s.freeze.counts.lessons += 1; }],
    ["40. fingerprint muda", "FINGERPRINT_DRIFT", (s) => { s.freeze.fingerprint = "000000000000"; }],
    ["41. 31 READY regride", "CAPABILITY_READY_DRIFT", (s) => { s.freeze.counts.conversationCapabilitiesRuntimeReady = 30; }],
    ["42. Daily Vocabulary cria outro SRS", "NEW_SRS", (s) => { s.freeze.systemModules.push("src/lib/dailyVocabularySrs.ts"); }],
    ["43. locale/course sai da cadeia", "LOCALE_COURSE_GATE_REMOVED", (s) => { s.scripts["validate:beta"] = swap(s.scripts["validate:beta"], " && npm run gate:rc2-2-14b-locale-course-direction", ""); }],
    ["43b. CourseDirection sai do gate", "LOCALE_COURSE_GATE_REMOVED", (s) => { s.scripts["gate:rc2-2-14b-locale-course-direction"] = swap(s.scripts["gate:rc2-2-14b-locale-course-direction"], "npm run validate:course-direction && ", ""); }],
    ["44. contrato de progressão da lição removido", "LESSON_PROGRESSION_CONTRACT_REMOVED", (s) => { delete s.scripts["validate:lesson-step-progression"]; }],
    ["CL. login por username ligado", "USERNAME_FLAG_ENABLED", (s) => { s.src.envProduction += "\nVITE_USERNAME_LOGIN_ENABLED=true\n"; }],
    ["gate agregado perde a identidade Android", "GATE_INCOMPLETE", (s) => { s.scripts["gate:rc2-2-16-play-internal-beta"] = swap(s.scripts["gate:rc2-2-16-play-internal-beta"], "npm run validate:android-release-identity && ", ""); }],
    ["Public Beta vira GO", "PUBLIC_BETA_VERDICT", (s) => { s.json.playInternal.publicBetaVerdict = "GO"; }],
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
