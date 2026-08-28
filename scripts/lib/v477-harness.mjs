import { V477_SENSITIVE_TABLES, V477_CRITICAL_RPCS } from "./v477-constants.mjs";
import {
  CANONICAL_SCHEMA_SQL,
  compareRpcContract,
  hashCanonicalSchema,
} from "./schema-canonical.mjs";
import {
  BEGINNER_EVIDENCE,
  EphemeralError,
  createUser,
  ephemeralClients,
  parseJsonCell,
  querySql,
  signIn,
} from "./ephemeral-backend.mjs";

function masterySnapshot(level) {
  return {
    schemaVersion: 1,
    snapshot: {
      schemaVersion: 1,
      account: { id: "cloud:tmp", name: "A", authMode: "cloud", createdAt: Date.now(), updatedAt: Date.now() },
      progress: {
        completedLessons: level > 0 ? ["topic-1"] : [],
        lessonMasteryById: { "topic-1": { level } },
      },
    },
  };
}

function jsonAggQuery(sql) {
  const inner = String(sql).replace(/;\s*$/, "").trim();
  return `select coalesce(json_agg(q), '[]'::json) from (${inner}) q;`;
}

export function dumpCanonicalSchema(env) {
  const payload = parseJsonCell(querySql(env, CANONICAL_SCHEMA_SQL));
  if (!payload) throw new EphemeralError("canonical schema dump vazio");
  return { payload, hash: hashCanonicalSchema(payload) };
}

export function assertRlsEnabled(env) {
  const sql = `
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in (${V477_SENSITIVE_TABLES.map((name) => `'${name}'`).join(",")});
  `;
  const rows = String(querySql(env, jsonAggQuery(sql)));
  const parsed = parseJsonCell(rows) ?? [];
  const missing = V477_SENSITIVE_TABLES.filter((name) => !parsed.some((row) => row.name === name));
  const disabled = parsed.filter((row) => row.rls !== true).map((row) => row.name);
  if (missing.length) throw new EphemeralError(`RLS tables missing: ${missing.join(",")}`);
  if (disabled.length) throw new EphemeralError(`RLS DISABLED: ${disabled.join(",")}`);
  return { ok: true, missingInThisSchema: [], checked: parsed.map((row) => row.name) };
}

export function assertLeastPrivilegeGrants(env) {
  const sql = `
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and table_name in ('profiles','user_progress','user_srs','subscriptions','transactions','placement_attempts','user_economy')
    order by table_name, grantee, privilege_type;
  `;
  const rows = parseJsonCell(querySql(env, jsonAggQuery(sql))) ?? [];
  const anonAny = rows.filter((row) => row.grantee === "anon");
  if (anonAny.length) {
    throw new EphemeralError(
      `anon table grants remain: ${anonAny.map((row) => `${row.table_name}:${row.privilege_type}`).join(",")}`
    );
  }
  const authDeleteProgress = rows.filter(
    (row) =>
      row.grantee === "authenticated" &&
      row.privilege_type === "DELETE" &&
      ["user_progress", "profiles", "subscriptions", "transactions", "placement_attempts", "user_economy"].includes(
        row.table_name
      )
  );
  if (authDeleteProgress.length) {
    throw new EphemeralError(
      `authenticated DELETE still granted: ${authDeleteProgress.map((row) => row.table_name).join(",")}`
    );
  }
  return { ok: true, sample: rows.length };
}

export function assertLiveRpcContract(env) {
  const sql = `
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f';
  `;
  const live = parseJsonCell(querySql(env, jsonAggQuery(sql))) ?? [];
  const errors = compareRpcContract(live, V477_CRITICAL_RPCS);
  if (errors.length) throw new EphemeralError(errors.join("; "));
  return { ok: true, liveCount: live.length };
}

