/**
 * Cria/atualiza a conta de QA teste@longyu.app com Pro interno e jornada 100% concluída.
 *
 * Uso:
 *   npm run seed:test-account
 *
 * Opcional em .env.local:
 *   SUPABASE_ACCESS_TOKEN=sbp_...   # aplica SQL de assinatura Pro
 *   SUPABASE_SERVICE_ROLE_KEY=...   # alternativa para inserir subscription
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const require = createRequire(import.meta.url);
const root = projectRoot();
const env = mergedEnv();

const TEST_EMAIL = "teste@longyu.app";
const TEST_PASSWORD = "teste999";
const TEST_NAME = "Conta Teste Longyu";
const TEST_USER_ID = "8fb6237b-5c98-4169-8331-b36efd228769";

const url = (env.VITE_SUPABASE_URL ?? "https://drjcfalvlbbeblmmyhwj.supabase.co").replace(/\/$/, "");
const anon = env.VITE_SUPABASE_ANON_KEY;
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";

if (!anon) {
  console.error("VITE_SUPABASE_ANON_KEY ausente.");
  process.exit(1);
}

async function loadJourneyModule() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-seed-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/journey.ts",
        "src/data/microtexts.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/vocabulary.ts",
        "src/data/domains.ts",
        "src/features/lesson/steps.tsx",
        "src/features/lesson/lessonTasks.ts",
        "src/data/hanziBuilder.ts",
        "src/data/types.ts",
      ],
      {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        rootDir: root,
        outDir,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
        skipLibCheck: true,
        strict: true,
      }
    );
    const emit = program.emit();
    if (emit.emitSkipped) {
      throw new Error("Falha ao compilar journey para seed");
    }
    return require(path.join(outDir, "src/data/journey.js"));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMaxedProgress({ ALL_LESSONS, JOURNEY }) {
  const now = Date.now();
  const date = todayKey();
  const completedLessons = ALL_LESSONS.map((lesson) => lesson.id);
  const lessonStarsById = Object.fromEntries(completedLessons.map((id) => [id, 3]));
  const lessonTaskProgress = Object.fromEntries(completedLessons.map((id) => [id, 99]));
  const validatedModules = JOURNEY.flatMap((phase) => phase.units.map((unit) => unit.id));
  const learnedChars = ["你", "好", "谢", "我", "是", "不", "会", "说", "中", "文"];
  const learnedChunks = ["nihao", "xiexie", "women", "zhongguo", "wobuzhidao"];

  return {
    completedLessons,
    lessonStarsById,
    lessonTaskProgress,
    lessonAttemptsById: {},
    currentLessonAttempt: null,
    mistakeHistory: [],
    correctedMistakes: {},
    recentErrors: [],
    recentActivityErrors: [],
    learnedChars,
    learnedChunks,
    hanziBuilderProgressByChar: {},
    srs: {},
    toneTrainer: {},
    today: { date, som: 30, fala: 30, hanzi: 30, leitura: 30 },
    dailyTasks: {
      date,
      reviewsDone: 5,
      lessonsDone: 3,
      minutesStudied: 60,
      tonesTrained: 20,
      microtextsRead: 2,
      errorsCorrected: 5,
      threeStarLessons: 2,
      claimedMissions: {},
    },
    dailyEnergy: {
      date,
      charges: 5,
      maxCharges: 5,
      usedCharges: 0,
      bonusChargesClaimed: {},
    },
    immersionDaily: { date, completedSessionIds: [] },
    streak: 30,
    longestStreak: 30,
    lastActive: date,
    points: 500,
    dragonPearls: 12,
    streakShields: 3,
    badges: ["Precisão Serena"],
    rewardHistory: [],
    favoriteItems: [],
    isPremium: false,
    placement: {
      level: "hanzi",
      label: "Avançado",
      score: 100,
      targetLessonId: completedLessons[completedLessons.length - 1] ?? "l30",
      skippedLessonIds: completedLessons,
      takenAt: now,
    },
    dailyMissions: { date, progress: {}, claimed: {} },
    weeklyMissions: { weekKey: weekKey(), lessons: 20, reviews: 10, tones: 10, premiumStories: 2, claimed: {} },
    monthlyMission: { monthKey: monthKey(), completed: 500, claimed: false },
    missionHistory: [],
    medals: [],
    inventory: {},
    ownedCosmetics: [],
    purchaseHistory: [],
    chests: { small: 2, dragon: 1, monthly: 1, legendary: 0 },
    chestOpenHistory: [],
    journeyChestsOpened: [],
    leagueTier: "gold",
    leagueJoinedAt: now,
    leagueBots: [],
    leagueHistory: [],
    lifetimeStats: {
      lessonsCompleted: completedLessons.length,
      reviewsDone: 100,
      chestsOpened: 5,
      missionsClaimed: 10,
      streakDays: 30,
    },
    achievementsUnlocked: {
      "jornada-primeira-licao": now,
      "jornada-dez-licoes": now,
    },
    achievementHistory: [],
    focusPassUntil: null,
    validatedModules,
    xpTotal: 5000,
    xpToday: 120,
    weeklyXp: 800,
    monthlyXp: 2500,
    xpDayKey: date,
    xpWeekKey: weekKey(),
    xpMonthKey: monthKey(),
  };
}

async function authSignIn() {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const body = await response.json();
  if (!response.ok) {
    if (body?.error_description?.includes("Invalid login credentials")) {
      const signup = await fetch(`${url}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          data: { name: TEST_NAME },
        }),
      });
      const signupBody = await signup.json();
      if (!signup.ok && !signupBody?.access_token) {
        throw new Error(signupBody?.msg ?? signupBody?.error_description ?? "Falha no signup");
      }
      return signupBody.access_token ?? signupBody.session?.access_token;
    }
    throw new Error(body?.error_description ?? body?.msg ?? "Falha no login");
  }
  return body.access_token;
}

async function rest(token, table, method, payload, extraHeaders = {}) {
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${table} ${method} HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function applySubscriptionSql() {
  const sql = fs.readFileSync(path.join(root, "supabase/seed/test-account.sql"), "utf8");
  if (serviceRole) {
    const adminToken = serviceRole;
    const response = await fetch(`${url}/rest/v1/subscriptions`, {
      method: "POST",
      headers: {
        apikey: adminToken,
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        status: "active",
        stripe_subscription_id: "internal_test_longyu_pro",
        current_period_start: new Date().toISOString(),
        current_period_end: "2030-01-01T00:00:00.000Z",
        cancel_at_period_end: false,
      }),
    });
    if (response.ok) {
      console.log("OK: assinatura Pro inserida via service_role.");
      return true;
    }
    const err = await response.text();
    console.warn("service_role subscription:", err.slice(0, 300));
  }

  if (!accessToken) return false;

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await response.text();
  if (!response.ok) {
    console.warn(`Management API SQL HTTP ${response.status}: ${body.slice(0, 400)}`);
    return false;
  }
  console.log("OK: SQL de seed aplicado via Management API.");
  return true;
}

async function main() {
  const { ALL_LESSONS, JOURNEY } = await loadJourneyModule();
  const progress = buildMaxedProgress({ ALL_LESSONS, JOURNEY });
  const now = Date.now();

  console.log(`== seed:test-account (${TEST_EMAIL}) ==`);
  console.log(`Lições: ${progress.completedLessons.length} | Módulos: ${progress.validatedModules.length}`);

  const token = await authSignIn();
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  });
  const userBody = await userResponse.json();
  const userId = userBody?.id ?? userBody?.user?.id ?? TEST_USER_ID;
  console.log(`User ID: ${userId}`);

  await rest(
    token,
    "profiles",
    "POST",
    {
      id: userId,
      name: TEST_NAME,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { Prefer: "resolution=merge-duplicates,return=representation" }
  );
  console.log("OK: perfil atualizado.");

  const snapshot = {
    schemaVersion: 1,
    exportedAt: now,
    account: {
      id: `cloud:${userId}`,
      name: TEST_NAME,
      email: TEST_EMAIL,
      authMode: "cloud",
      createdAt: now,
      updatedAt: now,
    },
    progress,
  };

  await rest(token, "user_progress", "POST", {
    user_id: userId,
    completed_lessons: progress.completedLessons,
    lesson_task_progress: progress.lessonTaskProgress,
    learned_chars: progress.learnedChars,
    learned_chunks: progress.learnedChunks,
    streak: progress.streak,
    longest_streak: progress.longestStreak,
    last_active: progress.lastActive,
    xp_total: progress.xpTotal,
    xp_today: progress.xpToday,
    weekly_xp: progress.weeklyXp,
    monthly_xp: progress.monthlyXp,
    client_snapshot: snapshot,
    client_snapshot_version: 1,
    updated_at: new Date().toISOString(),
  });
  console.log("OK: progresso completo enviado para user_progress.");

  const proApplied = await applySubscriptionSql();
  if (!proApplied) {
    console.log("");
    console.log("Aviso: assinatura Pro no servidor não foi aplicada automaticamente.");
    console.log("Cole supabase/seed/test-account.sql no Supabase SQL Editor e execute,");
    console.log("ou defina SUPABASE_ACCESS_TOKEN / SUPABASE_SERVICE_ROLE_KEY e rode de novo.");
    console.log("");
    console.log("Enquanto isso, o app reconhece Pro para este e-mail via entitlement interno (código).");
  }

  console.log("");
  console.log("Conta pronta para teste:");
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log(`  Senha: ${TEST_PASSWORD}`);
}

main().catch((error) => {
  console.error("ERRO:", error instanceof Error ? error.message : error);
  process.exit(1);
});
