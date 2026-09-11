import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";
import { validateConversationDecisions } from "./conversation-decisions-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const HEALTH_SCENE_IDS = ["nao-me-sinto-bem", "na-clinica"];
const HEALTH_LESSON_IDS = ["p6-saude", "p7-imersao-saude"];
const MEDICAL_POLICY =
  /\b\d+\s*mg\b|\bml\b|comprimidos?|dosagem|\btome dois\b|3 vezes ao dia|três vezes ao dia|一天三次|毫克|片药|AI Doctor|tratamento tradicional|rem[eé]dio [A-Z]/i;

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function blobOf(step) {
  return [
    step.title,
    step.body,
    step.prompt,
    step.promptPt,
    step.dialoguePrompt,
    step.explanation,
    step.situationPt,
    step.productionHintPt,
    step.text,
    step.audioText,
  ]
    .filter(Boolean)
    .join("\n");
}

function independent(step, fail, location) {
  const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
  const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
  if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
}

export function validateChinaSurvivalHealth(data) {
  const { lessons, scenes } = data;
  const failures = [];
  const evidence = [];
  const fail = (code, message) => failures.push({ code, message });

  for (const sceneId of HEALTH_SCENE_IDS) {
    if (!(scenes ?? []).some((scene) => scene.sceneId === sceneId)) fail("SCENE", sceneId);
  }

  const healthLessons = (lessons ?? []).filter((lesson) => HEALTH_LESSON_IDS.includes(lesson.id));
  if (healthLessons.length !== HEALTH_LESSON_IDS.length) {
    fail("SCENE", `missing health lessons: ${HEALTH_LESSON_IDS.filter((id) => !healthLessons.some((lesson) => lesson.id === id)).join(",")}`);
  }

  const teach = healthLessons.find((lesson) => lesson.id === "p6-saude");
  const mission = healthLessons.find((lesson) => lesson.id === "p7-imersao-saude");
  if (teach?.isReview) fail("NOVELTY", "p6-saude must stay a teaching topic");
  if (mission && (mission.isReview !== true || mission.curriculumRole !== "immersion")) {
    fail("NOVELTY", "p7-imersao-saude must be isReview + immersion");
  }

  function hasPhrase(steps, phrase, kinds) {
    return (steps ?? []).some((step) => {
      if (kinds && !kinds.has(step.kind)) return false;
      return clean(`${step.text ?? ""}${step.hanzi ?? ""}${step.answer ?? ""}${step.correctAnswer ?? ""}${step.blankAnswer ?? ""}${(step.targetParts ?? []).join("")}`).includes(clean(phrase));
    });
  }

  if (teach) {
    const steps = teach.steps ?? [];
    const teachUnwell = steps.findIndex((step) => step.kind === "listen" && /我不舒服/.test(String(step.text ?? "")));
    const testUnwell = steps.findIndex(
      (step) =>
        (step.kind === "free_production" && /我不舒服/.test(clean(step.answer ?? step.correctAnswer ?? ""))) ||
        (step.kind === "fill_blank" && /舒服/.test(String(step.blankAnswer ?? "")))
    );
    if (testUnwell >= 0 && (teachUnwell < 0 || teachUnwell >= testUnwell)) {
      fail("TEACH_BEFORE_TEST", "p6-saude tests 我不舒服 before teaching it");
    }
    const teachFever = steps.findIndex((step) => step.kind === "listen" && /我发烧了/.test(String(step.text ?? "")));
    const testFever = steps.findIndex(
      (step) =>
        (step.kind === "free_production" && /我发烧了/.test(clean(step.answer ?? step.correctAnswer ?? ""))) ||
        (step.kind === "fill_blank" && /发烧/.test(String(step.blankAnswer ?? "")))
    );
    if (testFever >= 0 && (teachFever < 0 || teachFever >= testFever)) {
      fail("TEACH_BEFORE_TEST", "p6-saude tests 我发烧了 before teaching it");
    }
    if (!hasPhrase(steps, "我不舒服", new Set(["listen"]))) fail("CAPABILITY", "say_unwell listening missing");
    if (!hasPhrase(steps, "我病了", new Set(["listen", "fill_blank"]))) fail("CAPABILITY", "say_sick missing");
    if (!hasPhrase(steps, "我头疼", new Set(["listen", "sentence_build", "free_production"]))) fail("CAPABILITY", "describe_headache missing");
    if (!hasPhrase(steps, "我肚子疼", new Set(["listen", "fill_blank"]))) fail("CAPABILITY", "describe_stomach_pain missing");
    if (!hasPhrase(steps, "我发烧了", new Set(["listen", "fill_blank", "free_production"]))) fail("CAPABILITY", "describe_fever missing");
    if (!steps.some((step) => step.kind === "listen_select" && /头疼吗/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "understand_basic_symptom_question listening missing");
    }
    if (!steps.some((step) => step.kind === "sentence_build" && (step.targetParts ?? []).includes("医生") && !(step.targetParts ?? []).includes("医"))) {
      fail("CAPABILITY", "ask_for_doctor must build 医生 as a word, not 医+生");
    }
    if (!steps.some((step) => step.kind === "listen" && /医院在哪里/.test(String(step.text ?? "")))) {
      // transfer: do not re-teach
    } else {
      fail("NOVELTY", "医院在哪里？ re-taught as listen acquisition in p6-saude");
    }
    const productions = steps.filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /我不舒服/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "say_unwell production missing");
    }
    if (!productions.some((step) => /医院在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "ask_for_hospital production missing");
    }
    if (!productions.some((step) => /我要看医生|我需要医生/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "ask_for_doctor production missing");
    }
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: health teach productions must allow speech");
    if (!productions.some((step) => /我不舒服/.test(clean(step.answer ?? step.correctAnswer ?? "")) && step.productionOpen)) {
      fail("CAPABILITY", "我不舒服 must keep speaking");
    }
    for (const step of productions) independent(step, fail, `${teach.id}/${step.title ?? step.kind}`);
    if (!(steps ?? []).some((step) => step.sceneId === "nao-me-sinto-bem")) fail("SCENE", "teach without nao-me-sinto-bem");
    if ((steps ?? []).some((step) => step.kind === "flashcard" && step.chunkId === "yiyuanzainali")) {
      fail("NOVELTY", "p6-saude re-teaches 医院在哪里？ as flashcard acquisition");
    }
  }

  if (mission) {
    if (!(mission.steps ?? []).some((step) => step.sceneId === "na-clinica")) fail("SCENE", "mission without na-clinica");
    if (!(mission.steps ?? []).some((step) => step.kind === "listen_select" && /头疼吗/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "mission missing symptom-question listening");
    }
    if (!(mission.steps ?? []).some((step) => step.kind === "listen_select" && /一直走/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "mission missing hospital direction listening");
    }
    if (!(mission.steps ?? []).some((step) => step.kind === "map_direction")) {
      fail("CAPABILITY", "mission missing mobility transfer map");
    }
    const productions = (mission.steps ?? []).filter((step) => step.kind === "free_production");
    if (productions.filter((step) => step.productionOpen).length < 2) {
      fail("CAPABILITY", "Health Mission needs at least 2 open productions");
    }
    if (!productions.some((step) => /我头疼/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "mission variant A headache missing");
    }
    if (!productions.some((step) => /我肚子疼/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "mission variant B stomach missing");
    }
    if (!productions.some((step) => /我发烧了/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "mission variant C fever missing");
    }
    if (!productions.some((step) => /我需要帮助|我需要医生/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "mission missing help/doctor request");
    }
    if (!productions.some((step) => /医院在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "mission must resolve by locating care");
    }
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: health mission productions must allow speech");
    for (const step of productions) independent(step, fail, `${mission.id}/${step.title ?? step.kind}`);
    if ((mission.steps ?? []).every((step) => step.kind === "dialogue_choice" || step.kind === "listen_select")) {
      fail("CAPABILITY", "Health Mission is quiz-only");
    }
    if ((mission.steps ?? []).some((step) => step.kind === "flashcard" && step.chunkId === "yiyuanzainali")) {
      fail("NOVELTY", "mission re-teaches 医院在哪里？ as acquisition");
    }
  }

  for (const lesson of healthLessons) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      const stimulus = AUDIO_KINDS.has(step.kind) ? (step.audioText ?? step.audioSequence?.[0]) : "";
      if (AUDIO_KINDS.has(step.kind)) {
        if (!stimulus) fail("NO_AUDIO", `${lesson.id}/${index + 1}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && stimulus && field.includes(stimulus)) fail("TARGET_LEAK", `${lesson.id}: ${field}`);
        }
      }
      if (/Matheus/.test(blobOf(step))) fail("MATHEUS", `${lesson.id}/${index + 1}: hardcoded Matheus`);
      if (MEDICAL_POLICY.test(blobOf(step))) fail("HEALTH_POLICY", `${lesson.id}/${index + 1}: medical advice or dosage`);
    }
  }

  const healthScenes = (scenes ?? []).filter((scene) => HEALTH_SCENE_IDS.includes(scene.sceneId));
  for (const scene of healthScenes) {
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    let hasUnwell = false;
    let hasSymptom = false;
    let hasDoctor = false;
    let hasHospital = false;
    let hasListening = false;
    let hasSpeaking = false;
    for (const node of path) {
      if (node.interaction?.type === "produce_reply") {
        independent(node.interaction, fail, `${scene.sceneId}/${node.id}`);
        hasSpeaking = true;
      }
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (answer) evidence.push({ lesson: scene.sceneId, location: node.id, answer, kind: node.interaction?.type ?? "npc" });
      if (/我不舒服/.test(answer)) hasUnwell = true;
      if (/我头疼|我肚子疼|我发烧了/.test(answer)) hasSymptom = true;
      if (/我需要医生|我要看医生/.test(answer)) hasDoctor = true;
      if (/医院在哪里/.test(answer)) hasHospital = true;
      if (node.interaction?.type === "listen_reply" && /头疼吗/.test(String(node.interaction.listenAudioText ?? node.hanzi ?? ""))) {
        hasListening = true;
        if (/头疼吗/.test(`${node.interaction.prompt ?? ""}${node.interaction.title ?? ""}`)) {
          fail("TARGET_LEAK", `${scene.sceneId}: symptom question leaked before listening`);
        }
      }
      if (node.interaction) {
        const prompt = node.interaction.prompt ?? "";
        const valid = node.interaction.validAnswers ?? [];
        if (/também vale|ambas|as duas servem|also works/i.test(prompt) && !node.interaction.decision) {
          fail("ANSWER_CONTRACT", `${scene.sceneId}/${node.id}: prompt treats two answers as valid without a decision`);
        }
        if (node.interaction.decision) {
          for (const item of valid) {
            const next = node.interaction.nextByAnswer?.[item] ?? node.interaction.correctNextNodeId;
            if (next && next === node.interaction.wrongNextNodeId) {
              fail("ANSWER_CONTRACT", `${scene.sceneId}/${node.id}: valid "${item}" takes the wrong branch`);
            }
          }
        }
        const wrong = node.interaction.wrongNextNodeId;
        const repairNode = (scene.nodes ?? []).find((item) => item.id === wrong);
        if (repairNode?.hanzi) repairs.push(cleanHanzi(repairNode.hanzi));
      }
      if (/Matheus/.test(`${node.interaction?.prompt ?? ""}${node.pt ?? ""}`)) {
        fail("MATHEUS", `${scene.sceneId}/${node.id}`);
      }
      if (MEDICAL_POLICY.test(`${node.pt ?? ""}${node.interaction?.prompt ?? ""}${node.interaction?.explanation ?? ""}`)) {
        fail("HEALTH_POLICY", `${scene.sceneId}/${node.id}: medical advice`);
      }
    }
    if (scene.sceneId === "nao-me-sinto-bem") {
      if (scene.setting !== "street") fail("SCENE", "nao-me-sinto-bem must stay a street friend scene");
      if ((scene.characters ?? []).some((character) => character.role === "Atendente")) {
        fail("SCENE", "friend scene must not use clinic roles");
      }
      if (!hasUnwell) fail("CAPABILITY", "friend scene missing 我不舒服");
      if (!hasSymptom) fail("CAPABILITY", "friend scene missing symptom answer");
      if (!hasDoctor) fail("CAPABILITY", "friend scene missing 我需要医生");
      if (!hasHospital) fail("CAPABILITY", "friend scene missing 医院在哪里？");
      if (!hasSpeaking) fail("CAPABILITY", "friend scene missing produce_reply speaking");
    }
    if (scene.sceneId === "na-clinica") {
      if (scene.setting !== "clinic") fail("SCENE", "na-clinica setting must be clinic");
      const roles = (scene.characters ?? []).map((character) => character.role);
      if (!roles.includes("Paciente") || !roles.includes("Atendente")) {
        fail("SCENE", "na-clinica must be patient + attendant");
      }
      if (!hasUnwell) fail("CAPABILITY", "clinic missing 我不舒服");
      if (!hasDoctor) fail("CAPABILITY", "clinic missing request for doctor");
      if (!hasListening) fail("CAPABILITY", "clinic missing symptom-question listening");
      const repeat = (scene.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
      if (!repeat) fail("CAPABILITY", "clinic missing 请再说一遍 / 请慢一点 decision");
      else if ((repeat.interaction.nextByAnswer ?? {})["请再说一遍"] === (repeat.interaction.nextByAnswer ?? {})["请慢一点"]) {
        fail("REPAIR_BRANCH", "请慢一点 must not reuse the repeat node");
      }
    }
    const uniqueRepairs = [...new Set(repairs.filter(Boolean))];
    if (uniqueRepairs.length && uniqueRepairs.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${scene.sceneId}: every repair is 请再说一遍`);
    }
  }

  const p6plans = data.plans?.["p6-saude"];
  if (Array.isArray(p6plans) && p6plans.length === 4) {
    const [m1, m2, m3, m4] = p6plans;
    if (!m1.some((step) => step.kind === "listen" && /我不舒服/.test(String(step.text ?? "")))) {
      fail("CAPABILITY", "health M1 missing 我不舒服 listening");
    }
    if (!m1.some((step) => step.kind === "fill_blank" && /舒服/.test(String(step.blankAnswer ?? "")))) {
      fail("CAPABILITY", "health M1 missing 舒服 fill");
    }
    if (!m1.some((step) => step.kind === "sentence_build" && (step.targetParts ?? []).includes("舒服"))) {
      fail("CAPABILITY", "health M1 missing 我不舒服 build");
    }
    if (m1.some((step) => step.kind === "conversation_scene" || step.kind === "free_production")) {
      fail("NOVELTY", "health M1 must not jump to open production or conversation");
    }
    if (!m2.some((step) => step.kind === "listen_select" && /头疼吗/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "health M2 missing symptom-question listening");
    }
    if (!m2.some((step) => step.kind === "sentence_build" && (step.targetParts ?? []).includes("医生") && !(step.targetParts ?? []).includes("医"))) {
      fail("CAPABILITY", "health M2 must build 医生 as a word");
    }
    if (!m3.some((step) => step.kind === "free_production" && step.productionOpen && /我不舒服/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "health M3 missing speaking 我不舒服");
    }
    if (!m4.some((step) => step.sceneId === "nao-me-sinto-bem")) {
      fail("CAPABILITY", "health M4 missing friend conversation");
    }
    if (!m4.some((step) => step.kind === "free_production" && /医院在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "health M4 missing hospital transfer production");
    }
  }

  const decisions = validateConversationDecisions(data);
  return { failures, evidence, decisions: decisions.scenes?.filter((id) => HEALTH_SCENE_IDS.includes(id)) ?? [] };
}

export function validateChinaSurvivalEmergency(data) {
  const result = validateChinaSurvivalHealth(data);
  const fail = (code, message) => result.failures.push({ code, message });
  const { lessons, scenes } = data;
  const mission = (lessons ?? []).find((lesson) => lesson.id === "p7-imersao-saude");
  const clinic = (scenes ?? []).find((scene) => scene.sceneId === "na-clinica");
  if (!mission) fail("CAPABILITY", "emergency mission missing");
  if (mission) {
    const productions = (mission.steps ?? []).filter((step) => step.kind === "free_production");
    if (!productions.some((step) => /我需要帮助/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "ask_help production missing");
    }
    if (!productions.some((step) => /医院在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
      fail("CAPABILITY", "identify_hospital / locate_help missing");
    }
  }
  if (clinic) {
    const path = mainPath(clinic.nodes ?? [], clinic.entryNodeId);
    if (!path.some((node) => /我需要帮助|我要看医生|我需要医生/.test(clean(node.interaction?.correctAnswer ?? node.hanzi ?? "")))) {
      fail("CAPABILITY", "clinic missing urgent need language");
    }
    const repeat = (clinic.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
    if (!repeat) fail("CAPABILITY", "repair_misunderstanding missing from clinic");
  }
  return result;
}
