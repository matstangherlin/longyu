import { mainPath, cleanHanzi } from "./conversation-coherence-validation.mjs";

const CJK = /[\u3400-\u9fff]/u;
const GENERIC_REPAIR = "请再说一遍";
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const TEACHING_KINDS = new Set(["listen", "intro", "flashcard", "decompose"]);
const RESTAURANT_SCENE_IDS = ["pedir-cardapio", "revisao-restaurante", "imersao-restaurante"];
const INTEGRATED_RESTAURANT_SCENES = ["pedir-cardapio", "imersao-restaurante"];
const RESTAURANT_LESSON_IDS = ["l26", "l26b", "l26c", "l27"];
const TEACH_GLYPHS = [
  ["char:wei_person", "位"],
  ["chunk:woyaocaidan", "菜单"],
];

const CAPABILITIES = {
  party_size: /一位|两位|几位/,
  menu: /我要菜单/,
  order_food: /我要(?:米饭|饭|这个|菜)/,
  order_drink: /我要(?:一杯茶|水)|我想喝|两杯水/,
  accept_or_refuse: /不要了|我要一杯茶/,
  react_to_food: /好吃/,
  bill: /买单/,
  get_attention: /服务员/,
};

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function taughtBy(step, surfaces) {
  if (step.kind === "listen") return step.text;
  if (step.kind === "flashcard") return surfaces.get("chunk:" + step.chunkId);
  if (step.kind === "decompose") return surfaces.get("char:" + step.charId);
  return undefined;
}

