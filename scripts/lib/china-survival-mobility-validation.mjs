import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";
import { validateConversationDecisions } from "./conversation-decisions-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const MOBILITY_SCENE_IDS = ["imersao-estacao", "pegar-taxi"];
const MOBILITY_LESSON_IDS = ["p6-cidade-lugares", "p6-direcoes", "p6-china-ruas", "p7-imersao-estacao"];
const ADVANCED_SCOPE =
  /房卡|登机口|行李|两晚|passaporte na recep|problema no quarto|reserva do quarto|entregue o passaporte|peça a 房卡/i;

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

export function validateChinaSurvivalMobility(data) {
  const { lessons, scenes, hanziMemoryTargets, cultureItems, missions, bridges } = data;
  const failures = [];
  const evidence = [];
  const fail = (code, message) => failures.push({ code, message });

  function independent(step, lessonId, location) {
    const answer = step.kind === "write" || step.kind === "free_production" ? (step.answer ?? step.correctAnswer) : step.correctAnswer;
    const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
    const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
    if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
    evidence.push({ lesson: lessonId, location, answer: clean(answer), kind: step.kind ?? "produce_reply" });
  }

  for (const sceneId of MOBILITY_SCENE_IDS) {
    if (!(scenes ?? []).some((scene) => scene.sceneId === sceneId)) fail("SCENE", sceneId);
  }

  const mobilityLessons = (lessons ?? []).filter((lesson) => MOBILITY_LESSON_IDS.includes(lesson.id));
  if (mobilityLessons.length !== MOBILITY_LESSON_IDS.length) {
    fail("SCENE", `missing mobility lessons: ${MOBILITY_LESSON_IDS.filter((id) => !mobilityLessons.some((lesson) => lesson.id === id)).join(",")}`);
  }

  const maps = mobilityLessons.flatMap((lesson) => (lesson.steps ?? []).filter((step) => step.kind === "map_direction" || step.kind === "route_sequence"));
  if (!maps.some((step) => step.kind === "map_direction")) fail("NO_MAP", "spatial application needs map_direction");
  if (!maps.some((step) => step.kind === "route_sequence")) fail("NO_MAP", "spatial application needs route_sequence");
  const planned = Object.values(data.plans ?? {}).flat(2);
  if (planned.length) {
    if (!planned.some((step) => step.kind === "map_direction")) fail("NO_MAP", "runtime plan dropped map_direction");
    if (!planned.some((step) => step.kind === "route_sequence")) fail("NO_MAP", "runtime plan dropped route_sequence");
    if (!planned.some((step) => step.sceneId === "imersao-estacao")) fail("CAPABILITY", "runtime plan dropped imersao-estacao");
    if (!planned.some((step) => step.sceneId === "pegar-taxi")) fail("CAPABILITY", "runtime plan dropped pegar-taxi");
    if (!planned.some((step) => step.kind === "free_production" && /在这里停车/.test(clean(step.answer ?? step.correctAnswer)))) {
      fail("CAPABILITY", "runtime plan dropped request_stop");
    }
  }
  if (!String(data.lessonStepsSource ?? "").includes("mapWrongTurn")) {
    fail("NO_MAP", "map wrong-turn must show a spatial consequence");
  }

  const direcoes = mobilityLessons.find((lesson) => lesson.id === "p6-direcoes");
  if (direcoes) {
    const steps = direcoes.steps ?? [];
    const teachRight = steps.findIndex(
      (step) =>
        (step.kind === "listen" && /右边|右转|往右走/.test(String(step.text ?? ""))) ||
        (step.kind === "flashcard" && step.chunkId === "youzhuan")
    );
    const testRight = steps.findIndex((step) => step.kind === "map_direction" && step.mapCorrectAction === "right");
    if (testRight >= 0 && (teachRight < 0 || teachRight >= testRight)) {
      fail("TEACH_BEFORE_TEST", "p6-direcoes asks 右转 on the map before teaching it");
    }
    const explain = steps.findIndex((step) => step.kind === "intro" && /3º|4º|contorno|zuǒ|yòu/.test(blobOf(step)));
    const toneTest = steps.findIndex(
      (step) =>
        (step.kind === "tone" && step.assist !== "guided") ||
        (step.kind === "listen_select" && /tom|contorno|esquerda|direita/i.test(blobOf(step)))
    );
    if (explain < 0) fail("EXPLAIN_BEFORE_TEST", "p6-direcoes missing 左/右 contour explanation");
    if (toneTest >= 0 && explain >= 0 && toneTest < explain) {
      fail("EXPLAIN_BEFORE_TEST", "左/右 tested before contour explanation");
    }
  }

  const mission = mobilityLessons.find((lesson) => lesson.id === "p7-imersao-estacao");
  if (!mission) fail("SCENE", "p7-imersao-estacao missing");
  else {
    if (mission.cultureItemId !== "metro-qr") fail("CULTURE", "mission must keep metro-qr");
    if (!(mission.steps ?? []).some((step) => step.sceneId === "imersao-estacao")) fail("SCENE", "mission without imersao-estacao");
    if (!(mission.steps ?? []).some((step) => step.sceneId === "pegar-taxi")) fail("SCENE", "mission without pegar-taxi");
    const productions = (mission.steps ?? []).filter((step) => step.kind === "free_production");
    const hasAskLocation = productions.some((step) => /在哪里/.test(clean(step.answer ?? step.correctAnswer)));
    const hasAskRoute = productions.some((step) => /怎么走/.test(clean(step.answer ?? step.correctAnswer)));
    const hasDestination = productions.some((step) => /我要去|去北京路/.test(clean(step.answer ?? step.correctAnswer)));
    const hasStop = productions.some((step) => /在这里停车/.test(clean(step.answer ?? step.correctAnswer)));
    if (!hasAskLocation) fail("CAPABILITY", "ask_location independent production missing from mission");
    if (!hasAskRoute) fail("CAPABILITY", "ask_route independent production missing from mission");
    if (!hasDestination) fail("CAPABILITY", "destination independent production missing from mission");
    if (!hasStop) fail("CAPABILITY", "request_stop independent production missing from mission");
    if (!productions.some((step) => step.productionOpen)) fail("CAPABILITY", "speaking: mission productions must allow speech");
    for (const step of productions) independent(step, mission.id, `${mission.id}/${step.title ?? step.kind}`);
    if (!(mission.steps ?? []).some((step) => /入口/.test(`${step.correctAnswer ?? ""}${step.signHanzi ?? ""}`))) {
      fail("CAPABILITY", "sign: 入口 action missing");
    }
    if (!(mission.steps ?? []).some((step) => step.kind === "listen_select" && /一直走|左转|右转/.test(String(step.audioText ?? "")))) {
      fail("CAPABILITY", "audio_direction missing from mission");
    }
    if (!(mission.steps ?? []).some((step) => step.kind === "listen_select" && String(step.audioText ?? "").includes("十"))) {
      fail("CAPABILITY", "ticket-price listening missing from mission");
    }
  }

  const cidade = mobilityLessons.find((lesson) => lesson.id === "p6-cidade-lugares");
  if (cidade && cidade.cultureItemId !== "metro-qr") fail("CULTURE", "p6-cidade-lugares must keep metro-qr");

  const ruas = mobilityLessons.find((lesson) => lesson.id === "p6-china-ruas");
  if (ruas && !(ruas.steps ?? []).some((step) => step.kind === "listen" && String(step.text ?? "").includes("去哪里"))) {
    fail("TEACH_BEFORE_TEST", "p6-china-ruas must teach 去哪里？ before the taxi scene");
  }

  for (const lesson of mobilityLessons) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      if (ADVANCED_SCOPE.test(blobOf(step))) {
        fail("SCOPE", `${lesson.id}/${index + 1}: hotel/airport advanced content entered 4.9.8A`);
      }
      const stimulus = step.kind === "map_direction" && step.audioText ? step.audioText : AUDIO_KINDS.has(step.kind) ? (step.audioText ?? step.audioSequence?.[0]) : "";
      if (AUDIO_KINDS.has(step.kind) || (step.kind === "map_direction" && step.audioText)) {
        if (!stimulus) fail("NO_AUDIO", `${lesson.id}/${index + 1}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && stimulus && field.includes(stimulus)) fail("TARGET_LEAK", `${lesson.id}: ${field}`);
        }
      }
    }
  }

  const mobilityScenes = (scenes ?? []).filter((scene) => MOBILITY_SCENE_IDS.includes(scene.sceneId));
  for (const scene of mobilityScenes) {
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    let destinationEcho = false;
    for (const node of path) {
      if (node.interaction?.type === "produce_reply") independent(node.interaction, scene.sceneId, `${scene.sceneId}/${node.id}`);
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (answer) evidence.push({ lesson: scene.sceneId, location: node.id, answer, kind: node.interaction?.type ?? "npc" });
      if (node.interaction) {
        const wrong = node.interaction.wrongNextNodeId;
        const repairNode = (scene.nodes ?? []).find((item) => item.id === wrong);
        if (repairNode?.hanzi) repairs.push(cleanHanzi(repairNode.hanzi));
      }
      if (/酒店好|北京路好/.test(cleanHanzi(node.hanzi))) destinationEcho = true;
    }
    if (scene.sceneId === "pegar-taxi" && !destinationEcho) {
      fail("BROKEN_CONTINUITY", "pegar-taxi: NPC does not echo the stated destination");
    }
    const uniqueRepairs = [...new Set(repairs.filter(Boolean))];
    if (uniqueRepairs.length && uniqueRepairs.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${scene.sceneId}: every repair is 请再说一遍`);
    }
  }

  const taxi = mobilityScenes.find((scene) => scene.sceneId === "pegar-taxi");
  if (taxi && !(taxi.nodes ?? []).some((node) => /在这里停车/.test(clean(node.interaction?.correctAnswer ?? "")))) {
    fail("CAPABILITY", "request_stop missing from taxi scene");
  }
  const station = mobilityScenes.find((scene) => scene.sceneId === "imersao-estacao");
  if (station) {
    const repairDecision = (station.nodes ?? []).find((node) => node.interaction?.validAnswers?.includes("请慢一点"));
    if (!repairDecision) fail("CAPABILITY", "repair decision missing from station");
    else if ((repairDecision.interaction.nextByAnswer ?? {})["请再说一遍"] === (repairDecision.interaction.nextByAnswer ?? {})["请慢一点"]) {
      fail("CAPABILITY", "repeat and slower-chunk must change the conversation");
    }
  }

  for (const glyph of ["左", "右"]) {
    const target = (hanziMemoryTargets ?? []).find((item) => item.glyph === glyph);
    if (!target) fail("DELAYED_RECALL", `CORE ${glyph} missing`);
    else {
      const introIndex = (lessons ?? []).findIndex((lesson) => lesson.id === target.introduceLessonId);
      const delayedOk = (target.delayedLessonIds ?? []).some((id) => {
        const lesson = (lessons ?? []).find((item) => item.id === id);
        const index = (lessons ?? []).findIndex((item) => item.id === id);
        if (!lesson || index <= introIndex) return false;
        const inSteps = (lesson.steps ?? []).some((step) => {
          if (step.charId === target.charId) return true;
          const blob = [step.text, step.hanzi, step.audioText, step.correctAnswer, step.answer, ...(step.options ?? [])].join("");
          return blob.includes(glyph);
        });
        const inReview = (lesson.reviewItems ?? []).includes(`char:${target.charId}`);
        return inSteps || inReview;
      });
      if (!delayedOk) fail("DELAYED_RECALL", `${glyph} without delayed recall`);
    }
  }

  const metro = (cultureItems ?? []).find((item) => item.id === "metro-qr");
  if (!metro) fail("CULTURE", "metro-qr missing");
  else {
    if (!metro.sources?.length) fail("MISSING_SOURCE", "metro-qr without source");
    if (!String(metro.titleEn ?? "").trim() || !String(metro.summaryEn ?? "").trim() || !String(metro.bodyEn ?? "").trim()) {
      fail("MISSING_EN", "metro-qr missing English");
    }
  }
  const metroBridge = (bridges ?? []).find((bridge) => bridge.cultureItemId === "metro-qr");
  if (!metroBridge || metroBridge.lessonId !== "p6-cidade-lugares") {
    fail("CULTURE", "metro-qr bridge must sit on p6-cidade-lugares");
  }
  if (metroBridge && (!String(metroBridge.explanation?.en ?? "").trim() || !String(metroBridge.prompt?.en ?? "").trim())) {
    fail("MISSING_EN", "metro-qr bridge missing English");
  }
  const bridgeLessons = (bridges ?? []).map((bridge) => bridge.lessonId);
  if (new Set(bridgeLessons).size !== bridgeLessons.length) fail("CULTURE", "two culture bridges on the same lesson");
  if ((bridges ?? []).length < 8 || (bridges ?? []).length > 12) {
    fail("BRIDGE_COUNT", `expected 8–12 journey bridges, found ${(bridges ?? []).length}`);
  }

  const metroMission = (missions ?? []).find((row) => row.cultureItemId === "metro-qr");
  if (!metroMission) fail("CULTURE", "metro-qr mission missing");
  else {
    const teach = (metroMission.steps ?? []).findIndex((step) => step.kind === "culture_teach");
    const scored = (metroMission.steps ?? []).findIndex(
      (step) =>
        ["scenario_choice", "dialogue_choice", "culture_recall", "sequence"].includes(step.kind) &&
        step.scored !== false &&
        step.role !== "demo"
    );
    if (scored >= 0 && (teach < 0 || teach >= scored)) fail("TEACH_AFTER_TEST", "metro-qr tested before explanation");
  }

  const player = data.lessonPlayerSource ?? "";
  if (player && /completeCultureBridge[\s\S]{0,400}ensureSrs/.test(player)) {
    fail("SRS_LEAK", "culture bridge must not touch lexical SRS");
  }

  const left = maps.some((step) => step.mapCorrectAction === "left" || (step.targetParts ?? []).includes("左转"));
  const right = maps.some((step) => step.mapCorrectAction === "right" || (step.targetParts ?? []).includes("右转"));
  const straight = maps.some((step) => step.mapCorrectAction === "straight" || (step.targetParts ?? []).includes("一直走"));
  if (!left) fail("CAPABILITY", "left");
  if (!right) fail("CAPABILITY", "right");
  if (!straight) fail("CAPABILITY", "straight");

  const decision = validateConversationDecisions(data);
  for (const item of decision.failures) {
    const text = `${item.code} ${item.message}`;
    if (MOBILITY_SCENE_IDS.some((id) => text.includes(id))) failures.push(item);
  }

  return { failures, evidence };
}
