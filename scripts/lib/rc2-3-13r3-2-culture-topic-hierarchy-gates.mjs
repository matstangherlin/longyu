/**
 * Pure checkers for gate:rc2-3-13r3-2-culture-topic-hierarchy
 * and validate:culture-topic-hierarchy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const CANONICAL_PATH_IDS = [
  "vida_cotidiana",
  "etiqueta_relacoes",
  "comida_mesa",
  "familia",
  "escola_universidade",
  "trabalho",
  "cidades_transporte",
  "china_digital",
  "festivais",
  "historia_simbolos",
  "china_contemporanea",
  "diferencas_regionais",
];

/** Expected topic → path membership (exactly one topic per path). */
export const EXPECTED_TOPIC_MAP = {
  vida_cotidiana: ["vida_cotidiana"],
  relacoes_etiqueta: ["etiqueta_relacoes", "familia"],
  comida_celebracoes: ["comida_mesa", "festivais"],
  escola_trabalho: ["escola_universidade", "trabalho"],
  cidades_digital: ["cidades_transporte", "china_digital"],
  historia_china: ["historia_simbolos"],
  china_contemporanea: ["china_contemporanea", "diferencas_regionais"],
};

export const STALE_348_APK_SHA256 =
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af";

export function loadR32Sources() {
  return {
    topics: read("src/data/cultureTopicGroups.ts"),
    paths: read("src/data/culturePaths.ts"),
    deep: read("src/data/cultureDeepSchema.ts"),
    culture: read("src/data/culture.ts"),
    native: read("src/data/cultureNative.ts"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    topicCard: read("src/features/culture/CultureTopicCard.tsx"),
    topicDetail: read("src/features/culture/CultureTopicDetailPage.tsx"),
    cultureHub: read("src/features/culture/CultureHubPage.tsx"),
    routes: read("src/routes.tsx"),
    shell: read("src/components/progression/ProgressionShell.tsx"),
    shellState: read("src/lib/progressionShellState.ts"),
    techEvents: read("src/lib/techEvents.ts"),
    freeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    gateRegistry: read("docs/release/gate-registry.json"),
    certification: read("docs/release/rc2-3-13r3-2-certification.json"),
    report: read("docs/reports/rc2-3-13r3-2-culture-topic-hierarchy.md"),
    productTruth: read("docs/release/product-truth.json"),
    finalRc: read("docs/release/final-pre-beta-rc.json"),
    pt: read("src/locales/pt-BR.ts"),
    en: read("src/locales/en.ts"),
    nextContinue: read("src/features/lesson/nextJourneyContinue.ts"),
    inventory: read("docs/culture/culture-v2-inventory.json"),
  };
}

function extractPathIdsFromTopicBlock(topicsSrc, topicId) {
  const re = new RegExp(
    `id:\\s*"${topicId}"[\\s\\S]*?pathIds:\\s*\\[([\\s\\S]*?)\\]`,
    "m",
  );
  const m = topicsSrc.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
}

export function checkTopicGrouping(src = loadR32Sources()) {
  const errors = [];
  if (!/CULTURE_TOPIC_GROUPS/.test(src.topics)) errors.push("TOPIC_GROUPS_MISSING");
  if (!/assertCultureTopicHierarchy/.test(src.topics)) errors.push("HIERARCHY_ASSERT_MISSING");

  const topicIds = Object.keys(EXPECTED_TOPIC_MAP);
  if (topicIds.length < 6 || topicIds.length > 8) errors.push("TOPIC_COUNT_OUT_OF_RANGE");

  const membership = new Map();
  for (const [topicId, expectedPaths] of Object.entries(EXPECTED_TOPIC_MAP)) {
    if (!new RegExp(`id:\\s*"${topicId}"`).test(src.topics)) {
      errors.push("TOPIC_MISSING");
      continue;
    }
    const got = extractPathIdsFromTopicBlock(src.topics, topicId);
    if (!got || got.length === 0) {
      errors.push("EMPTY_TOPIC");
      continue;
    }
    if (got.length !== expectedPaths.length || expectedPaths.some((p) => !got.includes(p))) {
      errors.push("TOPIC_PATH_MISMATCH");
    }
    for (const pathId of got) {
      if (membership.has(pathId)) errors.push("DUPLICATE_CULTURE_PATH_MEMBERSHIP");
      else membership.set(pathId, topicId);
    }
  }

  for (const pathId of CANONICAL_PATH_IDS) {
    if (!membership.has(pathId)) errors.push("UNMAPPED_CULTURE_PATH");
  }

  // Do not expose 12 root cards = one card per path.
  const cardCount = (src.cultureJourney.match(/CultureTopicCard/g) || []).length;
  if (cardCount < 1) errors.push("TOPIC_CARD_MISSING");
  if (/CULTURE_V2_PATHS\.map/.test(src.cultureJourney)) errors.push("ROOT_EXPOSES_ALL_PATHS");

  return [...new Set(errors)];
}

export function checkRootUx(src = loadR32Sources()) {
  const errors = [];
  if (!/data-culture-topic-hub="true"/.test(src.cultureJourney)) {
    errors.push("TOPIC_HUB_MARKER_MISSING");
  }
  if (/culture-path-picker-toggle/.test(src.cultureJourney)) {
    errors.push("TROCAR_DE_CAMINHO_RESTORED");
  }
  if (/culture-path-picker(?!-)/.test(src.cultureJourney) && /role="listbox"/.test(src.cultureJourney)) {
    errors.push("ROOT_HORIZONTAL_PATH_SELECTOR");
  }
  if (/culture-path-chip-/.test(src.cultureJourney)) {
    errors.push("ROOT_HORIZONTAL_PATH_SELECTOR");
  }
  if (/ProgressionPath/.test(src.cultureJourney) || /culture-path-bubbles(?!-)/.test(src.cultureJourney)) {
    // Allow data-culture-path-bubbles="false" marker only.
    if (/<ProgressionPath/.test(src.cultureJourney)) {
      errors.push("ROOT_PROGRESSION_BUBBLES");
    }
  }
  if (/t\("progression\.switchPath"\)/.test(src.cultureJourney)) {
    errors.push("TROCAR_DE_CAMINHO_RESTORED");
  }
  // Active PT string must not appear as learner-facing CTA on root (locale key may remain for history).
  if (/Trocar de caminho/.test(src.cultureJourney)) {
    errors.push("TROCAR_DE_CAMINHO_RESTORED");
  }
  if (!/culture-topic-grid/.test(src.cultureJourney)) errors.push("TOPIC_GRID_MISSING");
  if (!/exploreByTopic/.test(src.cultureJourney)) errors.push("EXPLORE_BY_TOPIC_MISSING");
  if (!/culture-next-cta/.test(src.cultureJourney)) errors.push("CONTINUE_CTA_MISSING");
  if (!/continueLearning|startCulture/.test(src.cultureJourney)) {
    errors.push("CONTINUE_CARD_MISSING");
  }
  // Half-cut horizontal carousel forbidden.
  if (/overflow-x-auto/.test(src.cultureJourney) && /culture-path/.test(src.cultureJourney)) {
    errors.push("ROOT_HORIZONTAL_OVERFLOW_RISK");
  }
  return [...new Set(errors)];
}

export function checkTopicDetail(src = loadR32Sources()) {
  const errors = [];
  if (!/CultureTopicDetailPage/.test(src.topicDetail + src.routes)) {
    errors.push("TOPIC_DETAIL_MISSING");
  }
  if (!/cultura\/topico\/:topicId/.test(src.routes)) errors.push("TOPIC_ROUTE_MISSING");
  if (!/<ProgressionPath/.test(src.topicDetail)) errors.push("DETAIL_BUBBLES_MISSING");
  if (!/culture-topic-back/.test(src.topicDetail)) errors.push("TOPIC_BACK_MISSING");
  if (!/culture-topic-continue/.test(src.topicDetail)) errors.push("TOPIC_CONTINUE_MISSING");
  if (!/culture-subtopic-/.test(src.topicDetail)) errors.push("SUBTOPIC_SECTIONS_MISSING");
  if (!/from=\$\{encodeURIComponent/.test(src.topicDetail) && !/from=\$\{encodeURIComponent/.test(src.cultureJourney)) {
    errors.push("NODE_RETURN_TOPIC_MISSING");
  }
  if (!/writeCultureTopicId/.test(src.topicDetail + src.shellState + src.cultureJourney)) {
    errors.push("TOPIC_MEMORY_MISSING");
  }
  if (!/readCultureTopicScroll|writeCultureTopicScroll/.test(src.shellState + src.topicDetail)) {
    errors.push("TOPIC_SCROLL_MEMORY_MISSING");
  }
  if (!/cultureRestoreHref|readCultureTopicId/.test(src.shell)) {
    errors.push("JOURNEY_CULTURE_RESTORE_MISSING");
  }
  return [...new Set(errors)];
}

export function checkContentConservation(src = loadR32Sources()) {
  const errors = [];
  for (const id of CANONICAL_PATH_IDS) {
    if (!new RegExp(`id:\\s*"${id}"`).test(src.paths)) errors.push("CULTURE_PATH_COUNT_DRIFT");
  }
  if ((src.paths.match(/id:\s*"[a-z_]+"/g) || []).length < 12) {
    errors.push("CULTURE_PATH_COUNT_DRIFT");
  }
  if (!/RC2_EXPECTED_CULTURE_ITEMS\s*=\s*36/.test(src.freeze)) {
    errors.push("CULTURE_ITEM_COUNT_DRIFT");
  }
  if (!/RC2_EXPECTED_CULTURE_NATIVE_LESSONS\s*=\s*36/.test(src.freeze)) {
    errors.push("CULTURE_NATIVE_COUNT_DRIFT");
  }
  if (!/culturePaths:\s*12/.test(src.freeze)) {
    errors.push("CULTURE_PATH_COUNT_DRIFT");
  }
  if (!/FLAGSHIP_DEEP/.test(src.deep)) errors.push("FLAGSHIP_CONTENT_MISSING");
  // Grouping must reference paths, not duplicate orderedNodeIds blocks as new content.
  if (/orderedNodeIds:\s*\[/.test(src.topics)) errors.push("GROUPING_DUPLICATES_NODES");
  if (!/pathIds:\s*\[/.test(src.topics)) errors.push("GROUPING_MISSING_PATH_REFS");
  return [...new Set(errors)];
}

export function checkProgressMigration(src = loadR32Sources()) {
  const errors = [];
  if (!/migrateCulturePathToTopic/.test(src.topics + src.cultureJourney)) {
    errors.push("PATH_MIGRATION_MISSING");
  }
  if (!/resolveCultureContinuation/.test(src.topics + src.cultureJourney)) {
    errors.push("CONTINUE_RESOLUTION_MISSING");
  }
  if (!/cultureTopicProgress/.test(src.topics + src.topicCard + src.topicDetail)) {
    errors.push("TOPIC_PROGRESS_AGGREGATION_MISSING");
  }
  // Progress must count nodes, not path count alone.
  if (!/orderedNodeIds/.test(src.topics) && !/cultureTopicPaths/.test(src.topics)) {
    errors.push("TOPIC_PROGRESS_MISCOUNTED");
  }
  return [...new Set(errors)];
}

export function checkAccessibilityAndMotion(src = loadR32Sources()) {
  const errors = [];
  if (!/aria-label=\{a11y\}/.test(src.topicCard) && !/aria-label=/.test(src.topicCard)) {
    errors.push("TOPIC_CARD_A11Y_MISSING");
  }
  if (!/motion-reduce/.test(src.topicCard)) errors.push("REDUCED_MOTION_IGNORED");
  if (!/min-h-\[110px\]|min-h-11/.test(src.topicCard)) errors.push("TOPIC_CARD_TOUCH_TARGET");
  if (!/type-card-title/.test(src.topicCard)) errors.push("TYPOGRAPHY_TOKEN_MISSING");
  return [...new Set(errors)];
}

export function checkFreezeAndRelease(src = loadR32Sources()) {
  const errors = [];
  if (!/PRE_BETA_FREEZE_EXCEPTION_R32/.test(src.freeze)) {
    errors.push("FREEZE_EXCEPTION_MISSING");
  }
  if (!/OWNER_APPROVED_CULTURE_INFORMATION_ARCHITECTURE/.test(src.freeze + src.certification + src.report)) {
    errors.push("FREEZE_REASON_MISSING");
  }
  if (!/"gate:rc2-3-13r3-2-culture-topic-hierarchy"/.test(src.packageJson)) {
    errors.push("R32_GATE_MISSING");
  }
  if (!/"validate:culture-topic-hierarchy"/.test(src.packageJson)) {
    errors.push("HIERARCHY_VALIDATE_MISSING");
  }
  if (!/gate:rc2-3-13r3-2-culture-topic-hierarchy/.test(src.gateRegistry)) {
    errors.push("GATE_REGISTRY_MISSING");
  }
  if (!src.certification || src.certification.length < 40) errors.push("CERT_MISSING");
  if (!src.report || src.report.length < 40) errors.push("REPORT_MISSING");
  if (!/cultureHierarchy/.test(src.certification)) errors.push("CERT_HIERARCHY_SECTION_MISSING");
  if (!/STALE|stale/.test(src.certification + src.report)) errors.push("OLD_APK_NOT_MARKED_STALE");
  if (new RegExp(`"apkSha256"\\s*:\\s*"${STALE_348_APK_SHA256}"`).test(src.certification)) {
    errors.push("OLD_348_APK_ACCEPTED");
  }
  if (/PHYSICAL_PASS/.test(src.certification) && /"physical"[\\s\\S]*PHYSICAL_PASS/.test(src.certification)) {
    // physical must not auto-pass from hosted
    if (!/NOT_RUN|OWNER_PENDING|PENDING/.test(src.certification)) {
      errors.push("PHYSICAL_AUTO_PASS");
    }
  }
  if (!/culture_topic_opened/.test(src.techEvents)) errors.push("TELEMETRY_TOPIC_OPEN_MISSING");
  if (!/culture_root_returned/.test(src.techEvents)) errors.push("TELEMETRY_ROOT_RETURN_MISSING");
  return [...new Set(errors)];
}

export function checkLocales(src = loadR32Sources()) {
  const errors = [];
  for (const key of [
    "continueLearning",
    "startCulture",
    "exploreByTopic",
    "topicProgress",
    "continueTopic",
    "backToCultureRoot",
  ]) {
    if (!new RegExp(`${key}:`).test(src.pt)) errors.push("PT_LOCALE_MISSING");
    if (!new RegExp(`${key}:`).test(src.en)) errors.push("EN_LOCALE_MISSING");
  }
  return [...new Set(errors)];
}

export function checkAll(src = loadR32Sources()) {
  return [
    ...checkTopicGrouping(src),
    ...checkRootUx(src),
    ...checkTopicDetail(src),
    ...checkContentConservation(src),
    ...checkProgressMigration(src),
    ...checkAccessibilityAndMotion(src),
    ...checkFreezeAndRelease(src),
    ...checkLocales(src),
  ];
}
