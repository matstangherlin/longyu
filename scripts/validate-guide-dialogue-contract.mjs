/**
 * Static contract: GuideDialogue is a reusable component (not a LessonPlayer),
 * uses grapheme segmentation, reduced-motion, and AT-safe full-sentence labels.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const machine = fs.readFileSync(path.join(root, "src/lib/guideDialogueMachine.ts"), "utf8");
const component = fs.readFileSync(path.join(root, "src/components/guide/GuideDialogue.tsx"), "utf8");
const steps = fs.readFileSync(path.join(root, "src/features/lesson/steps.tsx"), "utf8");

assert.match(machine, /Intl\.Segmenter/, "must use Intl.Segmenter for graphemes");
assert.match(machine, /prefersReducedMotion|prefers-reduced-motion/, "must support reduced motion");
assert.match(machine, /GUIDE_ADVANCE_GUARD_MS/, "must guard against double-skip");
assert.match(machine, /phase === "typing"/, "CONTINUE during typing must complete");
assert.match(component, /from ["'].*Mascot/, "must reuse canonical Mascot");
assert.match(component, /aria-hidden="true"/, "visual typewriter must be aria-hidden");
assert.match(component, /aria-live="polite"/, "AT gets full sentence via live region");
assert.match(component, /guide-continue/, "must expose Continuar control");
assert.doesNotMatch(component, /GuideLessonPlayer/, "must not create GuideLessonPlayer");
assert.match(steps, /GuideDialogue/, "StepIntro / lesson steps must consume GuideDialogue");
assert.doesNotMatch(steps, /GuideLessonPlayer/, "must not couple a GuideLessonPlayer");

const mascot = fs.readFileSync(path.join(root, "src/components/brand/Mascot.tsx"), "utf8");
assert.match(mascot, /\/longyu-mascot\.png/, "canonical guide asset must remain longyu-mascot.png");

console.log("PASS validate:guide-dialogue-contract");
