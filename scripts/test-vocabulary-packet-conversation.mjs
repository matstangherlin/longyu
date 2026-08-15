/**
 * test:vocabulary-packet-conversation
 *
 * Garante que questions/answers/conversationIntents dos packets V3.7
 * alimentam a seleção de diálogos (troca de frases).
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const fail = (m) => errors.push(m);
const assert = (c, m) => {
  if (!c) fail(m);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-packet-conv-"));
try {
  const program = ts.createProgram(
    [
      "src/data/vocabularyPacketConversation.ts",
      "src/data/vocabularyPacketsV37.ts",
      "src/data/conversationScenes.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar vocabularyPacketConversation.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const {
    matchVocabularyPacketsForRefs,
    preferredSceneIntentsForRefs,
    buildPacketPhraseExchangeScene,
    buildPacketPhraseExchangeCandidates,
    isPacketExchangeSceneId,
  } = load("src/data/vocabularyPacketConversation.js");
  const { vocabularyPacketById } = load("src/data/vocabularyPacketsV37.js");
  const { scoreConversationScene, conversationSceneStats } = load("src/data/conversationScenes.js");

  const greetFocus = new Set(["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao"]);
  const matched = matchVocabularyPacketsForRefs(greetFocus);
  assert(matched.some((p) => p.id === "greetings"), "greetings packet deve casar com foco de cumprimento");
  const intents = preferredSceneIntentsForRefs(greetFocus);
  assert(intents.has("greet") || intents.has("ask-wellbeing"), "intents de cumprimento preferidos");

  const greetings = vocabularyPacketById.greetings;
  const scene = buildPacketPhraseExchangeScene(greetings, {
    lessonRefs: greetFocus,
    knownRefs: greetFocus,
  });
  assert(scene, "deve gerar cena de troca a partir do packet greetings");
  assert(isPacketExchangeSceneId(scene.sceneId), "sceneId packet-exchange-*");
  assert(scene.nodes?.length >= 6, "cena com várias falas");
  const stats = conversationSceneStats(scene);
  assert(stats.interactionCount >= 2, `troca de frases precisa de ≥2 intervenções (tem ${stats.interactionCount})`);
  const chooseReplies = (scene.nodes ?? []).filter((n) => n.interaction?.type === "choose_reply");
  assert(chooseReplies.length >= 2, "dois choose_reply (pergunta → resposta)");
  for (const node of chooseReplies) {
    assert(node.interaction.options?.includes(node.interaction.correctAnswer), "resposta nas opções");
  }

  const foodPacket = vocabularyPacketById.food_drink ?? vocabularyPacketById.restaurant;
  assert(foodPacket?.questions?.length > 0, "packet food_drink/restaurant com perguntas");
  const foodRefs = new Set([...(foodPacket?.core ?? []), ...(foodPacket?.productive ?? []), ...(foodPacket?.support ?? [])]);
  const foodScene = buildPacketPhraseExchangeScene(foodPacket, {
    lessonRefs: foodRefs,
    knownRefs: foodRefs,
  });
  assert(foodScene, "packet food_drink/restaurant deve gerar troca de frases");
  assert(
    foodScene.nodes.some((n) => n.interaction?.prompt?.includes("Mei pergunta")),
    "prompt de troca de frases"
  );

  for (const id of ["weather", "technology", "food", "repair"]) {
    const packet = vocabularyPacketById[id];
    const refs = new Set([...(packet.core ?? []), ...(packet.support ?? []), ...(packet.productive ?? [])]);
    const built = buildPacketPhraseExchangeScene(packet, { lessonRefs: refs, knownRefs: refs });
    assert(built, `packet ${id} deve gerar troca de frases`);
  }

  const lessonInfo = {
    focusRefs: greetFocus,
    reviewRefs: new Set(),
    preferredPacketIntents: intents,
  };
  const authoredLike = {
    kind: "conversation_scene",
    sceneId: "primeiro-cumprimento",
    title: "t",
    intent: "greet",
    setting: "school",
    characters: scene.characters,
    lines: [],
    learnedRefs: ["chunk:nihao"],
    nodes: scene.nodes,
  };
  const scoreAligned = scoreConversationScene(authoredLike, lessonInfo, {});
  const scoreOther = scoreConversationScene(
    { ...authoredLike, intent: "point-nature", sceneId: "other" },
    lessonInfo,
    {}
  );
  assert(scoreAligned > scoreOther, "intent alinhado ao packet deve pontuar mais");

  const packetScore = scoreConversationScene(scene, lessonInfo, {});
  assert(
    scoreAligned > packetScore,
    "cena autoral alinhada deve vencer packet-exchange no desempate"
  );

  const candidates = buildPacketPhraseExchangeCandidates(greetFocus, new Set(), {
    knownRefs: greetFocus,
    limit: 2,
  });
  assert(candidates.length >= 1, "candidatos de packet no pool");

  if (errors.length) {
    console.error("ERRO: test:vocabulary-packet-conversation falhou:");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log(
    `OK: test:vocabulary-packet-conversation (${candidates.length} candidato(s), ${stats.interactionCount} intervenções na troca greetings).`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
