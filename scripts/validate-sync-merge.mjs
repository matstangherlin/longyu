/** Valida merge de progresso local+remoto (espelha src/lib/syncMerge.ts). */

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

function mergeRemoteProgress(local, remote) {
  return {
    ...local,
    ...remote,
    completedLessons: unionUnique([...local.completedLessons, ...remote.completedLessons]),
    learnedChars: unionUnique([...local.learnedChars, ...remote.learnedChars]),
    learnedChunks: unionUnique([...local.learnedChunks, ...remote.learnedChunks]),
    lessonStarsById: maxLessonStars(local.lessonStarsById, remote.lessonStarsById),
    lessonTaskProgress: maxRecordValues(local.lessonTaskProgress, remote.lessonTaskProgress),
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
    isPremium: local.isPremium || remote.isPremium,
    placement: local.placement ?? remote.placement,
  };
}

const local = {
  completedLessons: ["l1"],
  learnedChars: ["char:ni"],
  learnedChunks: [],
  lessonStarsById: { l1: 2 },
  lessonTaskProgress: { l1: 3 },
  points: 10,
  xpTotal: 50,
  xpToday: 5,
  weeklyXp: 20,
  monthlyXp: 20,
  streak: 2,
  longestStreak: 2,
  dragonPearls: 0,
  streakShields: 0,
  srs: { "chunk:nihao": { due: 100, reps: 1 } },
  achievementsUnlocked: {},
  isPremium: false,
  placement: null,
};

const remote = {
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
  isPremium: false,
  placement: null,
};

const merged = mergeRemoteProgress(local, remote);
const errors = [];

if (!merged.completedLessons.includes("l1") || !merged.completedLessons.includes("l2")) {
  errors.push("completedLessons deveria unir l1 e l2");
}
if ((merged.lessonStarsById.l1 ?? 0) !== 3) errors.push("lessonStarsById deveria manter 3 estrelas em l1");
if (merged.xpTotal !== 80) errors.push("xpTotal deveria usar o maior valor");
if ((merged.srs["chunk:nihao"]?.due ?? 0) !== 200) errors.push("srs deveria preferir item com due mais recente");

if (errors.length > 0) {
  console.error("ERRO: validate:sync-merge falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:sync-merge passou.");