export function validateChinaSurvivalRestaurant(data) {
  const { lessons, scenes, chunks, characters, plans, hanziMemoryTargets, cultureItems } = data;
  const failures = [];
  const evidence = [];
  const fail = (code, message) => failures.push({ code, message });
  const surfaces = new Map([
    ...chunks.map((chunk) => ["chunk:" + chunk.id, chunk.hanzi]),
    ...characters.map((character) => ["char:" + character.id, character.hanzi]),
  ]);

  function independent(step, lessonId, location) {
    const answer = step.kind === "write" || step.kind === "free_production" ? (step.answer ?? step.correctAnswer) : step.correctAnswer;
    const options = [...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? [])];
    const promptBlob = `${step.prompt ?? ""}${step.placeholder ?? ""}${step.body ?? ""}${step.situationPt ?? ""}`;
    if (options.length || CJK.test(promptBlob)) fail("INDEPENDENT", location);
    evidence.push({ lesson: lessonId, location, answer: clean(answer), kind: step.kind ?? "produce_reply" });
  }

  for (const sceneId of RESTAURANT_SCENE_IDS) {
    if (!scenes.some((scene) => scene.sceneId === sceneId)) fail("SCENE", sceneId);
  }

  const mission = lessons.find((lesson) => lesson.id === "l26c");
  if (!mission) fail("SCENE", "l26c missing");
  else {
    if (!mission.isReview) fail("SCENE", "l26c must remain a review/mission lesson");
    if (!/imersão|immersion/i.test(`${mission.id} ${mission.title}`)) fail("SCENE", "l26c must be an immersion lesson");
    if (mission.cultureItemId !== "chopsticks-rest") fail("CULTURE", "l26c needs chopsticks-rest");
    const hasOrder = (mission.steps ?? []).some((step) => step.kind === "free_production" && /我要(?:米饭|饭)/.test(clean(step.answer ?? step.correctAnswer)));
    const hasRefuse = (mission.steps ?? []).some((step) => step.kind === "free_production" && /不要了/.test(clean(step.answer ?? step.correctAnswer)));
    const hasBill = (mission.steps ?? []).some((step) => step.kind === "free_production" && /买单/.test(clean(step.answer ?? step.correctAnswer)));
    if (!hasOrder) fail("CAPABILITY", "order_food independent production missing from mission");
    if (!hasRefuse) fail("CAPABILITY", "accept_or_refuse independent production missing from mission");
    if (!hasBill) fail("CAPABILITY", "bill independent production missing from mission");
    for (const step of mission.steps ?? []) {
      const answer = clean(step.answer ?? step.correctAnswer);
      if (/我要(?:米饭|饭)/.test(answer) && (step.kind !== "free_production" || (step.options ?? []).length || (step.bank ?? []).length)) {
        fail("INDEPENDENT", "mission order is not independent production");
      }
    }
    if (!(mission.steps ?? []).some((step) => step.sceneId === "imersao-restaurante")) fail("SCENE", "mission without imersao-restaurante");
  }

  const l26b = lessons.find((lesson) => lesson.id === "l26b");
  if (l26b) {
    const taught = new Set();
    for (const [index, step] of (l26b.steps ?? []).entries()) {
      const at = `l26b/${index + 1}`;
      const text = clean(taughtBy(step, surfaces));
      if (text) {
        for (const [ref, surface] of surfaces) {
          if (text.includes(clean(surface))) taught.add(ref);
        }
      }
      if (AUDIO_KINDS.has(step.kind)) {
        if (!step.audioText) fail("NO_AUDIO", at);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && step.audioText && field.includes(step.audioText)) fail("TARGET_LEAK", `${at}: ${field}`);
        }
      }
      if (step.kind === "free_production" || (step.kind === "write" && step.mode !== "free_reflection")) {
        if (l26b.id === "l26b") {
          evidence.push({ lesson: "l26b", location: at, answer: clean(step.answer ?? step.correctAnswer), kind: step.kind });
        } else independent(step, "l26b", at);
      }
      if (step.kind === "conversation_scene") {
        const scene = scenes.find((item) => item.sceneId === step.sceneId);
        if (!scene) fail("SCENE", at);
        else {
          for (const node of scene.nodes ?? []) {
            const answer = clean(node.interaction?.correctAnswer ?? "");
            if (!TEACHING_KINDS.has(step.kind)) {
              for (const [ref, glyph] of TEACH_GLYPHS) {
                if (answer.includes(glyph) && !taught.has(ref) && ![...taught].some((item) => clean(surfaces.get(item) ?? "").includes(glyph))) {
                  fail("TEACH_BEFORE_TEST", `${at}/${node.id}: ${ref}`);
                }
              }
            }
            if (node.interaction?.type === "produce_reply") independent(node.interaction, "l26b", `${at}/${node.id}`);
          }
        }
      } else if (!TEACHING_KINDS.has(step.kind)) {
        const tested = String(step.hanzi ?? step.answer ?? step.correctAnswer ?? (step.target ?? []).join(""));
        for (const [ref, glyph] of TEACH_GLYPHS) {
          if (tested.includes(glyph) && !taught.has(ref) && ![...taught].some((item) => clean(surfaces.get(item) ?? "").includes(glyph))) {
            fail("TEACH_BEFORE_TEST", `${at}: ${ref}`);
          }
        }
      }
    }
  }

  for (const lesson of lessons.filter((item) => RESTAURANT_LESSON_IDS.includes(item.id))) {
    for (const step of lesson.steps ?? []) {
      if (AUDIO_KINDS.has(step.kind)) {
        if (!step.audioText) fail("NO_AUDIO", `${lesson.id}/${step.kind}`);
        for (const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
          if (typeof field === "string" && step.audioText && field.includes(step.audioText)) {
            fail("TARGET_LEAK", `${lesson.id}: ${field}`);
          }
        }
      }
      if (step.kind === "free_production") {
        if (lesson.id === "l26c") independent(step, lesson.id, `${lesson.id}/free_production`);
        else evidence.push({ lesson: lesson.id, location: `${lesson.id}/free_production`, answer: clean(step.answer ?? step.correctAnswer), kind: step.kind });
      }
    }
    if (lesson.id === "l26c") {
      for (const plan of plans[lesson.id] ?? []) {
        for (const [index, step] of plan.entries()) {
          if (step.kind === "free_production" || (step.kind === "write" && step.mode !== "free_reflection")) {
            independent(step, lesson.id, `${lesson.id}/plan/${index + 1}`);
          }
        }
      }
    }
  }

  const listen = (mission?.steps ?? []).find((step) => step.kind === "listen_select" && step.audioText === "请问几位？");
  if (!listen) fail("CAPABILITY", "party_size listening missing");
  else {
    if ((listen.options ?? []).some((option) => String(option).includes("请问几位"))) fail("TARGET_LEAK", "listen options leak target");
    if (!(listen.options ?? []).some((option) => /quantas pessoas/i.test(String(option)))) fail("CAPABILITY", "party_size listen options");
  }
  if (!(mission?.steps ?? []).some((step) => step.kind === "audio_discrimination")) fail("CAPABILITY", "contextual audio discrimination missing");

  const restaurantScenes = scenes.filter((scene) => RESTAURANT_SCENE_IDS.includes(scene.sceneId));
  for (const scene of restaurantScenes) {
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    for (const node of path) {
      if (node.interaction?.type === "produce_reply") independent(node.interaction, scene.sceneId, `${scene.sceneId}/${node.id}`);
      const answer = clean(node.interaction?.correctAnswer ?? "");
      if (answer) evidence.push({ lesson: scene.sceneId, location: node.id, answer, kind: node.interaction?.type ?? "npc" });
    }
  }

  for (const sceneId of INTEGRATED_RESTAURANT_SCENES) {
    const scene = scenes.find((item) => item.sceneId === sceneId);
    if (!scene) continue;
    const path = mainPath(scene.nodes ?? [], scene.entryNodeId);
    const repairs = [];
    let riceEcho = false;
    for (let index = 0; index < path.length; index += 1) {
      const node = path[index];
      if (!node.interaction) continue;
      const wrong = node.interaction.wrongNextNodeId;
      const repairNode = (scene.nodes ?? []).find((item) => item.id === wrong);
      if (repairNode?.hanzi) repairs.push(cleanHanzi(repairNode.hanzi));
      const answer = clean(node.interaction.correctAnswer ?? "");
      if (/我要米饭/.test(answer)) {
        const answerNode = path.find((item) => item.id === node.interaction.correctNextNodeId);
        const after = path[path.indexOf(answerNode) + 1];
        if (after && clean(after.hanzi).includes("米饭")) riceEcho = true;
      }
    }
    if (!riceEcho) fail("BROKEN_CONTINUITY", `${sceneId}: NPC does not echo 米饭 after the order`);
    const uniqueRepairs = [...new Set(repairs.filter(Boolean))];
    if (uniqueRepairs.length && uniqueRepairs.every((item) => item === GENERIC_REPAIR)) {
      fail("GENERIC_REPAIR", `${sceneId}: every repair is 请再说一遍`);
    }
    if (uniqueRepairs.length <= 1 && uniqueRepairs[0] === GENERIC_REPAIR) {
      fail("GENERIC_REPAIR", `${sceneId}: generic repair only`);
    }
  }

  const capabilities = Object.fromEntries(
    Object.entries(CAPABILITIES).map(([id, pattern]) => {
      const hits = evidence.filter((item) => pattern.test(item.answer));
      if (!hits.length) fail("CAPABILITY", id);
      return [id, hits];
    })
  );

  const independentOrder = evidence.filter((item) => item.kind === "free_production" || item.kind === "produce_reply" || item.kind === "write");
  if (!independentOrder.some((item) => CAPABILITIES.order_food.test(item.answer))) fail("CAPABILITY", "order_food independent");
  if (!independentOrder.some((item) => CAPABILITIES.accept_or_refuse.test(item.answer))) fail("CAPABILITY", "accept_or_refuse independent");
  if (!independentOrder.some((item) => CAPABILITIES.bill.test(item.answer))) fail("CAPABILITY", "bill independent");

  const lessonById = new Map((lessons ?? []).map((lesson) => [lesson.id, lesson]));
  for (const lesson of lessons.filter((item) => RESTAURANT_LESSON_IDS.includes(item.id))) {
    if (!lesson.cultureItemId) continue;
    const item = (cultureItems ?? []).find((row) => row.id === lesson.cultureItemId);
    if (!item) fail("CULTURE", `${lesson.id}: ${lesson.cultureItemId} missing`);
    else {
      for (const related of item.relatedLessonIds ?? []) {
        if (!lessonById.has(related)) fail("CULTURE", `${item.id} relatedLessonId ${related} does not exist`);
      }
    }
  }

  const cai = (hanziMemoryTargets ?? []).find((item) => item.glyph === "菜");
  if (!cai) fail("DELAYED_RECALL", "CORE 菜 missing");
  else {
    const introIndex = lessons.findIndex((lesson) => lesson.id === cai.introduceLessonId);
    const delayedOk = (cai.delayedLessonIds ?? []).some((id) => {
      const lesson = lessonById.get(id);
      const index = lessons.findIndex((item) => item.id === id);
      if (!lesson || index <= introIndex) return false;
      const inSteps = (lesson.steps ?? []).some((step) => {
        if (step.charId === "cai_dish") return true;
        const blob = [step.text, step.hanzi, step.audioText, step.correctAnswer, step.answer, ...(step.options ?? [])].join("");
        return blob.includes("菜");
      });
      const inReview = (lesson.reviewItems ?? []).includes("char:cai_dish");
      return inSteps || inReview;
    });
    if (!delayedOk) fail("DELAYED_RECALL", "菜 without delayed recall");
  }

  return { failures, capabilities, evidence };
}
