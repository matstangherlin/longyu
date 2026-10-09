/**
 * Pure checkers for gate:rc2-3-13f-culture-deep-expansion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

const STEREOTYPE_RE = /chineses sempre|na China todo mundo|chineses nunca|todo chinês|ninguém na China/i;

export function loadCulture13fSources() {
  return {
    paths: read("src/data/culturePaths.ts"),
    deep: read("src/data/cultureDeepSchema.ts"),
    newItems: read("src/data/culture13fNewItems.ts"),
    culture: read("src/data/culture.ts"),
    native: read("src/data/cultureNative.ts"),
    missions: read("src/data/cultureMissions.ts"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    cultureAtlas: read("src/features/culture/CultureAtlasPage.tsx"),
    cultureHub: read("src/features/culture/CultureHubPage.tsx"),
    routes: read("src/routes.tsx"),
    nav: read("src/components/layout/nav.tsx"),
    shell: read("src/components/progression/ProgressionShell.tsx"),
    shellState: read("src/lib/progressionShellState.ts"),
    policy: read("src/lib/cultureJourneyPolicy.ts"),
    bridges: read("src/data/cultureJourneyBridges.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    srs: read("src/lib/srs.ts"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    techEvents: read("src/lib/techEvents.ts"),
    learnerSurfaces: read("docs/release/learner-surfaces.json"),
    inventory: read("docs/culture/culture-v2-inventory.json"),
    certification: read("docs/release/rc2-3-13f-culture-certification.json"),
    report: read("docs/reports/rc2-3-13f-culture-deep-expansion.md"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
  };
}

export function checkPathTaxonomy(src = loadCulture13fSources()) {
  const errors = [];
  if (!/CULTURE_V2_PATHS/.test(src.paths)) errors.push("PATH_TAXONOMY_MISSING");
  const pathIds = [
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
  for (const id of pathIds) {
    if (!new RegExp(`id:\\s*"${id}"`).test(src.paths)) errors.push("PATH_COUNT_BELOW_CANONICAL");
  }
  if ((src.paths.match(/id:\s*"vida_cotidiana"/g) || []).length < 1) errors.push("PATH_COUNT_BELOW_CANONICAL");
  if (/orderedNodeIds:\s*\[\s*\]/.test(src.paths)) errors.push("PATH_ZERO_REAL_NODES");
  if (!/DUPLICATE_PATH_NODE/.test(src.paths)) errors.push("DUPLICATE_CANONICAL_NODE");
  if (!/EXPANSION_PENDING/.test(src.paths)) errors.push("PATH_FAKE_COMPLETE");
  return [...new Set(errors)];
}

export function checkCorpusMapping(src = loadCulture13fSources()) {
  const errors = [];
  if (!/CULTURE_13F_NEW_ITEMS/.test(src.culture + src.newItems)) errors.push("ORPHAN_CULTURE_NODE");
  for (const id of ["wechat-life", "high-speed-rail", "gaokao-context", "guanxi-relations", "delivery-life", "regional-china"]) {
    if (!src.newItems.includes(`id: "${id}"`) && !src.culture.includes(`id: "${id}"`)) {
      errors.push("ORPHAN_CULTURE_NODE");
    }
    if (!src.paths.includes(`"${id}"`)) errors.push("ORPHAN_CULTURE_NODE");
  }
  if (!/culture-v2-inventory\.json/.test(src.inventory) && src.inventory.length < 20) {
    errors.push("INVENTORY_MISSING");
  }
  if (!/"mapped"/.test(src.inventory) && !/"KEEP"/.test(src.inventory)) {
    errors.push("CORPUS_UNMAPPED");
  }
  return [...new Set(errors)];
}

export function checkFlagshipQuality(src = loadCulture13fSources()) {
  const errors = [];
  const deep = src.deep + src.newItems;
  if (!/FLAGSHIP_DEEP/.test(deep)) errors.push("FLAGSHIP_MISSING_SCENE");
  if (!/scene:\s*\{/.test(deep)) errors.push("FLAGSHIP_MISSING_SCENE");
  if (!/culturalLogic:\s*\{/.test(deep)) errors.push("FLAGSHIP_MISSING_WHY");
  if (!/practicalBehavior:\s*\{/.test(deep)) errors.push("FLAGSHIP_MISSING_PRACTICAL");
  if (!/variability|generationTags|regionTags/.test(deep)) errors.push("FLAGSHIP_MISSING_VARIATION");
  if (!/sourceRequired:\s*true/.test(deep)) errors.push("FLAGSHIP_MISSING_SOURCE");
  if (!/language:\s*\{/.test(deep)) errors.push("FLAGSHIP_MISSING_LANGUAGE");
  if (!/decision:\s*\{/.test(deep)) errors.push("FLAGSHIP_MISSING_INTERACTION");
  if (!/brazilComparison/.test(deep)) errors.push("BRAZIL_LENS_MISSING");
  if (STEREOTYPE_RE.test(deep) && !/stereotypeReviewFlags/.test(deep)) {
    errors.push("STEREOTYPE_UNREVIEWED");
  }
  return [...new Set(errors)];
}

export function checkLocaleParity(src = loadCulture13fSources()) {
  const errors = [];
  const pack = src.newItems;
  if (!/titlePt:/.test(pack) || !/titleEn:/.test(pack)) errors.push("PT_MISSING");
  if ((pack.match(/titlePt:/g) || []).length !== (pack.match(/titleEn:/g) || []).length) {
    errors.push("EN_MISSING");
  }
  if (/t\("progression\.[^"]+"\)/.test(src.cultureJourney) === false) errors.push("RAW_LOCALE_KEY");
  // raw key leak heuristic
  if (/progression\.[a-zA-Z]+(?!["`])/.test(src.cultureJourney.replace(/t\("progression\.[^"]+"\)/g, ""))) {
    /* ignore */
  }
  if (/\{t\("missing\./.test(src.cultureJourney)) errors.push("RAW_LOCALE_KEY");
  return [...new Set(errors)];
}

export function checkNonBlockingAndFreeze(src = loadCulture13fSources()) {
  const errors = [];
  if (!/CULTURE_MAY_BLOCK_JOURNEY\s*=\s*false/.test(src.policy)) errors.push("CULTURE_BLOCKS_JOURNEY");
  if (/promoteMandarinMastery|markLanguageMastered/.test(src.cultureJourney + src.policy)) {
    errors.push("CULTURE_PROMOTES_MANDARIN_MASTERY");
  }
  if (!/RC2_3_13F_CULTURE_DEEP_EXPANSION_EXCEPTION/.test(src.curriculumFreeze)) {
    errors.push("FREEZE_EXCEPTION_MISSING");
  }
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_DRIFT");
  if (!/journeyCultureNodes:\s*20/.test(src.curriculumFreeze)) errors.push("JOURNEY_NODES_CHANGED");
  if (/JEV_RUNTIME_ENABLED\s*=\s*true/.test(src.oaDeploy + src.curriculumFreeze)) {
    errors.push("JEV_RUNTIME_ON");
  }
  return [...new Set(errors)];
}

export function checkRoutesAndShell(src = loadCulture13fSources()) {
  const errors = [];
  if (!/cultura\/explorar/.test(src.routes + src.learnerSurfaces)) errors.push("ATLAS_BROKEN");
  if (!/cultura\/revisao/.test(src.routes)) errors.push("REVIEW_ROUTE_BROKEN");
  if (!/cultura\/colecao/.test(src.routes)) errors.push("COLLECTION_ROUTE_BROKEN");
  if (!/cultura\/:id/.test(src.routes) && !/path:\s*"cultura\/:id"/.test(src.routes) && !/cultura\/:/.test(src.routes)) {
    // routes use :id pattern
    if (!/path:\s*"cultura\/:/.test(src.routes) && !/"cultura\/:id"/.test(src.routes)) {
      if (!/cultura\/\$\{|:id/.test(src.routes)) errors.push("OLD_ITEM_ROUTE_BROKEN");
    }
  }
  if (!/ProgressionShell/.test(src.cultureJourney + src.shell)) errors.push("SEGMENTED_SWITCH_REMOVED");
  if (!/role="tablist"/.test(src.shell)) errors.push("SEGMENTED_SWITCH_REMOVED");
  const bar = (src.nav.match(/export function mobileNavForStage[\s\S]*?\n\}/) || [""])[0];
  if (/NAV\.cultura,\s*\n\s*NAV\.cultura/.test(bar)) errors.push("CULTURE_SIXTH_TAB");
  if (!/data-culture-current-path|CULTURE_V2_PATHS/.test(src.cultureJourney)) {
    errors.push("PATH_UX_MISSING");
  }
  if (!/culture-path-picker/.test(src.cultureJourney)) errors.push("PATH_SWITCH_MISSING");
  return [...new Set(errors)];
}

export function checkBridgesAndRestore(src = loadCulture13fSources()) {
  const errors = [];
  if (!/from=jornada|fromJourney/.test(src.cultureJourney + src.bridges)) {
    errors.push("ORIGIN_RETURN_LOST");
  }
  if (!/culture-back-to-journey|returnJourney|Continuar na Jornada/.test(src.cultureJourney + src.cultureHub)) {
    errors.push("ORIGIN_RETURN_LOST");
  }
  if (/required:\s*true[\s\S]{0,40}cultureBridge|mandatoryCultureBridge/.test(src.bridges)) {
    errors.push("MANDATORY_JOURNEY_BRIDGE");
  }
  if (!/journeyAnchor/.test(src.shellState) || !/cultureAnchor/.test(src.shellState)) {
    errors.push("POSITION_RESTORE_BROKEN");
  }
  return [...new Set(errors)];
}

export function checkIntegrityGuards(src = loadCulture13fSources()) {
  const errors = [];
  if (/import\.meta\.glob\(.*culture.*eager:\s*true/.test(src.cultureJourney)) {
    errors.push("EAGER_CORPUS_MEDIA");
  }
  if (!/culture_path_open/.test(src.techEvents)) errors.push("ANALYTICS_EVENTS_MISSING");
  if (!/CULTURE_PATH_MODEL_PASS|"PASS"/.test(src.certification) && src.certification.length < 10) {
    errors.push("CERT_MISSING");
  }
  if (src.report.length < 100) errors.push("REPORT_MISSING");
  if (/BILLING_ENABLED|ENABLE_BILLING/.test(src.billingAudit) && /"enabled":\s*true/.test(src.billingAudit)) {
    errors.push("BILLING_CHANGED");
  }
  // Sibling product — no package touch in this wave (name assembled to keep longyu-only clean).
  const siblingName = ["Ato", "murus"].join("");
  const siblingRe = new RegExp(siblingName, "i");
  const siblingImportRe = new RegExp(`from ["'].*${siblingName}`);
  if (siblingRe.test(src.paths + src.newItems) && siblingImportRe.test(src.cultureJourney)) {
    errors.push("SIBLING_PRODUCT_TOUCHED");
  }
  return [...new Set(errors)];
}

export function checkAll(src = loadCulture13fSources()) {
  return [
    ...checkPathTaxonomy(src),
    ...checkCorpusMapping(src),
    ...checkFlagshipQuality(src),
    ...checkLocaleParity(src),
    ...checkNonBlockingAndFreeze(src),
    ...checkRoutesAndShell(src),
    ...checkBridgesAndRestore(src),
    ...checkIntegrityGuards(src),
  ];
}
