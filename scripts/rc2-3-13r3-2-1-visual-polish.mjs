#!/usr/bin/env node
import {
  checkAlignment,
  checkOrnaments,
  checkTopicCards,
  checkRelease,
  checkAll,
  loadR321Sources,
} from "./lib/rc2-3-13r3-2-1-visual-polish-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : process.argv[2] || "validate";

function validate(which = "all") {
  const src = loadR321Sources();
  const errors =
    which === "alignment"
      ? checkAlignment(src)
      : which === "ornament"
        ? checkOrnaments(src)
        : which === "cards"
          ? checkTopicCards(src)
          : checkAll(src);
  if (errors.length) {
    console.error(`FAIL validate r321 ${which}`);
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`PASS validate r321 ${which}`);
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
  const base = loadR321Sources();
  const cases = [
    ["bubble sine restored", "BUBBLE_AXIS_SHIFTED", () => checkAlignment({ ...base, bubble: base.bubble.replace("return 0;", "return Math.round(Math.sin(index * 1.1) * 26);") })],
    ["path axis marker gone", "PATH_AXIS_MISSING", () => checkAlignment({ ...base, path: base.path.replace(/data-progression-axis="stable"/g, "") })],
    ["axis line gone", "CONNECTOR_AXIS_MISSING", () => checkAlignment({ ...base, path: base.path.replace(/data-progression-axis-line="true"/g, "") })],
    ["connector class gone", "CONNECTOR_CLASS_MISSING", () => checkAlignment({ ...base, connector: base.connector.replace(/progression-connector/g, "x") })],
    ["label class gone", "LABEL_WIDTH_UNSTABLE", () => checkAlignment({ ...base, label: base.label.replace(/progression-node-copy/g, "x") })],
    ["label width gone", "LABEL_WIDTH_UNSTABLE", () => checkAlignment({ ...base, label: base.label.replace(/w-\[8\.75rem\]/g, "max-w-xs") })],
    ["current pill gone", "CURRENT_PILL_DETACHED", () => checkAlignment({ ...base, bubble: base.bubble.replace(/progression-current-pill/g, "x") })],
    ["offset always applied", "OFFSET_ALWAYS_APPLIED", () => checkAlignment({ ...base, bubble: base.bubble.replace(/style=\{offset \? \{ transform: `translateX\(\$\{offset\}px\)` \} : undefined\}/, "style={{ transform: `translateX(${offset}px)` }}") })],
    ["journey axis gone", "JOURNEY_AXIS_MISSING", () => checkAlignment({ ...base, journeyPage: base.journeyPage.replace(/data-progression-axis="stable"/g, "") })],
    ["ornament component gone", "ORNAMENT_MISSING", () => checkOrnaments({ ...base, ornaments: "export const X = 1", path: base.path.replace(/SymbolicOrnamentRail/g, "X"), journeyPage: base.journeyPage.replace(/SymbolicOrnamentRail/g, "X") })],
    ["alternation gone", "ORNAMENT_NO_ALTERNATION", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/side: slots\.length % 2 === 0 \? "left" : "right"/, 'side: "left"') })],
    ["side unmarked", "ORNAMENT_SIDE_UNMARKED", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/data-ornament-side=\{slot\.side\}/g, "") })],
    ["right side removed", "ORNAMENT_SINGLE_SIDE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"right"/g, '"left"') })],
    ["motif set cut", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"bamboo"/g, '"x"').replace(/case "bamboo"/g, 'case "x"') })],
    ["aria hidden gone", "ORNAMENT_A11Y_NOISE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/aria-hidden/g, "") })],
    ["pointer events gone", "ORNAMENT_INTERACTIVE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/pointer-events-none/g, "") })],
    ["ornament button", "ORNAMENT_FOCUSABLE", () => checkOrnaments({ ...base, ornaments: base.ornaments + "\n<button tabIndex={0}>" })],
    ["reduced motion class gone", "REDUCED_MOTION_IGNORED", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/motion-reduce:animate-none/g, "") })],
    ["css keyframes gone", "ORNAMENT_MOTION_MISSING", () => checkOrnaments({ ...base, css: base.css.replace(/ornament-drift/g, "x") })],
    ["css reduced rule gone", "REDUCED_MOTION_CSS_MISSING", () => checkOrnaments({ ...base, css: base.css.replace(/\.symbolic-ornament/g, ".x") })],
    ["journey density gone", "JOURNEY_DENSITY_MISSING", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/density === "journey" \? 4 : 3/, "3") })],
    ["culture rail gone", "CULTURE_ORNAMENT_MISSING", () => checkOrnaments({ ...base, path: base.path.replace(/SymbolicOrnamentRail/g, "div") })],
    ["journey rail gone", "JOURNEY_ORNAMENT_MISSING", () => checkOrnaments({ ...base, journeyPage: base.journeyPage.replace(/SymbolicOrnamentRail/g, "div") })],
    ["topic icon gone", "TOPIC_ICON_MISSING", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/CultureTopicIcon/g, "span"), topicIcon: "" })],
    ["icon family gone", "ICON_FAMILY_INCONSISTENT", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/data-topic-icon-family="longyu-line"/g, ""), topicIcon: base.topicIcon.replace(/data-topic-icon-family": "longyu-line"/g, 'data-x": "x"').replace(/data-topic-icon-family="longyu-line"/g, "") })],
    ["icon container gone", "ICON_CONTAINER_MISSING", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/culture-topic-icon/g, "x") })],
    ["icon scale gone", "ICON_SCALE_UNCONTROLLED", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/h-9 w-9/g, "h-16 w-16") })],
    ["progress track gone", "PROGRESS_BAR_MISSING", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/culture-progress-track/g, "x") })],
    ["chevron gone", "CHEVRON_MISSING", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/IconChevron/g, "span") })],
    ["card title token gone", "TITLE_HIERARCHY_COLLAPSE", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/type-card-title/g, "text-sm") })],
    ["supporting token gone", "DESCRIPTION_HIERARCHY_COLLAPSE", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/type-supporting/g, "text-xs") })],
    ["card shadow gone", "CARD_DEPTH_MISSING", () => checkTopicCards({ ...base, topicCard: base.topicCard.replace(/shadow-card/g, "") })],
    ["continue card class gone", "CONTINUE_CARD_UNPOLISHED", () => checkTopicCards({ ...base, journey: base.journey.replace(/culture-continue-card/g, "") })],
    ["detail header gone", "DETAIL_HEADER_UNPOLISHED", () => checkTopicCards({ ...base, detail: base.detail.replace(/culture-topic-header/g, "") })],
    ["picker restored", "PATH_PICKER_RESTORED", () => checkTopicCards({ ...base, journey: base.journey + '\ndata-testid="culture-path-picker-toggle"' })],
    ["root bubbles restored", "ROOT_BUBBLES_RESTORED", () => checkTopicCards({ ...base, journey: base.journey + "\n<ProgressionPath />" })],
    ["freeze missing", "FREEZE_MISSING", () => checkRelease({ ...base, freeze: base.freeze.replace(/PRE_BETA_FREEZE_EXCEPTION_R321/g, "X") })],
    ["freeze reason missing", "FREEZE_REASON_MISSING", () => checkRelease({ ...base, freeze: base.freeze.replace(/VISUAL_POLISH_ONLY/g, "X"), certification: base.certification.replace(/VISUAL_POLISH_ONLY/g, "X"), report: base.report.replace(/VISUAL_POLISH_ONLY/g, "X") })],
    ["gate script missing", "GATE_SCRIPT_MISSING", () => checkRelease({ ...base, packageJson: base.packageJson.replace(/gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression/g, "gate:x") })],
    ["align validate missing", "ALIGN_VALIDATE_MISSING", () => checkRelease({ ...base, packageJson: base.packageJson.replace(/validate:progression-visual-alignment/g, "validate:x") })],
    ["ornament validate missing", "ORNAMENT_VALIDATE_MISSING", () => checkRelease({ ...base, packageJson: base.packageJson.replace(/validate:symbolic-ornament-system/g, "validate:x") })],
    ["card validate missing", "CARD_VALIDATE_MISSING", () => checkRelease({ ...base, packageJson: base.packageJson.replace(/validate:topic-card-polish/g, "validate:x") })],
    ["registry missing", "GATE_REGISTRY_MISSING", () => checkRelease({ ...base, gateRegistry: base.gateRegistry.replace(/gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression/g, "x") })],
    ["cert missing", "CERT_MISSING", () => checkRelease({ ...base, certification: "" })],
    ["report missing", "REPORT_MISSING", () => checkRelease({ ...base, report: "" })],
    ["cert alignment missing", "CERT_ALIGNMENT_MISSING", () => checkRelease({ ...base, certification: base.certification.replace(/progressionAlignment/g, "x") })],
    ["cert ornaments missing", "CERT_ORNAMENT_MISSING", () => checkRelease({ ...base, certification: base.certification.replace(/symbolicOrnaments/g, "x") })],
    ["apk not stale", "PRIOR_APK_NOT_STALE", () => checkRelease({ ...base, certification: base.certification.replace(/STALE|stale/g, "ACTIVE") })],
    ["checkAll alignment", "BUBBLE_AXIS_SHIFTED", () => checkAll({ ...base, bubble: "export function progressionOffsetForIndex(){ return Math.sin(1); }" })],
    ["checkAll ornaments", "ORNAMENT_MISSING", () => checkAll({ ...base, ornaments: "", path: "", journeyPage: "" })],
    ["checkAll cards", "TOPIC_ICON_MISSING", () => checkAll({ ...base, topicCard: "", topicIcon: "" })],
    ["checkAll release", "GATE_SCRIPT_MISSING", () => checkAll({ ...base, packageJson: "{}" })],
    ["fan motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"fan"/g, '"x"').replace(/case "fan"/g, 'case "x"') })],
    ["seal motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"seal"/g, '"x"').replace(/case "seal"/g, 'case "x"') })],
    ["blossom motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"blossom"/g, '"x"').replace(/case "blossom"/g, 'case "x"') })],
    ["knot motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"knot"/g, '"x"').replace(/case "knot"/g, 'case "x"') })],
    ["cloud motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"cloud"/g, '"x"').replace(/case "cloud"/g, 'case "x"') })],
    ["lantern motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"lantern"/g, '"x"').replace(/case "lantern"/g, 'case "x"') })],
    ["moon-gate motif removed", "ORNAMENT_SET_INCOMPLETE", () => checkOrnaments({ ...base, ornaments: base.ornaments.replace(/"moon-gate"/g, '"x"').replace(/case "moon-gate"/g, 'case "x"') })],
    ["label both markers gone", "LABEL_WIDTH_UNSTABLE", () => checkAlignment({ ...base, label: base.label.replace(/progression-node-copy/g, "").replace(/w-\[8\.75rem\]/g, "") })],
    ["continue and picker", "PATH_PICKER_RESTORED", () => checkTopicCards({ ...base, journey: 'data-testid="culture-path-picker-toggle"' })],
    ["root path component", "ROOT_BUBBLES_RESTORED", () => checkAll({ ...base, journey: base.journey + "\n<ProgressionPath nodes={[]} />" })],
    ["offset sine via checkAll", "BUBBLE_AXIS_SHIFTED", () => checkAll({ ...base, bubble: base.bubble.replace("return 0;", "return Math.sin(index);") })],
    ["journey ornaments stripped checkAll", "JOURNEY_ORNAMENT_MISSING", () => checkAll({ ...base, journeyPage: base.journeyPage.replace(/SymbolicOrnamentRail/g, "span") })],
    ["culture ornaments stripped checkAll", "CULTURE_ORNAMENT_MISSING", () => checkAll({ ...base, path: base.path.replace(/SymbolicOrnamentRail/g, "span") })],
    ["progress track checkAll", "PROGRESS_BAR_MISSING", () => checkAll({ ...base, topicCard: base.topicCard.replace(/culture-progress-track/g, "") })],
    ["chevron checkAll", "CHEVRON_MISSING", () => checkAll({ ...base, topicCard: base.topicCard.replace(/IconChevron/g, "i") })],
    ["freeze checkAll", "FREEZE_MISSING", () => checkAll({ ...base, freeze: "export const X = {}" })],
    ["cert alignment checkAll", "CERT_ALIGNMENT_MISSING", () => checkAll({ ...base, certification: base.certification.replace(/progressionAlignment/g, "gone") })],
    ["stale marker checkAll", "PRIOR_APK_NOT_STALE", () => checkAll({ ...base, certification: base.certification.replace(/stale|STALE/g, "LIVE") })],
    ["icon family checkAll", "ICON_FAMILY_INCONSISTENT", () => checkAll({ ...base, topicCard: base.topicCard.replace(/longyu-line/g, "emoji"), topicIcon: base.topicIcon.replace(/longyu-line/g, "emoji") })],
  ];

  cases.forEach((entry, index) => {
    expectKill(`${index + 1} ${entry[0]}`, entry[1], entry[2]);
  });
  if (cases.length < 70) {
    console.error(`FAIL mutation count ${cases.length} < 70`);
    process.exit(1);
  }
  console.log(`PASS test:rc2-3-13r3-2-1-visual-polish · ${cases.length} mutation kills`);
}

const arg = process.argv[2];
if (arg === "test") test();
else if (arg === "alignment" || arg === "ornament" || arg === "cards") validate(arg);
else validate("all");
