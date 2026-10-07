/**
 * RC2.3.7 — gate:rc2-3-7-sensory-guidance (pure checks over an injectable runtime).
 *
 * SG1  NO_HAPTIC_NAVIGATION    navigation/layout never vibrate (matrix forbidden list holds)
 * SG2  NO_HAPTIC_SCROLL        no vibration from scroll/wheel/touchmove handlers
 * SG3  ONE_GUIDANCE_AT_A_TIME  orchestrator returns ≤ 1; host renders one
 * SG4  GUIDANCE_BUDGET         1 per session (2 in the first, after the first activity)
 * SG5  SOUND_PREFERENCE        soundEffects OFF = no SFX; SFX yields to Mandarin audio/recording
 * SG6  HAPTIC_PREFERENCE       haptics OFF = no vibration
 * SG7  NO_ENGINE_LANGUAGE      learner copy has no engine/infra terms
 * SG8  AUDIO_TRUTH             "Tocando…" only in the PLAYING state (never on tap)
 * SG9  CEREMONY_DEDUPE         answer + completion = one vibration; completion keyed once
 * SG10 CTA_NO_REWARD           canonical CTAs never carry rewards ("Continuar +20 XP")
 * SG11 FIRST_USE_ONCE          a resolved first-use guidance never comes back
 * SG12 REDUCED_MOTION          reduced motion zeroes ceremony timing; CSS disables long animations
 * SG13 NOT_COLOR_ONLY          wrong/right feedback has text (not only red/green)
 * SG14 TECHNICAL_ERROR_EXIT    the error boundary always offers retry and a way out
 * SG15 RETURN_CONTEXT          Journey restores the return anchor; mastery practice returns to Seu Domínio
 * SG16 MASTERY_NO_RAW_SCORE    Seu Domínio never renders estimates, confidence or percentages
 * SG17 JEV_RUNTIME_OFF         no Jev client/key in learner source; flag false
 * SG18 SFX_FATIGUE             20 correct answers → success sound softens, never louder
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./v495a-runtime.mjs";

export const FILES = {
  guidanceHost: "src/components/guidance/GuidanceHost.tsx",
  errorBoundary: "src/components/system/ErrorBoundary.tsx",
  journey: "src/features/journey/JourneyPage.tsx",
  review: "src/features/revisao/RevisaoPage.tsx",
  dominio: "src/features/dominio/DominioPage.tsx",
  css: "src/index.css",
  budgetPolicy: "supabase/functions/_shared/budgetPolicy.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
};
const NAV_FILES = [
  "src/components/layout/AppShell.tsx",
  "src/components/layout/TabBar.tsx",
  "src/components/layout/TopBar.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/layout/nav.tsx",
  "src/components/navigation/SmartBackButton.tsx",
  "src/routes.tsx",
];
const ENGINE_RE = /SpeechRecognizer|Supabase|\bRPC\b|\bSQL\b|Edge Function|HTTP ?[45]\d\d|\bASR\b|Exception|stack trace|\bnull\b|undefined/;
const CTA_REWARD_RE = /^(Continuar|Começar|Voltar à Jornada|Responder|Tentar novamente|Ver resultado|Continue|Start)\s*[·+\-–—(]?\s*\+?\s*\d+\s*(XP|Qi)\b/i;
const JEV_CLIENT_RE = /api\.typesafe\.ai|TYPESAFE_API_KEY|systemone|\baskJev\b/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else if (typeof v === "string") out[key] = v;
  }
  return out;
}

export function loadSensoryRuntime(root) {
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const policy = tsRequire("../../src/lib/sensoryPolicy.ts");
  const guidance = tsRequire("../../src/lib/guidanceOrchestrator.ts");
  const completion = tsRequire("../../src/lib/completionSequence.ts");
  const { ptBR } = tsRequire("../../src/locales/pt-BR.ts");
  const { en } = tsRequire("../../src/locales/en.ts");
  const srcFiles = {};
  for (const f of walk(path.join(root, "src"))) srcFiles[path.relative(root, f)] = fs.readFileSync(f, "utf8");
  return {
    hapticDecision: policy.hapticDecision,
    sfxDecision: policy.sfxDecision,
    settleMs: policy.HAPTIC_RESULT_SETTLE_MS,
    selectGuidance: guidance.selectGuidance,
    guidance,
    completionSchedule: completion.completionSchedule,
    messages: { pt: flatten(ptBR), en: flatten(en) },
    src: Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, read(rel)])),
    srcFiles,
  };
}

function guidanceContext(g, overrides = {}) {
  const visibility = new Proxy({}, { get: () => "AVAILABLE" });
  return {
    now: 1_000_000,
    pathname: "/dominio",
    visibility,
    learner: { completedLessons: ["l1"], cultureTouched: true },
    state: { version: 2, enabled: true, initialized: true, availabilityMemory: [], records: {} },
    session: { ...g.EMPTY_GUIDANCE_SESSION, shownIds: [], snoozedIds: [], anchorMisses: [] },
    activeLearning: false,
    inputFocused: false,
    otherCeremonyActive: false,
    anchorsPresent: new Set(["dominio-header", "practice-what-i-need"]),
    isNative: false,
    notificationPermissionPromptable: false,
    recentToneConfusions: 0,
    ...overrides,
  };
}

const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

export function runSensoryGate(rt) {
  const failures = [];
  const fail = (code, subject, message) => failures.push({ code, subject, message });

  // SG1 — navigation never vibrates
  for (const rel of NAV_FILES) {
    const text = rt.srcFiles[rel] ?? "";
    if (/lib\/haptics"|\bhaptic\(|hapticOnce\(/.test(strip(text))) fail("NO_HAPTIC_NAVIGATION", rel, "navigation/layout must not vibrate");
  }
  for (const [rel, text] of Object.entries(rt.srcFiles)) {
    const t = strip(text);
    if (/(navigate|history\.(push|back)|setLocation)\([^)]*\)[^;\n]*;\s*haptic\(|haptic\([^)]*\);\s*navigate\(\s*-?1\s*\)/.test(t)) fail("NO_HAPTIC_NAVIGATION", rel, "vibration bound to navigation");
    // SG2 — scroll/wheel/touchmove handlers never vibrate
    if (/on(Scroll|Wheel|TouchMove)=\{[^}]*haptic|addEventListener\(\s*["'](scroll|wheel|touchmove)["'][\s\S]{0,240}?haptic\(/.test(t)) fail("NO_HAPTIC_SCROLL", rel, "scroll must not vibrate");
    // SG17 — Jev isolation
    if (JEV_CLIENT_RE.test(text)) fail("JEV_RUNTIME_OFF", rel, "Jev client / TypeSafe key in learner source");
  }

  // SG3/SG4/SG11 — guidance
  const g = rt.guidance;
  {
    const ctx = guidanceContext(g);
    const first = rt.selectGuidance(ctx);
    if (Array.isArray(first)) fail("ONE_GUIDANCE_AT_A_TIME", "selectGuidance", "returned several guidances at once");
    if (first && !Array.isArray(first)) {
      const after = rt.selectGuidance(guidanceContext(g, { session: { ...ctx.session, shownIds: [first.definition.id] } }));
      if (after) fail("GUIDANCE_BUDGET", "selectGuidance", `second guidance (${after.definition?.id ?? "?"}) in the same session`);
    } else if (!first) fail("GUIDANCE_BUDGET", "selectGuidance", "Seu Domínio first use never shows (control)");
    const firstSession = guidanceContext(g, { pathname: "/jornada", learner: { completedLessons: [], cultureTouched: false }, session: { ...ctx.session, shownIds: ["welcome_journey_v1"] } });
    if (rt.selectGuidance(firstSession)) fail("GUIDANCE_BUDGET", "first-session", "second guidance before the first activity");
    const host = strip(rt.src.guidanceHost);
    if (/\.map\(\s*\(?\s*(presentation|guidance)\b/.test(host) || !/setCurrentGuidance\(/.test(host)) fail("ONE_GUIDANCE_AT_A_TIME", FILES.guidanceHost, "host renders a single current guidance");
    // SG11 — resolved first-use never returns
    for (const status of ["SHOWN", "DISMISSED", "SKIPPED"]) {
      const resolved = guidanceContext(g, { state: { ...ctx.state, records: { mastery_first_use_v1: { status, at: 1 }, practice_need_first_use_v1: { status, at: 1 } } } });
      const again = rt.selectGuidance(resolved);
      if (again && ["mastery_first_use_v1", "practice_need_first_use_v1"].includes(again.definition.id)) fail("FIRST_USE_ONCE", again.definition.id, `came back after ${status}`);
    }
    const ids = new Set();
    for (const d of g.GUIDANCE_DEFINITIONS) {
      if (ids.has(d.id)) fail("ONE_GUIDANCE_AT_A_TIME", d.id, "duplicate guidance id");
      ids.add(d.id);
      if (d.kind === "COACHMARK" && d.anchor && !Object.values(rt.srcFiles).some((t) => t.includes(`data-coachmark-target="${d.anchor}"`) || t.includes(`coachmarkTarget: "${d.anchor}"`))) fail("GUIDANCE_BUDGET", d.id, `anchor "${d.anchor}" does not exist`);
      for (const key of [d.bodyKey, d.primaryKey, d.titleKey].filter(Boolean)) if (!rt.messages.pt[key]) fail("NO_ENGINE_LANGUAGE", d.id, `missing copy ${key}`);
    }
  }

  // SG5 — sound preference + yielding
  {
    const base = { kind: "success", now: 10_000, lastKind: null, lastKindAt: 0, recentSuccesses: 0, audioOwner: "IDLE" };
    if (rt.sfxDecision({ ...base, enabled: false, soundEffectsSetting: false }).play) fail("SOUND_PREFERENCE", "sfxDecision", "plays with soundEffects OFF");
    if (rt.sfxDecision({ ...base, enabled: true, soundEffectsSetting: false }).play) fail("SOUND_PREFERENCE", "sfxDecision", "plays with stored setting OFF");
    for (const owner of ["RECORDING", "RECOGNITION", "CANONICAL_MEDIA", "TTS", "SELF_PLAYBACK"]) if (rt.sfxDecision({ ...base, enabled: true, soundEffectsSetting: true, audioOwner: owner }).play) fail("SOUND_PREFERENCE", owner, "SFX over Mandarin audio/recording");
    if (!rt.sfxDecision({ ...base, enabled: true, soundEffectsSetting: true }).play) fail("SOUND_PREFERENCE", "control", "SFX never plays");
  }

  // SG6 — haptic preference
  if (rt.hapticDecision({ enabled: false, event: "answerCorrect", now: 10_000, lastAt: 0, lastWeight: 0 }).fire) fail("HAPTIC_PREFERENCE", "hapticDecision", "vibrates with haptics OFF");

  // SG9 — ceremony dedupe (answer that completes the lesson = one vibration)
  {
    const d = rt.hapticDecision({ enabled: true, event: "lessonComplete", now: 10_300, lastAt: 10_000, lastWeight: 3 });
    if (d.fire) fail("CEREMONY_DEDUPE", "hapticDecision", "answerCorrect + lessonComplete stacked");
    const later = rt.hapticDecision({ enabled: true, event: "lessonComplete", now: 10_000 + rt.settleMs + 50, lastAt: 10_000, lastWeight: 3 });
    if (!later.fire) fail("CEREMONY_DEDUPE", "control", "completion never vibrates");
  }

  // SG7 / SG10 — copy
  for (const [lang, msgs] of Object.entries(rt.messages)) {
    for (const [key, value] of Object.entries(msgs)) {
      // QA/dev surfaces and the privacy disclosure (which must name the system speech service) are exempt.
      if (/^(qa|dev|admin|deviceQa|privacyNotice)\./i.test(key)) continue;
      if (ENGINE_RE.test(value)) fail("NO_ENGINE_LANGUAGE", `${lang}:${key}`, value.slice(0, 80));
      if (CTA_REWARD_RE.test(value)) fail("CTA_NO_REWARD", `${lang}:${key}`, value);
    }
  }

  // SG8 — audio truth: "Tocando…" only under PLAYING
  for (const [rel, text] of Object.entries(rt.srcFiles)) {
    if (!text.includes("audioPlaying")) continue;
    for (const m of text.matchAll(/([\s\S]{0,120})\.audioPlaying"\)/g)) {
      if (!/=== "PLAYING"\s*\?\s*[a-zA-Z]*\(\s*"[a-zA-Z]+$/.test(m[1])) fail("AUDIO_TRUTH", rel, "'Tocando…' shown outside the PLAYING state");
    }
  }

  // SG12 — reduced motion
  {
    const sched = rt.completionSchedule(["CHECK", "XP", "QI", "SUMMARY"], true);
    if (sched.some((ms) => ms !== 0)) fail("REDUCED_MOTION", "completionSchedule", "ceremony animates with reduced motion");
    const css = rt.src.css;
    const reduce = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\n\}/.exec(css)?.[1] ?? "";
    if (!reduce) fail("REDUCED_MOTION", FILES.css, "no prefers-reduced-motion block");
    for (const cls of ["longyu-error-shake", "longyu-success-bloom", "lesson-victory-in", "longyu-chest-open", "longyu-streak-burst", "longyu-lesson-dragon"]) {
      if (!reduce.includes(`.${cls}`)) fail("REDUCED_MOTION", cls, "animation not disabled under reduced motion");
    }
  }

  // SG13 — not color only
  for (const key of ["review.feedbackWrong", "review.feedbackRight", "player.almost"]) {
    if (!(rt.messages.pt[key] ?? "").trim()) fail("NOT_COLOR_ONLY", key, "feedback has no text (color only)");
  }

  // SG14 — technical error has an exit
  {
    const eb = strip(rt.src.errorBoundary);
    if (!/common\.retry/.test(eb)) fail("TECHNICAL_ERROR_EXIT", FILES.errorBoundary, "no 'Tentar novamente'");
    if (!/common\.(home|back|reloadApp|reportProblem)|href=|navigate\(|to=/.test(eb)) fail("TECHNICAL_ERROR_EXIT", FILES.errorBoundary, "no way out");
  }

  // SG15 — return context
  {
    const j = strip(rt.src.journey);
    if (!/consumeJourneyReturnAnchor\(\)/.test(j) || !/scrollIntoView\(\{ block: "center"/.test(j)) fail("RETURN_CONTEXT", FILES.journey, "Journey does not restore the return anchor");
    if (!/masterySession \? "\/dominio" : "\/jornada"/.test(rt.src.review)) fail("RETURN_CONTEXT", FILES.review, "mastery practice does not return to Seu Domínio");
  }

  // SG16 — Personal Mastery shows no raw score
  {
    const d = strip(rt.src.dominio);
    if (/\.estimate\b|\.confidence\b|\.graded\b|%|toFixed\(|evidenceIds/.test(d)) fail("MASTERY_NO_RAW_SCORE", FILES.dominio, "learner page renders numbers/confidence");
  }

  // SG17 — flag
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(rt.src.budgetPolicy)) fail("JEV_RUNTIME_OFF", FILES.budgetPolicy, "JEV_RUNTIME_ENABLED is not false");

  // SG18 — fatigue: 20 correct answers
  {
    let last = 1;
    for (let i = 0; i < 20; i += 1) {
      const d = rt.sfxDecision({ kind: "success", enabled: true, soundEffectsSetting: true, audioOwner: "IDLE", now: 100_000 + i * 4000, lastKind: "success", lastKindAt: 100_000 + (i - 1) * 4000, recentSuccesses: i });
      if (!d.play) {
        fail("SFX_FATIGUE", `answer ${i + 1}`, "correct answer lost its sound");
        break;
      }
      if (d.gain > last + 1e-9 || d.gain < 0.5) fail("SFX_FATIGUE", `answer ${i + 1}`, `gain ${d.gain}`);
      last = d.gain;
    }
    if (last >= 1) fail("SFX_FATIGUE", "20 answers", "success sound never softens");
  }
  return failures;
}
