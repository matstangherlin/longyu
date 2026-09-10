import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";
import { validateConversationDecisions } from "./conversation-decisions-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const TEACHING_KINDS = new Set(["listen", "intro", "flashcard", "decompose", "recognize"]);
const SHOPPING_SCENE_IDS = ["conversa-na-loja", "comprar-itens", "imersao-mercado"];
const SHOPPING_LESSON_IDS = ["l27", "p6-compras", "p6-survival-mandarin", "p7-imersao-mercado"];
const ALWAYS_BARGAIN = /negociar faz parte|sempre se pechincha|em qualquer loja da China|negociar em qualquer loja/i;
const CAPABILITIES = {
  ask_price: /多少钱/,
  understand_price: /二十八|28/,
  choose_item: /我要这个|我要这双鞋|我要买/,
  accept_price: /(?:^|[\s。])好/,
  decline: /不要了/,
  bargain_context: /太贵了|便宜一点/,
  payment: /可以刷卡吗|现金可以吗|微信支付/,
};

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
  ]
    .filter(Boolean)
    .join("\n");
}

export function validateChinaSurvivalShopping(data) {
  const { lessons, scenes, chunks, characters, plans, hanziMemoryTargets, cultureItems, missions, bridges } = data;
  const failures = [];
  const evidence = [];
  const fail = (code, message) => failures.push({ code, message });
  const surfaces = new Map([
    ...(chunks ?? []).map((chunk) => ["chunk:" + chunk.id, chunk.hanzi]),
    ...(characters ?? []).map((character) => ["char:" + character.id, character.hanzi]),
  ]);

  function independent(step, lessonId, location) {
    const answer = step.kind === "write" || step.kind === "free_production" ? (step.answer ?? step.correctAnswer) : step.correctAnswer;
    const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
    const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
    if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
    evidence.push({ lesson: lessonId, location, answer: clean(answer), kind: step.kind ?? "produce_reply" });
  }

  for (const sceneId of SHOPPING_SCENE_IDS) {
    if (!(scenes ?? []).some((scene) => scene.sceneId === sceneId)) fail("SCENE", sceneId);
  }

  const mission = (lessons ?? []).find((lesson) => lesson.id === "p7-imersao-mercado");
  if (!mission) fail("SCENE", "p7-imersao-mercado missing");
  else {
    if (mission.cultureItemId === "shared-dishes") fail("CULTURE", "p7-imersao-mercado must not keep shared-dishes");
    if (ALWAYS_BARGAIN.test(blobOf({ body: mission.title, explanation: (mission.steps ?? []).map(blobOf).join("\n") }))) {
      fail("ALWAYS_BARGAIN", "mission copy presents bargaining as automatic");
    }
    const hasPrice = (mission.steps ?? []).some((step) => step.kind === "free_production" && /多少钱/.test(clean(step.answer ?? step.correctAnswer)));
    const hasItem = (mission.steps ?? []).some((step) => step.kind === "free_production" && /我要这个/.test(clean(step.answer ?? step.correctAnswer)));
    const hasPay = (mission.steps ?? []).some((step) => step.kind === "free_production" && /现金可以吗|可以刷卡吗/.test(clean(step.answer ?? step.correctAnswer)));
    const hasDecline = (mission.steps ?? []).some((step) => step.kind === "free_production" && /不要了/.test(clean(step.answer ?? step.correctAnswer)));
    if (!hasPrice) fail("CAPABILITY", "ask_price independent production missing from mission");
    if (!hasItem) fail("CAPABILITY", "choose_item independent production missing from mission");
    if (!hasPay) fail("CAPABILITY", "payment independent production missing from mission");
    if (!hasDecline) fail("CAPABILITY", "decline independent production missing from mission");
    if (!(mission.steps ?? []).some((step) => step.sceneId === "imersao-mercado")) fail("SCENE", "mission without imersao-mercado");
    for (const step of mission.steps ?? []) {
      if (step.kind === "free_production") independent(step, "p7-imersao-mercado", `${mission.id}/${step.title ?? step.kind}`);
    }
  }

  const p6 = (lessons ?? []).find((lesson) => lesson.id === "p6-compras");
  if (!p6) fail("SCENE", "p6-compras missing");
  else {
    if (p6.cultureItemId !== "bargaining-context") fail("CULTURE", "p6-compras needs bargaining-context");
    if (!(p6.hanziMemoryTargets ?? []).includes("买")) fail("DELAYED_RECALL", "p6-compras must declare CORE 买");
    const steps = p6.steps ?? [];
    const explain = steps.findIndex((step) => step.kind === "intro" && /买|卖|contorno|3º|4º/.test(blobOf(step)));
    const toneTest = steps.findIndex(
      (step) =>
        (step.kind === "tone" && step.assist !== "guided") ||
        (step.kind === "listen_select" && /comprar|vender|contorno|tom/i.test(blobOf(step)))
    );
    if (explain < 0) fail("EXPLAIN_BEFORE_TEST", "p6-compras missing 买×卖 contour explanation");
    if (toneTest >= 0 && explain >= 0 && toneTest < explain) {
      fail("EXPLAIN_BEFORE_TEST", "买×卖 test before contrast explanation");
    }
    if (!(steps ?? []).some((step) => step.kind === "listen" && String(step.text ?? "").includes("卖"))) {
      fail("UNTAUGHT_TONE_VOCAB", "p6-compras must listen-teach 卖 before the tone contrast");
    }
    if (!(steps ?? []).some((step) => step.kind === "recognize" && step.charId === "mai_buy")) {
      fail("TEACH_BEFORE_TEST", "买 must be recognized before production");
    }
  }

  const l27 = (lessons ?? []).find((lesson) => lesson.id === "l27");
  if (l27) {
    if (l27.cultureItemId !== "digital-pay") fail("CULTURE", "l27 must keep digital-pay");
    if (!(l27.steps ?? []).some((step) => step.kind === "listen" && String(step.text ?? "").includes("便宜一点"))) {
      fail("CAPABILITY", "l27 must teach 便宜一点");
    }
    const priceListen = (l27.steps ?? []).find((step) => step.kind === "listen_select" && step.audioText === "二十八");
    if (!priceListen) fail("CAPABILITY", "price listening missing from l27");
  }

  const survival = (lessons ?? []).find((lesson) => lesson.id === "p6-survival-mandarin");
  if (survival && !(survival.steps ?? []).some((step) => /现金可以吗/.test(`${step.text ?? ""}${step.chunkId ?? ""}`))) {
    const hasCashAsk =
      (survival.steps ?? []).some((step) => step.chunkId === "xianjinkeyima") ||
      (survival.steps ?? []).some((step) => String(step.text ?? "").includes("现金可以吗"));
    if (!hasCashAsk) fail("CAPABILITY", "p6-survival-mandarin must teach 现金可以吗？");
  }

  for (const lesson of (lessons ?? []).filter((item) => SHOPPING_LESSON_IDS.includes(item.id))) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      if (ALWAYS_BARGAIN.test(blobOf(step))) fail("ALWAYS_BARGAIN", `${lesson.id}/${index + 1}: ${blobOf(step).slice(0, 80)}`);
      if (AUDIO_KINDS.has(step.kind)) {
        const stimulus = step.audioText ?? step.audioSequence?.[0];
        if (!stimulus) fail("NO_AUDIO", `${lesson.id}/${index + 1}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && stimulus && field.includes(stimulus)) fail("TARGET_LEAK", `${lesson.id}: ${field}`);
        }
      }
      if (step.kind === "free_production" && lesson.id === "p7-imersao-mercado") {
        independent(step, lesson.id, `${lesson.id}/plan-or-step`);
      }
    }
    if (lesson.id === "p7-imersao-mercado") {
      for (const plan of plans?.[lesson.id] ?? []) {
        for (const [index, step] of plan.entries()) {
          if (step.kind === "free_production" || (step.kind === "write" && step.mode !== "free_reflection")) {
            independent(step, lesson.id, `${lesson.id}/plan/${index + 1}`);
          }
        }
      }
    }
  }

  const listen = (mission?.steps ?? []).find((step) => step.kind === "listen_select" && step.audioText === "二十八");
  if (!listen) fail("CAPABILITY", "understand_price listening missing from mission");
  else {
    if ((listen.options ?? []).some((option) => String(option).includes("二十八"))) fail("TARGET_LEAK", "price listen options leak target");
    if (!(listen.options ?? []).some((option) => String(option) === "28")) fail("CAPABILITY", "price listen options");
  }
  const payListen = (mission?.steps ?? []).find((step) => step.kind === "listen_select" && /微信|支付宝/.test(String(step.audioText ?? "")));
  if (!payListen) fail("CAPABILITY", "payment listening missing");
  else {
    for (const field of [payListen.title, payListen.prompt]) {
      if (field && payListen.audioText && String(field).includes(payListen.audioText)) fail("TARGET_LEAK", field);
    }
  }

  const shoppingScenes = (scenes ?? []).filter((scene) => SHOPPING_SCENE_IDS.includes(scene.sceneId));
  for (const scene of shoppingScenes) {
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    let itemEcho = false;
    for (const node of path) {
      if (node.interaction?.type === "produce_reply") independent(node.interaction, scene.sceneId, `${scene.sceneId}/${node.id}`);
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (answer) evidence.push({ lesson: scene.sceneId, location: node.id, answer, kind: node.interaction?.type ?? "npc" });
      if (node.interaction) {
        const wrong = node.interaction.wrongNextNodeId;
        const repairNode = (scene.nodes ?? []).find((item) => item.id === wrong);
        if (repairNode?.hanzi) repairs.push(cleanHanzi(repairNode.hanzi));
        if (/我要这个/.test(answer)) {
          const answerNode = path.find((item) => item.id === node.interaction.correctNextNodeId);
          const after = answerNode ? path[path.indexOf(answerNode) + 1] : undefined;
          if (after && /这个/.test(clean(after.hanzi))) itemEcho = true;
        }
      }
    }
    if (scene.sceneId === "imersao-mercado" && !itemEcho) fail("BROKEN_CONTINUITY", `${scene.sceneId}: NPC does not echo 这个 after the order`);
    const uniqueRepairs = [...new Set(repairs.filter(Boolean))];
    if (uniqueRepairs.length && uniqueRepairs.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${scene.sceneId}: every repair is 请再说一遍`);
    }
  }

  const tagged = (scenes ?? []).find((scene) => scene.sceneId === "conversa-na-loja");
  const taggedDecision = (tagged?.nodes ?? []).find((node) => node.interaction?.decision);
  if (!taggedDecision?.interaction?.validAnswers?.includes("好")) {
    fail("ALWAYS_BARGAIN", "tagged shop must treat paying the marked price as valid");
  }
  if (taggedDecision?.interaction?.correctAnswer === "太贵了" && (taggedDecision.interaction.validAnswers ?? []).length < 2) {
    fail("ALWAYS_BARGAIN", "bargaining presented as the only correct shop move");
  }

  for (const [id, pattern] of Object.entries(CAPABILITIES)) {
    const hits = evidence.filter((item) => pattern.test(item.answer) || pattern.test(item.answer.replace(/好/g, "好")));
    if (!hits.length && id !== "accept_price") fail("CAPABILITY", id);
  }
  const acceptHit = (scenes ?? []).some((scene) =>
    (scene.nodes ?? []).some((node) => node.interaction?.decision && (node.interaction.validAnswers ?? []).includes("好"))
  );
  if (!acceptHit) fail("CAPABILITY", "accept_price");

  const independentHits = evidence.filter((item) => item.kind === "free_production" || item.kind === "produce_reply" || item.kind === "write");
  if (!independentHits.some((item) => CAPABILITIES.ask_price.test(item.answer))) fail("CAPABILITY", "ask_price independent");
  if (!independentHits.some((item) => CAPABILITIES.payment.test(item.answer))) fail("CAPABILITY", "payment independent");

  const bargaining = (cultureItems ?? []).find((item) => item.id === "bargaining-context");
  if (!bargaining) fail("CULTURE", "bargaining-context missing");
  else {
    if (!bargaining.sources?.length) fail("MISSING_SOURCE", "bargaining-context without source");
    if (bargaining.miniCheck?.correctOptionId === "a") fail("ALWAYS_BARGAIN", "culture mini-check treats always-bargain as correct");
    if (!(bargaining.relatedLessonIds ?? []).includes("p6-compras")) fail("CULTURE", "bargaining-context must relate to p6-compras");
  }
  const digital = (cultureItems ?? []).find((item) => item.id === "digital-pay");
  if (!digital) fail("CULTURE", "digital-pay missing");

  const bargainingBridge = (bridges ?? []).find((bridge) => bridge.cultureItemId === "bargaining-context");
  if (!bargainingBridge || bargainingBridge.lessonId !== "p6-compras") {
    fail("CULTURE", "bargaining-context bridge must sit on p6-compras");
  }
  if ((bridges ?? []).length < 8 || (bridges ?? []).length > 12) {
    fail("BRIDGE_COUNT", `expected 8–12 journey bridges, found ${(bridges ?? []).length}`);
  }
  const player = data.lessonPlayerSource ?? "";
  if (player && /completeCultureBridge[\s\S]{0,400}ensureSrs/.test(player)) {
    fail("SRS_LEAK", "culture bridge must not touch lexical SRS");
  }

  const bargainingMission = (missions ?? []).find((row) => row.cultureItemId === "bargaining-context");
  if (!bargainingMission) fail("CULTURE", "bargaining-context mission missing");
  else {
    const teach = (bargainingMission.steps ?? []).findIndex((step) => step.kind === "culture_teach");
    const scored = (bargainingMission.steps ?? []).findIndex(
      (step) =>
        ["scenario_choice", "dialogue_choice", "culture_recall"].includes(step.kind) &&
        step.scored !== false &&
        step.role !== "demo"
    );
    if (scored >= 0 && (teach < 0 || teach >= scored)) fail("TEACH_AFTER_TEST", "bargaining tested before explanation");
  }

  const mai = (hanziMemoryTargets ?? []).find((item) => item.glyph === "买");
  if (!mai) fail("DELAYED_RECALL", "CORE 买 missing");
  else {
    const introIndex = (lessons ?? []).findIndex((lesson) => lesson.id === mai.introduceLessonId);
    const delayedOk = (mai.delayedLessonIds ?? []).some((id) => {
      const lesson = (lessons ?? []).find((item) => item.id === id);
      const index = (lessons ?? []).findIndex((item) => item.id === id);
      if (!lesson || index <= introIndex) return false;
      const inSteps = (lesson.steps ?? []).some((step) => {
        if (step.charId === "mai_buy") return true;
        const blob = [step.text, step.hanzi, step.audioText, step.correctAnswer, step.answer, ...(step.options ?? [])].join("");
        return blob.includes("买");
      });
      const inReview = (lesson.reviewItems ?? []).includes("char:mai_buy");
      return inSteps || inReview;
    });
    if (!delayedOk) fail("DELAYED_RECALL", "买 without delayed recall");
  }

  if (!String(bargaining?.titleEn ?? "").trim() || !String(bargaining?.summaryEn ?? "").trim() || !String(bargaining?.bodyEn ?? "").trim()) {
    fail("MISSING_EN", "bargaining-context missing English");
  }
  const bargainingBridgeEn = (bridges ?? []).find((bridge) => bridge.cultureItemId === "bargaining-context");
  if (bargainingBridgeEn && (!String(bargainingBridgeEn.explanation?.en ?? "").trim() || !String(bargainingBridgeEn.prompt?.en ?? "").trim())) {
    fail("MISSING_EN", "bargaining bridge missing English");
  }

  const decision = validateConversationDecisions(data);
  for (const item of decision.failures) failures.push(item);

  return { failures, capabilities: CAPABILITIES, evidence, surfaces };
}
