#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13f-culture-deep-expansion
 */
import {
  checkAll,
  checkPathTaxonomy,
  checkCorpusMapping,
  checkFlagshipQuality,
  checkLocaleParity,
  checkNonBlockingAndFreeze,
  checkRoutesAndShell,
  checkBridgesAndRestore,
  checkIntegrityGuards,
  loadCulture13fSources,
} from "./lib/rc2-3-13f-culture-deep-expansion-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:rc2-3-13f-culture-deep-expansion");
    for (const e of errors.slice(0, 50)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:rc2-3-13f-culture-deep-expansion · 12 paths · flagships · non-blocking · freeze · parity",
  );
}

function expectKill(label, code, run) {
  const errors = run();
  if (!errors.includes(code)) {
    console.error(`KILL MISS ${label} — expected ${code}, got [${errors.join(", ")}]`);
    process.exit(1);
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function test() {
  const base = loadCulture13fSources();

  expectKill("1 path count below canonical", "PATH_COUNT_BELOW_CANONICAL", () =>
    checkPathTaxonomy({ ...base, paths: base.paths.replace(/id:\s*"diferencas_regionais"/, 'id: "x"') }),
  );
  expectKill("2 path zero real nodes", "PATH_ZERO_REAL_NODES", () =>
    checkPathTaxonomy({
      ...base,
      paths: base.paths.replace(/orderedNodeIds:\s*\[[^\]]*\]/, "orderedNodeIds: []"),
    }),
  );
  expectKill("3 orphan culture node", "ORPHAN_CULTURE_NODE", () =>
    checkCorpusMapping({ ...base, paths: base.paths.replace(/"regional-china"/g, '"missing-node"') }),
  );
  expectKill("4 duplicate canonical node", "DUPLICATE_CANONICAL_NODE", () =>
    checkPathTaxonomy({ ...base, paths: base.paths.replace(/DUPLICATE_PATH_NODE/g, "X") }),
  );
  expectKill("5 flagship missing scene", "FLAGSHIP_MISSING_SCENE", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/scene:\s*\{/g, "hook: {"),
      newItems: base.newItems.replace(/scene:\s*\{/g, "hook: {"),
    }),
  );
  expectKill("6 flagship missing why", "FLAGSHIP_MISSING_WHY", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/culturalLogic:\s*\{/g, "logicX: {"),
      newItems: base.newItems.replace(/culturalLogic:\s*\{/g, "logicX: {"),
    }),
  );
  expectKill("7 flagship missing practical", "FLAGSHIP_MISSING_PRACTICAL", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/practicalBehavior:\s*\{/g, "practiceX: {"),
      newItems: base.newItems.replace(/practicalBehavior:\s*\{/g, "practiceX: {"),
    }),
  );
  expectKill("8 flagship missing variation", "FLAGSHIP_MISSING_VARIATION", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/regionTags|generationTags|variability/g, "tagX"),
      newItems: base.newItems.replace(/regionTags|generationTags|variability/g, "tagX"),
    }),
  );
  expectKill("9 flagship missing source", "FLAGSHIP_MISSING_SOURCE", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/sourceRequired:\s*true/g, "sourceRequired: false"),
      newItems: base.newItems.replace(/sourceRequired:\s*true/g, "sourceRequired: false"),
    }),
  );
  expectKill("10 flagship missing language", "FLAGSHIP_MISSING_LANGUAGE", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/language:\s*\{/g, "langX: {"),
      newItems: base.newItems.replace(/language:\s*\{/g, "langX: {"),
    }),
  );
  expectKill("11 flagship missing interaction", "FLAGSHIP_MISSING_INTERACTION", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/decision:\s*\{/g, "choiceX: {"),
      newItems: base.newItems.replace(/decision:\s*\{/g, "choiceX: {"),
    }),
  );
  expectKill("12 PT missing", "PT_MISSING", () =>
    checkLocaleParity({ ...base, newItems: base.newItems.replace(/titlePt:/g, "titleXX:") }),
  );
  expectKill("13 EN missing", "EN_MISSING", () =>
    checkLocaleParity({ ...base, newItems: base.newItems.replace(/titleEn:/g, "titleYY:") }),
  );
  expectKill("14 raw locale key", "RAW_LOCALE_KEY", () =>
    checkLocaleParity({ ...base, cultureJourney: `${base.cultureJourney}\n{t("missing.bad.key")}` }),
  );
  expectKill("15 culture blocks journey", "CULTURE_BLOCKS_JOURNEY", () =>
    checkNonBlockingAndFreeze({
      ...base,
      policy: base.policy.replace(/CULTURE_MAY_BLOCK_JOURNEY\s*=\s*false/, "CULTURE_MAY_BLOCK_JOURNEY = true"),
    }),
  );
  expectKill("16 culture promotes mandarin mastery", "CULTURE_PROMOTES_MANDARIN_MASTERY", () =>
    checkNonBlockingAndFreeze({
      ...base,
      cultureJourney: `${base.cultureJourney}\npromoteMandarinMastery()`,
    }),
  );
  expectKill("17 freeze exception missing", "FREEZE_EXCEPTION_MISSING", () =>
    checkNonBlockingAndFreeze({
      ...base,
      curriculumFreeze: base.curriculumFreeze.replace(/RC2_3_13F_CULTURE_DEEP_EXPANSION_EXCEPTION/g, "X"),
    }),
  );
  expectKill("18 journey nodes changed", "JOURNEY_NODES_CHANGED", () =>
    checkNonBlockingAndFreeze({
      ...base,
      curriculumFreeze: base.curriculumFreeze.replace(/journeyCultureNodes:\s*20/g, "journeyCultureNodes: 99"),
    }),
  );
  expectKill("19 atlas broken", "ATLAS_BROKEN", () =>
    checkRoutesAndShell({
      ...base,
      routes: base.routes.replace(/cultura\/explorar/g, "cultura/x"),
      learnerSurfaces: base.learnerSurfaces.replace(/cultura\/explorar/g, "cultura/x"),
    }),
  );
  expectKill("20 review route broken", "REVIEW_ROUTE_BROKEN", () =>
    checkRoutesAndShell({ ...base, routes: base.routes.replace(/cultura\/revisao/g, "cultura/r") }),
  );
  expectKill("21 collection route broken", "COLLECTION_ROUTE_BROKEN", () =>
    checkRoutesAndShell({ ...base, routes: base.routes.replace(/cultura\/colecao/g, "cultura/c") }),
  );
  expectKill("22 segmented switch removed", "SEGMENTED_SWITCH_REMOVED", () =>
    checkRoutesAndShell({
      ...base,
      shell: base.shell.replace(/role="tablist"/g, 'role="group"'),
      cultureJourney: base.cultureJourney.replace(/ProgressionShell/g, "XShell"),
    }),
  );
  expectKill("23 culture sixth tab", "CULTURE_SIXTH_TAB", () =>
    checkRoutesAndShell({
      ...base,
      nav: base.nav.replace(
        /export function mobileNavForStage[\s\S]*?\n\}/,
        `export function mobileNavForStage() {\n  return [\n    NAV.jornada,\n    NAV.treino,\n    NAV.cultura,\n    NAV.cultura,\n    NAV.missoes,\n    NAV.mais,\n  ];\n}`,
      ),
    }),
  );
  expectKill("24 path ux missing", "PATH_UX_MISSING", () =>
    checkRoutesAndShell({
      ...base,
      cultureJourney: base.cultureJourney.replace(/data-culture-current-path|CULTURE_V2_PATHS/g, "x"),
    }),
  );
  expectKill("25 path switch missing", "PATH_SWITCH_MISSING", () =>
    checkRoutesAndShell({
      ...base,
      cultureJourney: base.cultureJourney.replace(/culture-path-picker/g, "x"),
    }),
  );
  expectKill("26 origin return lost", "ORIGIN_RETURN_LOST", () =>
    checkBridgesAndRestore({
      ...base,
      cultureJourney: base.cultureJourney
        .replace(/fromJourney|from=jornada/g, "x")
        .replace(/culture-back-to-journey|returnJourney/g, "x"),
      cultureHub: base.cultureHub.replace(/culture-back-to-journey|JourneyHandoffBanner/g, "x"),
      bridges: base.bridges.replace(/from=jornada/g, "x"),
    }),
  );
  expectKill("27 position restore broken", "POSITION_RESTORE_BROKEN", () =>
    checkBridgesAndRestore({
      ...base,
      shellState: base.shellState.replace(/journeyAnchor/g, "a").replace(/cultureAnchor/g, "b"),
    }),
  );
  expectKill("28 analytics events missing", "ANALYTICS_EVENTS_MISSING", () =>
    checkIntegrityGuards({ ...base, techEvents: base.techEvents.replace(/culture_path_open/g, "x") }),
  );
  expectKill("29 cert missing", "CERT_MISSING", () =>
    checkIntegrityGuards({ ...base, certification: "" }),
  );
  expectKill("30 report missing", "REPORT_MISSING", () =>
    checkIntegrityGuards({ ...base, report: "x" }),
  );
  expectKill("31 inventory missing", "INVENTORY_MISSING", () =>
    checkCorpusMapping({ ...base, inventory: "" }),
  );
  expectKill("32 corpus unmapped", "CORPUS_UNMAPPED", () =>
    checkCorpusMapping({ ...base, inventory: "{}" }),
  );
  expectKill("33 path fake complete", "PATH_FAKE_COMPLETE", () =>
    checkPathTaxonomy({ ...base, paths: base.paths.replace(/EXPANSION_PENDING/g, "ACTIVE_ONLY") }),
  );
  expectKill("34 brazil lens missing", "BRAZIL_LENS_MISSING", () =>
    checkFlagshipQuality({
      ...base,
      deep: base.deep.replace(/brazilComparison/g, "x"),
      newItems: base.newItems.replace(/brazilComparison/g, "x"),
    }),
  );
  expectKill("35 culture count drift", "CULTURE_COUNT_DRIFT", () =>
    checkNonBlockingAndFreeze({
      ...base,
      curriculumFreeze: base.curriculumFreeze.replace(/cultureItems:\s*36/g, "cultureItems: 30"),
    }),
  );
  expectKill("36 jev runtime on", "JEV_RUNTIME_ON", () =>
    checkNonBlockingAndFreeze({
      ...base,
      oaDeploy: `${base.oaDeploy}\nJEV_RUNTIME_ENABLED = true\n`,
    }),
  );
  expectKill("37 path taxonomy missing", "PATH_TAXONOMY_MISSING", () =>
    checkPathTaxonomy({ ...base, paths: "export const x = 1" }),
  );
  expectKill("38 stereotype unreviewed", "STEREOTYPE_UNREVIEWED", () =>
    checkFlagshipQuality({
      ...base,
      deep: 'chineses sempre\nFLAGSHIP_DEEP\nscene: {\nculturalLogic: {\npracticalBehavior: {\nlanguage: {\ndecision: {\nsourceRequired: true\nregionTags',
      newItems: "",
    }),
  );

  console.log("PASS test:rc2-3-13f-culture-deep-expansion · 38 kills");
}

if (mode === "validate") validate();
else test();
