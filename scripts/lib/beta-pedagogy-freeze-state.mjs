/** Estado real do repositório para o BETA_PEDAGOGY_FREEZE. */
import fs from "node:fs";
import path from "node:path";
import { loadTs, root } from "./capability-evidence-runtime.mjs";
import { journeyFingerprint } from "./report-meta.mjs";
import { economyExportNames, listSystemModules } from "./beta-pedagogy-freeze.mjs";

export function loadBetaPedagogyFreezeState() {
  const freezeModule = loadTs("src/lib/curriculumFreeze.ts");
  const { ALL_LESSONS } = loadTs("src/data/journey.ts");
  const { CULTURE_ITEMS } = loadTs("src/data/culture.ts");
  const { CULTURE_NATIVE_LESSONS } = loadTs("src/data/cultureLessons.ts");
  const { CULTURE_JOURNEY_PLACEMENT } = loadTs("src/data/cultureNative.ts");
  const { JOURNEY_CULTURE_MOMENTS } = loadTs("src/data/journeyCultureMoments.ts");
  const { TONE_TRANSFER_TASKS } = loadTs("src/data/toneTransfer.ts");
  const { CONVERSATION_CAPABILITIES } = loadTs("src/data/conversationCapabilities.ts");
  const { FEATURE_TRUTH } = loadTs("src/product/featureTruth.ts");
  return {
    freeze: freezeModule.BETA_PEDAGOGY_FREEZE,
    frozenFingerprint: freezeModule.RC_BASE_FINGERPRINT,
    fingerprint: journeyFingerprint(root),
    counts: {
      lessons: ALL_LESSONS.length,
      teachingTopics: ALL_LESSONS.filter((lesson) => !lesson.isReview && !lesson.reviewMasteryMode).length,
      cultureItems: CULTURE_ITEMS.length,
      cultureNativeLessons: CULTURE_NATIVE_LESSONS.length,
      journeyCultureNodes: CULTURE_JOURNEY_PLACEMENT.length,
      cultureMoments: JOURNEY_CULTURE_MOMENTS.length,
      toneTransferPlayable: TONE_TRANSFER_TASKS.length,
      conversationCapabilities: CONVERSATION_CAPABILITIES.length,
      // Declarado; validate:capability-runtime-evidence (K1) garante que o
      // declarado é o calculado a partir do runtime.
      conversationCapabilitiesRuntimeReady: CONVERSATION_CAPABILITIES.filter((cap) => cap.status === "READY").length,
    },
    systemModules: listSystemModules(root),
    economyExports: economyExportNames(fs.readFileSync(path.join(root, "src/data/economy.ts"), "utf8")),
    featureTruthIds: Object.keys(FEATURE_TRUTH),
  };
}
