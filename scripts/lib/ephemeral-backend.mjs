import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  V476_OPERATIONAL_MIGRATIONS,
  V476_REQUIRED_PROFILE_COLUMNS,
  V476_REQUIRED_RPCS,
  V476_REQUIRED_TABLES,
} from "./v476-constants.mjs";
import { isProductionProjectId } from "./staging-guard.mjs";
import { LONGYU_EDGE_FUNCTIONS } from "./edge-functions.mjs";

const BEGINNER_EVIDENCE = [
  { questionId: "warm-nihao-meaning", answer: "Olá", hintUsed: true, responseMode: "choice" },
  { questionId: "warm-xiexie-meaning", answer: "Obrigado(a).", hintUsed: true, responseMode: "choice" },
  { questionId: "warm-nihao-pinyin", answer: "nǐ hǎo", hintUsed: true, responseMode: "choice" },
];

export class EphemeralError extends Error {
  constructor(message) {
    super(message);
    this.name = "EphemeralError";
  }
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: opts.timeout ?? 120_000,
    cwd: opts.cwd,
    env: opts.env ?? process.env,
  });
}

export function parseEnvOutput(text) {
  const values = {};
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[trimmed.slice(0, eq).trim()] = value;
  }
  return values;
}

export function startSupabase(root) {
  const version = run("npx", ["supabase", "--version"], { cwd: root, timeout: 60_000 });
  if (version.status !== 0) {
    throw new EphemeralError(`Supabase CLI ausente: ${(version.stderr || version.stdout).slice(0, 400)}`);
  }
  const started = run("npx", ["supabase", "start"], { cwd: root, timeout: 600_000 });
  if (started.status !== 0) {
    throw new EphemeralError(
      `supabase start falhou: ${(started.stderr || started.stdout).slice(0, 2000)}`
    );
  }
  return started.stdout;
}

export function loadEphemeralEnv(root) {
  const status = run("npx", ["supabase", "status", "-o", "env"], { cwd: root, timeout: 60_000 });
  if (status.status !== 0) {
    throw new EphemeralError(
      `supabase status falhou (stack efêmera não está no ar): ${(status.stderr || status.stdout).slice(0, 800)}`
    );
  }
  const parsed = parseEnvOutput(status.stdout);
  const url = String(parsed.API_URL || parsed.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = parsed.ANON_KEY || parsed.SUPABASE_ANON_KEY || "";
  const service = parsed.SERVICE_ROLE_KEY || parsed.SUPABASE_SERVICE_ROLE_KEY || "";
  const dbUrl =
    parsed.DB_URL ||
    parsed.POSTGRES_URL ||
    parsed.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  if (!url || !anon || !service) {
    throw new EphemeralError("supabase status não devolveu API_URL/ANON_KEY/SERVICE_ROLE_KEY.");
  }
  if (isProductionProjectId(url)) {
    throw new EphemeralError("RECUSADO: stack efêmera resolveu para MandarimProject.");
  }
  return { url, anon, service, dbUrl, raw: parsed };
}

export function resetEphemeralDb(root) {
  const reset = run("npx", ["supabase", "db", "reset", "--yes"], { cwd: root, timeout: 300_000 });
  if (reset.status !== 0) {
    throw new EphemeralError(
      `supabase db reset falhou (pare no primeiro erro): ${(reset.stderr || reset.stdout).slice(0, 2500)}`
    );
  }
  return reset.stdout;
}

export function applyLocalMigrationsInOrder(root, dbUrl) {
  const dir = path.join(root, "supabase", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  const log = [];
  for (const file of files) {
    const started = Date.now();
    const result = run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", path.join(dir, file)], {
      cwd: root,
      timeout: 120_000,
    });
    const entry = {
      file,
      status: result.status === 0 ? "PASS" : "FAIL",
      duration_ms: Date.now() - started,
      error: result.status === 0 ? null : (result.stderr || result.stdout).slice(0, 1500),
    };
    log.push(entry);
    if (entry.status === "FAIL") {
      return { ok: false, log, stoppedAt: file };
    }
  }
  return { ok: true, log };
}

