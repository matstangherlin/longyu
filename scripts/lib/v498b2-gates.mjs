/**
 * V4.9.8B.2 — speaking-first, auto-reveal, culture-on-journey, minimal victory.
 */
import fs from "node:fs";
import path from "node:path";
import { finalizeReport, reportProvenanceLines } from "./report-meta.mjs";

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

export function validateLessonUiConsistency(data = {}) {
  const { fail, failures } = failList();
  const tokens = data.lessonTokensSource ?? read("src/ui/lessonTokens.ts");
  const css = data.indexCssSource ?? read("src/index.css");
  const label = data.lessonKindLabelSource ?? read("src/components/ui/LessonKindLabel.tsx");
  const field = data.freeAnswerSource ?? read("src/features/lesson/FreeAnswerField.tsx");
  const conversation = data.conversationPlayerSource ?? read("src/features/lesson/ConversationSceneStep.tsx");
  const player = data.lessonPlayerSource ?? read("src/features/lesson/LessonPlayer.tsx");
  const victory = data.lessonVictorySource ?? read("src/features/lesson/LessonVictory.tsx");
  const steps = data.lessonStepsSource ?? read("src/features/lesson/steps.tsx");

  for (const token of ["maxWidth", "padding", "cardRadius", "buttonHeight", "mobileGap", "desktopGap", "sectionSpacing"]) {
    if (!tokens.includes(token)) fail("TOKENS", "lessonTokens.ts", `missing ${token}`);
  }
  for (const cssVar of [
    "--lesson-max-width",
    "--lesson-padding",
    "--lesson-card-radius",
    "--lesson-button-height",
    "--lesson-mobile-gap",
    "--lesson-desktop-gap",
    "--lesson-section-spacing",
  ]) {
    if (!css.includes(cssVar)) fail("TOKENS", "index.css", `missing ${cssVar}`);
  }
  if (!label.includes("player.kindProduction") || !label.includes("player.kindConversation") || !label.includes("player.kindCulture")) {
    fail("KIND_LABEL", "LessonKindLabel", "shared PRODUÇÃO/CONVERSA/CULTURA labels missing");
  }
  if (!conversation.includes("LessonKindLabel") || !victory.includes("data-lesson-victory")) {
    fail("KIND_LABEL", "surfaces", "conversation/victory must reuse the shared shell tokens");
  }
  if (/orSpeakAnswer/.test(field) && /underline decoration-line/.test(field)) {
    fail("SPEAK_LINK", "FreeAnswerField", "Falar must not be a tiny underlined link");
  }
  if (!field.includes("data-speech-state") || !field.includes("data-testid=\"free-answer-mic\"")) {
    fail("SPEAK_PRIMARY", "FreeAnswerField", "speech states and primary mic button required");
  }
  if (!conversation.includes("micOnly") || !conversation.includes("FreeAnswerField")) {
    fail("SPEAK_WITH_CHIPS", "ConversationSceneStep", "speaking must stay available with pieces");
  }
  if (!conversation.includes("evaluateLearnerResponse")) {
    fail("EVALUATOR", "ConversationSceneStep", "pieces/text/speech must share evaluateLearnerResponse");
  }
  if (!steps.includes("speechAsAlternative") && !steps.includes("FreeAnswerField")) {
    fail("SPEAK_PRIMARY", "steps", "production surfaces must keep FreeAnswerField");
  }
  if (!player.includes("LessonVictory")) {
    fail("VICTORY_SHELL", "LessonPlayer", "player must mount the shared LessonVictory shell");
  }
  return { failures };
}

export function validateConversationAutoReveal(data = {}) {
  const { fail, failures } = failList();
  const conversation = data.conversationPlayerSource ?? read("src/features/lesson/ConversationSceneStep.tsx");
  const steps = data.lessonStepsSource ?? read("src/features/lesson/steps.tsx");

  if (/Ouça e toque para revelar/.test(conversation)) {
    fail("TAP_REVEAL", "ConversationSceneStep", "standard conversation must not require tap-to-reveal");
  }
  if (!conversation.includes("data-conversation-auto-reveal")) {
    fail("AUTO_REVEAL", "ConversationSceneStep", "NPC lines must declare auto-reveal");
  }
  if (!/setTimeout\(\s*\(\)\s*=>\s*setRevealed\(true\),\s*700\)/.test(conversation) && !conversation.includes("setRevealed(true)")) {
    fail("AUDIO_FIRST", "ConversationSceneStep", "audio_first must auto-reveal text");
  }
  if (!/listen_select|audio_discrimination|dictation/.test(steps)) {
    fail("LISTEN_HIDE", "steps", "listening StepKinds must still exist");
  }
  const listenHides =
    steps.includes("isAudioOnlyStep") ||
    /kind === "dictation"/.test(steps) ||
    /audio-only/.test(steps);
  if (!listenHides && !steps.includes("pairReveal")) {
    fail("LISTEN_HIDE", "steps", "listening-first StepKinds must still hide the target");
  }
  return { failures };
}

