#!/usr/bin/env node
/**
 * RC2.2.17B — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-17b-guided-journey-parity.mjs validate <área>
 *   node scripts/rc2-2-17b-guided-journey-parity.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-17b-gates.mjs. As mutações 1–25 seguem a lista
 * DJ da especificação RC2.2.17B; M26+ cobrem contrato, flag, evidência e QA.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-17b-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = VALIDATORS[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(VALIDATORS).join("|")}>`);
  process.exit(2);
}
const name = `${mode}:${area}`;
const base = await loadState();

if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(name, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};
const json = (mutate) => (s) => mutate(s);

const MUTATIONS = {
  "guided-shell": [
    ["1. Jornada volta a usar o Card externo", "LEGACY_CARD_WRAPPER", src("player", "        <GuidedStepSurface\n", "        <Card data-legacy>\n        <GuidedStepSurface\n")],
    ["2. HIGH usa o shell, LOW não", "SHELL_DEPENDS_ON_GUIDANCE", src("player", 'const guidedShell = shellMode === "GUIDED";', 'const guidedShell = shellMode === "GUIDED" && lessonGuidance !== "LOW";')],
    ["3. prova volta para o card legado", "ASSESSMENT_LEGACY", src("phaseChallenge", '          data-guided-assessment="true"', '          data-guided-assessment="true"\n        >\n          <Card className="p-5"')],
    ["4. metadado guiado sem shell", "SHELL_MISSING", src("player", 'data-guided-lesson-shell={guidedShell ? "true" : "false"}', 'data-guidance-shell-off="true"')],
    ["20. shell guiado quebra o desktop", "DESKTOP_WIDTH", src("primitives", 'column: "mx-auto w-full max-w-[680px]"', 'column: "mx-auto w-full max-w-[1400px]"')],
    ["21. shell guiado quebra a cultura", "CULTURE_SHELL_BROKEN", src("player", 'exitTestId={lesson.lessonDomain === "culture" ? "culture-back" : undefined}', "exitTestId={undefined}")],
    ["M26. produção aceita o shell legado", "PRODUCTION_LEGACY_ALLOWED", src("presentation", '  if (input.productionBeta) return "GUIDED";\n', "")],
    ["M27. flag de rollback ignorada", "SHELL_FLAG_BROKEN", src("presentation", 'return OFF.has(flag) ? "LEGACY" : "GUIDED";', 'return "GUIDED";')],
    ["M28. override de runtime fora da sessão de teste", "PRODUCTION_LEGACY_ALLOWED", src("shell", "runtimeOverride: seeded ? readLocal(SHELL_OVERRIDE_KEY) : null", "runtimeOverride: readLocal(SHELL_OVERRIDE_KEY)")],
  ],
  "presentation-contracts": [
    ["8. ouvir exige rolagem em 390×844", "SIMPLE_STEP_SCROLLS", src("presentation", '  listen: native("CENTER", "LISTEN_FIRST"),', '  listen: adapter("CONTENT_SCROLL", "LISTEN_FIRST"),')],
    ["9. tom rola sem necessidade", "SIMPLE_STEP_SCROLLS", src("presentation", '  tone: native("CENTER", "LISTEN_FIRST"),', '  tone: adapter("CONTENT_SCROLL", "LISTEN_FIRST"),')],
    ["M29. StepKind sem contrato", "CONTRACT_MISSING", src("presentation", '  price_task: native("CENTER"),\n', "")],
    ["M30. dock abaixo de 80%", "DOCK_SHARE_LOW", json((s) => {
      s.src.presentation = swap(s.src.presentation, '  listen: native("CENTER", "LISTEN_FIRST"),', '  listen: { ...native("CENTER", "LISTEN_FIRST"), actionPlacement: "INLINE", exception: "x" },');
      s.src.presentation = swap(s.src.presentation, '  flashcard: native("CENTER", "AUTO_CHECK"),', '  flashcard: { ...native("CENTER", "AUTO_CHECK"), actionPlacement: "INLINE", exception: "x" },');
      s.src.presentation = swap(s.src.presentation, '  intro: native("CENTER", "READ_CONTINUE"),', '  intro: { ...native("CENTER", "READ_CONTINUE"), actionPlacement: "INLINE", exception: "x" },');
    })],
    ["M31. exceção ao dock sem motivo", "INLINE_WITHOUT_REASON", src("presentation", '    exception: "resposta/composição da vez do aluno fica junto do balão; o avanço da fala usa o dock",\n', "")],
    ["M32. evidência das 134 com Card antigo", "STRUCTURAL_EVIDENCE_FAILED", json((s) => { s.structural = { ...s.structural, legacyCard: 3 }; })],
    ["M33. varredura por StepKind com violação", "STRUCTURAL_EVIDENCE_FAILED", json((s) => { s.contractSweep = { ...s.contractSweep, violations: ["l2#3 dialogue_choice: 2 CTAs principais"] }; })],
    ["M34. evidência estrutural ausente", "STRUCTURAL_EVIDENCE_MISSING", json((s) => { s.structural = null; })],
  ],
  "presentation-stage": [
    ["5. PREPARE vira só texto acima do card", "PREPARE_NOT_REAL", src("presentation", '  return "PREPARE";\n}', '  return "STEP";\n}')],
    ["15. estágio de apresentação mexe no domínio/idx", "PRESENTATION_MUTATES_PROGRESS", src("player", "onClick={() => setPrepareDone(true)}", "onClick={() => { setPrepareDone(true); setIdx(idx + 1); }}")],
    ["16. estágio de apresentação dá XP", "PRESENTATION_GRANTS_XP", src("player", "onClick={() => setPrepareDone(true)}", "onClick={() => { setPrepareDone(true); setLessonXp((xp) => xp + 5); }}")],
    ["17. micro-página chama onDone cedo", "SUBPAGE_EARLY_DONE", src("steps", '          onClick={() => setPage("speak")}\n          data-guided-primary', '          onClick={() => onDone()}\n          data-guided-primary')],
    ["18. recarregar duplica conclusão", "RELOAD_DUPLICATES", src("player", "if (completedStepKeyRef.current === completionKey) {", "if (false && completedStepKeyRef.current === completionKey) {")],
    ["13. título da lição repetido em todo passo", "TITLE_REPEATED", src("shell", '      <div className="w-full">{children}</div>', '      <p data-guided-lesson-title>{stepKind}</p>\n      <div className="w-full">{children}</div>')],
    ["M35. micro-páginas perdem texto", "TEACH_PAGES_LOSE_TEXT", src("presentation", "    if (current) pages.push(current);\n  }\n  return pages;", "  }\n  return pages;")],
    ["M36. ensino longo sem micro-páginas", "SUBPAGE_EARLY_DONE", src("steps", "            messages={pages}", "            messages={guideMessages}")],
    ["M37. PREPARE persistido como progresso", "PRESENTATION_MUTATES_PROGRESS", src("player", "const [prepareDone, setPrepareDone] = useState(false);", "const [prepareDone, setPrepareDone] = useState(() => localStorage.getItem('prepare') === '1');")],
  ],
  "guided-action-dock": [
    ["6. duas CTAs principais", "TWO_PRIMARY_CTAS", src("css", "[data-guided-action-dock] button[data-button-variant=\"outline\"]:not([data-guided-primary]),", "[data-guided-action-dock] button[data-button-variant=\"none\"],")],
    ["7. CTA some atrás da gesture bar", "CTA_BEHIND_GESTURE_BAR", src("primitives", "pb-[calc(var(--app-safe-bottom)+1rem)]", "pb-4")],
    ["19. movimento reduzido ignorado", "REDUCED_MOTION_IGNORED", src("css", "  .longyu-step-in,\n", "")],
    ["22. fallback de fala escapa do shell", "SPEECH_FALLBACK_ESCAPES_SHELL", json((s) => { s.src.selfCompare = s.src.selfCompare.split("<GuidedDock>").join("<div>").split("</GuidedDock>").join("</div>"); })],
    ["23. erro volta para o painel/dashboard legado", "RETRY_DASHBOARD", src("player", '{pendingMistake && guidedShell && (guidance === "HIGH" || guidance === "MEDIUM") ? (', "{pendingMistake && false ? (")],
    ["M38. clique = ouviu", "LISTEN_CLICK_IS_HEARD", src("steps", "  function play() {\n    setFailReason(null);\n", "  function play() {\n    setListen(\"HEARD\");\n    setFailReason(null);\n")],
    ["M39. falha de áudio escondida", "AUDIO_FAILURE_HIDDEN", src("steps", 'data-testid="guided-audio-failed"', 'data-testid="guided-audio-hidden" hidden')],
    ["M40. folha de erro mostra ofertas", "RETRY_DASHBOARD", src("player", '              {canPayRetry && (\n                <Button variant="ghost"', '              <Button onClick={() => setProPaywallKind("qi")}>{t("player.seeProShort")}</Button>\n              {canPayRetry && (\n                <Button variant="ghost"')],
    ["M41. teclado cobre o campo", "KEYBOARD_COVERS_INPUT", src("player", "const viewportFrame = useVisualViewportFrame();", "const viewportFrame = null as ReturnType<typeof useVisualViewportFrame>;")],
  ],
  "guided-parity-release": [
    ["10. escolha simples com cards aninhados", "NESTED_CARDS", src("steps", 'guidedShell ? "mt-4 grid gap-2.5 text-center" :', '"mt-3 grid gap-2.5 rounded-2xl border border-line bg-surface-2 p-3 text-center" + (guidedShell ? "" : "") ||')],
    ["11. conversa mantém a moldura gigante", "CONVERSATION_FRAME", src("conversation", 'className={guided ? "mt-4" : "-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface', 'className={guided ? "-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface px-3" : "-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface')],
    ["12. Dragão em todo passo", "DRAGON_EVERY_STEP", src("presentation", '  if (kind === "intro") return index === 0 ? "PREPARE" : "EXPLANATION";\n  return null;', '  if (kind === "intro") return index === 0 ? "PREPARE" : "EXPLANATION";\n  return "EXPLANATION";')],
    ["14. mais de 1 pílula de metadado", "METADATA_PILLS", src("shell", '<span className="sr-only">{stageLabel}</span>', '<span className="rounded-full uppercase">{stageLabel}</span>')],
    ["24. package muda de longyu.noba.com", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "com.longyu.app"')],
    ["25. #273 tocado", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["M42. falante inativo quase invisível", "SPEAKER_INVISIBLE", src("conversation", '"border-line opacity-70"', '"border-line opacity-20"')],
    ["M43. tom com card-em-card", "TONE_CARD_IN_CARD", src("steps", "flat={guided}", "flat={false}")],
    ["M44. recompensa antes do recap", "RECAP_AFTER_REWARDS", json((s) => {
      s.src.victory = s.src.victory.replace("data-victory-learned", "data-victory-extra");
    })],
    ["M45. segundo motor de lição", "SECOND_ENGINE", json((s) => { s.srcFileNames.push("src/features/lesson/LessonEngineV2.tsx"); })],
    ["M46. PASS físico sem aparelho", "FAKE_PHYSICAL_PASS", json((s) => { s.qa = { ...s.qa, guidedJourneyL1: "PASS", deviceModel: null }; })],
    ["M47. cabeçalho volta a mostrar Qi/ofensiva", "METADATA_PILLS", src("shell", "            {breath && (", "            <FolegoMeter folego={0} unlimited={false} />\n            {breath && (")],
  ],
};

const cases = MUTATIONS[area] ?? [];
const clean = await gate(base);
assert.deepEqual(clean, [], `${area}: estado real falhou\n${report(name, clean)}`);
let killed = 0;
for (const [label, code, mutate] of cases) {
  const state = structuredClone(base);
  mutate(state);
  const failures = await gate(state);
  const codes = failures.map((f) => f.code);
  assert.ok(codes.includes(code), `${label}: esperava ${code}, veio ${codes.join(", ") || "nenhuma falha"}`);
  console.log(`KILLED ${label}: ${code}`);
  killed += 1;
}
console.log(`PASS ${name} (${killed} mutações)`);
