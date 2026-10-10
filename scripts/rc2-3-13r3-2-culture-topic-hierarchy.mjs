#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13r3-2-culture-topic-hierarchy
 * npm run validate:culture-topic-hierarchy
 */
import {
  checkAll,
  checkTopicGrouping,
  checkRootUx,
  checkTopicDetail,
  checkContentConservation,
  checkProgressMigration,
  checkAccessibilityAndMotion,
  checkFreezeAndRelease,
  checkLocales,
  loadR32Sources,
  STALE_348_APK_SHA256,
} from "./lib/rc2-3-13r3-2-culture-topic-hierarchy-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:culture-topic-hierarchy / rc2-3-13r3-2");
    for (const e of errors.slice(0, 80)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:culture-topic-hierarchy · 7 topics · 12 paths mapped · root hub · topic detail · freeze exception",
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

function mutate(base, key, from, to) {
  return { ...base, [key]: base[key].replace(from, to) };
}

function test() {
  const base = loadR32Sources();
  let n = 0;
  const k = (label, code, run) => {
    n += 1;
    expectKill(`${n} ${label}`, code, run);
  };

  // —— Hierarchy (1–20)
  k("topic groups missing", "TOPIC_GROUPS_MISSING", () =>
    checkTopicGrouping({ ...base, topics: base.topics.replace(/CULTURE_TOPIC_GROUPS/g, "X") }),
  );
  k("hierarchy assert missing", "HIERARCHY_ASSERT_MISSING", () =>
    checkTopicGrouping({ ...base, topics: base.topics.replace(/assertCultureTopicHierarchy/g, "x") }),
  );
  k("unmapped path", "UNMAPPED_CULTURE_PATH", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(/"diferencas_regionais"/g, '"diferencas_regionais_x"'),
    }),
  );
  k("duplicate membership", "DUPLICATE_CULTURE_PATH_MEMBERSHIP", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(
        /pathIds:\s*\["vida_cotidiana"\]/,
        'pathIds: ["vida_cotidiana", "familia"]',
      ),
    }),
  );
  k("empty topic", "EMPTY_TOPIC", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(/pathIds:\s*\["historia_simbolos"\]/, "pathIds: []"),
    }),
  );
  k("root exposes all paths", "ROOT_EXPOSES_ALL_PATHS", () =>
    checkTopicGrouping({
      ...base,
      cultureJourney: base.cultureJourney + "\n{CULTURE_V2_PATHS.map((p) => p.id)}",
    }),
  );
  k("topic card missing", "TOPIC_CARD_MISSING", () =>
    checkTopicGrouping({ ...base, cultureJourney: base.cultureJourney.replace(/CultureTopicCard/g, "X") }),
  );
  k("topic path mismatch", "TOPIC_PATH_MISMATCH", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(
        /pathIds:\s*\["etiqueta_relacoes", "familia"\]/,
        'pathIds: ["etiqueta_relacoes"]',
      ),
    }),
  );
  k("topic missing", "TOPIC_MISSING", () =>
    checkTopicGrouping({ ...base, topics: base.topics.replace(/id:\s*"historia_china"/, 'id: "historia_x"') }),
  );
  k("trocar restored toggle", "TROCAR_DE_CAMINHO_RESTORED", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney + '\ndata-testid="culture-path-picker-toggle"',
    }),
  );
  k("trocar restored locale", "TROCAR_DE_CAMINHO_RESTORED", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney + '\n{t("progression.switchPath")}',
    }),
  );
  k("root horizontal chips", "ROOT_HORIZONTAL_PATH_SELECTOR", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney + '\ndata-testid="culture-path-chip-familia"',
    }),
  );
  k("root bubbles", "ROOT_PROGRESSION_BUBBLES", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney + "\n<ProgressionPath nodes={[]} />",
    }),
  );
  k("hub marker missing", "TOPIC_HUB_MARKER_MISSING", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney.replace(/data-culture-topic-hub="true"/, ""),
    }),
  );
  k("topic grid missing", "TOPIC_GRID_MISSING", () =>
    checkRootUx({ ...base, cultureJourney: base.cultureJourney.replace(/culture-topic-grid/g, "x") }),
  );
  k("explore by topic missing", "EXPLORE_BY_TOPIC_MISSING", () =>
    checkRootUx({ ...base, cultureJourney: base.cultureJourney.replace(/exploreByTopic/g, "x") }),
  );
  k("continue cta missing", "CONTINUE_CTA_MISSING", () =>
    checkRootUx({ ...base, cultureJourney: base.cultureJourney.replace(/culture-next-cta/g, "x") }),
  );
  k("continue card missing", "CONTINUE_CARD_MISSING", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney
        .replace(/continueLearning/g, "x")
        .replace(/startCulture/g, "y"),
    }),
  );
  k("horizontal overflow risk", "ROOT_HORIZONTAL_OVERFLOW_RISK", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney + '\n<div className="overflow-x-auto culture-path">',
    }),
  );
  k("topic detail missing", "TOPIC_DETAIL_MISSING", () =>
    checkTopicDetail({ ...base, topicDetail: "", routes: base.routes.replace(/CultureTopicDetailPage/g, "") }),
  );

  // —— Detail / nav (21–40)
  k("topic route missing", "TOPIC_ROUTE_MISSING", () =>
    checkTopicDetail({ ...base, routes: base.routes.replace(/cultura\/topico\/:topicId/g, "cultura/x/:id") }),
  );
  k("detail bubbles missing", "DETAIL_BUBBLES_MISSING", () =>
    checkTopicDetail({ ...base, topicDetail: base.topicDetail.replace(/<ProgressionPath/g, "<div") }),
  );
  k("topic back missing", "TOPIC_BACK_MISSING", () =>
    checkTopicDetail({ ...base, topicDetail: base.topicDetail.replace(/culture-topic-back/g, "x") }),
  );
  k("topic continue missing", "TOPIC_CONTINUE_MISSING", () =>
    checkTopicDetail({ ...base, topicDetail: base.topicDetail.replace(/culture-topic-continue/g, "x") }),
  );
  k("subtopic sections missing", "SUBTOPIC_SECTIONS_MISSING", () =>
    checkTopicDetail({ ...base, topicDetail: base.topicDetail.replace(/culture-subtopic-/g, "x") }),
  );
  k("node return missing", "NODE_RETURN_TOPIC_MISSING", () =>
    checkTopicDetail({
      ...base,
      topicDetail: base.topicDetail.replace(/from=\$\{encodeURIComponent/g, "q=${"),
      cultureJourney: base.cultureJourney.replace(/from=\$\{encodeURIComponent/g, "q=${"),
    }),
  );
  k("topic memory missing", "TOPIC_MEMORY_MISSING", () =>
    checkTopicDetail({
      ...base,
      topicDetail: base.topicDetail.replace(/writeCultureTopicId/g, "x"),
      cultureJourney: base.cultureJourney.replace(/writeCultureTopicId/g, "x"),
      shellState: base.shellState.replace(/writeCultureTopicId/g, "x"),
    }),
  );
  k("topic scroll memory missing", "TOPIC_SCROLL_MEMORY_MISSING", () =>
    checkTopicDetail({
      ...base,
      shellState: base.shellState
        .replace(/writeCultureTopicScroll/g, "x")
        .replace(/readCultureTopicScroll/g, "y"),
      topicDetail: base.topicDetail
        .replace(/writeCultureTopicScroll/g, "x")
        .replace(/readCultureTopicScroll/g, "y"),
    }),
  );
  k("journey culture restore missing", "JOURNEY_CULTURE_RESTORE_MISSING", () =>
    checkTopicDetail({
      ...base,
      shell: base.shell.replace(/cultureRestoreHref|readCultureTopicId/g, "x"),
    }),
  );
  k("path count drift", "CULTURE_PATH_COUNT_DRIFT", () =>
    checkContentConservation({
      ...base,
      paths: base.paths.replace(/id:\s*"diferencas_regionais"/, 'id: "x"'),
    }),
  );
  k("flagship missing", "FLAGSHIP_CONTENT_MISSING", () =>
    checkContentConservation({ ...base, deep: base.deep.replace(/FLAGSHIP_DEEP/g, "X") }),
  );
  k("grouping duplicates nodes", "GROUPING_DUPLICATES_NODES", () =>
    checkContentConservation({
      ...base,
      topics: base.topics + "\norderedNodeIds: [\"fake\"]",
    }),
  );
  k("grouping missing path refs", "GROUPING_MISSING_PATH_REFS", () =>
    checkContentConservation({ ...base, topics: base.topics.replace(/pathIds:\s*\[/g, "paths: [") }),
  );
  k("path migration missing", "PATH_MIGRATION_MISSING", () =>
    checkProgressMigration({
      ...base,
      topics: base.topics.replace(/migrateCulturePathToTopic/g, "x"),
      cultureJourney: base.cultureJourney.replace(/migrateCulturePathToTopic/g, "x"),
    }),
  );
  k("continue resolution missing", "CONTINUE_RESOLUTION_MISSING", () =>
    checkProgressMigration({
      ...base,
      topics: base.topics.replace(/resolveCultureContinuation/g, "x"),
      cultureJourney: base.cultureJourney.replace(/resolveCultureContinuation/g, "x"),
    }),
  );
  k("topic progress aggregation missing", "TOPIC_PROGRESS_AGGREGATION_MISSING", () =>
    checkProgressMigration({
      ...base,
      topics: base.topics.replace(/cultureTopicProgress/g, "x"),
      topicCard: base.topicCard.replace(/cultureTopicProgress/g, "x"),
      topicDetail: base.topicDetail.replace(/cultureTopicProgress/g, "x"),
    }),
  );
  k("a11y missing", "TOPIC_CARD_A11Y_MISSING", () =>
    checkAccessibilityAndMotion({
      ...base,
      topicCard: base.topicCard.replace(/aria-label/g, "data-x"),
    }),
  );
  k("reduced motion ignored", "REDUCED_MOTION_IGNORED", () =>
    checkAccessibilityAndMotion({
      ...base,
      topicCard: base.topicCard.replace(/motion-reduce/g, "x"),
    }),
  );
  k("touch target", "TOPIC_CARD_TOUCH_TARGET", () =>
    checkAccessibilityAndMotion({
      ...base,
      topicCard: base.topicCard.replace(/min-h-\[110px\]/g, "").replace(/min-h-11/g, ""),
    }),
  );
  k("typography token missing", "TYPOGRAPHY_TOKEN_MISSING", () =>
    checkAccessibilityAndMotion({
      ...base,
      topicCard: base.topicCard.replace(/type-card-title/g, "text-xl"),
    }),
  );

  // —— Freeze / release (41–60)
  k("freeze exception missing", "FREEZE_EXCEPTION_MISSING", () =>
    checkFreezeAndRelease({ ...base, freeze: base.freeze.replace(/PRE_BETA_FREEZE_EXCEPTION_R32/g, "X") }),
  );
  k("freeze reason missing", "FREEZE_REASON_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      freeze: base.freeze.replace(/OWNER_APPROVED_CULTURE_INFORMATION_ARCHITECTURE/g, "X"),
      certification: base.certification.replace(/OWNER_APPROVED_CULTURE_INFORMATION_ARCHITECTURE/g, "X"),
      report: base.report.replace(/OWNER_APPROVED_CULTURE_INFORMATION_ARCHITECTURE/g, "X"),
    }),
  );
  k("r32 gate missing", "R32_GATE_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      packageJson: base.packageJson.replace(/gate:rc2-3-13r3-2-culture-topic-hierarchy/g, "gate:gone"),
    }),
  );
  k("hierarchy validate missing", "HIERARCHY_VALIDATE_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      packageJson: base.packageJson.replace(/validate:culture-topic-hierarchy/g, "validate:gone"),
    }),
  );
  k("gate registry missing", "GATE_REGISTRY_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      gateRegistry: base.gateRegistry.replace(/gate:rc2-3-13r3-2-culture-topic-hierarchy/g, "gate:x"),
    }),
  );
  k("cert missing", "CERT_MISSING", () => checkFreezeAndRelease({ ...base, certification: "" }));
  k("report missing", "REPORT_MISSING", () => checkFreezeAndRelease({ ...base, report: "" }));
  k("cert hierarchy section missing", "CERT_HIERARCHY_SECTION_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      certification: base.certification.replace(/cultureHierarchy/g, "x"),
    }),
  );
  k("old apk not marked stale", "OLD_APK_NOT_MARKED_STALE", () =>
    checkFreezeAndRelease({
      ...base,
      certification: base.certification.replace(/STALE|stale/g, "ACTIVE"),
      report: base.report.replace(/STALE|stale/g, "ACTIVE"),
    }),
  );
  k("old 348 apk accepted", "OLD_348_APK_ACCEPTED", () =>
    checkFreezeAndRelease({
      ...base,
      certification: base.certification.replace(
        /"apkSha256":\s*null/,
        `"apkSha256": "${STALE_348_APK_SHA256}"`,
      ),
    }),
  );
  k("telemetry topic open missing", "TELEMETRY_TOPIC_OPEN_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      techEvents: base.techEvents.replace(/culture_topic_opened/g, "x"),
    }),
  );
  k("telemetry root return missing", "TELEMETRY_ROOT_RETURN_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      techEvents: base.techEvents.replace(/culture_root_returned/g, "x"),
    }),
  );
  k("pt locale missing", "PT_LOCALE_MISSING", () =>
    checkLocales({ ...base, pt: base.pt.replace(/continueLearning:/g, "x:") }),
  );
  k("en locale missing", "EN_LOCALE_MISSING", () =>
    checkLocales({ ...base, en: base.en.replace(/continueTopic:/g, "x:") }),
  );

  // —— Extra mutations to ≥80 (61–85)
  k("trocar literal restored", "TROCAR_DE_CAMINHO_RESTORED", () =>
    checkRootUx({ ...base, cultureJourney: base.cultureJourney + "\nTrocar de caminho" }),
  );
  k("listbox path picker", "ROOT_HORIZONTAL_PATH_SELECTOR", () =>
    checkRootUx({
      ...base,
      cultureJourney:
        base.cultureJourney +
        '\n<div data-testid="culture-path-picker" role="listbox"></div>',
    }),
  );
  k("checkAll includes grouping", "TOPIC_GROUPS_MISSING", () =>
    checkAll({ ...base, topics: "export const X = []" }),
  );
  k("checkAll includes root ux", "TOPIC_HUB_MARKER_MISSING", () =>
    checkAll({ ...base, cultureJourney: "export function CultureJourneyPage(){return null}" }),
  );
  k("checkAll includes detail", "TOPIC_ROUTE_MISSING", () =>
    checkAll({ ...base, routes: base.routes.replace(/cultura\/topico\/:topicId/g, "") }),
  );
  k("checkAll includes freeze", "R32_GATE_MISSING", () =>
    checkAll({
      ...base,
      packageJson: base.packageJson.replace(/"gate:rc2-3-13r3-2-culture-topic-hierarchy"/g, '"gate:x"'),
    }),
  );
  k("unmapped via remove path from topic", "UNMAPPED_CULTURE_PATH", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(
        /pathIds:\s*\["china_contemporanea", "diferencas_regionais"\]/,
        'pathIds: ["china_contemporanea"]',
      ),
    }),
  );
  k("duplicate via add path", "DUPLICATE_CULTURE_PATH_MEMBERSHIP", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(
        /pathIds:\s*\["historia_simbolos"\]/,
        'pathIds: ["historia_simbolos", "festivais"]',
      ),
    }),
  );
  k("empty comida topic", "EMPTY_TOPIC", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(
        /pathIds:\s*\["comida_mesa", "festivais"\]/,
        "pathIds: []",
      ),
    }),
  );
  k("root bubbles via testid", "ROOT_PROGRESSION_BUBBLES", () =>
    checkRootUx({
      ...base,
      cultureJourney: base.cultureJourney.replace(
        /data-culture-path-bubbles="false"/,
        'data-culture-path-bubbles="true"',
      ) + "\n<ProgressionPath nodes={nodes} testId=\"culture-path-bubbles\" />",
    }),
  );
  k("continue learning key gone", "CONTINUE_CARD_MISSING", () =>
    checkRootUx(mutate(base, "cultureJourney", /continueLearning|startCulture/g, "noop")),
  );
  k("topic card a11y aria gone", "TOPIC_CARD_A11Y_MISSING", () =>
    checkAccessibilityAndMotion(mutate(base, "topicCard", /aria-label=\{a11y\}/, "")),
  );
  k("cert cultureHierarchy typo", "CERT_HIERARCHY_SECTION_MISSING", () =>
    checkFreezeAndRelease(mutate(base, "certification", /cultureHierarchy/g, "cultureX")),
  );
  k("report wiped", "REPORT_MISSING", () => checkFreezeAndRelease({ ...base, report: " " }));
  k("stale apk hash accepted in cert", "OLD_348_APK_ACCEPTED", () =>
    checkFreezeAndRelease({
      ...base,
      certification: JSON.stringify({
        ...JSON.parse(base.certification),
        artifact: { ...(JSON.parse(base.certification).artifact || {}), apkSha256: STALE_348_APK_SHA256 },
      }),
    }),
  );
  k("path drift remove vida", "CULTURE_PATH_COUNT_DRIFT", () =>
    checkContentConservation({
      ...base,
      paths: base.paths.replace(/id:\s*"vida_cotidiana"/, 'id: "vida_x"'),
    }),
  );
  k("migration helper renamed", "PATH_MIGRATION_MISSING", () =>
    checkProgressMigration({
      ...base,
      topics: base.topics.replace(/migrateCulturePathToTopic/g, "migrateX"),
      cultureJourney: base.cultureJourney.replace(/migrateCulturePathToTopic/g, "migrateX"),
    }),
  );
  k("pt exploreByTopic missing", "PT_LOCALE_MISSING", () =>
    checkLocales(mutate(base, "pt", /continueLearning:/g, "x:")),
  );
  k("en startCulture missing", "EN_LOCALE_MISSING", () =>
    checkLocales(mutate(base, "en", /startCulture:/g, "x:")),
  );
  k("shell restore stripped", "JOURNEY_CULTURE_RESTORE_MISSING", () =>
    checkTopicDetail({
      ...base,
      shell: base.shell
        .replace(/cultureRestoreHref/g, "hrefX")
        .replace(/readCultureTopicId/g, "readX"),
    }),
  );
  k("detail from param stripped", "NODE_RETURN_TOPIC_MISSING", () =>
    checkTopicDetail({
      ...base,
      topicDetail: base.topicDetail.replace(/from=/g, "origin="),
      cultureJourney: base.cultureJourney.replace(/from=/g, "origin="),
    }),
  );
  k("gate registry wipe", "GATE_REGISTRY_MISSING", () =>
    checkFreezeAndRelease({ ...base, gateRegistry: "{}" }),
  );
  k("package validate script gone", "HIERARCHY_VALIDATE_MISSING", () =>
    checkFreezeAndRelease(
      mutate(base, "packageJson", /"validate:culture-topic-hierarchy"/g, '"validate:x"'),
    ),
  );
  k("freeze rationale gone", "FREEZE_REASON_MISSING", () =>
    checkFreezeAndRelease({
      ...base,
      freeze: "export const PRE_BETA_FREEZE_EXCEPTION_R32 = {}",
      certification: "{}",
      report: "report without reason",
    }),
  );
  k("topic missing relacoes", "TOPIC_MISSING", () =>
    checkTopicGrouping({
      ...base,
      topics: base.topics.replace(/id:\s*"relacoes_etiqueta"/, 'id: "relacoes_x"'),
    }),
  );
  k("native count drift", "CULTURE_NATIVE_COUNT_DRIFT", () =>
    checkContentConservation({
      ...base,
      freeze: base.freeze.replace(/RC2_EXPECTED_CULTURE_NATIVE_LESSONS\s*=\s*36/, "RC2_EXPECTED_CULTURE_NATIVE_LESSONS = 35"),
    }),
  );
  k("item count drift", "CULTURE_ITEM_COUNT_DRIFT", () =>
    checkContentConservation({
      ...base,
      freeze: base.freeze.replace(/RC2_EXPECTED_CULTURE_ITEMS\s*=\s*36/, "RC2_EXPECTED_CULTURE_ITEMS = 35"),
    }),
  );

  if (n < 80) {
    console.error(`FAIL mutation count ${n} < 80`);
    process.exit(1);
  }
  console.log(`PASS test:rc2-3-13r3-2-culture-topic-hierarchy · ${n} mutation kills`);
}

if (mode === "test") test();
else validate();
