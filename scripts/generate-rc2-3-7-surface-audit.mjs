#!/usr/bin/env node
/**
 * RC2.3.7 — learner-facing surface polish audit, derived from source (not opinion).
 * For each surface: entry file(s), sound/haptic call sites, guidance coverage,
 * loading/empty/error/completion handling, exits, reduced-motion use.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { GUIDANCE_DEFINITIONS } = tsRequire("../../src/lib/guidanceOrchestrator.ts");

const SURFACES = [
  ["Jornada", "/jornada", ["src/features/journey/JourneyPage.tsx"]],
  ["Lesson Player", "/licao/:id/player", ["src/features/lesson/LessonPlayer.tsx", "src/features/lesson/LessonVictory.tsx", "src/features/lesson/steps.tsx"]],
  ["Revisão", "/revisao", ["src/features/revisao/RevisaoPage.tsx"]],
  ["Praticar", "/treino", ["src/features/treino/TreinoPage.tsx"]],
  ["Seu Domínio", "/dominio", ["src/features/dominio/DominioPage.tsx"]],
  ["Praticar o que preciso", "/revisao?sessao=dominio", ["src/features/revisao/RevisaoPage.tsx", "src/lib/mastery/personalMastery.ts"]],
  ["Pinyin Lab", "/pinyin", ["src/features/pinyin/PinyinLabPage.tsx", "src/features/pinyin/PronunciationContrastDrill.tsx"]],
  ["Tons", "/som", ["src/features/som/SomPage.tsx", "src/components/tone/ToneTrace.tsx"]],
  ["Fala", "/fala", ["src/features/fala/FalaPage.tsx", "src/features/lesson/SelfComparePractice.tsx", "src/features/lesson/PronunciationPractice.tsx"]],
  ["Hànzì", "/hanzi", ["src/features/hanzi/HanziPage.tsx", "src/features/hanzi/writing/HanziWritingExercise.tsx"]],
  ["Atlas", "/hanzi/atlas", ["src/features/hanzi/HanziAtlasPage.tsx"]],
  ["Ideogramas", "/ideogramas", ["src/features/hanzi/IdeogramasPage.tsx"]],
  ["Culture Hub", "/cultura", ["src/features/culture/CultureHubPage.tsx"]],
  ["Culture Lesson", "/cultura/:id", ["src/features/culture/CultureItemPage.tsx"]],
  ["Imersão", "/imersao", ["src/features/immersion/ImmersionPage.tsx"]],
  ["Missões", "/missoes", ["src/features/missoes/MissoesPage.tsx"]],
  ["Phase Challenge", "/teste/fase/:id", ["src/features/challenge/PhaseChallengePage.tsx"]],
  ["Perfil", "/perfil", ["src/features/perfil/ProfilePage.tsx"]],
  ["Mais", "/mais", ["src/features/more/MorePage.tsx"]],
  ["Premium", "/pro", ["src/features/pro/ProPage.tsx"]],
];

function find(rel) {
  if (fs.existsSync(path.join(root, rel))) return rel;
  const dir = path.dirname(rel);
  const base = path.basename(rel).toLowerCase();
  if (!fs.existsSync(path.join(root, dir))) return null;
  const hit = fs.readdirSync(path.join(root, dir)).find((f) => f.toLowerCase() === base || f.toLowerCase().includes(base.replace(/page\.tsx$/, "").replace(/\.tsx$/, "")));
  return hit ? path.join(dir, hit) : null;
}

const count = (text, re) => (text.match(re) ?? []).length;
const rows = SURFACES.map(([name, route, files]) => {
  const found = files.map(find).filter(Boolean);
  const text = found.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
  const routeKey = route.split("?")[0].replace(/:.*$/, "");
  const guidance = GUIDANCE_DEFINITIONS.filter((d) => d.surfaces.some((s) => s === routeKey || s.startsWith(routeKey.replace(/\/$/, "")))).map((d) => d.id);
  return {
    surface: name,
    route,
    files: found,
    primaryAction: /data-lesson-primary-cta|data-testid="practice-what-i-need"|ButtonLink|<Button/.test(text),
    navigation: { exit: /SmartBackButton|navigate\(-1\)|to="\/jornada"|Voltar|onClose|onExit/.test(text), returnAnchor: /JourneyReturnAnchor|consumeJourneyReturnAnchor|peekJourneyReturnAnchor|returnPath|cultureReturnPath/.test(text) },
    loading: /loading|Carregando|Suspense|isLoading|skeleton/i.test(text),
    emptyState: /empty|vazi|Nada para|Continue praticando|nenhum/i.test(text),
    errorState: /error|falh|failed|Tentar novamente|retry/i.test(text),
    completion: /Victory|Completion|concluíd|complete/i.test(text),
    sound: { calls: count(text, /playSoundFx\(/g), kinds: [...new Set([...text.matchAll(/playSoundFx\(\s*"([a-zA-Z]+)"/g)].map((m) => m[1]))] },
    haptic: { calls: count(text, /\bhaptic(Once)?\(/g), events: [...new Set([...text.matchAll(/haptic(?:Once)?\([^)]*?"([a-zA-Z]+)"\)/g)].map((m) => m[1]))] },
    animation: { reducedMotion: /prefers-reduced-motion|reducedMotion/.test(text), animated: /animate-|longyu-[a-z-]+-in|animation/.test(text) },
    firstUseGuidance: guidance,
    mobileScroll: /data-lesson-scroll-region|overflow-y-auto|data-lesson-activity-scroll/.test(text),
    safeArea: /app-safe-(top|bottom)|safe-area|env\(safe-area/.test(text),
  };
});
const out = { generatedBy: "scripts/generate-rc2-3-7-surface-audit.mjs", surfaces: rows.length, rows };
fs.writeFileSync(path.join(root, "docs/reports/rc2-3-7-surface-polish-audit.json"), JSON.stringify(out, null, 2) + "\n");
for (const r of rows) console.log(`${r.surface.padEnd(24)} files:${r.files.length} snd:${r.sound.calls} hap:${r.haptic.calls} guide:${r.firstUseGuidance.length} exit:${r.navigation.exit ? 1 : 0} empty:${r.emptyState ? 1 : 0} err:${r.errorState ? 1 : 0} safe:${r.safeArea ? 1 : 0}`);
