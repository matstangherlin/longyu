/**
 * GuideDialogue motion contract — entrance CSS, reduced-motion, no heavy deps.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");
const component = fs.readFileSync(path.join(root, "src/components/guide/GuideDialogue.tsx"), "utf8");
const motion = fs.readFileSync(path.join(root, "src/lib/guideDialogueMotion.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

assert.match(css, /guide-mascot-in/, "mascot entrance keyframes required");
assert.match(css, /guide-bubble-in/, "bubble entrance keyframes required");
assert.match(css, /guide-mascot-enter/, "mascot enter class required");
assert.match(css, /guide-bubble-enter/, "bubble enter class required");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*guide-mascot-enter/, "reduced-motion must disable entrance");
assert.doesNotMatch(css, /guide-mascot-in[\s\S]{0,200}width\s*:/, "must not animate width in entrance");
assert.doesNotMatch(css, /guide-mascot-in[\s\S]{0,200}height\s*:/, "must not animate height in entrance");

assert.match(component, /data-guide-motion/, "must expose motion phase");
assert.match(component, /guide-mascot-enter/, "must apply mascot entrance class");
assert.match(component, /guide-bubble-enter/, "must apply bubble entrance class");
assert.match(component, /GUIDE_ENTRANCE_READY_MS/, "must use entrance ready timing");
assert.match(motion, /GUIDE_ENTRANCE_READY_MS\s*=\s*280/, "entrance ready must stay short (~280ms)");
assert.ok(Number(motion.match(/GUIDE_FIRST_LETTER_BUDGET_MS\s*=\s*(\d+)/)?.[1] ?? 9999) <= 350);

assert.ok(!deps["framer-motion"], "must not add framer-motion");
assert.ok(!deps.gsap, "must not add gsap");
assert.ok(!deps["lottie-web"] && !deps["@lottiefiles/react-lottie-player"], "must not add lottie");

console.log("PASS validate:guide-dialogue-motion");