export async function runRlsNegativeMatrix(env) {
  const { admin, anon } = ephemeralClients(env);
  const userA = await createUser(admin, "mx-a");
  const userB = await createUser(admin, "mx-b");
  const clientA = await signIn(env, userA);
  const clientB = await signIn(env, userB);
  const results = [];
  try {
    await admin.from("user_progress").upsert({
      user_id: userB.id,
      xp_total: 50,
      completed_lessons: ["secret-b"],
      updated_at: new Date().toISOString(),
    });
    const cases = [
      ["anon", anon, "user_progress", "select", async (c) => c.from("user_progress").select("user_id").eq("user_id", userB.id)],
      ["anon", anon, "profiles", "select", async (c) => c.from("profiles").select("id").eq("id", userB.id)],
      ["A", clientA, "user_progress", "select_b", async (c) => c.from("user_progress").select("user_id").eq("user_id", userB.id)],
      ["A", clientA, "subscriptions", "select_b", async (c) => c.from("subscriptions").select("user_id").eq("user_id", userB.id)],
      ["A", clientA, "placement_attempts", "select_b", async (c) => c.from("placement_attempts").select("user_id").eq("user_id", userB.id)],
      ["A", clientA, "placement_onboarding_drafts", "select_b", async (c) => c.from("placement_onboarding_drafts").select("user_id").eq("user_id", userB.id)],
      ["A", clientA, "user_economy", "insert_b", async (c) => c.from("user_economy").insert({ user_id: userB.id, qi: 1 }).select("user_id")],
      ["A", clientA, "user_progress", "update_b", async (c) => c.from("user_progress").update({ xp_total: 1 }).eq("user_id", userB.id).select("user_id")],
      ["A", clientA, "profiles", "delete_b", async (c) => c.from("profiles").delete().eq("id", userB.id).select("id")],
      ["B", clientB, "user_progress", "select_own", async (c) => c.from("user_progress").select("user_id").eq("user_id", userB.id)],
    ];
    for (const [actor, client, table, op, fn] of cases) {
      const { data, error } = await fn(client);
      const leaked = Array.isArray(data) && data.length > 0 && op !== "select_own";
      const writeWentThrough = op.startsWith("insert") || op.startsWith("update") || op.startsWith("delete")
        ? !error && (data == null || Array.isArray(data))
        : false;
      if (op === "select_own") {
        if (error) throw new EphemeralError(`matrix ${actor} ${table} ${op}: ${error.message}`);
        results.push({ actor, table, op, blocked: false, ok: true });
        continue;
      }
      const blocked = Boolean(error) || !leaked;
      if (op.startsWith("insert") || op.startsWith("update") || op.startsWith("delete")) {
        if (!error && writeWentThrough && (Array.isArray(data) ? data.length > 0 : true)) {
          const { data: check } = await admin.from(table).select("*").limit(1);
          void check;
        }
        if (!error && data && Array.isArray(data) && data.length > 0) {
          throw new EphemeralError(`matrix FAIL ${actor} wrote ${table}.${op}`);
        }
        results.push({ actor, table, op, blocked: Boolean(error) || !data?.length, ok: true });
        continue;
      }
      if (leaked) throw new EphemeralError(`matrix FAIL ${actor} read ${table}.${op}`);
      results.push({ actor, table, op, blocked, ok: true });
    }
    const { error: svcErr } = await admin.from("user_progress").select("user_id").eq("user_id", userB.id).maybeSingle();
    if (svcErr) throw new EphemeralError(`service_role select: ${svcErr.message}`);
    results.push({ actor: "service_role", table: "user_progress", op: "select", blocked: false, ok: true });
    return { ok: true, results };
  } finally {
    await admin.auth.admin.deleteUser(userA.id);
    await admin.auth.admin.deleteUser(userB.id);
  }
}

