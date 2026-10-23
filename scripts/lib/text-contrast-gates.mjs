/**
 * Text contrast contract — text roles, same-element pairs, no glass.
 *
 * `text-accent`, `text-good` and `text-wrong` read per-theme text tokens
 * (`--accent-text`, `--good-text`, `--wrong-text`) while fills keep the base
 * token. The dark accent cannot carry a white label and read as small text at
 * the same time (3.8:1 on surface), and the light good/wrong were 3.9:1 on
 * their own soft tints; a text role fixes every use at once.
 *
 * The pair scan reads every class-string literal under src/: when one literal
 * sets both a text colour and a background colour (base state, no variant
 * prefix), the pair is resolved in clay, china and dark, composited over
 * `surface`, and must hold 4.5:1 (3:1 for large text).
 */
import fs from "node:fs";
import path from "node:path";
import { themeTokens, contrast } from "./rc2-3-13r3-2-5-premium-ux-gates.mjs";
import { CURRICULUM_SOURCES } from "./report-meta.mjs";

export const TEXT_ROLES = {
  accent: { token: "accent-text", soft: "accent-soft" },
  good: { token: "good-text", soft: "good-soft" },
  wrong: { token: "wrong-text", soft: "wrong-soft" },
};

export const ROLE_GROUNDS = ["bg", "surface", "surface-2"];

function resolveRgb(vars, name, depth = 0) {
  const raw = vars[name];
  if (raw == null || depth > 6) return null;
  const ref = raw.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (ref) return resolveRgb(vars, ref[1], depth + 1);
  const parts = raw.split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? parts : null;
}

const mix = (fg, alpha, bg) => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));
const uniq = (list) => [...new Set(list)];
function stripComments(text) {
  return String(text ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

/** Tailwind colour name → CSS variable, for text and for fills. */
const ALIAS = { ink: "text", "ink-soft": "text-soft", "ink-faint": "text-faint", line: "border" };
const COLOR_NAMES = [
  "accent-strong", "accent-soft", "accent-on-soft", "accent", "good-soft", "good", "gold-soft", "gold",
  "wrong-soft", "wrong", "ink-soft", "ink-faint", "ink", "surface-2", "surface", "bg", "line",
  "on-good", "on-wrong", "on-gold", "white",
];
const NAME = `(${COLOR_NAMES.join("|")})`;
const TEXT_RE = new RegExp(`^text-${NAME}(?:/(\\d+))?$`);
const BG_RE = new RegExp(`^bg-(?:${NAME}(?:/(\\d+))?|\\[rgb\\(var\\(--${NAME}\\)(?:\\s*/\\s*(0?\\.\\d+))?\\)\\])$`);

function textVar(name) {
  if (name === "white") return "white";
  if (TEXT_ROLES[name]) return TEXT_ROLES[name].token;
  return ALIAS[name] ?? name;
}
function fillVar(name) {
  if (name === "white") return "white";
  return ALIAS[name] ?? name;
}

function isLarge(classes) {
  const size = classes.find((c) => /^text-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(px|rem)\])$/.test(c));
  if (!size) return false;
  const bold = classes.some((c) => /^font-(semibold|bold|extrabold|black)$/.test(c));
  const arb = size.match(/^text-\[([\d.]+)(px|rem)\]$/);
  const px = arb ? Number(arb[1]) * (arb[2] === "rem" ? 16 : 1) : { xs: 12, sm: 14, base: 16, lg: 18, xl: 20 }[size.slice(5)] ?? 24;
  return px >= 24 || (bold && px >= 18.66);
}