export function querySql(env, sql) {
  const dbQuery = run("npx", ["supabase", "db", "query", sql], {
    cwd: process.cwd(),
    timeout: 60_000,
  });
  if (dbQuery.status === 0) return dbQuery.stdout;
  const psql = run("psql", [env.dbUrl, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", sql], {
    timeout: 60_000,
  });
  if (psql.status !== 0) {
    throw new EphemeralError(
      `SQL falhou: ${(psql.stderr || dbQuery.stderr || psql.stdout || dbQuery.stdout).slice(0, 1200)}`
    );
  }
  return psql.stdout;
}

function parseJsonCell(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("[");
    const startObj = raw.indexOf("{");
    const idx = [start, startObj].filter((value) => value >= 0).sort((a, b) => a - b)[0];
    if (idx == null) return null;
    return JSON.parse(raw.slice(idx));
  }
}

export function assertSchema(env) {
  const tableList = V476_REQUIRED_TABLES.map((name) => `'${name}'`).join(", ");
  const columnList = V476_REQUIRED_PROFILE_COLUMNS.map((name) => `'${name}'`).join(", ");
  const rpcList = V476_REQUIRED_RPCS.map((name) => `'${name}'`).join(", ");
  const sql = `
    select json_build_object(
      'tables', (
        select coalesce(json_agg(table_name order by table_name), '[]'::json)
        from information_schema.tables
        where table_schema = 'public' and table_name in (${tableList})
      ),
      'profile_columns', (
        select coalesce(json_agg(json_build_object(
          'column_name', column_name,
          'is_nullable', is_nullable,
          'data_type', data_type
        ) order by column_name), '[]'::json)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name in (${columnList})
      ),
      'rpcs', (
        select coalesce(json_agg(json_build_object(
          'name', p.proname,
          'args', pg_get_function_identity_arguments(p.oid)
        ) order by p.proname), '[]'::json)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in (${rpcList})
      )
    );
  `;
  const payload = parseJsonCell(querySql(env, sql));
  if (!payload) throw new EphemeralError("Schema assertion não devolveu JSON.");
  const tables = (payload.tables ?? []).map(String);
  const columns = payload.profile_columns ?? [];
  const rpcs = payload.rpcs ?? [];
  const missingTables = V476_REQUIRED_TABLES.filter((name) => !tables.includes(name));
  const presentCols = new Set(columns.map((row) => row.column_name));
  const missingColumns = V476_REQUIRED_PROFILE_COLUMNS.filter((name) => !presentCols.has(name));
  const presentRpcs = new Set(rpcs.map((row) => row.name));
  const missingRpcs = V476_REQUIRED_RPCS.filter((name) => !presentRpcs.has(name));
  const nullableCritical = columns.filter(
    (row) =>
      ["onboarding_completed", "native_language", "target_language"].includes(row.column_name) &&
      row.is_nullable === "YES"
  );
  if (missingTables.length || missingColumns.length || missingRpcs.length || nullableCritical.length) {
    throw new EphemeralError(
      `SCHEMA_READY FAIL tables=${missingTables.join(",") || "-"} columns=${missingColumns.join(",") || "-"} rpcs=${missingRpcs.join(",") || "-"} nullable=${nullableCritical.map((row) => row.column_name).join(",") || "-"}`
    );
  }
  const operationalMissing = V476_OPERATIONAL_MIGRATIONS.filter(
    (file) => !fs.existsSync(path.join(process.cwd(), "supabase", "migrations", file))
  );
  if (operationalMissing.length) {
    throw new EphemeralError(`Migrations operacionais ausentes no repo: ${operationalMissing.join(",")}`);
  }
  return { tables, columns, rpcs };
}

export function generatedTypesFromSchema(env) {
  const sql = `
    select json_build_object(
      'tables', (
        select coalesce(json_object_agg(table_name, cols), '{}'::json)
        from (
          select table_name,
                 json_agg(json_build_object(
                   'name', column_name,
                   'nullable', is_nullable = 'YES',
                   'type', data_type
                 ) order by ordinal_position) as cols
          from information_schema.columns
          where table_schema = 'public'
          group by table_name
        ) t
      ),
      'rpcs', (
        select coalesce(json_agg(json_build_object(
          'name', p.proname,
          'args', pg_get_function_identity_arguments(p.oid),
          'security_definer', p.prosecdef
        ) order by p.proname), '[]'::json)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
      )
    );
  `;
  const payload = parseJsonCell(querySql(env, sql));
  if (!payload) throw new EphemeralError("Falha a gerar o contrato de types.");
  return payload;
}

