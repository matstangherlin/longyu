/**
 * Checkers for gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadR321Sources() {
  return {
    bubble: read("src/components/progression/ProgressionNodeBubble.tsx"),
    path: read("src/components/progression/ProgressionPath.tsx"),
    connector: read("src/components/progression/ProgressionConnector.tsx"),
    label: read("src/components/progression/ProgressionNodeLabel.tsx"),
    ornaments: read("src/components/progression/symbolicOrnaments.tsx"),
    css: read("src/index.css"),
    topicCard: read("src/features/culture/CultureTopicCard.tsx"),
    topicIcon: read("src/features/culture/CultureTopicIcon.tsx"),
    journey: read("src/features/culture/CultureJourneyPage.tsx"),
    detail: read("src/features/culture/CultureTopicDetailPage.tsx"),
    journeyPage: read("src/features/journey/JourneyPage.tsx"),
    freeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    gateRegistry: read("docs/release/gate-registry.json"),
    certification: read("docs/release/rc2-3-13r3-2-1-certification.json"),
    report: read("docs/reports/rc2-3-13r3-2-1-visual-polish-symbolic-progression.md"),
  };
}

export function checkAlignment(src = loadR321Sources()) {
  const errors = [];
  if (!/return 0;/.test(src.bubble) || /Math\.sin\(/.test(src.bubble)) {
    errors.push("BUBBLE_AXIS_SHIFTED");
  }
  if (!/data-progression-axis="stable"/.test(src.path)) errors.push("PATH_AXIS_MISSING");
  if (!/data-progression-axis-line="true"/.test(src.path)) errors.push("CONNECTOR_AXIS_MISSING");
  if (!/progression-connector/.test(src.connector)) errors.push("CONNECTOR_CLASS_MISSING");
  if (!/progression-node-copy/.test(src.label)) errors.push("LABEL_WIDTH_UNSTABLE");
  if (!/w-\[8\.75rem\]/.test(src.label)) errors.push("LABEL_WIDTH_UNSTABLE");
  if (!/progression-current-pill/.test(src.bubble)) errors.push("CURRENT_PILL_DETACHED");
  if (/style=\{\{\s*transform:\s*`translateX\(\$\{offset\}px\)`/.test(src.bubble)) {
    errors.push("OFFSET_ALWAYS_APPLIED");
  }
  if (!/data-progression-axis="stable"/.test(src.journeyPage)) errors.push("JOURNEY_AXIS_MISSING");
  return [...new Set(errors)];
}

export function checkOrnaments(src = loadR321Sources()) {
  const errors = [];
  if (!/SymbolicOrnamentRail/.test(src.ornaments + src.path + src.journeyPage)) {
    errors.push("ORNAMENT_MISSING");
  }
  if (!/side: slots\.length % 2 === 0 \? "left" : "right"/.test(src.ornaments)) {
    errors.push("ORNAMENT_NO_ALTERNATION");
  }
  if (!/data-ornament-side=\{slot\.side\}/.test(src.ornaments)) errors.push("ORNAMENT_SIDE_UNMARKED");
  if (!/"left"/.test(src.ornaments) || !/"right"/.test(src.ornaments)) {
    errors.push("ORNAMENT_SINGLE_SIDE");
  }
  for (const motif of ["lantern", "fan", "bamboo", "cloud", "moon-gate", "seal", "blossom", "knot"]) {
    if (!src.ornaments.includes(`"${motif}"`) && !src.ornaments.includes(`case "${motif}"`)) {
      errors.push("ORNAMENT_SET_INCOMPLETE");
    }
  }
  if (!/aria-hidden/.test(src.ornaments)) errors.push("ORNAMENT_A11Y_NOISE");
  if (!/pointer-events-none/.test(src.ornaments)) errors.push("ORNAMENT_INTERACTIVE");
  if (/<button/.test(src.ornaments) || /tabIndex/.test(src.ornaments)) errors.push("ORNAMENT_FOCUSABLE");
  if (!/motion-reduce:animate-none/.test(src.ornaments)) errors.push("REDUCED_MOTION_IGNORED");
  if (!/ornament-drift/.test(src.css)) errors.push("ORNAMENT_MOTION_MISSING");
  if (!/\.symbolic-ornament/.test(src.css)) errors.push("REDUCED_MOTION_CSS_MISSING");
  if (!/density === "journey" \? 4 : 3/.test(src.ornaments)) errors.push("JOURNEY_DENSITY_MISSING");
  if (!/SymbolicOrnamentRail/.test(src.path)) errors.push("CULTURE_ORNAMENT_MISSING");
  if (!/SymbolicOrnamentRail/.test(src.journeyPage)) errors.push("JOURNEY_ORNAMENT_MISSING");
  return [...new Set(errors)];
}

export function checkTopicCards(src = loadR321Sources()) {
  const errors = [];
  if (!/CultureTopicIcon/.test(src.topicCard + src.topicIcon)) errors.push("TOPIC_ICON_MISSING");
  if (!/data-topic-icon-family="longyu-line"/.test(src.topicCard + src.topicIcon)) {
    errors.push("ICON_FAMILY_INCONSISTENT");
  }
  if (!/culture-topic-icon/.test(src.topicCard)) errors.push("ICON_CONTAINER_MISSING");
  if (!/h-9 w-9/.test(src.topicCard)) errors.push("ICON_SCALE_UNCONTROLLED");
  if (!/culture-progress-track/.test(src.topicCard)) errors.push("PROGRESS_BAR_MISSING");
  if (!/IconChevron/.test(src.topicCard)) errors.push("CHEVRON_MISSING");
  if (!/type-card-title/.test(src.topicCard)) errors.push("TITLE_HIERARCHY_COLLAPSE");
  if (!/type-supporting/.test(src.topicCard)) errors.push("DESCRIPTION_HIERARCHY_COLLAPSE");
  if (!/shadow-card/.test(src.topicCard)) errors.push("CARD_DEPTH_MISSING");
  if (!/culture-continue-card/.test(src.journey)) errors.push("CONTINUE_CARD_UNPOLISHED");
  if (!/culture-topic-header/.test(src.detail)) errors.push("DETAIL_HEADER_UNPOLISHED");
  if (/culture-path-picker-toggle/.test(src.journey)) errors.push("PATH_PICKER_RESTORED");
  if (/<ProgressionPath/.test(src.journey)) errors.push("ROOT_BUBBLES_RESTORED");
  return [...new Set(errors)];
}

export function checkRelease(src = loadR321Sources()) {
  const errors = [];
  if (!/PRE_BETA_FREEZE_EXCEPTION_R321/.test(src.freeze)) errors.push("FREEZE_MISSING");
  if (!/VISUAL_POLISH_ONLY/.test(src.freeze + src.certification + src.report)) errors.push("FREEZE_REASON_MISSING");
  if (!/"gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression"/.test(src.packageJson)) {
    errors.push("GATE_SCRIPT_MISSING");
  }
  if (!/"validate:progression-visual-alignment"/.test(src.packageJson)) errors.push("ALIGN_VALIDATE_MISSING");
  if (!/"validate:symbolic-ornament-system"/.test(src.packageJson)) errors.push("ORNAMENT_VALIDATE_MISSING");
  if (!/"validate:topic-card-polish"/.test(src.packageJson)) errors.push("CARD_VALIDATE_MISSING");
  if (!/gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression/.test(src.gateRegistry)) {
    errors.push("GATE_REGISTRY_MISSING");
  }
  if (!src.certification || src.certification.length < 40) errors.push("CERT_MISSING");
  if (!src.report || src.report.length < 40) errors.push("REPORT_MISSING");
  if (!/progressionAlignment/.test(src.certification)) errors.push("CERT_ALIGNMENT_MISSING");
  if (!/symbolicOrnaments/.test(src.certification)) errors.push("CERT_ORNAMENT_MISSING");
  if (!/STALE|stale/.test(src.certification)) errors.push("PRIOR_APK_NOT_STALE");
  return [...new Set(errors)];
}

export function checkAll(src = loadR321Sources()) {
  return [...checkAlignment(src), ...checkOrnaments(src), ...checkTopicCards(src), ...checkRelease(src)];
}