export function validateCultureJourneyPlacement(data = {}) {
  const { fail, failures } = failList();
  const placement = data.placement ?? [];
  const items = data.items ?? [];
  const nodes = (data.nodes ?? []).filter((node) => node.type === "CULTURE_LESSON");
  const player = data.lessonPlayerSource ?? read("src/features/lesson/LessonPlayer.tsx");
  const victory = data.lessonVictorySource ?? read("src/features/lesson/LessonVictory.tsx");
  const detail = data.lessonDetailSource ?? read("src/features/lesson/LessonDetailPage.tsx");
  const hub = data.cultureHubSource ?? read("src/features/culture/CultureHubPage.tsx");
  const card = data.cultureCardSource ?? read("src/features/culture/CultureCard.tsx");
  const inline = data.journeyInlineSource ?? read("src/features/journey/JourneyInlineNode.tsx");

  const core = placement.filter((row) => row.track === "core");
  for (const row of core) {
    const node = nodes.find((item) => item.id === `culture:${row.itemId}` || String(item.id).endsWith(row.itemId));
    const item = items.find((entry) => entry.id === row.itemId);
    if (!item) fail("CORE_ITEM", row.itemId, "CORE placement points at a missing CultureItem");
    if (!node) fail("MISSING_NODE", row.itemId, "CORE CultureItem has no Journey node");
    else if (node.sourceId !== `culture-${row.itemId}`) {
      fail("CANONICAL_ID", row.itemId, "Hub/Journey must share culture-{itemId}");
    }
  }

  const coreAfter = new Map();
  for (const row of core) {
    const list = coreAfter.get(row.afterTopicId) ?? [];
    list.push(row.itemId);
    coreAfter.set(row.afterTopicId, list);
  }
  for (const [topic, ids] of coreAfter) {
    if (ids.length > 1) fail("CONSECUTIVE_CORE", topic, `two CORE culture nodes after ${topic}: ${ids.join(",")}`);
  }

  if (/CultureTouchpoint/.test(player) || /culture-touchpoint/.test(victory)) {
    fail("POST_LESSON_CTA", "LessonVictory", "Victory must not depend on a Culture Mission card");
  }
  if (/saveForLater/.test(player) || /saveForLater/.test(victory) || /culture-touchpoint-save/.test(detail)) {
    fail("SAVE_FOR_LATER", "lesson", "Salvar para depois must not appear on Victory or Lesson");
  }
  if (!card.includes("data-canonical-lesson-id") || !inline.includes("data-canonical-lesson-id")) {
    fail("CANONICAL_ID", "hub/journey", "Hub cards and Journey nodes must expose canonicalLessonId");
  }
  if (!hub.includes("CultureCard") && !hub.includes("/cultura/")) {
    fail("HUB_MAP", "CultureHubPage", "Hub must keep the culture map");
  }
  return { failures };
}

