const CJK_RE = /[\u3400-\u9FFF]/u;
const GRADED = new Set([
  "contextual_choice",
  "fill_blank",
  "match_pairs",
  "sentence_build",
  "translation_build",
  "dialogue_choice",
  "spot_error",
  "image_choice",
  "free_production",
  "conversation_scene",
  "route_sequence",
]);

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function hasCjk(value) {
  return CJK_RE.test(String(value ?? ""));
}

export function affordanceFailures(step) {
  const kind = step?.kind;
  const errors = [];
  if (!kind) return ["passo sem kind"];
  if (kind === "contextual_choice" || kind === "dialogue_choice" || kind === "spot_error") {
    if ((step.options ?? []).length < 2) errors.push(`${kind}: options.length < 2`);
    if (!(step.correctAnswer ?? step.answer)) errors.push(`${kind}: sem resposta`);
  }
  if (kind === "fill_blank") {
    if (!(step.bank ?? []).length) errors.push("fill_blank sem bank/input");
    if (!step.blankAnswer) errors.push("fill_blank sem blankAnswer");
  }
  if (kind === "match_pairs") {
    if ((step.pairs ?? []).length < 2) errors.push("match_pairs: pairs.length < 2");
  }
  if (kind === "sentence_build" || kind === "translation_build" || kind === "route_sequence") {
    const parts = step.targetParts ?? step.target ?? step.routeParts ?? [];
    const bank = step.bank ?? [];
    if (parts.length < 2 && bank.length < 2) errors.push(`${kind} sem peças renderizáveis`);
  }
  if (kind === "image_choice") {
    if ((step.imageOptions ?? step.options ?? []).length < 2) errors.push("image_choice sem imagens/opções");
  }
  if (kind === "free_production") {
    if (!step.situationPt && !step.prompt) errors.push("free_production sem campo/situação");
  }
  if (kind === "conversation_scene") {
    if (!(step.nodes ?? step.lines ?? []).length) errors.push("conversation_scene sem interação");
  }
  return errors;
}

export function validateExerciseAffordance(data) {
  const { fail, failures } = failList();
  for (const lesson of [...(data.nativeLessons ?? []), ...(data.lessons ?? [])]) {
    for (const [index, step] of (lesson.steps ?? []).entries()) {
      if (!GRADED.has(step.kind) && step.pedagogicalEvidence?.graded !== true) continue;
      for (const error of affordanceFailures(step)) {
        fail("NO_AFFORDANCE", `${lesson.id}#${index}:${step.kind}`, error);
      }
    }
  }
  return { failures };
}