/** Every same-literal text/background pair under the given tree. */
export function scanPairs(tree, themes) {
  const failures = [];
  for (const [rel, text] of Object.entries(tree)) {
    if (!rel.endsWith(".tsx")) continue;
    const code = stripComments(text);
    for (const m of code.matchAll(/(["'`])((?:(?!\1)[^\n\\])*?)\1/g)) {
      const classes = m[2].split(/\s+/).filter(Boolean);
      const base = classes.filter((c) => !c.includes(":"));
      let fg = null;
      let bg = null;
      for (const c of base) {
        const t = c.match(TEXT_RE);
        if (t) fg = { name: t[1], alpha: t[2] ? Number(t[2]) / 100 : 1, cls: c };
        const b = c.match(BG_RE);
        if (b) bg = { name: b[1] ?? b[3], alpha: b[2] ? Number(b[2]) / 100 : b[4] ? Number(b[4]) : 1, cls: c };
      }
      if (!fg || !bg) continue;
      const min = isLarge(base) ? 3 : 4.5;
      for (const [theme, vars] of Object.entries(themes)) {
        const surface = resolveRgb(vars, "surface");
        const fgRgb = fg.name === "white" ? [255, 255, 255] : resolveRgb(vars, textVar(fg.name));
        const bgRgb = bg.name === "white" ? [255, 255, 255] : resolveRgb(vars, fillVar(bg.name));
        if (!surface || !fgRgb || !bgRgb) continue;
        const ground = mix(bgRgb, bg.alpha, surface);
        const ratio = contrast(mix(fgRgb, fg.alpha, ground), ground);
        if (ratio < min) failures.push({ rel, theme, pair: `${fg.cls} on ${bg.cls}`, ratio: Number(ratio.toFixed(2)), min });
      }
    }
  }
  return failures;
}

export function checkTextContrast(src) {
  const errors = [];
  const themes = themeTokens(src.css ?? "");

  for (const [theme, vars] of Object.entries(themes)) {
    for (const { token, soft } of Object.values(TEXT_ROLES)) {
      const fg = resolveRgb(vars, token);
      if (!fg) {
        errors.push("TEXT_TOKEN_MISSING");
        continue;
      }
      for (const ground of [...ROLE_GROUNDS, soft]) {
        const bg = resolveRgb(vars, ground);
        if (!bg) errors.push("TEXT_TOKEN_MISSING");
        else if (contrast(fg, bg) < 4.5) errors.push("TEXT_ROLE_BELOW_AA");
      }
    }
  }

  const tw = stripComments(src.tailwind);
  const textColor = tw.match(/textColor:\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  for (const [role, { token }] of Object.entries(TEXT_ROLES)) {
    if (!new RegExp(`\\b${role}:\\s*"rgb\\(var\\(--${token}\\) / <alpha-value>\\)"`).test(textColor)) errors.push("TEXT_ROLE_UNMAPPED");
  }

  const tree = src.tree ?? {};
  for (const [rel, text] of Object.entries(tree)) {
    if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) continue;
    // Curriculum sources are under the content freeze (their bytes are the
    // Journey fingerprint); their class strings change with a content wave.
    if (CURRICULUM_SOURCES.includes(rel)) continue;
    const code = stripComments(text);
    // Arbitrary values skip the text role and fall back to the fill colour.
    if (/text-\[rgb\(var\(--(?:accent|good|wrong)\)/.test(code)) errors.push("TEXT_ROLE_BYPASS");
    // Theme fills carry their own label token (white is 2.1:1 on dark gold).
    for (const m of code.matchAll(/(["'`])((?:(?!\1)[^\n\\])*?)\1/g)) {
      const base = m[2].split(/\s+/).filter((c) => c && !c.includes(":"));
      if (base.includes("text-white") && base.some((c) => /^bg-(?:gold|wrong|good)(?:\/\d+)?$|^bg-\[rgb\(var\(--(?:gold|wrong|good)\)\)\]$/.test(c))) {
        errors.push("WHITE_ON_THEME_FILL");
      }
    }
    // Nothing is glass, nothing glows, nothing blurs (premium-surface-system.md).
    if (/(?<![\w-])(?:[\w-]+:)*backdrop-blur(?!-none)(?:-\w+)?(?![\w-])/.test(code)) errors.push("GLASS_SURFACE");
    if (/(?<![\w-])(?:[\w-]+:)*blur(?:-(?:sm|md|lg|xl|2xl|3xl))?(?=["'`\s])/.test(code)) errors.push("GLOW_BLUR");
  }

  if (scanPairs(tree, themes).length > 0) errors.push("PAIR_BELOW_AA");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* Sources                                                            */
/* ------------------------------------------------------------------ */

export function loadTextContrastSources(root) {
  const tree = {};
  (function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(tsx?|css)$/.test(entry.name)) tree[rel] = fs.readFileSync(path.join(root, rel), "utf8");
    }
  })("src");
  return {
    css: tree["src/index.css"],
    tailwind: fs.readFileSync(path.join(root, "tailwind.config.js"), "utf8"),
    tree,
  };
}
