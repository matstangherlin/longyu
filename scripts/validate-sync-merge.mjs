/** Valida merge de progresso local+remoto e guardrails do sync cloud. */

function unionUnique(values) {
  return [...new Set(values)];
}

function maxRecordValues(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged = {};
  for (const key of keys) {
    merged[key] = Math.max(a[key] ?? 0, b[key] ?? 0);
  }
  return merged;
}

function maxLessonStars(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged = {};
  for (const key of keys) {
    merged[key] = Math.min(3, Math.max(a[key] ?? 0, b[key] ?? 0));
  }
  return merged;
}

function uniqueById(items) {
  const byId = new Map();
  items.forEach((item, index) => {
    const key = item.id?.trim() || `idx:${index}:${JSON.stringify(item)}`;
    byId.set(key, item);
  });
  return [...byId.values()];
}

function sortByTimestampDesc(items, pickTimestamp) {
  return [...items].sort((a, b) => pickTimestamp(b) - pickTimestamp(a));
}

function mergeConversationHistory(local, remote) {
  const richness = (entry) =>
    (entry.assistanceLevel ? 1 : 0) +
    (entry.mainAnswer ? 1 : 0) +
    (entry.setting ? 1 : 0) +
    (entry.errorRefs?.length ?? 0) +
    (entry.attempts > 1 ? 1 : 0) +
    (entry.result === "mistake" || entry.result === "abandoned" ? 1 : 0);
  const byKey = new Map();
  for (const entry of [...(local ?? []), ...(remote ?? [])]) {
    if (!entry?.sceneId) continue;
    const key = `${entry.sceneId}:${entry.lessonId ?? ""}:${entry.completedAt ?? 0}`;
    const previous = byKey.get(key);
    if (!previous || richness(entry) > richness(previous)) byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 100);
}

function mergeSrs(local, remote) {
  const merged = { ...local };
  for (const [key, remoteItem] of Object.entries(remote)) {
    const localItem = merged[key];
    if (!localItem) {
      merged[key] = remoteItem;
      continue;
    }
    const remoteDue = remoteItem.due ?? 0;
    const localDue = localItem.due ?? 0;
    merged[key] = remoteDue >= localDue ? remoteItem : localItem;
  }
  return merged;
}

function hasAnyPositiveValue(values) {
  if (!values) return false;
  return Object.values(values).some((value) => Number(value) > 0);
}

function countPositiveValues(values) {
  if (!values) return 0;
  return Object.values(values).filter((value) => Number(value) > 0).length;
}

function countObjectKeys(values) {
  return values ? Object.keys(values).length : 0;
}