export function validateCompletionExperience(data = {}) {
  const { fail, failures } = failList();
  const victory = data.lessonVictorySource ?? read("src/features/lesson/LessonVictory.tsx");
  const summary = data.completionSummarySource ?? read("src/features/lesson/buildLessonCompletionSummary.ts");
  const player = data.lessonPlayerSource ?? read("src/features/lesson/LessonPlayer.tsx");

  for (const needle of ["data-lesson-victory", "data-victory-highlight", "data-victory-primary", "data-victory-xp", "data-victory-accuracy"]) {
    if (!victory.includes(needle)) fail("VICTORY_CONTRACT", "LessonVictory", `missing ${needle}`);
  }
  if (!summary.includes("export function buildLessonCompletionSummary")) {
    fail("SUMMARY", "buildLessonCompletionSummary", "deterministic summary helper missing");
  }
  if (/Continue estudando!/.test(summary)) {
    fail("GENERIC_FOCUS", "buildLessonCompletionSummary", "must not emit a generic keep-studying line");
  }
  if (/CultureTouchpoint/.test(player) || /Na vida real/.test(victory) || /touchpointEyebrow/.test(victory)) {
    fail("CULTURE_CARD", "Victory", "Culture card must not be primary victory content");
  }
  if (/missionsUpdated/.test(victory) || /leaveFeedback/.test(victory) || /CollapsibleInfoCard/.test(victory)) {
    fail("DASHBOARD", "LessonVictory", "missions/feedback accordion must not be primary victory content");
  }
  if (/player.navReview/.test(victory) || /player.navLibrary/.test(victory)) {
    fail("BOTTOM_NAV", "LessonVictory", "bottom nav must not compete with the victory CTA");
  }
  const ctaMatches = victory.match(/data-victory-primary/g) ?? [];
  if (ctaMatches.length !== 1) fail("CTA_COUNT", "LessonVictory", "exactly one primary victory CTA");
  if ((victory.match(/data-testid=\{primaryTestId\}/g) ?? []).length + (victory.match(/data-victory-primary/g) ?? []).length < 1) {
    fail("CTA_COUNT", "LessonVictory", "primary CTA must stay addressable");
  }
  if (!victory.includes("prefers-reduced-motion") || !victory.includes("soundEffects")) {
    fail("A11Y", "LessonVictory", "animation must respect reduced motion and sound preference");
  }
  if (!victory.includes("playedRef") && !victory.includes("playedRef.current")) {
    fail("REPLAY_XP", "LessonVictory", "victory animation must not grant XP again");
  }
  return { failures };
}