export function compareFrontendContracts(types, root) {
  const src = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) src.push(fs.readFileSync(full, "utf8"));
    }
  }
  walk(path.join(root, "src"));
  const joined = src.join("\n");
  const fromTables = [...joined.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((match) => match[1]);
  const rpcNames = [...joined.matchAll(/\.rpc\("([a-z0-9_]+)"/g)].map((match) => match[1]);
  const missingTables = [...new Set(fromTables)].filter((name) => !types.tables?.[name]);
  const missingRpcs = [...new Set(rpcNames)].filter(
    (name) => !(types.rpcs ?? []).some((row) => row.name === name)
  );
  const ensure = (types.rpcs ?? []).find((row) => row.name === "ensure_own_profile");
  const ensureArgs = String(ensure?.args ?? "");
  const requiredEnsure = ["p_name", "p_birth_date", "p_country", "p_signup_source", "p_marketing_opt_in"];
  const missingEnsureArgs = requiredEnsure.filter((name) => !ensureArgs.includes(name));
  if (missingTables.length || missingRpcs.length || missingEnsureArgs.length) {
    throw new EphemeralError(
      `TYPES FAIL missing_tables=${missingTables.join(",") || "-"} missing_rpcs=${missingRpcs.join(",") || "-"} ensure_args=${missingEnsureArgs.join(",") || "-"}`
    );
  }
  return { tablesChecked: new Set(fromTables).size, rpcsChecked: new Set(rpcNames).size };
}

export function auditSecurityDefiner(env) {
  const sql = `
    select coalesce(json_agg(json_build_object(
      'name', p.proname,
      'args', pg_get_function_identity_arguments(p.oid),
      'search_path', coalesce(array_to_string(p.proconfig, ','), ''),
      'leakproof', p.proleakproof,
      'execute_grants', (
        select coalesce(json_agg(json_build_object('grantee', r.rolname, 'privilege', 'EXECUTE')), '[]'::json)
        from aclexplode(p.proacl) g
        join pg_roles r on r.oid = g.grantee
        where g.privilege_type = 'EXECUTE'
      ),
      'uses_auth_uid', pg_get_functiondef(p.oid) ilike '%auth.uid%'
    ) order by p.proname), '[]'::json)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef;
  `;
  const rows = parseJsonCell(querySql(env, sql)) ?? [];
  return rows.map((row) => {
    const search = String(row.search_path ?? "");
    const grants = row.execute_grants ?? [];
    const publicExec = grants.some((grant) => ["public", "anon"].includes(String(grant.grantee).toLowerCase()));
    const authenticatedExec = grants.some((grant) => String(grant.grantee).toLowerCase() === "authenticated");
    const serviceOnly =
      grants.length > 0 &&
      grants.every((grant) => ["service_role", "postgres", "supabase_admin"].includes(String(grant.grantee)));
    return {
      ...row,
      search_path_ok: /search_path/.test(search),
      public_execute: publicExec,
      authenticated_execute: authenticatedExec,
      service_role_only: serviceOnly,
    };
  });
}

export function ephemeralClients(env) {
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  return {
    admin: createClient(env.url, env.service, { auth }),
    anon: createClient(env.url, env.anon, { auth }),
  };
}

async function createUser(admin, label) {
  const nonce = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `ephemeral-${label}-${nonce}@example.com`;
  const password = `Ly!${crypto.randomBytes(16).toString("base64url")}9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `Ephemeral ${label}` },
  });
  if (error || !data.user?.id) throw new EphemeralError(`createUser ${label}: ${error?.message ?? "sem user"}`);
  return { id: data.user.id, email, password };
}

async function signIn(env, identity) {
  const client = createClient(env.url, env.anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  if (error || data.user?.id !== identity.id) {
    throw new EphemeralError(`signIn: ${error?.message ?? "mismatch"}`);
  }
  return client;
}

export async function runRlsIsolation(env) {
  const { admin } = ephemeralClients(env);
  const userA = await createUser(admin, "rls-a");
  const userB = await createUser(admin, "rls-b");
  const created = [userA.id, userB.id];
  try {
    await admin.from("user_progress").upsert({
      user_id: userB.id,
      xp_total: 99,
      completed_lessons: ["secret-b"],
      updated_at: new Date().toISOString(),
    });
    await admin.from("user_economy").upsert({ user_id: userB.id, qi: 77, updated_at: new Date().toISOString() });
    await admin.from("user_srs").upsert({
      user_id: userB.id,
      item_type: "chunk",
      item_id: "rls-b",
      domain: "meaning",
      track: "speak",
      ease: 2.5,
      interval_days: 1,
      repetitions: 1,
      lapses: 0,
      due_at: new Date().toISOString(),
    });
    await admin.from("subscriptions").upsert({
      user_id: userB.id,
      status: "active",
      stripe_subscription_id: `eph_${userB.id}`,
      updated_at: new Date().toISOString(),
    });
    await admin.from("placement_attempts").insert({
      user_id: userB.id,
      placement_version: 2,
      declared_experience: "zero",
      answers: [],
    });
    await admin.from("placement_onboarding_drafts").upsert({
      user_id: userB.id,
      placement_version: 2,
      declared_experience: "zero",
      answers: [],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({ name: "Org B", slug: `org-b-${crypto.randomBytes(3).toString("hex")}` })
      .select("id")
      .maybeSingle();
    if (!orgErr && org?.id) {
      await admin.from("organization_members").insert({
        organization_id: org.id,
        user_id: userB.id,
        role: "owner",
      });
    }
    const clientA = await signIn(env, userA);
    const checks = [
      ["profiles", "id", userB.id],
      ["user_progress", "user_id", userB.id],
      ["user_srs", "user_id", userB.id],
      ["user_economy", "user_id", userB.id],
      ["placement_attempts", "user_id", userB.id],
      ["placement_onboarding_drafts", "user_id", userB.id],
      ["subscriptions", "user_id", userB.id],
      ["organization_members", "user_id", userB.id],
    ];
    const leaked = [];
    for (const [table, column, value] of checks) {
      const { data, error } = await clientA.from(table).select("*").eq(column, value);
      if (error && /does not exist|schema cache/i.test(error.message)) continue;
      if ((data ?? []).length > 0) leaked.push(table);
    }
    if (leaked.length) throw new EphemeralError(`RLS FAIL A leu B em ${leaked.join(",")}`);
    return { ok: true, userA: userA.id, userB: userB.id };
  } finally {
    for (const id of created) {
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {
        /* best-effort */
      }
    }
  }
}

export async function runPlacementRpc(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "place");
  try {
    const payload = {
      p_user_id: user.id,
      p_placement_version: 2,
      p_declared_experience: "zero",
      p_goal: "speak",
      p_answers: BEGINNER_EVIDENCE,
      p_score_summary: { score: 1 },
      p_competency_summary: {},
      p_foundation_proofs: [],
      p_recommended_lesson_id: "server-lesson",
      p_mastered_by_placement: ["server-mastered"],
      p_confidence: 0.2,
      p_idempotency_key: "eph-place-1",
      p_learning_goal: "speak",
    };
    const first = await admin.rpc("commit_placement_result", payload);
    if (first.error) throw new EphemeralError(`commit_placement_result: ${first.error.message}`);
    const second = await admin.rpc("commit_placement_result", payload);
    if (second.error) throw new EphemeralError(`idempotent commit: ${second.error.message}`);
    const attemptId = first.data?.attemptId ?? first.data?.attemptid;
    const attemptId2 = second.data?.attemptId ?? second.data?.attemptid;
    if (attemptId && attemptId2 && attemptId !== attemptId2) {
      throw new EphemeralError("commit_placement_result não foi idempotente");
    }
    const { data: attempts } = await admin.from("placement_attempts").select("id").eq("user_id", user.id);
    if ((attempts ?? []).length !== 1) {
      throw new EphemeralError(`esperava 1 placement_attempt, veio ${(attempts ?? []).length}`);
    }
    const { data: progress } = await admin
      .from("user_progress")
      .select("completed_lessons, current_lesson_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!progress?.completed_lessons?.includes("server-mastered")) {
      throw new EphemeralError("progress merge não persistiu mastered_by_placement");
    }
    if (progress.current_lesson_id !== "server-lesson") {
      throw new EphemeralError("recommended lesson não persistiu");
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.onboarding_completed !== true) {
      throw new EphemeralError("onboarding_completed deveria ser true após commit");
    }
    return { ok: true, attemptId };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runOnboardingTransaction(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "onb");
  try {
    const draft = await admin.rpc("save_placement_onboarding_draft", {
      p_user_id: user.id,
      p_placement_version: 2,
      p_declared_experience: "zero",
      p_goal: "speak",
      p_answers: BEGINNER_EVIDENCE,
      p_ttl_hours: 24,
    });
    if (draft.error) throw new EphemeralError(`save draft: ${draft.error.message}`);
    const commit = await admin.rpc("commit_placement_result", {
      p_user_id: user.id,
      p_placement_version: 2,
      p_declared_experience: "zero",
      p_goal: "speak",
      p_answers: BEGINNER_EVIDENCE,
      p_score_summary: {},
      p_competency_summary: {},
      p_foundation_proofs: [],
      p_recommended_lesson_id: "l1",
      p_mastered_by_placement: ["l0"],
      p_confidence: 0.1,
      p_idempotency_key: "eph-onb-1",
      p_learning_goal: "speak",
    });
    if (commit.error) throw new EphemeralError(`finalize commit: ${commit.error.message}`);
    const again = await admin.rpc("commit_placement_result", {
      p_user_id: user.id,
      p_placement_version: 2,
      p_declared_experience: "zero",
      p_goal: "speak",
      p_answers: BEGINNER_EVIDENCE,
      p_score_summary: {},
      p_competency_summary: {},
      p_foundation_proofs: [],
      p_recommended_lesson_id: "forged-later",
      p_mastered_by_placement: ["should-not-add"],
      p_confidence: 0.9,
      p_idempotency_key: "eph-onb-1",
      p_learning_goal: "speak",
    });
    if (again.error) throw new EphemeralError(`second finalize: ${again.error.message}`);
    if (again.data?.alreadyCompleted !== true && again.data?.ok !== true) {
      throw new EphemeralError("second finalize deveria ser idempotente");
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.onboarding_completed !== true) throw new EphemeralError("onboarding_completed false após finalize");
    const { data: drafts } = await admin.from("placement_onboarding_drafts").select("user_id").eq("user_id", user.id);
    if ((drafts ?? []).length !== 0) throw new EphemeralError("draft deveria ter sido consumido");
    return { ok: true };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runMissingDraft(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "nodraft");
  try {
    await admin.from("profiles").upsert({
      id: user.id,
      name: "Sem draft",
      onboarding_completed: false,
      native_language: "pt-BR",
      target_language: "zh-CN",
    });
    const { data: drafts } = await admin.from("placement_onboarding_drafts").select("user_id").eq("user_id", user.id);
    if ((drafts ?? []).length) throw new EphemeralError("fixture de missing draft veio com draft");
    const { data: progress } = await admin.from("user_progress").select("completed_lessons").eq("user_id", user.id);
    if ((progress ?? []).some((row) => (row.completed_lessons ?? []).length > 0)) {
      throw new EphemeralError("missing draft gerou progresso arbitrário");
    }
    const grants = querySql(
      env,
      `select exists (
          select 1 from information_schema.role_routine_grants
          where routine_schema = 'public'
            and routine_name = 'commit_placement_result'
            and privilege_type = 'EXECUTE'
            and grantee in ('PUBLIC', 'anon', 'authenticated')
        )::text;`
    );
    if (/^t/i.test(String(grants).trim())) {
      throw new EphemeralError("authenticated/anon não deveria executar commit_placement_result");
    }
    return { ok: true, note: "sem draft não há progresso; RPC é service_role" };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

function masterySnapshot(level) {
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    snapshot: {
      schemaVersion: 1,
      exportedAt: Date.now(),
      account: { id: "cloud:tmp", name: "A", authMode: "cloud", createdAt: Date.now(), updatedAt: Date.now() },
      progress: {
        completedLessons: level > 0 ? ["topic-1"] : [],
        lessonTaskProgress: {},
        learnedChars: [],
        learnedChunks: [],
        srs: {},
        points: 0,
        dailyEnergy: 5,
        dailyTasks: {},
        weeklyMissions: {},
        monthlyMission: null,
        missionHistory: [],
        chests: {},
        chestOpenHistory: [],
        achievementsUnlocked: {},
        achievementHistory: [],
        placement: null,
        xpTotal: 0,
        xpToday: 0,
        weeklyXp: 0,
        monthlyXp: 0,
        lessonStarsById: {},
        lessonMasteryById: { "topic-1": { level } },
      },
    },
  };
}

export async function runTopicMasteryPersistence(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "mastery");
  const client = await signIn(env, user);
  try {
    for (const level of [0, 1, 2, 3, 4]) {
      const snapshot = masterySnapshot(level);
      snapshot.snapshot.account.id = `cloud:${user.id}`;
      const { error } = await client.from("user_progress").upsert(
        {
          user_id: user.id,
          client_snapshot: snapshot.snapshot,
          client_snapshot_version: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw new EphemeralError(`mastery ${level}/4 upsert: ${error.message}`);
      const { data } = await client
        .from("user_progress")
        .select("client_snapshot")
        .eq("user_id", user.id)
        .maybeSingle();
      const stored = data?.client_snapshot?.progress?.lessonMasteryById?.["topic-1"]?.level;
      if (stored !== level) throw new EphemeralError(`mastery persistida ${stored}, esperada ${level}`);
    }
    return { ok: true };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runConcurrentMastery(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "race");
  const sessionA = await signIn(env, user);
  const sessionB = await signIn(env, user);
  try {
    const snap2 = masterySnapshot(2);
    snap2.snapshot.account.id = `cloud:${user.id}`;
    const { error: errA } = await sessionA.from("user_progress").upsert(
      {
        user_id: user.id,
        client_snapshot: snap2.snapshot,
        client_snapshot_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (errA) throw new EphemeralError(`sessão A: ${errA.message}`);
    const snap1 = masterySnapshot(1);
    snap1.snapshot.account.id = `cloud:${user.id}`;
    const { error: errB } = await sessionB.from("user_progress").upsert(
      {
        user_id: user.id,
        client_snapshot: snap1.snapshot,
        client_snapshot_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (errB) throw new EphemeralError(`sessão B: ${errB.message}`);
    const { data } = await admin
      .from("user_progress")
      .select("client_snapshot")
      .eq("user_id", user.id)
      .maybeSingle();
    const stored = data?.client_snapshot?.progress?.lessonMasteryById?.["topic-1"]?.level;
    const clientProtected = stored === 2;
    return {
      ok: true,
      storedLevel: stored,
      clientProtected,
      classification: clientProtected
        ? "MONOTONIC_IN_THIS_RUN"
        : "CLIENT_ONLY_ANTI_REGRESSION — last-write-wins no banco; proteção só no client se fetchRemote antes do upsert",
    };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runEconomyConcurrency(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "eco");
  const client = await signIn(env, user);
  try {
    const lesson = await Promise.all([
      client.rpc("grant_lesson_reward", {
        p_lesson_id: "eph-lesson",
        p_attempt_id: "attempt-1",
        p_stars: 3,
        p_no_skip: true,
      }),
      client.rpc("grant_lesson_reward", {
        p_lesson_id: "eph-lesson",
        p_attempt_id: "attempt-1",
        p_stars: 3,
        p_no_skip: true,
      }),
    ]);
    for (const result of lesson) {
      if (result.error) throw new EphemeralError(`grant_lesson_reward: ${result.error.message}`);
    }
    const applied = lesson.filter((result) => result.data?.already_applied === false).length;
    const replayed = lesson.filter((result) => result.data?.already_applied === true).length;
    if (applied > 1) throw new EphemeralError("double lesson reward");
    const missionPeriod = new Date().toISOString().slice(0, 10);
    const mission = await Promise.all([
      client.rpc("claim_mission", {
        p_scope: "daily",
        p_mission_id: "missao-diaria-1",
        p_period_key: missionPeriod,
        p_metric_value: 99,
      }),
      client.rpc("claim_mission", {
        p_scope: "daily",
        p_mission_id: "missao-diaria-1",
        p_period_key: missionPeriod,
        p_metric_value: 99,
      }),
    ]);
    const missionErrors = mission.filter((result) => result.error);
    if (missionErrors.length === 2) {
      return {
        ok: true,
        lessonApplied: applied,
        lessonReplayed: replayed,
        missionNote: missionErrors[0].error.message,
      };
    }
    const missionApplied = mission.filter((result) => result.data?.already_applied === false).length;
    if (missionApplied > 1) throw new EphemeralError("double mission reward");
    return { ok: true, lessonApplied: applied, lessonReplayed: replayed, missionApplied };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runEdgeLocal(env, root) {
  const followUps = [];
  const results = {};
  async function probe(slug, init) {
    const headers = {
      apikey: env.anon,
      "x-longyu-correlation-id": "eph-corr-00000000-0000-4000-8000-000000000001",
      "x-longyu-session-id": "eph-sess-00000000-0000-4000-8000-000000000002",
      "x-longyu-op": slug,
      ...(init.headers ?? {}),
    };
    const response = await fetch(`${env.url}/functions/v1/${slug}`, {
      ...init,
      headers,
    });
    const text = await response.text();
    if (/email|password|access_token|refresh_token|service_role|sk_live|whsec_/i.test(text) && /[A-Za-z0-9_\-]{20,}/.test(text)) {
      followUps.push(`${slug} resposta pode conter segredo — revisar`);
    }
    return { status: response.status, body: text.slice(0, 500) };
  }

  for (const slug of ["create-account", "commit-placement", "finalize-onboarding", "submit-business-lead"]) {
    try {
      results[slug] = await probe(slug, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forged: true }),
      });
    } catch (error) {
      followUps.push(`${slug} inalcançável: ${error instanceof Error ? error.message : String(error)}`);
      results[slug] = { status: 0, body: "unreachable" };
    }
  }

  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "edge");
  try {
    const session = await signIn(env, user);
    const { data: sessionData } = await session.auth.getSession();
    const access = sessionData.session?.access_token;
    const forged = await probe("commit-placement", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        placementVersion: 2,
        declaredExperience: "zero",
        answers: BEGINNER_EVIDENCE,
        score: 100,
        skippedLessonIds: ["forge-all-lessons"],
        masteredByPlacement: ["forge-all-lessons"],
        recommendedLesson: "forged",
      }),
    });
    results["commit-placement-forged"] = forged;
    if (forged.body.includes("forge-all-lessons")) {
      throw new EphemeralError("commit-placement honrou skipped/mastery forjados");
    }
    const missing = await probe("finalize-onboarding", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    results["finalize-onboarding-missing-draft"] = missing;
    if (missing.status && missing.status !== 409 && !/missing_draft/.test(missing.body) && missing.status !== 401) {
      followUps.push(`finalize-onboarding sem draft HTTP ${missing.status}`);
    }
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }

  for (const slug of ["create-checkout-session", "create-billing-portal", "stripe-webhook"]) {
    try {
      results[slug] = await probe(slug, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
    } catch (error) {
      followUps.push(`${slug} FOLLOW_UP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const repoSlugs = LONGYU_EDGE_FUNCTIONS.filter((slug) =>
    fs.existsSync(path.join(root, "supabase", "functions", slug, "index.ts"))
  );
  const unreachable = ["create-account", "commit-placement", "finalize-onboarding", "submit-business-lead"].filter(
    (slug) => !results[slug]?.status
  );
  return { results, followUps, repoSlugs, unreachable };
}
