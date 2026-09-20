/**
 * Static + runtime contract: Journey pedagogical handoffs use canonical GuideDialogue.
 * RC2.2.5 — Journey Dragon Teacher Layer (presentation only; no curriculum mutation).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inline = fs.readFileSync(path.join(root, "src/features/journey/JourneyInlineNode.tsx"), "utf8");
const wrapper = fs.readFileSync(
  path.join(root, "src/features/journey/JourneyGuideExplanation.tsx"),
  "utf8"
);
const guide = fs.readFileSync(path.join(root, "src/components/guide/GuideDialogue.tsx"), "utf8");
const machine = fs.readFileSync(path.join(root, "src/lib/guideDialogueMachine.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src/features/journey/JourneyPage.tsx"), "utf8");
const cultureCard = fs.readFileSync(
  path.join(root, "src/features/journey/JourneyCultureMomentCard.tsx"),
  "utf8"
);
const steps = fs.readFileSync(path.join(root, "src/features/lesson/steps.tsx"), "utf8");

// P0 — reuse, never fork
assert.match(wrapper, /from ["'].*GuideDialogue/, "wrapper must import GuideDialogue");
assert.match(wrapper, /size=\{?"compact"?\}|size="compact"/, "journey guide uses compact size");
assert.doesNotMatch(wrapper, /GuideDialogue2|DragonDialogue|TeacherMascot|MascotTeacher|GuideEngineV2|DialogueMachine2/);
assert.doesNotMatch(wrapper, /createGuideDialogueState|reduceGuideDialogue|GUIDE_TYPEWRITER/, "wrapper must not own a machine");
assert.match(inline, /JourneyGuideExplanation/, "HANDOFF_LINES must render via JourneyGuideExplanation");
assert.match(inline, /export const HANDOFF_LINES/, "HANDOFF_LINES remain exported source of truth");
assert.doesNotMatch(
  inline,
  /Mascot size=\{22\}/,
  "handoffs must not stay as Mascot 22px + loose text"
);

// All four booster handoffs present with pt+en
for (const id of [
  "booster:tone-contour-1-3:v1",
  "booster:pinyin-practice:v1",
  "booster:hanzi-builder-foundations:v1",
  "booster:first-conversation:v1",
]) {
  assert.match(inline, new RegExp(`"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `missing handoff ${id}`);
}
assert.match(inline, /Você já sabe como o 1º e o 3º tom/);
assert.match(inline, /You know how the 1st and 3rd tones move/);
assert.match(inline, /Você já sabe o que o pinyin faz/);
assert.match(inline, /You know what pinyin does/);
assert.match(inline, /feitos de peças/);
assert.match(inline, /made of parts/);
assert.match(inline, /Você já sabe dizer 你好/);
assert.match(inline, /You can already say 你好/);

// P3 — activity card stays a sibling Link (clickable while guide types)
assert.match(inline, /JourneyGuideExplanation[\s\S]*\{link\}/, "guide must sit above clickable link sibling");

// P12 — header objective stays normal UI (no GuideDialogue import/mount on page)
assert.match(page, /currentObjective/, "objective still exists");
assert.doesNotMatch(
  page,
  /import\s*\{[^}]*GuideDialogue|from ["'].*JourneyGuideExplanation/,
  "JourneyPage must not import GuideDialogue / JourneyGuideExplanation"
);
assert.doesNotMatch(
  page,
  /<GuideDialogue|<JourneyGuideExplanation/,
  "JourneyPage must not mount GuideDialogue on header/objective"
);

// P13 — culture moment cards stay compact (no GuideDialogue)
assert.doesNotMatch(cultureCard, /GuideDialogue|JourneyGuideExplanation/);

// P9 — lesson StepIntro already uses GuideDialogue — preserve
assert.match(steps, /guideMessagesFromExistingBody/);
assert.match(steps, /GuideDialogue/);

// Graded prompts must not gate on GuideDialogue typewriter
assert.doesNotMatch(
  steps,
  /function StepChoice[\s\S]{0,400}GuideDialogue/,
  "graded choice must not use GuideDialogue"
);

// Canonical assets / single machine
assert.match(guide, /from ["'].*Mascot/);
assert.match(machine, /GUIDE_ADVANCE_GUARD_MS/);
assert.equal(
  fs.existsSync(path.join(root, "public/longyu-mascot.png")),
  true,
  "canonical mascot asset"
);

// Locked hint: SYSTEM_GUIDANCE — visual mascot ok, no dialogue Continuar gate
assert.match(page, /data-journey-locked-hint/);
assert.match(page, /pointer-events-none[\s\S]{0,200}data-journey-locked-hint|data-journey-locked-hint[\s\S]{0,200}pointer-events-none/);
assert.doesNotMatch(
  page,
  /data-journey-locked-hint[\s\S]{0,600}<GuideDialogue/,
  "locked hint must not become mandatory GuideDialogue"
);

// No second dialogue machine files
for (const bad of [
  "src/lib/guideDialogueMachine2.ts",
  "src/components/guide/GuideDialogue2.tsx",
  "src/components/guide/DragonDialogue.tsx",
  "src/components/brand/TeacherMascot.tsx",
]) {
  assert.equal(fs.existsSync(path.join(root, bad)), false, `forbidden file ${bad}`);
}

console.log("PASS validate:journey-guide-explanations");