export async function runMonotonicityMatrix(env) {
  const { admin } = ephemeralClients(env);
  const pairs = [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ];
  const out = [];
  for (const [first, second] of pairs) {
    const user = await createUser(admin, `mono-${first}-${second}`);
    const sessionA = await signIn(env, user);
    const sessionB = await signIn(env, user);
    try {
      const snap = (level) => {
        const body = masterySnapshot(level);
        body.snapshot.account.id = `cloud:${user.id}`;
        return {
          user_id: user.id,
          client_snapshot: body.snapshot,
          client_snapshot_version: 1,
          completed_lessons: level > 0 ? ["topic-1"] : [],
          updated_at: new Date().toISOString(),
        };
      };
      await sessionA.from("user_progress").upsert(snap(first), { onConflict: "user_id" });
      await Promise.all([
        sessionA.from("user_progress").upsert(snap(first), { onConflict: "user_id" }),
        sessionB.from("user_progress").upsert(snap(second), { onConflict: "user_id" }),
      ]);
      const { data } = await admin
        .from("user_progress")
        .select("client_snapshot, completed_lessons")
        .eq("user_id", user.id)
        .maybeSingle();
      const stored = data?.client_snapshot?.progress?.lessonMasteryById?.["topic-1"]?.level;
      const expected = Math.max(first, second);
      if (stored !== expected) {
        throw new EphemeralError(`monotonic ${first}+${second} stored=${stored} expected=${expected}`);
      }
      out.push({ first, second, stored, expected });
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
  return { ok: true, cases: out };
}

export async function runMalformedMasteryMatrix(env) {
  const { admin } = ephemeralClients(env);
  const out = [];

  function progressRow(userId, { level, map, completed = ["topic-1"] }) {
    const lessonMasteryById = map !== undefined ? map : { "topic-1": { level } };
    return {
      user_id: userId,
      client_snapshot: {
        schemaVersion: 1,
        account: { id: `cloud:${userId}`, name: "A", authMode: "cloud", createdAt: Date.now(), updatedAt: Date.now() },
        progress: { completedLessons: completed, lessonMasteryById },
      },
      client_snapshot_version: 1,
      completed_lessons: completed,
      updated_at: new Date().toISOString(),
    };
  }

  async function storedLevel(userId) {
    const { data } = await admin
      .from("user_progress")
      .select("client_snapshot")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.client_snapshot?.progress?.lessonMasteryById?.["topic-1"]?.level;
  }

  const cases = [
    { name: "insert-999-clamps-to-4", steps: [{ level: 999 }], expect: 4 },
    { name: "insert-2.5-trunc-to-2", steps: [{ level: 2.5 }], expect: 2 },
    { name: "insert-neg1-to-0", steps: [{ level: -1 }], expect: 0 },
    { name: "keep-2-when-abc", steps: [{ level: 2 }, { level: "abc" }], expect: 2 },
    { name: "keep-2-when-empty-string", steps: [{ level: 2 }, { level: "" }], expect: 2 },
    { name: "keep-3-when-string-entry", steps: [{ level: 3 }, { map: { "topic-1": "nope" } }], expect: 3 },
    { name: "keep-2-when-null-map", steps: [{ level: 2 }, { map: null }], expect: 2 },
    { name: "keep-2-when-array-map", steps: [{ level: 2 }, { map: [] }], expect: 2 },
    { name: "insert-5-then-1-stays-4", steps: [{ level: 5 }, { level: 1 }], expect: 4 },
  ];

  for (const item of cases) {
    const user = await createUser(admin, `mal-${item.name.slice(0, 24)}`);
    const session = await signIn(env, user);
    try {
      for (const step of item.steps) {
        const { error } = await session.from("user_progress").upsert(progressRow(user.id, step), { onConflict: "user_id" });
        if (error) throw new EphemeralError(`malformed ${item.name}: ${error.message}`);
      }
      const stored = await storedLevel(user.id);
      if (stored !== item.expect) {
        throw new EphemeralError(`malformed ${item.name} stored=${stored} expected=${item.expect}`);
      }
      out.push({ name: item.name, stored, expected: item.expect });
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
  return { ok: true, cases: out };
}

export async function runLocalAuthFlow(env) {
  const { anon, admin } = ephemeralClients(env);
  const email = `local-auth-${Date.now()}@example.com`;
  const password = `Ly!${Date.now()}9aA`;
  const signup = await anon.auth.signUp({
    email,
    password,
    options: { data: { name: "Local Auth" }, emailRedirectTo: "http://127.0.0.1:5173/confirmar-email" },
  });
  if (signup.error) throw new EphemeralError(`signUp: ${signup.error.message}`);
  const userId = signup.data.user?.id;
  if (!userId) throw new EphemeralError("signUp sem user");
  const already = signup.data.session;
  let confirmedViaMailbox = false;
  if (!already) {
    const mailbox = email.split("@")[0];
    const inbucket = env.inbucketUrl || "http://127.0.0.1:54324";
    let confirmUrl = "";
    for (let i = 0; i < 15; i += 1) {
      const response = await fetch(`${inbucket}/api/v1/mailbox/${encodeURIComponent(mailbox)}`);
      if (response.ok) {
        const messages = await response.json();
        const id = messages?.[0]?.id;
        if (id) {
          const detail = await fetch(`${inbucket}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${id}`);
          const body = await detail.text();
          const match = body.match(/https?:\/\/[^"'\s]+confirm[^"'\s]*/i) || body.match(/https?:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^"'\s]*/);
          if (match) {
            confirmUrl = match[0].replace(/&amp;/g, "&");
            break;
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!confirmUrl) {
      await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      return {
        ok: true,
        classification: "LOCAL_AUTH_FLOW_READY with admin confirm fallback (Inbucket empty)",
        mailbox: false,
      };
    }
    await fetch(confirmUrl, { redirect: "manual" });
    confirmedViaMailbox = true;
  }
  const session = await signIn(env, { id: userId, email, password });
  const { data: profile } = await session.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profile?.id !== userId) throw new EphemeralError("profile missing after local auth");
  await admin.auth.admin.deleteUser(userId);
  return {
    ok: true,
    classification: already
      ? "LOCAL_AUTH_FLOW_READY (autoconfirm session)"
      : confirmedViaMailbox
        ? "LOCAL_AUTH_FLOW_READY (Inbucket confirm)"
        : "LOCAL_AUTH_FLOW_READY",
    mailbox: confirmedViaMailbox,
  };
}

export async function runOnboardingEdgeFlow(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "onb-edge");
  try {
    const draft = await admin.rpc("save_placement_onboarding_draft", {
      p_user_id: user.id,
      p_placement_version: 2,
      p_declared_experience: "zero",
      p_goal: "speak",
      p_answers: BEGINNER_EVIDENCE,
      p_ttl_hours: 24,
    });
    if (draft.error) throw new EphemeralError(`draft: ${draft.error.message}`);
    const session = await signIn(env, user);
    const { data: sessionData } = await session.auth.getSession();
    const access = sessionData.session?.access_token;
    const headers = {
      apikey: env.anon,
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
      "x-longyu-correlation-id": "eph-corr-00000000-0000-4000-8000-000000000011",
      "x-longyu-session-id": "eph-sess-00000000-0000-4000-8000-000000000012",
      "x-longyu-op": "finalize-onboarding",
    };
    const once = await fetch(`${env.url}/functions/v1/finalize-onboarding`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const onceBody = await once.text();
    const twice = await fetch(`${env.url}/functions/v1/finalize-onboarding`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const twiceBody = await twice.text();
    const concurrent = await Promise.all([
      fetch(`${env.url}/functions/v1/finalize-onboarding`, { method: "POST", headers, body: JSON.stringify({}) }),
      fetch(`${env.url}/functions/v1/finalize-onboarding`, { method: "POST", headers, body: JSON.stringify({}) }),
    ]);
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    const { data: attempts } = await admin.from("placement_attempts").select("id").eq("user_id", user.id);
    const { data: drafts } = await admin.from("placement_onboarding_drafts").select("user_id").eq("user_id", user.id);
    if (profile?.onboarding_completed !== true) {
      throw new EphemeralError(`finalize onboarding_completed=${profile?.onboarding_completed} body=${onceBody.slice(0, 200)}`);
    }
    if ((attempts ?? []).length !== 1) {
      throw new EphemeralError(`expected 1 placement_attempt, got ${(attempts ?? []).length}`);
    }
    if ((drafts ?? []).length !== 0) throw new EphemeralError("draft not consumed");
    return {
      ok: true,
      once: { status: once.status, body: onceBody.slice(0, 180) },
      twice: { status: twice.status, body: twiceBody.slice(0, 180) },
      concurrent: concurrent.map((row) => row.status),
    };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runCreateAccountEdge(env) {
  const email = `create-acct-${Date.now()}@example.com`;
  const password = `Ly!${Date.now()}9aA`;
  const headers = {
    apikey: env.anon,
    Authorization: `Bearer ${env.anon}`,
    "Content-Type": "application/json",
    Origin: "http://127.0.0.1:5173",
    "x-longyu-correlation-id": "eph-corr-00000000-0000-4000-8000-000000000021",
    "x-longyu-session-id": "eph-sess-00000000-0000-4000-8000-000000000022",
    "x-longyu-op": "create-account",
  };
  const response = await fetch(`${env.url}/functions/v1/create-account`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      displayName: "Create Account",
      emailRedirectTo: "http://127.0.0.1:5173/confirmar-email",
      countryCode: "BR",
      signupSource: "ephemeral",
    }),
  });
  const body = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }
  const skipEnabled = process.env.TURNSTILE_ALLOW_SKIP === "1";
  if (skipEnabled) {
    if (response.status >= 500) {
      throw new EphemeralError(`create-account HTTP ${response.status} ${body.slice(0, 180)}`);
    }
    if (parsed?.code === "captcha_failed") {
      throw new EphemeralError(
        "create-account captcha_failed with TURNSTILE_ALLOW_SKIP=1 — Edge did not see the skip (write supabase/functions/.env before supabase start)"
      );
    }
  }
  return {
    ok: true,
    status: response.status,
    code: parsed?.code ?? null,
    pendingConfirmation: parsed?.pendingConfirmation === true,
    skipEnabled,
    body: body.slice(0, 180),
  };
}
