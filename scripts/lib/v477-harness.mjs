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

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function normalizeMailboxBody(value) {
  let raw = String(value ?? "");
  // Inbucket deployments differ: the detail endpoint may return raw MIME or
  // a JSON envelope whose text/html body contains the action URL. Parse the
  // envelope first so JSON escaping (including \u0026) is decoded safely.
  try {
    const parsed = JSON.parse(raw);
    const parts = [
      parsed?.body?.text,
      parsed?.body?.html,
      parsed?.text,
      parsed?.html,
      typeof parsed?.body === "string" ? parsed.body : null,
    ].filter((part) => typeof part === "string");
    if (parts.length) raw = parts.join("\n");
  } catch {
    // Raw MIME/plain-text response; continue with the original body.
  }
  return raw
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&")
    .replace(/=\r?\n/g, "")
    .replace(/=3D/gi, "=");
}

async function findMailboxActionLink(env, email, type, attempts = 20) {
  const mailbox = email.split("@")[0];
  const inbucket = env.inbucketUrl || "http://127.0.0.1:54324";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${inbucket}/api/v1/mailbox/${encodeURIComponent(mailbox)}`);
    if (response.ok) {
      const payload = await response.json();
      const messages = Array.isArray(payload) ? payload : (payload?.messages ?? []);
      for (const message of messages) {
        const id = message?.id;
        if (!id) continue;
        const detail = await fetch(`${inbucket}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${id}`);
        if (!detail.ok) continue;
        const body = normalizeMailboxBody(await detail.text());
        const urls = body.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
        for (const candidate of urls) {
          const cleaned = candidate.replace(/[),.;]+$/, "");
          try {
            const parsed = new URL(cleaned);
            if (parsed.pathname.includes("/auth/v1/verify") && parsed.searchParams.get("type") === type) {
              return cleaned;
            }
          } catch {
            // Ignore non-URL fragments from the MIME envelope.
          }
        }
      }
    }
    await wait(1000);
  }
  throw new EphemeralError(`Inbucket sem link ${type} para mailbox efêmera`);
}

function tokenHashFromActionLink(actionLink) {
  const parsed = new URL(actionLink);
  const tokenHash = parsed.searchParams.get("token") || parsed.searchParams.get("token_hash");
  if (!tokenHash) throw new EphemeralError("action link sem token hash");
  return tokenHash;
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
      and table_name in (
        'profiles','user_progress','user_srs','subscriptions','transactions','placement_attempts',
        'placement_onboarding_drafts','user_economy','organizations','organization_members',
        'organization_invites','organization_subscriptions','organization_entitlement_grants'
      )
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
  const authenticatedOrganizationWrites = rows.filter(
    (row) =>
      row.grantee === "authenticated" &&
      ["INSERT", "UPDATE", "DELETE", "TRUNCATE"].includes(row.privilege_type) &&
      [
        "organizations",
        "organization_members",
        "organization_invites",
        "organization_subscriptions",
        "organization_entitlement_grants",
      ].includes(row.table_name)
  );
  if (authenticatedOrganizationWrites.length) {
    throw new EphemeralError(
      `authenticated organization writes remain: ${authenticatedOrganizationWrites
        .map((row) => `${row.table_name}:${row.privilege_type}`)
        .join(",")}`
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
  const organizationIds = [];
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
      ["A", clientA, "profiles", "update_b_onboarding", async (c) => c.from("profiles").update({ onboarding_completed: true }).eq("id", userB.id).select("id")],
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

    const suffix = userA.id.slice(0, 8);
    const { data: orgA, error: orgAError } = await admin
      .from("organizations")
      .insert({ name: "Ephemeral Org A", slug: `ephemeral-org-a-${suffix}`, status: "active" })
      .select("id")
      .single();
    const { data: orgB, error: orgBError } = await admin
      .from("organizations")
      .insert({ name: "Ephemeral Org B", slug: `ephemeral-org-b-${suffix}`, status: "active" })
      .select("id")
      .single();
    if (orgAError || orgBError || !orgA?.id || !orgB?.id) {
      throw new EphemeralError(`org seed: ${orgAError?.message ?? orgBError?.message ?? "missing id"}`);
    }
    organizationIds.push(orgA.id, orgB.id);
    const seeds = [
      admin.from("organization_members").insert({ organization_id: orgA.id, user_id: userA.id, role: "learner", seat_status: "active" }),
      admin.from("organization_members").insert({ organization_id: orgB.id, user_id: userB.id, role: "owner", seat_status: "active" }),
      admin.from("organization_invites").insert({
        organization_id: orgA.id,
        email: "invite-a@example.invalid",
        role: "learner",
        token_hash: `token-a-${suffix}`,
        status: "pending",
        invited_by: userA.id,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      }),
      admin.from("organization_invites").insert({
        organization_id: orgB.id,
        email: "invite-b@example.invalid",
        role: "learner",
        token_hash: `token-b-${suffix}`,
        status: "pending",
        invited_by: userB.id,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      }),
      admin.from("organization_subscriptions").insert({ organization_id: orgA.id, status: "active", seat_limit: 5 }),
      admin.from("organization_subscriptions").insert({ organization_id: orgB.id, status: "active", seat_limit: 5 }),
      admin.from("organization_entitlement_grants").insert({
        organization_id: orgA.id,
        access_source: "internal",
        seat_limit: 5,
        status: "active",
      }),
      admin.from("organization_entitlement_grants").insert({
        organization_id: orgB.id,
        access_source: "internal",
        seat_limit: 5,
        status: "active",
      }),
    ];
    const seedResults = await Promise.all(seeds);
    const seedFailure = seedResults.find((row) => row.error)?.error;
    if (seedFailure) throw new EphemeralError(`organization seed: ${seedFailure.message}`);

    const assertVisibleCount = async (actor, client, table, column, value, expected, op) => {
      const { data, error } = await client.from(table).select(column).eq(column, value);
      if (error) throw new EphemeralError(`matrix ${actor} ${table} ${op}: ${error.message}`);
      const count = data?.length ?? 0;
      if (count !== expected) {
        throw new EphemeralError(`matrix ${actor} ${table} ${op}: count=${count} expected=${expected}`);
      }
      results.push({ actor, table, op, blocked: expected === 0, ok: true });
    };

    await assertVisibleCount("A_member", clientA, "organizations", "id", orgA.id, 1, "select_own_org");
    await assertVisibleCount("A_member", clientA, "organizations", "id", orgB.id, 0, "select_org_b");
    await assertVisibleCount("A_member", clientA, "organization_members", "organization_id", orgA.id, 1, "select_own_peers");
    await assertVisibleCount("A_member", clientA, "organization_members", "organization_id", orgB.id, 0, "select_org_b_peers");
    await assertVisibleCount("A_member", clientA, "organization_invites", "organization_id", orgA.id, 0, "select_invites_without_admin");
    await assertVisibleCount("A_member", clientA, "organization_entitlement_grants", "organization_id", orgB.id, 0, "select_org_b_entitlement");
    await assertVisibleCount("B_owner", clientB, "organization_invites", "organization_id", orgB.id, 1, "select_own_invites");
    await assertVisibleCount("B_owner", clientB, "organization_entitlement_grants", "organization_id", orgB.id, 1, "select_own_entitlement");

    const anonOrganization = await anon.from("organizations").select("id").eq("id", orgA.id);
    if (!anonOrganization.error && (anonOrganization.data?.length ?? 0) > 0) {
      throw new EphemeralError("anonymous actor read an organization");
    }
    results.push({ actor: "anon", table: "organizations", op: "select", blocked: true, ok: true });

    const memberAdmin = await clientA.rpc("is_organization_admin", { p_org_id: orgA.id });
    const ownerAdmin = await clientB.rpc("is_organization_admin", { p_org_id: orgB.id });
    if (memberAdmin.error || memberAdmin.data !== false) {
      throw new EphemeralError(`common member admin=${String(memberAdmin.data)} error=${memberAdmin.error?.message ?? "-"}`);
    }
    if (ownerAdmin.error || ownerAdmin.data !== true) {
      throw new EphemeralError(`owner admin=${String(ownerAdmin.data)} error=${ownerAdmin.error?.message ?? "-"}`);
    }
    results.push({ actor: "A_member", table: "organization_members", op: "admin_helper", blocked: true, ok: true });
    results.push({ actor: "B_owner", table: "organization_members", op: "admin_helper", blocked: false, ok: true });

    const forbiddenMembershipWrite = await clientA
      .from("organization_members")
      .update({ role: "owner" })
      .eq("organization_id", orgB.id)
      .eq("user_id", userB.id)
      .select("user_id");
    if (!forbiddenMembershipWrite.error && (forbiddenMembershipWrite.data?.length ?? 0) > 0) {
      throw new EphemeralError("common member changed foreign organization role");
    }
    results.push({ actor: "A_member", table: "organization_members", op: "update_org_b_role", blocked: true, ok: true });

    const serviceOrganizations = await admin.from("organizations").select("id").in("id", organizationIds);
    if (serviceOrganizations.error || (serviceOrganizations.data?.length ?? 0) !== 2) {
      throw new EphemeralError(`service_role organizations: ${serviceOrganizations.error?.message ?? "count mismatch"}`);
    }
    results.push({ actor: "service_role", table: "organizations", op: "select_all", blocked: false, ok: true });
    return { ok: true, results };
  } finally {
    if (organizationIds.length) await admin.from("organizations").delete().in("id", organizationIds);
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
      const firstWrite = await sessionA.from("user_progress").upsert(snap(first), { onConflict: "user_id" });
      if (firstWrite.error) {
        throw new EphemeralError(`monotonic insert ${first}: ${firstWrite.error.message}`);
      }
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

export async function runMultiDeviceSyncContract(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "sync-devices");
  try {
    const deviceA = await signIn(env, user);
    const deviceB = await signIn(env, user);
    const progressRow = (level, completed, mistakes) => ({
      user_id: user.id,
      completed_lessons: completed,
      lesson_task_progress: { "topic-sync": { mistakes, stepIndex: level + 1 } },
      client_snapshot: {
        schemaVersion: 1,
        account: { id: `cloud:${user.id}`, authMode: "cloud" },
        progress: {
          completedLessons: completed,
          lessonMasteryById: { "topic-sync": { level } },
          mistakes: mistakes.map((itemId) => ({ itemId, count: 1 })),
        },
      },
      client_snapshot_version: 1,
      updated_at: new Date().toISOString(),
    });
    const firstProgress = await deviceA
      .from("user_progress")
      .upsert(progressRow(1, ["topic-sync"], ["char:ren"]), { onConflict: "user_id" });
    if (firstProgress.error) throw new EphemeralError(`sync device A progress: ${firstProgress.error.message}`);
    const firstSrs = await deviceA.from("user_srs").upsert(
      {
        user_id: user.id,
        item_type: "char",
        item_id: "char:ren",
        domain: "core",
        track: "mandarin",
        ease: 2.5,
        interval_days: 1,
        repetitions: 1,
        lapses: 0,
        due_at: "2030-01-01T00:00:00.000Z",
        last_grade: "good",
      },
      { onConflict: "user_id,item_type,item_id,domain,track" }
    );
    if (firstSrs.error) throw new EphemeralError(`sync device A SRS: ${firstSrs.error.message}`);

    const deviceBProgress = await deviceB
      .from("user_progress")
      .select("user_id,completed_lessons,lesson_task_progress,client_snapshot")
      .eq("user_id", user.id)
      .single();
    const deviceBSrs = await deviceB
      .from("user_srs")
      .select("user_id,item_id,repetitions,lapses,due_at")
      .eq("user_id", user.id)
      .single();
    if (deviceBProgress.error || deviceBSrs.error) {
      throw new EphemeralError(`sync device B pull: ${deviceBProgress.error?.message ?? deviceBSrs.error?.message}`);
    }
    if (
      deviceBProgress.data?.user_id !== user.id ||
      deviceBProgress.data?.client_snapshot?.progress?.lessonMasteryById?.["topic-sync"]?.level !== 1 ||
      deviceBSrs.data?.repetitions !== 1
    ) {
      throw new EphemeralError("sync device B did not receive device A state");
    }

    const secondProgress = await deviceB
      .from("user_progress")
      .upsert(progressRow(2, ["topic-sync", "topic-sync-next"], []), { onConflict: "user_id" });
    if (secondProgress.error) throw new EphemeralError(`sync device B progress: ${secondProgress.error.message}`);
    const secondSrs = await deviceB
      .from("user_srs")
      .update({ repetitions: 2, lapses: 1, interval_days: 3, due_at: "2030-01-04T00:00:00.000Z", last_grade: "hard" })
      .eq("user_id", user.id)
      .eq("item_id", "char:ren");
    if (secondSrs.error) throw new EphemeralError(`sync device B SRS: ${secondSrs.error.message}`);

    const deviceAProgress = await deviceA
      .from("user_progress")
      .select("user_id,completed_lessons,lesson_task_progress,client_snapshot")
      .eq("user_id", user.id)
      .single();
    const deviceASrs = await deviceA
      .from("user_srs")
      .select("user_id,item_id,repetitions,lapses,due_at")
      .eq("user_id", user.id)
      .single();
    if (deviceAProgress.error || deviceASrs.error) {
      throw new EphemeralError(`sync device A refresh: ${deviceAProgress.error?.message ?? deviceASrs.error?.message}`);
    }
    if (
      deviceAProgress.data?.user_id !== user.id ||
      deviceAProgress.data?.client_snapshot?.progress?.lessonMasteryById?.["topic-sync"]?.level !== 2 ||
      !deviceAProgress.data?.completed_lessons?.includes("topic-sync-next") ||
      (deviceAProgress.data?.client_snapshot?.progress?.mistakes?.length ?? -1) !== 0 ||
      deviceASrs.data?.repetitions !== 2 ||
      deviceASrs.data?.lapses !== 1
    ) {
      throw new EphemeralError("sync device A did not receive device B advancement");
    }
    return {
      ok: true,
      sameUserId: true,
      deviceBReceivedDeviceA: true,
      deviceAReceivedDeviceB: true,
      progress: true,
      mastery: true,
      srs: true,
      mistakes: true,
      conflictAuthority: "server monotonic mastery trigger + explicit SRS row update",
    };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function runLocalAuthFlow(env) {
  const { anon, admin } = ephemeralClients(env);
  const email = `local-auth-${Date.now()}@example.com`;
  const password = `Ly!${Date.now()}9aA`;
  let userId = null;
  try {
    const signup = await anon.auth.signUp({
      email,
      password,
      options: { data: { name: "Local Auth" }, emailRedirectTo: "http://127.0.0.1:5173/confirmar-email" },
    });
    if (signup.error) throw new EphemeralError(`signUp: ${signup.error.message}`);
    userId = signup.data.user?.id ?? null;
    if (!userId) throw new EphemeralError("signUp sem user");
    const already = signup.data.session;
    let confirmedViaMailbox = false;
    let usedAdminFallback = false;
    if (!already) {
      try {
        const confirmUrl = await findMailboxActionLink(env, email, "signup", 15);
        const confirmed = await fetch(confirmUrl, { redirect: "manual" });
        if (confirmed.status >= 400) {
          throw new EphemeralError(`signup confirmation HTTP ${confirmed.status}`);
        }
        confirmedViaMailbox = true;
      } catch {
        const fallback = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
        if (fallback.error) throw new EphemeralError(`admin confirm fallback: ${fallback.error.message}`);
        usedAdminFallback = true;
      }
    }
    const session = await signIn(env, { id: userId, email, password });
    const { data: profile } = await session.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (profile?.id !== userId) throw new EphemeralError("profile missing after local auth");
    return {
      ok: true,
      classification: already
        ? "LOCAL_AUTH_FLOW_READY (autoconfirm session)"
        : confirmedViaMailbox
          ? "LOCAL_AUTH_FLOW_READY (Inbucket confirm)"
          : "LOCAL_AUTH_FLOW_READY with admin confirm fallback (Inbucket empty)",
      mailbox: confirmedViaMailbox,
      adminFallback: usedAdminFallback,
    };
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
}

export async function runPasswordRecoveryFlow(env) {
  const { anon, admin } = ephemeralClients(env);
  const recoveredUser = await createUser(admin, "recovery-ok");
  const expiredUser = await createUser(admin, "recovery-expired");
  const redirectTo = "http://127.0.0.1:5173/redefinir-senha";
  try {
    const requested = await anon.auth.resetPasswordForEmail(recoveredUser.email, { redirectTo });
    if (requested.error) throw new EphemeralError(`resetPasswordForEmail: ${requested.error.message}`);
    const recoveryLink = await findMailboxActionLink(env, recoveredUser.email, "recovery");
    const recovery = await anon.auth.verifyOtp({
      token_hash: tokenHashFromActionLink(recoveryLink),
      type: "recovery",
    });
    if (recovery.error || recovery.data.user?.id !== recoveredUser.id || !recovery.data.session) {
      throw new EphemeralError(`recovery verify: ${recovery.error?.message ?? "session mismatch"}`);
    }

    const newPassword = `${recoveredUser.password}Z7!`;
    const updated = await anon.auth.updateUser({ password: newPassword });
    if (updated.error || updated.data.user?.id !== recoveredUser.id) {
      throw new EphemeralError(`recovery update password: ${updated.error?.message ?? "user mismatch"}`);
    }
    const logout = await anon.auth.signOut({ scope: "local" });
    if (logout.error) throw new EphemeralError(`recovery logout: ${logout.error.message}`);

    const recoveredIdentity = { ...recoveredUser, password: newPassword };
    const signedIn = await signIn(env, recoveredIdentity);
    const current = await signedIn.auth.getSession();
    const refreshToken = current.data.session?.refresh_token;
    if (current.error || !refreshToken) {
      throw new EphemeralError(`recovery login session: ${current.error?.message ?? "missing refresh token"}`);
    }
    const refreshed = await signedIn.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshed.error || refreshed.data.user?.id !== recoveredUser.id) {
      throw new EphemeralError(`refresh session: ${refreshed.error?.message ?? "user mismatch"}`);
    }
    const relogout = await signedIn.auth.signOut({ scope: "local" });
    if (relogout.error) throw new EphemeralError(`recovery relogout: ${relogout.error.message}`);
    const afterLogout = await signedIn.auth.getSession();
    if (afterLogout.data.session) throw new EphemeralError("logout kept a local session");

    const invalid = await anon.auth.verifyOtp({ token_hash: "0".repeat(64), type: "recovery" });
    if (!invalid.error || invalid.data.session) {
      throw new EphemeralError("invalid recovery token did not fail closed");
    }

    const expiredRequest = await anon.auth.resetPasswordForEmail(expiredUser.email, { redirectTo });
    if (expiredRequest.error) {
      throw new EphemeralError(`expired reset request: ${expiredRequest.error.message}`);
    }
    const expiredLink = await findMailboxActionLink(env, expiredUser.email, "recovery");
    querySql(
      env,
      `update auth.users set recovery_sent_at = now() - interval '2 hours' where id = '${expiredUser.id}';`
    );
    const expired = await anon.auth.verifyOtp({
      token_hash: tokenHashFromActionLink(expiredLink),
      type: "recovery",
    });
    if (!expired.error || expired.data.session) {
      throw new EphemeralError("expired recovery token did not fail closed");
    }

    let offlineRejected = false;
    try {
      await fetch("http://127.0.0.1:1/auth/v1/health", { signal: AbortSignal.timeout(1500) });
    } catch {
      offlineRejected = true;
    }
    const online = await fetch(`${env.url}/auth/v1/health`);
    if (!offlineRejected || !online.ok) {
      throw new EphemeralError(`offline/online reconnect offline=${offlineRejected} online=${online.status}`);
    }

    return {
      ok: true,
      passwordRecovery: true,
      recoveryLink: true,
      invalidLinkRejected: true,
      expiredLinkRejected: true,
      logoutLogin: true,
      refreshToken: true,
      offlineOnlineReconnect: true,
      mailbox: true,
    };
  } finally {
    await admin.auth.admin.deleteUser(recoveredUser.id);
    await admin.auth.admin.deleteUser(expiredUser.id);
  }
}

export async function runCourseLanguageBackendCompatibility(env) {
  const { admin } = ephemeralClients(env);
  const user = await createUser(admin, "course-language");
  try {
    const session = await signIn(env, user);
    const progressRow = {
      user_id: user.id,
      completed_lessons: ["topic-locale-invariant"],
      lesson_task_progress: {
        "topic-locale-invariant": { stepIndex: 3, mistakes: ["char:ren"], unlocked: true },
      },
      client_snapshot: {
        schemaVersion: 1,
        account: { id: `cloud:${user.id}`, authMode: "cloud" },
        progress: {
          completedLessons: ["topic-locale-invariant"],
          lessonMasteryById: { "topic-locale-invariant": { level: 3 } },
          mistakes: [{ itemId: "char:ren", count: 1 }],
          unlockedLessonIds: ["topic-locale-next"],
        },
      },
      client_snapshot_version: 1,
      updated_at: new Date().toISOString(),
    };
    const progressWrite = await session.from("user_progress").upsert(progressRow, { onConflict: "user_id" });
    if (progressWrite.error) throw new EphemeralError(`course language progress seed: ${progressWrite.error.message}`);
    const srsWrite = await session.from("user_srs").upsert(
      {
        user_id: user.id,
        item_type: "char",
        item_id: "char:ren",
        domain: "core",
        track: "mandarin",
        ease: 2.6,
        interval_days: 4,
        repetitions: 2,
        lapses: 1,
        due_at: "2030-01-02T03:04:05.000Z",
        last_grade: "hard",
      },
      { onConflict: "user_id,item_type,item_id,domain,track" }
    );
    if (srsWrite.error) throw new EphemeralError(`course language SRS seed: ${srsWrite.error.message}`);

    const readState = async () => {
      const progress = await admin
        .from("user_progress")
        .select("completed_lessons,lesson_task_progress,client_snapshot,client_snapshot_version")
        .eq("user_id", user.id)
        .single();
      const srs = await admin
        .from("user_srs")
        .select("item_type,item_id,domain,track,ease,interval_days,repetitions,lapses,due_at,last_grade")
        .eq("user_id", user.id)
        .order("item_id");
      if (progress.error || srs.error) {
        throw new EphemeralError(`course language state read: ${progress.error?.message ?? srs.error?.message}`);
      }
      return { progress: progress.data, srs: srs.data };
    };

    const before = await readState();
    const firstSwitch = await session
      .from("profiles")
      .update({ interface_locale: "en", instruction_locale: "pt-BR", native_language: "pt-BR", target_language: "zh-CN" })
      .eq("id", user.id);
    if (firstSwitch.error) throw new EphemeralError(`course language first switch: ${firstSwitch.error.message}`);
    const secondSwitch = await session
      .from("profiles")
      .update({ interface_locale: "pt-BR", instruction_locale: "en", native_language: "en", target_language: "zh-CN" })
      .eq("id", user.id);
    if (secondSwitch.error) throw new EphemeralError(`course language second switch: ${secondSwitch.error.message}`);
    const after = await readState();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new EphemeralError("course language switch changed progress/mastery/SRS/mistakes/unlock state");
    }
    const profile = await admin
      .from("profiles")
      .select("interface_locale,instruction_locale,native_language,target_language")
      .eq("id", user.id)
      .single();
    if (
      profile.error ||
      profile.data?.interface_locale !== "pt-BR" ||
      profile.data?.instruction_locale !== "en" ||
      profile.data?.native_language !== "en" ||
      profile.data?.target_language !== "zh-CN"
    ) {
      throw new EphemeralError(`course language profile mismatch: ${profile.error?.message ?? JSON.stringify(profile.data)}`);
    }
    return {
      ok: true,
      independentLocaleCombinations: 2,
      progressInvariant: true,
      masteryInvariant: true,
      srsInvariant: true,
      mistakesInvariant: true,
      unlockInvariant: true,
    };
  } finally {
    await admin.auth.admin.deleteUser(user.id);
  }
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
  const skipEnabled = process.env.TURNSTILE_ALLOW_SKIP === "1";
  if (!skipEnabled) {
    throw new EphemeralError("create-account Edge contract requires TURNSTILE_ALLOW_SKIP=1 only in the ephemeral stack");
  }
  const { admin } = ephemeralClients(env);
  const createdUserIds = [];
  const nonce = Date.now();
  const cases = [
    {
      name: "en-interface-en-instruction-brazil",
      interfaceLocale: "en",
      instructionLocale: "en",
      nativeLanguage: "en",
      targetLanguage: "zh-CN",
      countryCode: "BR",
      withPlacement: true,
    },
    {
      name: "pt-interface-pt-instruction-united-states",
      interfaceLocale: "pt-BR",
      instructionLocale: "pt-BR",
      nativeLanguage: "pt-BR",
      targetLanguage: "zh-CN",
      countryCode: "US",
    },
    {
      name: "en-interface-pt-instruction",
      interfaceLocale: "en",
      instructionLocale: "pt-BR",
      nativeLanguage: "pt-BR",
      targetLanguage: "zh-CN",
      countryCode: "JP",
    },
    {
      name: "pt-interface-en-instruction",
      interfaceLocale: "pt-BR",
      instructionLocale: "en",
      nativeLanguage: "en",
      targetLanguage: "zh-CN",
      countryCode: "DE",
    },
  ];

  const findUserByEmail = async (email) => {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listed.error) throw new EphemeralError(`listUsers: ${listed.error.message}`);
    return listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
  };

  const results = [];
  try {
    for (let index = 0; index < cases.length; index += 1) {
      const item = cases[index];
      const email = `create-acct-${nonce}-${index}@example.com`;
      const password = `Ly!${nonce}${index}9aA`;
      const headers = {
        apikey: env.anon,
        Authorization: `Bearer ${env.anon}`,
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
        "x-forwarded-for": `127.0.0.1, 198.51.100.${20 + index}`,
        "x-longyu-correlation-id": `eph-corr-00000000-0000-4000-8000-00000000002${index}`,
        "x-longyu-session-id": `eph-sess-00000000-0000-4000-8000-00000000003${index}`,
        "x-longyu-op": "create-account",
      };
      const requestBody = {
        email,
        password,
        displayName: `Create Account ${index + 1}`,
        emailRedirectTo: "http://127.0.0.1:5173/confirmar-email",
        countryCode: item.countryCode,
        signupSource: "ephemeral",
        interfaceLocale: item.interfaceLocale,
        instructionLocale: item.instructionLocale,
        nativeLanguage: item.nativeLanguage,
        targetLanguage: item.targetLanguage,
        ...(item.withPlacement
          ? {
              placement: {
                placementVersion: 2,
                declaredExperience: "zero",
                goal: "speak",
                answers: BEGINNER_EVIDENCE,
              },
            }
          : {}),
      };
      const response = await fetch(`${env.url}/functions/v1/create-account`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
      const responseText = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }
      if (response.status !== 200 || parsed?.pendingConfirmation !== true) {
        throw new EphemeralError(`create-account ${item.name} HTTP ${response.status} ${responseText.slice(0, 180)}`);
      }
      const user = await findUserByEmail(email);
      if (!user?.id) throw new EphemeralError(`create-account ${item.name}: auth user missing`);
      createdUserIds.push(user.id);
      const profile = await admin
        .from("profiles")
        .select("interface_locale,instruction_locale,native_language,target_language,country_code,onboarding_completed")
        .eq("id", user.id)
        .single();
      if (profile.error) throw new EphemeralError(`create-account ${item.name} profile: ${profile.error.message}`);
      const expectedProfile = {
        interface_locale: item.interfaceLocale,
        instruction_locale: item.instructionLocale,
        native_language: item.nativeLanguage,
        target_language: item.targetLanguage,
        country_code: item.countryCode,
        onboarding_completed: false,
      };
      for (const [field, expected] of Object.entries(expectedProfile)) {
        if (profile.data?.[field] !== expected) {
          throw new EphemeralError(
            `create-account ${item.name} ${field}=${String(profile.data?.[field])} expected=${String(expected)}`
          );
        }
      }
      const metadata = user.user_metadata ?? {};
      for (const [field, expected] of [
        ["interface_locale", item.interfaceLocale],
        ["instruction_locale", item.instructionLocale],
        ["native_language", item.nativeLanguage],
        ["target_language", item.targetLanguage],
      ]) {
        if (metadata[field] !== expected) {
          throw new EphemeralError(`create-account ${item.name} auth metadata ${field} mismatch`);
        }
      }
      const draft = await admin
        .from("placement_onboarding_drafts")
        .select("user_id")
        .eq("user_id", user.id);
      if (draft.error) throw new EphemeralError(`create-account ${item.name} draft: ${draft.error.message}`);
      const expectedDrafts = item.withPlacement ? 1 : 0;
      if ((draft.data?.length ?? 0) !== expectedDrafts) {
        throw new EphemeralError(`create-account ${item.name} drafts=${draft.data?.length ?? 0} expected=${expectedDrafts}`);
      }
      results.push({
        name: item.name,
        status: response.status,
        pendingConfirmation: true,
        profile: expectedProfile,
        placementDraft: item.withPlacement === true,
      });
    }

    const invalidEmail = `create-acct-${nonce}-invalid@example.com`;
    const invalidResponse = await fetch(`${env.url}/functions/v1/create-account`, {
      method: "POST",
      headers: {
        apikey: env.anon,
        Authorization: `Bearer ${env.anon}`,
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
        "x-longyu-op": "create-account",
      },
      body: JSON.stringify({
        email: invalidEmail,
        password: `Ly!${nonce}invalid9aA`,
        displayName: "Invalid Locale",
        interfaceLocale: "es",
        instructionLocale: "en",
        nativeLanguage: "en",
        targetLanguage: "zh-CN",
      }),
    });
    const invalidBody = await invalidResponse.json().catch(() => ({}));
    if (invalidResponse.status !== 400 || invalidBody?.code !== "invalid_locale_contract") {
      throw new EphemeralError(`create-account invalid locale HTTP ${invalidResponse.status}`);
    }
    if (await findUserByEmail(invalidEmail)) {
      throw new EphemeralError("create-account invalid locale created an auth user");
    }

    return {
      ok: true,
      status: 200,
      pendingConfirmation: true,
      skipEnabled,
      localeCases: results,
      invalidLocaleRejected: true,
    };
  } finally {
    for (const userId of createdUserIds) await admin.auth.admin.deleteUser(userId);
  }
}