export function writeUnifiedLessonUxReport(rootDir, extra = {}) {
  const lines = [
    "# V4.9.8B.2 — Unified Lesson UX",
    "",
    "Última micro-remessa da V4.9.8. **Não** inicia V4.9.9.",
    "",
    "Speaking First + diálogos com revelação automática + Cultura na Jornada + Victory mínima.",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: extra.lessonCount ?? 0 }),
    "## Base",
    "",
    "| Campo | Valor |",
    "|-------|-------|",
    `| SHA obrigatória (\`main\` após merge #250) | \`${extra.baseSha ?? "ddc08aa57a7dad11a1033b3611e63618fd786a57"}\` |`,
    "| #250 | V4.9.8B.1 — Conversation phrase builder + Hanzi fill + lexical bridge |",
    "| Branch | `cursor/v498b2-unified-lesson-ux-6ae2` |",
    `| Fingerprint da Jornada | \`${extra.fingerprint ?? "003cb0ed7858"}\` |`,
    "| Tópicos de ensino | 113 (imersões continuam `isReview` + `curriculumRole: \"immersion\"`) |",
    "",
    "## O que esta remessa não faz",
    "",
    "Não inicia V4.9.9. Não reescreve a Jornada. Não cria LessonPlayer/CulturePlayer/ConversationPlayer novos. Não remove produção livre. Não esconde o Falar. Não copia o dashboard do Duolingo. Não reabre Culture playability / story audio / native lessons / rewards / Live Leagues, salvo regressão direta causada por esta UX.",
    "",
    "## Antes / depois",
    "",
    "| Superfície | Antes (#250) | Depois (8B.2) |",
    "|------------|--------------|---------------|",
    "| Falar | link `Ou falar a resposta` | botão primário `Falar` com `data-speech-state` idle/listening/processing |",
    "| Peças | retângulo de montagem | chips de palavra (`rounded-full` + `conversation-chip-in`); guided = hànzì+pinyin; assisted = hànzì; independent = sem chips |",
    "| Diálogo | `Ouça e toque para revelar` | NPC auto-revela; `audio_first` espera 700 ms ou revela se o autoplay bloquear |",
    "| Victory | dashboard + Culture Mission card | `LessonVictory` mínima: headline, estrelas, XP, precisão, 1 highlight, 0–1 foco, 1 CTA |",
    "| Cultura | card pós-aula + Salvar no player | aula normal na Jornada (`culture-{itemId}`); Hub e Jornada compartilham o id canônico |",
    "| Continuar | sempre Jornada | se o próximo nó for Cultura CORE, abre essa aula; mastery de tópico continua `preferJourney` |",
    "",
    "## Speaking hierarchy",
    "",
    "- Falar é ação primária quando o reconhecedor existe (mesmo avaliador: `evaluateLearnerResponse`).",
    "- Digitar permanece disponível; Montar aparece no guiado ou dentro de Preciso de ajuda no independent/transfer.",
    "- Três blocos gigantes não competem: Falar é `primary`, Digitar/Montar são `ghost`/`soft`.",
    "- Alvo de toque ≥ 44px (`min-h-11` / `--lesson-button-height: 2.75rem`).",
    "- Após o transcript: `[Usar resposta]` (`player.useAnswer`).",
    "- Falar continua visível com peças (`micOnly` + `data-testid=\"free-answer-mic\"`).",
    "",
    "## Cultura na Jornada",
    "",
    "- CORE no caminho; EXPLORE como nó lateral. No máximo um CORE por `afterTopicId`.",
    "- `canonicalLessonId` = `culture-{itemId}` no Hub (`CultureCard`) e no nó (`JourneyInlineNode`).",
    "- Lanterna + rótulo CULTURA (`culture.journeyNodeCore` / `LessonKindLabel`).",
    "- Títulos do nó com `line-clamp-2`.",
    "- Victory **não** monta `CultureTouchpoint`. O card permanece só na ficha `/licao/{id}` (e2e de hotel/hub/shopping/mobilidade).",
    "- Salvar para depois fica no Hub. LessonPlayer / Victory / ficha da aula não mostram o botão.",
    "",
    "## Victory mínima",
    "",
    "`buildLessonCompletionSummary()` é determinístico, sem LLM. Perfeito: ✨ Perfeito! e sem foco. Nunca emite `Continue estudando!`.",
    "",
    "Animação 1–2s no mascote existente; respeita `soundEffects` e `prefers-reduced-motion`. `playedRef` impede replay de SFX/XP no shell. O grant de XP continua no `LessonPlayer` (`claimedRewardCards`).",
    "",
    "Mesmo shell para culture / review / test / mission. CTA: `Receber recompensas` → `Continuar Jornada` / `Voltar à Jornada`. Opcional: Revisar erros.",
    "",
    "## Prompts naturalizados",
    "",
    "Reescrita só na exibição (`naturalizeConversationPrompt`). `conversationScenes.ts` não muda — fingerprint permanece `003cb0ed7858`.",
    "",
    "- `O que X responde com 我叫…` → `Mei perguntou seu nome. Como você responde?`",
    "- Nome do aluno vem de `currentUser.displayName` / `studentFirstName`. Mei / Wang / Lin continuam hardcoded.",
    "",
    "## Gates novos",
    "",
    "- `validate:lesson-ui-consistency` / `test:lesson-ui-consistency`",
    "- `validate:conversation-auto-reveal` / `test:conversation-auto-reveal`",
    "- `validate:culture-journey-placement` / `test:culture-journey-placement`",
    "- `validate:completion-experience` / `test:completion-experience`",
    "",
    "Preservados (#250 e anteriores): conversation-lexical-bridge, production-scaffolding, hanzi-fill-integration, china-survival hotel/airport/travel, culture-*, live-league, validate:beta, build.",
    "",
    "## Mutations",
    "",
    extra.mutations ??
      [
        "| # | Mutação | Código | Resultado |",
        "|---|---------|--------|-----------|",
        "| 1 | Falar volta a ser link sublinhado | SPEAK_LINK | KILLED |",
        "| 2 | Tokens de aula ausentes | TOKENS | KILLED |",
        "| 3 | Sem rótulo compartilhado | KIND_LABEL | KILLED |",
        "| 4 | Ouça e toque para revelar | TAP_REVEAL | KILLED |",
        "| 5 | NPC esconde o texto de novo | AUTO_REVEAL | KILLED |",
        "| 6 | CORE sem nó na Jornada | MISSING_NODE | KILLED |",
        "| 7 | Dois CORE no mesmo âncora | CONSECUTIVE_CORE | KILLED |",
        "| 8 | Culture card na Victory | POST_LESSON_CTA | KILLED |",
        "| 9 | Salvar para depois na aula | SAVE_FOR_LATER | KILLED |",
        "| 10 | Culture card / missions dashboard | CULTURE_CARD / DASHBOARD | KILLED |",
        "| 11 | Dois CTAs primários | CTA_COUNT | KILLED |",
        "| 12 | Continue estudando! | GENERIC_FOCUS | KILLED |",
        "",
      ].join("\n"),
    "",
    "## E2E",
    "",
    extra.e2e ??
      "`e2e/v498b2-unified-lesson-ux.spec.ts`: hotel Falar+peças sem tap-reveal; nó Cultura `culture-greetings-nihao`; Victory mínima sem card/save/nav; EN Type/Speak; viewport 390×844.",
    "",
    extra.notes ?? "",
    "",
  ];
  const out = path.join(rootDir, "docs/reports/v498b2-unified-lesson-ux.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, finalizeReport(lines));
  return out;
}
