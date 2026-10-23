#!/usr/bin/env node
/**
 * Mutations for validate:text-contrast: each one reintroduces a regression the
 * text-role wave removed and must turn the gate red with its own code.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkTextContrast, loadTextContrastSources } from "./lib/text-contrast-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadTextContrastSources(root);

assert.deepEqual(checkTextContrast(base), [], "controle positivo");

const css = (from, to) => {
  assert.ok(base.css.includes(from), `css mutation anchor missing: ${from}`);
  return { ...base, css: base.css.replace(from, to) };
};
const tw = (from, to) => {
  assert.ok(base.tailwind.includes(from), `tailwind mutation anchor missing: ${from}`);
  return { ...base, tailwind: base.tailwind.replace(from, to) };
};
const tsx = (line) => ({ ...base, tree: { ...base.tree, "src/__mutation__.tsx": `export const M = () => ${line};\n` } });

const mutations = [
  ["dark accent text back to the fill red", css("  --accent-text: 236 128 108;", "  --accent-text: 202 72 54;"), "TEXT_ROLE_BELOW_AA"],
  ["clay accent text back to 4.47:1 on accent-soft", css("  --accent-text: 181 64 45;", "  --accent-text: 185 65 46;"), "TEXT_ROLE_BELOW_AA"],
  ["clay good text back to the fill green", css("  --good-text: 42 120 81;", "  --good-text: 47 133 90;"), "TEXT_ROLE_BELOW_AA"],
  ["clay wrong text back to the fill coral", css("  --wrong-text: 178 70 49;", "  --wrong-text: 198 78 54;"), "TEXT_ROLE_BELOW_AA"],
  ["dark wrong-soft back to 4.0:1 under wrong text", css("  --wrong-soft: 71 34 28;", "  --wrong-soft: 87 42 34;"), "TEXT_ROLE_BELOW_AA"],
  ["accent text token removed", css("  --accent-text: 181 64 45;\n", ""), "TEXT_TOKEN_MISSING"],
  ["text-accent mapped to the fill again", tw('accent: "rgb(var(--accent-text) / <alpha-value>)"', 'accent: "rgb(var(--accent) / <alpha-value>)"'), "TEXT_ROLE_UNMAPPED"],
  ["text-good mapping dropped", tw('        good: "rgb(var(--good-text) / <alpha-value>)",\n', ""), "TEXT_ROLE_UNMAPPED"],
  ["arbitrary good text bypasses the role", tsx('<span className="font-semibold text-[rgb(var(--good))]" />'), "TEXT_ROLE_BYPASS"],
  ["white label on the gold fill", tsx('<span className="bg-gold text-white" />'), "WHITE_ON_THEME_FILL"],
  ["white label on the danger fill", tsx('<span className="rounded-xl bg-wrong text-white" />'), "WHITE_ON_THEME_FILL"],
  ["translucent bar blurs again", tsx('<div className="sticky top-0 bg-bg/95 backdrop-blur" />'), "GLASS_SURFACE"],
  ["responsive glass", tsx('<div className="lg:bg-bg/90 lg:backdrop-blur-sm" />'), "GLASS_SURFACE"],
  ["decorative glow blob", tsx('<div className="absolute h-40 w-40 rounded-full bg-accent/10 blur-3xl" />'), "GLOW_BLUR"],
  ["faint caption on surface-2", tsx('<p className="bg-surface-2 text-xs text-ink-faint/60" />'), "PAIR_BELOW_AA"],
  ["accent label on a dense accent tint", tsx('<span className="bg-accent/40 text-xs text-accent" />'), "PAIR_BELOW_AA"],
  ["white on the soft accent wash", tsx('<span className="bg-accent-soft text-sm text-white" />'), "PAIR_BELOW_AA"],
  ["good label on a dense good tint", tsx('<span className="bg-[rgb(var(--good)/0.3)] text-xs text-good" />'), "PAIR_BELOW_AA"],
];

let killed = 0;
for (const [name, src, code] of mutations) {
  const errors = checkTextContrast(src);
  if (errors.includes(code)) {
    killed += 1;
    console.log(`KILLED ${name}`);
  } else {
    console.error(`SURVIVED ${name} — expected ${code}, got [${errors.join(", ")}]`);
  }
}

// Large text is held to 3:1, not 4.5:1: a 24px accent title on accent-soft passes.
assert.deepEqual(checkTextContrast(tsx('<h2 className="bg-accent-soft/60 text-2xl text-accent" />')), [], "large text uses 3:1");
// Variant states (hover:, disabled:) are not the resting pair.
assert.deepEqual(checkTextContrast(tsx('<a className="text-ink hover:bg-accent hover:text-accent" />')), [], "variants are not the resting pair");

assert.equal(killed, mutations.length, `${mutations.length - killed} mutation(s) survived`);
console.log(`PASS test:text-contrast (${killed}/${mutations.length} mutações mortas)`);