function chestInventoryScore(chests) {
  if (!chests) return 0;
  return Object.values(chests).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

function isMeaningfulProgress(source) {
  const progress = source?.snapshot?.progress ?? source;
  if (!progress) return false;
  return (
    (progress.completedLessons?.length ?? 0) > 0 ||
    hasAnyPositiveValue(progress.lessonStarsById) ||
    hasAnyPositiveValue(progress.lessonTaskProgress) ||
    (progress.learnedChars?.length ?? 0) > 0 ||
    (progress.learnedChunks?.length ?? 0) > 0 ||
    countObjectKeys(progress.srs) > 0 ||
    (progress.xpTotal ?? 0) > 0 ||
    (progress.points ?? 0) > 0 ||
    (progress.streak ?? 0) > 0 ||
    countObjectKeys(progress.achievementsUnlocked) > 0 ||
    chestInventoryScore(progress.chests) > 0 ||
    (progress.rewardHistory?.length ?? 0) > 0 ||
    progress.placement != null
  );
}

function getProgressScore(source) {
  const progress = source?.snapshot?.progress ?? source;
  if (!progress) return 0;
  const totalStars = Object.values(progress.lessonStarsById ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const lessonTaskUnits = Object.values(progress.lessonTaskProgress ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return (
    (progress.completedLessons?.length ?? 0) * 100 +
    totalStars * 25 +
    lessonTaskUnits * 10 +
    (progress.learnedChars?.length ?? 0) * 8 +
    (progress.learnedChunks?.length ?? 0) * 8 +
    countObjectKeys(progress.srs) * 12 +
    Math.max(0, progress.xpTotal ?? 0) +
    Math.max(0, progress.points ?? 0) * 2 +
    Math.max(0, progress.streak ?? 0) * 20 +
    countObjectKeys(progress.achievementsUnlocked) * 30 +
    (progress.rewardHistory?.length ?? 0) * 10 +
    chestInventoryScore(progress.chests) * 10 +
    (progress.placement ? 40 : 0) +
    countPositiveValues(progress.correctedMistakes) * 4 +
    (progress.recentErrors?.length ?? 0) * 2 +
    (progress.recentActivityErrors?.length ?? 0) * 2 +
    (progress.journeyChestsOpened?.length ?? 0) * 5 +
    (progress.validatedModules?.length ?? 0) * 12
  );
}

function mergeRemoteProgress(local, remote) {
  const primary = getProgressScore(local) >= getProgressScore(remote) ? local : remote;
  const secondary = primary === local ? remote : local;
  return {
    ...secondary,
    ...primary,
    completedLessons: unionUnique([...local.completedLessons, ...remote.completedLessons]),
    learnedChars: unionUnique([...local.learnedChars, ...remote.learnedChars]),
    learnedChunks: unionUnique([...local.learnedChunks, ...remote.learnedChunks]),
    badges: unionUnique([...(local.badges ?? []), ...(remote.badges ?? [])]),
    favoriteItems: unionUnique([...(local.favoriteItems ?? []), ...(remote.favoriteItems ?? [])]),
    ownedCosmetics: unionUnique([...(local.ownedCosmetics ?? []), ...(remote.ownedCosmetics ?? [])]),
    journeyChestsOpened: unionUnique([...(local.journeyChestsOpened ?? []), ...(remote.journeyChestsOpened ?? [])]),
    validatedModules: unionUnique([...(local.validatedModules ?? []), ...(remote.validatedModules ?? [])]),
    lessonStarsById: maxLessonStars(local.lessonStarsById, remote.lessonStarsById),
    lessonTaskProgress: maxRecordValues(local.lessonTaskProgress, remote.lessonTaskProgress),
    correctedMistakes: maxRecordValues(local.correctedMistakes, remote.correctedMistakes),
    points: Math.max(local.points, remote.points),
    xpTotal: Math.max(local.xpTotal, remote.xpTotal),
    xpToday: Math.max(local.xpToday, remote.xpToday),
    weeklyXp: Math.max(local.weeklyXp, remote.weeklyXp),
    monthlyXp: Math.max(local.monthlyXp, remote.monthlyXp),
    streak: Math.max(local.streak, remote.streak),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    dragonPearls: Math.max(local.dragonPearls, remote.dragonPearls),
    streakShields: Math.max(local.streakShields, remote.streakShields),
    srs: mergeSrs(local.srs, remote.srs),
    achievementsUnlocked: { ...remote.achievementsUnlocked, ...local.achievementsUnlocked },
    achievementHistory: sortByTimestampDesc(uniqueById([...(local.achievementHistory ?? []), ...(remote.achievementHistory ?? [])]), (item) => item.unlockedAt ?? 0),
    rewardHistory: sortByTimestampDesc(uniqueById([...(local.rewardHistory ?? []), ...(remote.rewardHistory ?? [])]), (item) => item.claimedAt ?? 0),
    chestOpenHistory: sortByTimestampDesc(uniqueById([...(local.chestOpenHistory ?? []), ...(remote.chestOpenHistory ?? [])]), (item) => item.openedAt ?? 0),
    purchaseHistory: sortByTimestampDesc(uniqueById([...(local.purchaseHistory ?? []), ...(remote.purchaseHistory ?? [])]), (item) => item.purchasedAt ?? 0),
    missionHistory: sortByTimestampDesc(uniqueById([...(local.missionHistory ?? []), ...(remote.missionHistory ?? [])]), (item) => item.claimedAt ?? 0),
    medals: sortByTimestampDesc(uniqueById([...(local.medals ?? []), ...(remote.medals ?? [])]), (item) => item.earnedAt ?? 0),
    mistakeHistory: sortByTimestampDesc(uniqueById([...(local.mistakeHistory ?? []), ...(remote.mistakeHistory ?? [])]), (item) => item.createdAt ?? 0),
    recentErrors: sortByTimestampDesc(uniqueById([...(local.recentErrors ?? []), ...(remote.recentErrors ?? [])]), (item) => item.createdAt ?? 0),
    recentActivityErrors: sortByTimestampDesc(uniqueById([...(local.recentActivityErrors ?? []), ...(remote.recentActivityErrors ?? [])]), (item) => item.timestamp ?? 0),
    conversationHistory: mergeConversationHistory(local.conversationHistory, remote.conversationHistory),
    inventory: maxRecordValues(local.inventory, remote.inventory),
    chests: maxRecordValues(local.chests, remote.chests),
    leagueHistory: sortByTimestampDesc(uniqueById([...(local.leagueHistory ?? []), ...(remote.leagueHistory ?? [])]), (item) => item.createdAt ?? 0).slice(0, 24),
    leagueJoinedAt:
      local.leagueJoinedAt == null
        ? remote.leagueJoinedAt
        : remote.leagueJoinedAt == null
        ? local.leagueJoinedAt
        : Math.min(local.leagueJoinedAt, remote.leagueJoinedAt),
    leagueBots: (local.leagueBots?.length ?? 0) >= (remote.leagueBots?.length ?? 0) ? local.leagueBots : remote.leagueBots,
    isPremium: local.isPremium || remote.isPremium,
    placement: local.placement ?? remote.placement,
  };
}

function baseProgress(overrides = {}) {
  return {
    completedLessons: [],
    learnedChars: [],
    learnedChunks: [],
    badges: [],
    favoriteItems: [],
    ownedCosmetics: [],
    journeyChestsOpened: [],
    validatedModules: [],
    lessonStarsById: {},
    lessonTaskProgress: {},
    correctedMistakes: {},
    points: 0,
    xpTotal: 0,
    xpToday: 0,
    weeklyXp: 0,
    monthlyXp: 0,
    streak: 0,
    longestStreak: 0,
    dragonPearls: 0,
    streakShields: 0,
    srs: {},
    achievementsUnlocked: {},
    achievementHistory: [],
    rewardHistory: [],
    chestOpenHistory: [],
    purchaseHistory: [],
    missionHistory: [],
    medals: [],
    mistakeHistory: [],
    recentErrors: [],
    recentActivityErrors: [],
    conversationHistory: [],
    inventory: {},
    chests: { small: 0, dragon: 0, monthly: 0, legendary: 0 },
    leagueHistory: [],
    leagueJoinedAt: null,
    leagueBots: [],
    isPremium: false,
    placement: null,
    ...overrides,
  };
}

const local = baseProgress({
  completedLessons: ["l1"],
  learnedChars: ["char:ni"],
  lessonStarsById: { l1: 2 },
  lessonTaskProgress: { l1: 3 },
  correctedMistakes: { "l1:q1": 1 },
  points: 10,
  xpTotal: 50,
  xpToday: 5,
  weeklyXp: 20,
  monthlyXp: 20,
  streak: 2,
  longestStreak: 2,
  srs: { "chunk:nihao": { due: 100, reps: 1 } },
  recentActivityErrors: [{ id: "activity-local", timestamp: 100 }],
  rewardHistory: [{ id: "reward-local", claimedAt: 100, type: "qi", amount: 5, source: "local" }],
  conversationHistory: [
    { sceneId: "pedir-agua", intent: "ask-water", lessonId: "l26", completedAt: 100, result: "completed", attempts: 1 },
  ],
});

const remote = baseProgress({
  completedLessons: ["l2"],
  learnedChars: ["char:hao"],
  learnedChunks: ["chunk:xiexie"],
  lessonStarsById: { l1: 3, l2: 2 },
  lessonTaskProgress: { l2: 2 },
  points: 5,
  xpTotal: 80,
  xpToday: 2,
  weeklyXp: 10,
  monthlyXp: 40,
  streak: 1,
  longestStreak: 3,
  dragonPearls: 1,
  streakShields: 1,
  srs: { "chunk:nihao": { due: 200, reps: 2 } },
  achievementsUnlocked: { first_lesson: 1 },
  recentErrors: [{ id: "mistake-remote", createdAt: 300 }],
  chestOpenHistory: [{ id: "chest-remote", openedAt: 200 }],
  chests: { small: 1, dragon: 0, monthly: 0, legendary: 0 },
  conversationHistory: [
    { sceneId: "onde-esta", intent: "ask-where", lessonId: "l25", completedAt: 300, result: "completed", attempts: 1 },
    // Mesma chave da entrada local (cena+lição+timestamp) — deve deduplicar.
    { sceneId: "pedir-agua", intent: "ask-water", lessonId: "l26", completedAt: 100, result: "mistake", attempts: 2 },
  ],
});

function decideSync(localProgress, remoteProgress) {
  const localMeaningful = isMeaningfulProgress(localProgress);
  const remoteMeaningful = isMeaningfulProgress(remoteProgress);
  if (remoteProgress && !localMeaningful && remoteMeaningful) return "restore_remote";
  if (remoteProgress && localMeaningful) return "merge_and_push";
  if (!remoteProgress && localMeaningful) return "push_local";
  return "create_initial";
}

const merged = mergeRemoteProgress(local, remote);
const errors = [];

if (!merged.completedLessons.includes("l1") || !merged.completedLessons.includes("l2")) {
  errors.push("completedLessons deveria unir l1 e l2");
}
if ((merged.lessonStarsById.l1 ?? 0) !== 3) errors.push("lessonStarsById deveria manter 3 estrelas em l1");
if (merged.xpTotal !== 80) errors.push("xpTotal deveria usar o maior valor");
if ((merged.srs["chunk:nihao"]?.due ?? 0) !== 200) errors.push("srs deveria preferir item com due mais recente");
if ((merged.lessonTaskProgress.l2 ?? 0) !== 2 || (merged.lessonTaskProgress.l1 ?? 0) !== 3) {
  errors.push("lessonTaskProgress deveria preservar progresso dos dois lados");
}
if ((merged.correctedMistakes["l1:q1"] ?? 0) !== 1) errors.push("correctedMistakes deveria ser preservado");
if ((merged.recentActivityErrors?.length ?? 0) !== 1) errors.push("recentActivityErrors deveria ser preservado");
if ((merged.recentErrors?.length ?? 0) !== 1) errors.push("recentErrors deveria ser preservado");
if ((merged.chests?.small ?? 0) !== 1) errors.push("chests deveria preservar inventário relevante");

// Histórico de conversas acompanha a conta na nuvem: une os dois lados,
// deduplicando por (cena+lição+timestamp) e mantendo mais recente primeiro.
if ((merged.conversationHistory?.length ?? 0) !== 2) {
  errors.push(`conversationHistory deveria unir e deduplicar (esperado 2, obteve ${merged.conversationHistory?.length ?? 0})`);
}
if (merged.conversationHistory?.[0]?.sceneId !== "onde-esta") {
  errors.push("conversationHistory deveria ordenar por completedAt desc (onde-esta primeiro)");
}
if (!merged.conversationHistory?.some((entry) => entry.sceneId === "pedir-agua")) {
  errors.push("conversationHistory deveria preservar a entrada compartilhada (pedir-agua)");
}
const pedirAgua = merged.conversationHistory?.find((entry) => entry.sceneId === "pedir-agua");
if (pedirAgua && pedirAgua.result !== "mistake") {
  errors.push("merge de histórico deveria preferir a entrada mais rica (mistake/attempts) na mesma chave");
}

// Troca de conta não mistura históricos: cada conta mescla apenas o seu próprio
// local+remoto; o histórico de outra conta nunca aparece no resultado.
const accountA = baseProgress({
  completedLessons: ["l1"],
  conversationHistory: [{ sceneId: "pedir-cha", intent: "ask-tea", lessonId: "l27", completedAt: 10, result: "completed", attempts: 1 }],
});
const accountB = baseProgress({
  completedLessons: ["l2"],
  conversationHistory: [{ sceneId: "sala-de-aula", intent: "classroom-intro", lessonId: "p3", completedAt: 20, result: "completed", attempts: 1 }],
});
const mergedA = mergeRemoteProgress(accountA, baseProgress({ conversationHistory: accountA.conversationHistory }));
if (mergedA.conversationHistory?.some((entry) => entry.sceneId === "sala-de-aula")) {
  errors.push("troca de conta: histórico da conta A não deveria conter cenas da conta B");
}
if (!mergedA.conversationHistory?.some((entry) => entry.sceneId === "pedir-cha")) {
  errors.push("troca de conta: histórico da conta A deveria preservar as suas próprias cenas");
}

// Campos ricos do loop → SRS sobrevivem ao merge (assistanceLevel / errorRefs / setting).
const richLocal = baseProgress({
  conversationHistory: [
    {
      sceneId: "primeiro-cumprimento",
      intent: "greet",
      lessonId: "l1",
      completedAt: 50,
      result: "mistake",
      attempts: 2,
      assistanceLevel: "guided",
      mainAnswer: "你好",
      errorRefs: ["chunk:nihao"],
      setting: "school",
    },
  ],
});
const richRemote = baseProgress({
  conversationHistory: [
    {
      sceneId: "pedir-agua",
      intent: "ask-water",
      lessonId: "l26",
      completedAt: 90,
      result: "completed",
      attempts: 1,
      assistanceLevel: "independent",
      setting: "home",
    },
  ],
});
const richMerged = mergeRemoteProgress(richLocal, richRemote);
const richGreet = richMerged.conversationHistory?.find((entry) => entry.sceneId === "primeiro-cumprimento");
if (!richGreet || richGreet.assistanceLevel !== "guided" || richGreet.errorRefs?.[0] !== "chunk:nihao") {
  errors.push("merge deveria preservar assistanceLevel/errorRefs do histórico de conversa");
}
if (!richMerged.conversationHistory?.some((entry) => entry.assistanceLevel === "independent" && entry.setting === "home")) {
  errors.push("merge deveria preservar setting/assistanceLevel do remoto");
}

// Limite de 100 registros preservado no merge.
const longHistory = Array.from({ length: 80 }, (_, i) => ({
  sceneId: `s${i}`,
  intent: `i${i}`,
  lessonId: `l${i}`,
  completedAt: 1000 + i,
  result: "completed",
  attempts: 1,
}));
const mergedLong = mergeRemoteProgress(
  baseProgress({ conversationHistory: longHistory }),
  baseProgress({ conversationHistory: longHistory.map((entry) => ({ ...entry, completedAt: entry.completedAt + 1000 })) })
);
if ((mergedLong.conversationHistory?.length ?? 0) > 100) {
  errors.push(`conversationHistory deveria respeitar o limite de 100 (obteve ${mergedLong.conversationHistory?.length})`);
}

const emptyLocal = baseProgress();
if (isMeaningfulProgress(emptyLocal)) errors.push("snapshot vazio não deveria ser considerado progresso significativo");
if (!isMeaningfulProgress(remote)) errors.push("snapshot remoto avançado deveria ser considerado significativo");
if (decideSync(emptyLocal, remote) !== "restore_remote") errors.push("local vazio + remoto avançado deveria restaurar remoto");
if (decideSync(local, remote) !== "merge_and_push") errors.push("local com progresso + remoto com progresso deveria mesclar");
if (decideSync(local, null) !== "push_local") errors.push("sem remoto + local com progresso deveria enviar local");
if (decideSync(emptyLocal, null) !== "create_initial") errors.push("sem remoto + local vazio deveria criar snapshot inicial");

const remoteScore = getProgressScore(remote);
const emptyScore = getProgressScore(emptyLocal);
if (!(remoteScore > emptyScore)) errors.push("progressScore deveria ranquear remoto avançado acima do vazio");
if (!(remoteScore > getProgressScore(local) || getProgressScore(local) > 0)) {
  errors.push("progressScore deveria produzir valor positivo para progresso real");
}

if (!(emptyScore < remoteScore && isMeaningfulProgress(remote))) {
  errors.push("local vazio nunca deve poder sobrescrever remoto avançado");
}

const tabA = mergeRemoteProgress(baseProgress({ completedLessons: ["p1"], lessonStarsById: { p1: 3 }, lessonTaskProgress: { p1: 6 } }), baseProgress());
const tabBDecision = decideSync(baseProgress(), tabA);
if (tabBDecision !== "restore_remote") errors.push("nova aba deve restaurar progresso da aba A");
if ((tabA.completedLessons?.length ?? 0) === 0 || countObjectKeys(tabA.lessonStarsById) === 0 || countObjectKeys(tabA.lessonTaskProgress) === 0) {
  errors.push("restauração remota deve manter completedLessons, lessonStarsById e lessonTaskProgress");
}

if (errors.length > 0) {
  console.error("ERRO: validate:sync-merge falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:sync-merge passou.");
