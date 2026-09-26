#!/usr/bin/env node
/**
 * RC2.2.17 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-17-guided-learning-reliability.mjs validate <área>
 *   node scripts/rc2-2-17-guided-learning-reliability.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-17-gates.mjs. As mutações 1–56 seguem a lista
 * da especificação RC2.2.17; M57+ cobrem o orçamento de informação (FC).
 */
import assert from "node:assert/strict";
import { GATES, loadState, report } from "./lib/rc2-2-17-gates.mjs";

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

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};
const json = (mutate) => (s) => mutate(s);

const MUTATIONS = {
  "audio-playback-truth": [
    ["1. Guided Try seta heard no clique", "GUIDED_HEARD_ON_CLICK", src("guided", "  function playNihao() {\n    setFailReason(null);", '  function playNihao() {\n    setAudioResult("AUDIO_HEARD");\n    setFailReason(null);')],
    ["2. falha do TTS libera Continuar calado", "TTS_FAIL_ENABLES_CONTINUE", src("guided", 'else if (state === "FAILED") setListen((prev) => (prev === "HEARD" ? prev : "FAILED"));', 'else if (state === "FAILED") setListen("HEARD");')],
    ["3. botão de áudio falha sem status", "AUDIO_SILENT_FAILURE", src("speakButton", "      setFailed(true);\n      setFailReason(outcome.reason);", "      setFailed(false);")],
    ["4. voz sem dados sem ação de instalar", "TTS_INSTALL_MISSING", src("audio", "return usesNativeVoice() && isVoiceMissingReason(reason);", "return false;")],
    ["5. placement conta falha de áudio como erro", "PLACEMENT_AUDIO_PENALIZED", src("comecar", "  function skipTechnical() {\n    if (!question || !experience) return;", '  function skipTechnical() {\n    if (!question || !experience) return;\n    appendPendingAnswer(readPendingPlacement()!, { questionId: question.id, answer: "", hintUsed: false, responseMode: "choice", at: Date.now() }, askedIds);')],
    ["6. tarefa audioHeard sem áudio real", "DAILY_AUDIO_WITHOUT_PLAYBACK", src("speakButton", "    noteAudioManualPlay();\n", '    noteAudioManualPlay();\n    recordDailyTask("audioHeard");\n')],
  ],
  "lesson-advance-integrity": [
    ["7. como-se-chama: Continuar não avança", "SCENE_NOT_ADVANCING", src("scene", "    onDone(!hadMistakeRef.current, {\n      attempts,", "    void (!hadMistakeRef.current, {\n      attempts,")],
    ["8. latch descarta o onDone da conversa", "LATCH_DROPS_ONDONE", src("steps", "      parentOnDoneRef.current(correct, meta);", "      /* conclusão engolida */")],
    ["9. completionKey bloqueia o próximo", "COMPLETION_KEY_BLOCKS", src("player", "      completedStepKeyRef.current = null;\n      traceLessonStep(", "      traceLessonStep(")],
    ["10. toque duplo pula dois", "DOUBLE_ADVANCE", src("player", '      traceLessonStep({ lessonId: lesson.id, stepIndex: idx, kind: currentStep?.kind ?? "none", attempt: stepAttempt, event: "duplicate_completion" });\n      return;\n    }', '      traceLessonStep({ lessonId: lesson.id, stepIndex: idx, kind: currentStep?.kind ?? "none", attempt: stepAttempt, event: "duplicate_completion" });\n    }')],
    ["11. mesma fala trava (laço 5→6→5)", "SAME_TEXT_LOOP", src("scene", "if (wrongHere >= 2) {", "if (wrongHere >= 99) {")],
    ["12. background/resume trava a cena", "RESUME_BLOCKS_SCENE", src("scene", "  function advance() {\n    noteUserGesture();", '  function advance() {\n    if (document.visibilityState !== "visible") return;\n    noteUserGesture();')],
    ["13. tentar de novo deixa a cena incompletável", "RETRY_UNCOMPLETABLE", src("scene", "onClick={retry}", "onClick={() => undefined}")],
    ["14. toque físico não chega ao handler", "TAP_NOT_REACHING_HANDLER", src("token", 'const effectiveActivation: MandarinTokenActivation = activation === "default" && nestedInButton ? "hover-hold" : activation;', "const effectiveActivation: MandarinTokenActivation = activation;")],
  ],
  "speech-capability": [
    ["15. permissão tratada como suporte ao idioma", "PERMISSION_AS_LANGUAGE", src("capability", '  if (language === "NO_SERVICE") return "SERVICE_UNAVAILABLE";', '  if (input.microphone === "granted") return "READY";\n  if (language === "NO_SERVICE") return "SERVICE_UNAVAILABLE";')],
    ["16. zh-CN sem suporte bloqueia a lição", "ZH_UNSUPPORTED_BLOCKS", src("capability", '    case "LANGUAGE_UNSUPPORTED":\n    case "LANGUAGE_TEMP_UNAVAILABLE":\n      return recordingAvailable ? "self_compare" : "model_only";', '    case "LANGUAGE_UNSUPPORTED":\n    case "LANGUAGE_TEMP_UNAVAILABLE":\n      return "recognize";')],
    ["17. modelo ausente sem caminho de download", "MODEL_DOWNLOAD_MISSING", src("pronunciation", 'data-testid="speech-model-download-start"', 'data-testid="speech-model-hidden"')],
    ["18. reconhecedor indisponível sem fallback", "RECOGNIZER_NO_FALLBACK", src("pronunciation", "      setForcedFallback(true);\n    }", "    }")],
    ["19. gravação enviada à nuvem", "RECORDING_UPLOADED", src("selfCompare", "        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || \"audio/webm\" });", "        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || \"audio/webm\" });\n        void fetch(\"/api/practice-upload\", { method: \"POST\", body: blob });")],
    ["20. gravação fica persistida", "RECORDING_PERSISTED", src("plugin", "        // RC2.2.17 · AB — sair da atividade apaga a gravação de prática.\n        discardPracticeRecording();", "        // (gravação mantida)")],
    ["21. self-compare dá nota de tom", "SELF_COMPARE_SCORES", src("selfCompare", "const MIN_RECORDING_MS = 400;", "const MIN_RECORDING_MS = 400;\nconst toneScore = 93;")],
    ["22. Continuar falso conta tentativa de fala", "FAKE_SPEECH_ATTEMPT", src("selfCompare", '<Button onClick={onContinue} data-testid="self-compare-continue">', '<Button onClick={() => { countAttempt(); onContinue(); }} data-testid="self-compare-continue">')],
    ["23. reconhecedor nunca destruído", "RECOGNIZER_NOT_DESTROYED", src("plugin", "            recognizer.destroy();\n            recognizer = null;", "            recognizer = null;")],
    ["24. segundo reconhecedor antes do fim do primeiro", "SECOND_RECOGNIZER", src("nativeSpeech", '  if (recognitionInFlight) return { ok: false, code: "RECOGNIZER_BUSY" };\n', "")],
  ],
  "single-onboarding": [
    ["25. iniciante recebe placement obrigatório", "BEGINNER_MANDATORY_PLACEMENT", src("comecar", '  return ["welcome", "dailyGoal", "account"];', '  return ["welcome", "dailyGoal", "level", "quiz", "result", "account"];')],
    ["26. meta diária aparece duas vezes", "DAILY_GOAL_TWICE", src("comecar", "        {step === \"placementOffer\" && (", "        {step === \"account\" && <DailyGoalStep value={dailyGoal} onPick={chooseDailyGoal} />}\n        {step === \"placementOffer\" && (")],
    ["27. Teste guiado dá domínio", "GUIDED_TRY_MASTERY", src("postAuth", "  clearOnboardingDraft();\n}", '  store.setLessonMastery?.("l2", 4);\n  clearOnboardingDraft();\n}')],
    ["28. Teste guiado dá XP", "GUIDED_TRY_XP", src("guided", '  function finish() {\n    haptic("practiceComplete");', '  function finish() {\n    useStore.getState().addXp(5, "guided");\n    haptic("practiceComplete");')],
    ["29. Teste guiado completa a lição", "GUIDED_TRY_COMPLETES_LESSON", src("store", "          const next = { ...s, guidedTryExposure: exposure };\n          return { guidedTryExposure: exposure, accounts: saveCurrentAccount(next) };", '          const next = { ...s, guidedTryExposure: exposure, completedLessons: [...s.completedLessons, "l2"] };\n          return { guidedTryExposure: exposure, completedLessons: next.completedLessons, accounts: saveCurrentAccount(next) };')],
    ["30. experiente perde o teste de nível", "EXPERIENCED_LOSES_PLACEMENT", src("comecar", '  if (path === "experienced" && wantsPlacement) return ["welcome", "dailyGoal", "placementOffer", "level", "quiz", "result", "account"];\n', "")],
    ["31. onboarding pergunta o idioma de novo", "LOCALE_ASKED_AGAIN", src("comecar", '<div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-2" data-testid="onboarding-welcome">', '<div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-2" data-testid="onboarding-welcome">\n      <InterfaceLanguageSelect />')],
    ["32. escolha do curso regride", "COURSE_PICKER_REGRESSED", src("guided", '  if (!hasCourseDirection()) return <Navigate to="/curso?next=%2Fteste-guiado" replace />;\n', "")],
  ],
  "guided-lesson-layer": [
    ["33. camada guiada vira segundo motor", "SECOND_ENGINE", json((s) => s.srcFileNames.push("src/features/lesson/LessonEngineV2.tsx"))],
    ["34. primeiras lições viram parede de texto", "WALL_OF_TEXT", src("ptBR", 'guidedPrepare: "Hoje: {title}. Vamos por partes."', `guidedPrepare: "Hoje: {title}. ${"Antes de começar, leia com atenção esta explicação longa sobre tudo o que vem a seguir. ".repeat(3)}"`)],
    ["35. Dragão repete todo texto", "DRAGON_REPEATS", src("player", ' && (bridge || lesson.steps[0]?.kind !== "intro");', " && true;")],
    ["36. avaliação recebe guia", "ASSESSMENT_GUIDED", src("guidedLesson", '  if (input.assessment) return "NONE";\n', "")],
    ["37. Revisão vira tutorial longo", "REVIEW_BECAME_TUTORIAL", src("guidedLesson", '  if (input.isReview || input.curriculumRole === "review") return "LOW";\n', "")],
    ["38. Imersão perde naturalidade", "IMMERSION_LOST_NATURALNESS", src("guidedLesson", '  if (input.curriculumRole === "immersion") return "LOW";\n', "")],
  ],
  "tone-truth": [
    ["39. 1º tom não é reto", "TONE1_NOT_LEVEL", src("toneKnowledge", "heights: [5, 5, 5]", "heights: [5, 4, 3]")],
    ["40. 2º tom não sobe", "TONE2_NOT_RISING", src("toneKnowledge", "heights: [3, 4, 5]", "heights: [3, 3, 3]")],
    ["41. 3º tom ensinado como vale completo obrigatório", "TONE3_FULL_DIP", src("toneKnowledge", "heights: [2, 1, 1, 3]", "heights: [4, 1, 1, 5]")],
    ["42. 4º tom sobe", "TONE4_NOT_FALLING", src("toneKnowledge", "heights: [5, 3, 1]", "heights: [1, 3, 5]")],
    ["43. neutro chamado de quinto contorno", "NEUTRAL_AS_CONTOUR", src("toneKnowledge", 'guidedPt: "Curto e leve."', 'guidedPt: "O quinto contorno completo."')],
    ["44. língua usada para explicar o tom", "TONGUE_EXPLAINS_PITCH", src("toneKnowledge", 'guidedPt: "A voz sobe."', 'guidedPt: "A língua sobe."')],
    ["45. exercício de tom declara precisão sem analisador", "FAKE_PITCH_SCORE", src("toneKnowledge", 'export const TONE_PRODUCTION_EVIDENCE_STATUS: ToneProductionEvidenceStatus = "NO_PITCH_MEASUREMENT";', 'export const TONE_PRODUCTION_EVIDENCE_STATUS = "MEASURED" as ToneProductionEvidenceStatus;')],
  ],
  "settings-visibility": [
    ["46. Excluir conta volta para Avançado", "DELETE_ACCOUNT_HIDDEN", src("settingsPage", "          <DangerZone />", "")],
    ["47. Aparência some da Home de Ajustes", "APPEARANCE_HIDDEN", src("categories", '  { id: "aparencia", titleKey: "settings.catAppearance", descKey: "settings.catAppearanceDesc" },\n', "")],
    ["48. placeholder PT volta a Matheus", "PLACEHOLDER_PERSONAL_NAME", src("ptBR", 'namePlaceholder: "Ex.: Mariana"', 'namePlaceholder: "Ex.: Matheus"')],
    ["49. formulário EN usa 'Ex.:'", "EN_PLACEHOLDER_NOT_LOCALIZED", src("en", 'namePlaceholder: "e.g. Alex"', 'namePlaceholder: "Ex.: Alex"')],
    ["50. requisitos de senha sempre num card gigante", "PASSWORD_CARD_ALWAYS", src("comecar", ' className="mt-2" progressive focused={passwordFocused} />', ' className="mt-2" />')],
  ],
  "release-residual": [
    ["51. package sai de longyu.noba.com", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["52. assinatura debug passa", "DEBUG_SIGNING_ACCEPTED", src("buildGradle", "            minifyEnabled false", "            signingConfig signingConfigs.debug\n            minifyEnabled false")],
    ["53. instalação Play falsa (PASS)", "FAKE_PLAY_INSTALL", json((s) => { s.residual.items.internalPlay.status = "COMPLETE"; s.residual.items.internalPlay.evidence = null; })],
    ["54. resíduo RC2.2.16 marcado completo sem evidência", "RESIDUAL_FAKE_COMPLETE", json((s) => { s.residual.RC2_2_16_RESIDUAL = "COMPLETE"; })],
    ["55. #273 alterada", "CLOUD_273_TOUCHED", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["56. checkout Android reativado", "ANDROID_CHECKOUT_REACTIVATED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "PLAY_BILLING" as const;')],
    ["M60. PASS físico sem aparelho", "FAKE_PHYSICAL_PASS", json((s) => { s.qa.selfCompareRecording = "PASS"; s.qa.deviceModel = null; })],
  ],
  "mobile-information-budget": [
    ["M57. placement volta com 3 pílulas", "PLACEMENT_METADATA_PILLS", src("comecar", '      <div className="mx-auto max-w-2xl text-center">\n        <p className="text-xs font-semibold tabular-nums text-ink-faint" data-testid="placement-question-of">', '      <div className="mx-auto max-w-2xl text-center">\n        <span>{categoryLabel(question.category, t)}</span>\n        <p className="text-xs font-semibold tabular-nums text-ink-faint" data-testid="placement-question-of">')],
    ["M58. Teste guiado ganha card dentro de card e 2ª CTA", "NESTED_CARDS_OR_CTAS", src("guided", '<main key={step} className="longyu-step-in', '<Card><Card /></Card>\n      <main data-guided-action key={step} className="longyu-step-in')],
    ["M59. cadastro volta a 6 campos numa tela", "SIGNUP_TOO_LONG", src("comecar", '          <UsernameField value={username} onChange={onUsername} />\n          <Button type="submit"', '          <UsernameField value={username} onChange={onUsername} />\n          <PasswordField value={password} onChange={(event) => onPassword(event.target.value)} />\n          <Button type="submit"')],
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
