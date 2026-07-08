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

const errors = validateFixture("fixture-v1", fixture);
if (errors.length > 0) {
  console.error("ERRO: validate:progress-snapshot falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:progress-snapshot passou.");
