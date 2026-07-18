const REQUIRED_TOP_KEYS = ["schemaVersion", "exportedAt", "snapshot"];
const REQUIRED_SNAPSHOT_KEYS = ["schemaVersion", "exportedAt", "account", "progress"];
const REQUIRED_ACCOUNT_KEYS = ["id", "name", "authMode", "createdAt", "updatedAt"];
const REQUIRED_PROGRESS_KEYS = [
  "completedLessons",
  "lessonTaskProgress",
  "learnedChars",
  "learnedChunks",
  "srs",
  "points",
  "dailyEnergy",
  "dailyTasks",
  "weeklyMissions",
  "monthlyMission",
  "missionHistory",
  "chests",
  "chestOpenHistory",
  "achievementsUnlocked",
  "achievementHistory",
  "placement",
  "xpTotal",
  "xpToday",
  "weeklyXp",
  "monthlyXp",
];

function validateFixture(name, fixture) {
  const errors = [];
  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in fixture)) errors.push(`${name}: falta ${key}`);
  }
  const snapshot = fixture.snapshot;
  if (snapshot) {
    for (const key of REQUIRED_SNAPSHOT_KEYS) {
      if (!(key in snapshot)) errors.push(`${name}.snapshot: falta ${key}`);
    }
    if (snapshot.account) {
      for (const key of REQUIRED_ACCOUNT_KEYS) {
        if (!(key in snapshot.account)) errors.push(`${name}.snapshot.account: falta ${key}`);
      }
    }
    if (snapshot.progress) {
      for (const key of REQUIRED_PROGRESS_KEYS) {
        if (!(key in snapshot.progress)) errors.push(`${name}.snapshot.progress: falta ${key}`);
      }
    }
  }
  return errors;
}

const fixture = {
  schemaVersion: 1,
  exportedAt: Date.now(),
  snapshot: {
    schemaVersion: 1,
    exportedAt: Date.now(),
    account: {
      id: "local",
      name: "Teste",
      authMode: "local",
      createdAt: 1,
      updatedAt: 1,
    },
    progress: Object.fromEntries(REQUIRED_PROGRESS_KEYS.map((key) => [key, key.endsWith("s") ? [] : key === "placement" ? null : 0])),
  },
};

fixture.snapshot.progress.srs = {};
fixture.snapshot.progress.lessonTaskProgress = {};
fixture.snapshot.progress.dailyEnergy = {};
fixture.snapshot.progress.dailyTasks = {};
fixture.snapshot.progress.weeklyMissions = {};
fixture.snapshot.progress.monthlyMission = {};
fixture.snapshot.progress.chests = {};
fixture.snapshot.progress.achievementsUnlocked = {};
// O histórico de conversas viaja no corpo do snapshot (acompanha a conta).
fixture.snapshot.progress.conversationHistory = [
  { sceneId: "pedir-agua", intent: "ask-water", lessonId: "l26", completedAt: 1, result: "completed", attempts: 1 },
];

const errors = validateFixture("fixture-v1", fixture);

// conversationHistory precisa sobreviver ao snapshot como um array de registros
// bem formados (mais recente primeiro, no máximo 100).
const history = fixture.snapshot.progress.conversationHistory;
if (!Array.isArray(history)) {
  errors.push("progress.conversationHistory deveria ser um array");
} else if (history.length > 100) {
  errors.push("progress.conversationHistory deveria respeitar o limite de 100 registros");
} else {
  for (const [index, entry] of history.entries()) {
    if (!entry?.sceneId || !entry?.intent) {
      errors.push(`conversationHistory[${index}] sem sceneId/intent`);
    }
    if (!["completed", "mistake", "abandoned"].includes(entry?.result)) {
      errors.push(`conversationHistory[${index}] com result inválido: ${entry?.result}`);
    }
  }
}

if (errors.length > 0) {
  console.error("ERRO: validate:progress-snapshot falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:progress-snapshot passou.");