export function validateCulturePlayability(data) {
  const { fail, failures } = failList();
  const native = data.nativeLessons ?? [];
  if (native.length !== 20) fail("COVERAGE", "catalog", `expected 20 culture lessons, found ${native.length}`);
  for (const lesson of native) {
    const scored = (lesson.steps ?? []).filter(
      (step) => GRADED.has(step.kind) || step.pedagogicalEvidence?.graded === true
    );
    if (scored.length === 0) fail("STORY_NO_ACTIVITY", lesson.id, "culture lesson has no scored step");
    for (const [index, step] of scored.entries()) {
      const errors = affordanceFailures(step);
      for (const error of errors) fail("NO_AFFORDANCE", `${lesson.id}:${step.kind}:${index}`, error);
      const prompt = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""}`;
      if (/ordene|order the/i.test(prompt) && (step.targetParts ?? step.target ?? step.bank ?? []).length < 2) {
        fail("NO_AFFORDANCE", `${lesson.id}:order`, "Ordene without pieces");
      }
      if (/preencha|fill/i.test(prompt) && step.kind === "fill_blank" && !(step.bank ?? []).length) {
        fail("NO_AFFORDANCE", `${lesson.id}:fill`, "Preencha without bank");
      }
      if (/combine|match/i.test(prompt) && step.kind === "match_pairs" && (step.pairs ?? []).length < 2) {
        fail("NO_AFFORDANCE", `${lesson.id}:match`, "Combine without pairs");
      }
      if (/escolha|choose/i.test(prompt) && ["contextual_choice", "dialogue_choice", "image_choice"].includes(step.kind)) {
        const n = (step.options ?? step.imageOptions ?? []).length;
        if (n < 2) fail("NO_AFFORDANCE", `${lesson.id}:choice`, "Escolha without options");
      }
    }
  }
  const qingwen = native.find((lesson) => lesson.id === "culture-qingwen-ask");
  if (qingwen && !(qingwen.steps ?? []).some((step) => step.kind === "sentence_build")) {
    fail("FAKE_SEQUENCE", "culture-qingwen-ask", "canonical lesson must use a real sentence_build engine");
  }
  const player = data.lessonPlayerSource ?? "";
  if (player.includes('data-testid="culture-save"') || /culture\.saveForLater/.test(player)) {
    fail("SAVE_IN_PLAYER", "LessonPlayer", "Salvar para depois inside LessonPlayer");
  }
  if ((data.cultureReviewSource ?? "").includes("culture-seq-")) {
    fail("FAKE_SEQUENCE", "CultureReviewPage", "review still uses custom sequence overlay");
  }
  return { failures };
}

export function validateCultureStoryAudio(data) {
  const { fail, failures } = failList();
  const flagship = new Set(data.storyFlagshipIds ?? data.flagshipIds ?? []);
  const player = data.lessonPlayerSource ?? "";
  const stepsSource = data.stepsSource ?? "";
  if (player.includes("CultureTTS") || (data.cultureHubSource ?? "").includes("CultureTTS")) {
    fail("CUSTOM_TTS", "catalog", "do not create CultureTTS");
  }
  if (stepsSource && !/culture-story-audio/.test(stepsSource) && !/MandarinText/.test(stepsSource)) {
    fail("NO_AUDIO", "StepIntro", "story beats need SpeakButton/MandarinText");
  }
  for (const lesson of data.nativeLessons ?? []) {
    const itemId = lesson.cultureItemId ?? String(lesson.id ?? "").replace(/^culture-/, "");
    if (!flagship.has(itemId)) continue;
    const speech = (lesson.steps ?? []).filter(
      (step) => step.kind === "intro" && (step.hanzi || step.audioText) && hasCjk(step.hanzi ?? step.audioText)
    );
    if (speech.length === 0) {
      fail("NO_AUDIO", itemId, "flagship story has no Mandarin speech with audio");
      continue;
    }
    for (const step of speech) {
      if (!String(step.audioText ?? step.hanzi ?? "").trim()) {
        fail("NO_AUDIO", `${itemId}:${step.title}`, "Mandarin line without audioText");
      }
      if (!step.speaker) fail("NO_STORY", `${itemId}:${step.title}`, "speech beat missing character");
    }
    const storyish = (lesson.steps ?? []).filter((step) => step.kind === "intro" && step.speaker);
    if (storyish.length === 0) fail("NO_STORY", itemId, "flagship missing character + situation story beat");
  }
  if ((data.lessonPlayerSource ?? "") && !/SpeakButton|MandarinText|useAutoSpeak/.test(data.stepsSource ?? "")) {
    // stepsSource optional; player already uses TTS elsewhere
  }
  return { failures };
}

export function validateCultureRewards(data) {
  const { fail, failures } = failList();
  const player = data.lessonPlayerSource ?? "";
  const store = data.storeSource ?? "";
  if (player && !/LESSON_BASE_XP/.test(player)) fail("NO_REWARD", "LessonPlayer", "culture victory must use LESSON_BASE_XP");
  if (player && !/LESSON_THREE_STAR_XP_BONUS/.test(player)) {
    fail("NO_PERFECT", "LessonPlayer", "perfect bonus must use LESSON_THREE_STAR_XP_BONUS");
  }
  if (player && !/firstCompletion/.test(player)) fail("REPLAY_XP", "LessonPlayer", "replay must gate on firstCompletion");
  if (store && !/grantXp: false/.test(store)) fail("REPLAY_XP", "store", "native completion must skip culture-complete XP");
  if (player && !/leagueXpKeyLesson/.test(player)) {
    fail("LEAGUE_XP", "LessonPlayer", "culture XP must reuse leagueXpKeyLesson");
  }
  if (player && /cultureLeagueXpSync/.test(player)) {
    fail("LEAGUE_XP", "LessonPlayer", "do not create a separate cultureLeagueXpSync");
  }
  if (player && !/culture-xp/.test(player)) fail("NO_REWARD", "LessonPlayer", "victory must show culture-xp");
  if (player && !/culture\.lessonComplete/.test(player) && !/Cultura concluída/.test(player)) {
    fail("NO_REWARD", "LessonPlayer", "victory must show Cultura concluída");
  }
  return { failures };
}

export function validateLiveLeague(data) {
  const { fail, failures } = failList();
  const hook = data.leagueHookSource ?? "";
  const page = data.ligasPageSource ?? "";
  const service = data.leagueServiceSource ?? "";
  const view = data.leagueLiveViewSource ?? "";
  if (view && !/allowBots: false/.test(view)) fail("BOTS_AS_REAL", "leagueLiveView", "cloud surfaces must forbid bots");
  if (hook && !/resolveLeagueSurface/.test(hook)) fail("BOTS_AS_REAL", "useLeagueData", "must use resolveLeagueSurface");
  if (hook && /generateLeagueBots/.test(hook) && !/surface.allowBots/.test(hook)) {
    fail("BOTS_AS_REAL", "useLeagueData", "bots must be gated by allowBots");
  }
  if (page && !/league-error-banner|Não foi possível carregar a liga/.test(page)) {
    fail("SILENT_DEMO", "LigasPage", "RPC error must show retry, not silent demo");
  }
  if (page && !/league-retry|Tentar novamente/.test(page)) {
    fail("SILENT_DEMO", "LigasPage", "error state needs retry");
  }
  if (page && !/league-xp/.test(page)) fail("NO_WEEKLY_XP", "LigasPage", "standings must show weekly XP");
  if (service && /email/.test(service) && /parseStandings[\s\S]{0,400}email/.test(service)) {
    fail("PRIVACY", "leagueService", "standings must not expose email");
  }
  if (service && !/Aluno/.test(service)) fail("DISPLAY_NAME", "leagueService", "empty display_name must fall back to Aluno");
  if (service && /Aluno [Dd]emo/.test(service) && !/aluno\\s\*demo/.test(service)) {
    fail("DISPLAY_NAME", "leagueService", "live fallback must not be Aluno Demo");
  }
  const sql = data.leagueSqlSource ?? "";
  if (sql && /get_league_standings[\s\S]{0,800}select[\s\S]{0,900}\bemail\b/.test(sql)) {
    fail("PRIVACY", "get_league_standings", "RPC must not select email");
  }
  if (sql && !/auth\.uid\(\)/.test(sql)) fail("RPC_SECURITY", "leagues sql", "RPCs must bind auth.uid");
  if (sql && !/on conflict \(user_id, source_key\)/.test(sql)) {
    fail("RPC_SECURITY", "add_league_weekly_xp", "league XP must be idempotent by source_key");
  }
  if (hook && !/sessionResolved/.test(hook)) {
    fail("BOTS_AS_REAL", "useLeagueData", "must resolve cloud session before showing demo bots");
  }
  return { failures };
}

export function auditCultureLessons(nativeLessons = []) {
  return nativeLessons.map((lesson) => {
    const steps = lesson.steps ?? [];
    const scored = steps.filter((step) => GRADED.has(step.kind) || step.pedagogicalEvidence?.graded === true);
    const speech = steps.filter(
      (step) => step.kind === "intro" && (step.hanzi || step.audioText) && hasCjk(step.hanzi ?? step.audioText)
    );
    const storyBeats = steps.filter((step) => step.kind === "intro" && step.speaker);
    return {
      lessonId: lesson.id,
      steps: steps.length,
      interactiveSteps: scored.length,
      audioBeats: speech.length,
      storyBeats: storyBeats.length,
      kinds: [...new Set(scored.map((step) => step.kind))],
      affordance: scored.flatMap((step) => affordanceFailures(step)),
    };
  });
}
