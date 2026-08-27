/**
 * Smoke de RLS com dois usuários (A ≠ B).
 *
 * Requer em .env.local:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   # só para criar/limpar usuários de teste
 *
 * Uso:
 *   npm run test:rls
 *
 * Sem service_role: falha com instrução clara (não é skip silencioso no gate).
 */
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { mergedEnv, readEnvFile } from "./lib/env-local.mjs";
import { isProductionProjectId } from "./lib/staging-guard.mjs";

const env = {
  ...readEnvFile(".env.production"),
  ...mergedEnv(),
};

const url = (env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const stamp = Date.now();
const PASSWORD = "LongyuRlsTest999!";
const emailA = `rls-a-${stamp}@longyu.test`;
const emailB = `rls-b-${stamp}@longyu.test`;

let failures = 0;
function assert(cond, message) {
  if (cond) {
    console.log(`ok: ${message}`);
  } else {
    failures += 1;
    console.error(`FALHOU: ${message}`);
  }
}

if (env.LONGYU_STAGING_ONLY === "true" && isProductionProjectId(url)) {
  console.error("RECUSADO: LONGYU_STAGING_ONLY recusa MandarimProject de produção.");
  process.exit(2);
}

if (!url || !anon) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes.");
  process.exit(1);
}

if (!serviceRole) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY ausente — necessário para criar usuários A/B sem poluir o signup público."
  );
  console.error("Defina em .env.local e rode: npm run test:rls");
  process.exit(2);
}

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function userClient(accessToken) {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: email.startsWith("rls-a") ? "RLS A" : "RLS B" },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user;
}

async function signIn(email) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.session;
}

async function cleanup(userIds) {
  for (const id of userIds) {
    if (!id) continue;
    await admin.from("beta_feedback").delete().eq("user_id", id);
    await admin.from("beta_pedagogy_events").delete().eq("user_id", id);
    await admin.from("league_xp_events").delete().eq("user_id", id);
    await admin.from("league_weekly_results").delete().eq("user_id", id);
    await admin.from("league_memberships").delete().eq("user_id", id);
    await admin.from("user_srs").delete().eq("user_id", id);
    await admin.from("user_missions").delete().eq("user_id", id);
    await admin.from("user_chests").delete().eq("user_id", id);
    await admin.from("user_achievements").delete().eq("user_id", id);
    await admin.from("placement_onboarding_drafts").delete().eq("user_id", id);
    await admin.from("placement_attempts").delete().eq("user_id", id);
    await admin.from("organization_members").delete().eq("user_id", id);
    await admin.from("user_progress").delete().eq("user_id", id);
    await admin.from("user_economy").delete().eq("user_id", id);
    await admin.from("subscriptions").delete().eq("user_id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

const createdIds = [];
const createdOrgIds = [];
let socialSchemaAvailable = false;
let socialUsername = "";

function blockedReadOk(rows, error, label) {
  if (error) {
    console.log(`· ${label}: leitura bloqueada com erro (${error.message.slice(0, 80)})`);
    return true;
  }
  return (rows ?? []).length === 0;
}

function blockedWriteOk(rows, error, label) {
  if (error) {
    console.log(`· ${label}: escrita bloqueada com erro (${error.message.slice(0, 80)})`);
    return true;
  }
  return (rows ?? []).length === 0;
}

async function tableReady(table) {
  const { error } = await admin.from(table).select("*").limit(0);
  if (!error) return true;
  const message = error.message ?? "";
  if (/schema cache|does not exist|Could not find the table|relation .* does not exist/i.test(message)) {
    console.log(`· ${table} ausente neste projeto; pulando (migration nao aplicada)`);
    return false;
  }
  console.log(`· ${table} probe: ${message.slice(0, 100)}`);
  return true;
}

try {
  console.log("== test:rls ==");
  console.log("URL:", url);

  const userA = await createUser(emailA);
  const userB = await createUser(emailB);
  createdIds.push(userA.id, userB.id);

  socialUsername = `rls_b_${stamp}`;
  const { error: socialSeedErr } = await admin
    .from("profiles")
    .update({
      username: socialUsername,
      show_in_search: true,
      phone: "+5500000000000",
      marketing_opt_in: true,
    })
    .eq("id", userB.id);
  if (!socialSeedErr) {
    socialSchemaAvailable = true;
    assert(true, "seed perfil social publico + campos privados de B");
  } else if (
    socialSeedErr.code === "PGRST204" ||
    /show_in_search|username/i.test(socialSeedErr.message)
  ) {
    console.log("· modulo social ainda nao implantado; testes sociais condicionais serao ignorados");
  } else {
    assert(false, `seed perfil social B (${socialSeedErr.message})`);
  }

  // Seed progresso/economia/assinatura via service_role (bypass RLS).
  const { error: progErr } = await admin.from("user_progress").upsert({
    user_id: userB.id,
    xp_total: 1234,
    streak: 7,
    completed_lessons: ["secret-lesson-b"],
    updated_at: new Date().toISOString(),
  });
  assert(!progErr, `seed user_progress B (${progErr?.message ?? "ok"})`);

  const { error: ecoErr } = await admin.from("user_economy").upsert({
    user_id: userB.id,
    qi: 99,
    updated_at: new Date().toISOString(),
  });
  assert(!ecoErr, `seed user_economy B (${ecoErr?.message ?? "ok"})`);

  const { error: subErr } = await admin.from("subscriptions").upsert({
    user_id: userB.id,
    stripe_subscription_id: `rls_test_${stamp}`,
    status: "active",
    current_period_end: new Date(Date.now() + 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });
  assert(!subErr, `seed subscriptions B (${subErr?.message ?? "ok"})`);

  // Seed adicionais para ampliar cobertura de isolamento.
  const { error: srsErr } = await admin.from("user_srs").upsert({
    user_id: userB.id,
    item_type: "chunk",
    item_id: `rls_item_${stamp}`,
    domain: "meaning",
    track: "speak",
    ease: 2.5,
    interval_days: 1,
    repetitions: 1,
    lapses: 0,
    due_at: new Date(Date.now() + 3600000).toISOString(),
    last_grade: "good",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,item_type,item_id,domain" });
  assert(!srsErr, `seed user_srs B (${srsErr?.message ?? "ok"})`);

  const { error: missionErr } = await admin.from("user_missions").upsert({
    user_id: userB.id,
    scope: "daily",
    mission_id: "missao-diaria-1",
    period_key: "2026-08-04",
    progress: 1,
    claimed: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,scope,mission_id,period_key" });
  assert(!missionErr, `seed user_missions B (${missionErr?.message ?? "ok"})`);

  const { error: chestErr } = await admin.from("user_chests").upsert({
    user_id: userB.id,
    chest_type: "small",
    quantity: 2,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,chest_type" });
  assert(!chestErr, `seed user_chests B (${chestErr?.message ?? "ok"})`);

  const { error: achievementErr } = await admin.from("user_achievements").upsert({
    user_id: userB.id,
    achievement_id: "jornada-primeira-licao",
    unlocked_at: new Date().toISOString(),
    reward: { qi: 10 },
  }, { onConflict: "user_id,achievement_id" });
  assert(!achievementErr, `seed user_achievements B (${achievementErr?.message ?? "ok"})`);

  const weekKey = "2026-W32";
  const { error: membershipErr } = await admin.from("league_memberships").upsert({
    user_id: userB.id,
    league_tier_id: "bronze",
    current_week_key: weekKey,
    weekly_xp: 42,
    rank_position: 7,
    joined_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  assert(!membershipErr, `seed league_memberships B (${membershipErr?.message ?? "ok"})`);

  const { error: weeklyErr } = await admin.from("league_weekly_results").insert({
    week_key: weekKey,
    user_id: userB.id,
    league_tier_id: "bronze",
    weekly_xp: 42,
    final_rank: 7,
    movement: "stay",
    reward_claimed: false,
    reward_qi: 0,
    reward_chest_type: null,
  });
  assert(!weeklyErr, `seed league_weekly_results B (${weeklyErr?.message ?? "ok"})`);

  const { error: xpEventErr } = await admin.from("league_xp_events").insert({
    user_id: userB.id,
    week_key: weekKey,
    source_key: `rls_test_${stamp}`,
    amount: 10,
  });
  assert(!xpEventErr, `seed league_xp_events B (${xpEventErr?.message ?? "ok"})`);

  const { error: feedbackErr } = await admin.from("beta_feedback").insert({
    user_id: userB.id,
    local_profile_id: "rls",
    category: "bug",
    message: "RLS seed",
    route: "/jornada",
    app_version: "test",
    browser: "test",
    viewport: "390x844",
    status: "open",
    client_dedupe_key: `rls_feedback_${stamp}`,
  });
  assert(!feedbackErr, `seed beta_feedback B (${feedbackErr?.message ?? "ok"})`);

  const { error: pedagogyErr } = await admin.from("beta_pedagogy_events").insert({
    user_id: userB.id,
    local_profile_id: "rls",
    event_type: "lesson_started",
    lesson_id: "l1",
    route: "/licao/l1/player",
    metadata: {},
    client_dedupe_key: `rls_pedagogy_${stamp}`,
    client_context_digest: "rls",
    rate_bucket_key: "rls",
  });
  assert(!pedagogyErr, `seed beta_pedagogy_events B (${pedagogyErr?.message ?? "ok"})`);

  const sessionA = await signIn(emailA);
  const clientA = userClient(sessionA.access_token);

  // A lê o próprio perfil (ou vazio se trigger não criou — sem erro).
  const { error: ownProfileErr } = await clientA.from("profiles").select("id").eq("id", userA.id);
  assert(!ownProfileErr, `A lê próprio perfil (${ownProfileErr?.message ?? "ok"})`);

  const { data: foreignProfile, error: foreignProfileErr } = await clientA
    .from("profiles")
    .select("*")
    .eq("id", userB.id);
  assert(
    blockedReadOk(foreignProfile, foreignProfileErr, "profiles"),
    "A nao le nenhuma coluna do perfil-base de B"
  );

  if (socialSchemaAvailable) {
    const { data: publicSearch, error: publicSearchErr } = await clientA.rpc(
      "search_public_profiles",
      { search_query: socialUsername.slice(0, 8) }
    );
    assert(!publicSearchErr, `busca social responde (${publicSearchErr?.message ?? "ok"})`);
    const searched = (publicSearch ?? []).find((row) => row.user_id === userB.id);
    assert(Boolean(searched), "perfil publico pesquisavel de B aparece na busca");
    assert(
      searched && !("phone" in searched) && !("birth_date" in searched) && !("marketing_opt_in" in searched),
      "busca social retorna somente colunas publicas"
    );

    const { error: hideErr } = await admin
      .from("profiles")
      .update({ show_in_search: false })
      .eq("id", userB.id);
    assert(!hideErr, `oculta perfil B (${hideErr?.message ?? "ok"})`);

    const { data: hiddenDirect, error: hiddenDirectErr } = await clientA.rpc(
      "get_public_profile_by_username",
      { target_username: socialUsername }
    );
    assert(!hiddenDirectErr, `lookup oculto responde (${hiddenDirectErr?.message ?? "ok"})`);
    assert((hiddenDirect ?? []).length === 0, "perfil oculto de B nao aparece por lookup direto");

    const { error: followErr } = await clientA.from("user_follows").insert({
      follower_id: userA.id,
      following_id: userB.id,
    });
    assert(!followErr, `A segue B (${followErr?.message ?? "ok"})`);

    const { data: relatedProfiles, error: relatedProfilesErr } = await clientA.rpc(
      "get_public_profiles_by_ids",
      { target_user_ids: [userB.id] }
    );
    assert(!relatedProfilesErr, `batch de perfis relacionados responde (${relatedProfilesErr?.message ?? "ok"})`);
    assert((relatedProfiles ?? []).length === 1, "A ve campos publicos do perfil oculto que segue");

    const { data: relatedBaseProfile, error: relatedBaseProfileErr } = await clientA
      .from("profiles")
      .select("*")
      .eq("id", userB.id);
    assert(
      blockedReadOk(relatedBaseProfile, relatedBaseProfileErr, "profiles relacionado"),
      "seguir B nao libera nenhuma coluna do perfil-base"
    );
  }

  // A NÃO lê progresso de B.
  const { data: foreignProgress, error: foreignProgressErr } = await clientA
    .from("user_progress")
    .select("user_id, xp_total, completed_lessons")
    .eq("user_id", userB.id);
  assert(!foreignProgressErr, `select progresso B sem erro RLS (${foreignProgressErr?.message ?? "ok"})`);
  assert((foreignProgress ?? []).length === 0, "A não lê progresso de B");

  // A NÃO lê economia de B.
  const { data: foreignEco } = await clientA
    .from("user_economy")
    .select("user_id, qi")
    .eq("user_id", userB.id);
  assert((foreignEco ?? []).length === 0, "A não lê economia de B");

  // A NÃO lê assinatura de B.
  const { data: foreignSub } = await clientA
    .from("subscriptions")
    .select("user_id, status, stripe_subscription_id")
    .eq("user_id", userB.id);
  assert((foreignSub ?? []).length === 0, "A não lê assinatura de B");

  const { data: foreignSrs, error: foreignSrsErr } = await clientA
    .from("user_srs")
    .select("user_id,item_id")
    .eq("user_id", userB.id);
  assert(blockedReadOk(foreignSrs, foreignSrsErr, "user_srs"), "A não lê user_srs de B");

  const { data: foreignMissions, error: foreignMissionsErr } = await clientA
    .from("user_missions")
    .select("user_id,mission_id")
    .eq("user_id", userB.id);
  assert(blockedReadOk(foreignMissions, foreignMissionsErr, "user_missions"), "A não lê user_missions de B");

  const { data: foreignChests, error: foreignChestsErr } = await clientA
    .from("user_chests")
    .select("user_id,chest_type")
    .eq("user_id", userB.id);
  assert(blockedReadOk(foreignChests, foreignChestsErr, "user_chests"), "A não lê user_chests de B");

  const { data: foreignAchievements, error: foreignAchievementsErr } = await clientA
    .from("user_achievements")
    .select("user_id,achievement_id")
    .eq("user_id", userB.id);
  assert(
    blockedReadOk(foreignAchievements, foreignAchievementsErr, "user_achievements"),
    "A não lê user_achievements de B"
  );

  const { data: foreignLeagueMembership, error: foreignLeagueMembershipErr } = await clientA
    .from("league_memberships")
    .select("user_id,league_tier_id")
    .eq("user_id", userB.id);
  assert(
    blockedReadOk(foreignLeagueMembership, foreignLeagueMembershipErr, "league_memberships"),
    "A não lê membership da liga de B"
  );

  const { data: foreignLeagueResults, error: foreignLeagueResultsErr } = await clientA
    .from("league_weekly_results")
    .select("user_id,week_key")
    .eq("user_id", userB.id);
  assert(
    blockedReadOk(foreignLeagueResults, foreignLeagueResultsErr, "league_weekly_results"),
    "A não lê resultado semanal de B"
  );

  const { data: foreignLeagueEvents, error: foreignLeagueEventsErr } = await clientA
    .from("league_xp_events")
    .select("user_id,source_key")
    .eq("user_id", userB.id);
  assert(
    blockedReadOk(foreignLeagueEvents, foreignLeagueEventsErr, "league_xp_events"),
    "A não lê eventos de XP de B"
  );

  const { data: foreignFeedback, error: foreignFeedbackErr } = await clientA
    .from("beta_feedback")
    .select("user_id,id")
    .eq("user_id", userB.id);
  assert(blockedReadOk(foreignFeedback, foreignFeedbackErr, "beta_feedback"), "A não lê feedback de B");

  const { data: foreignPedagogy, error: foreignPedagogyErr } = await clientA
    .from("beta_pedagogy_events")
    .select("user_id,id")
    .eq("user_id", userB.id);
  assert(
    blockedReadOk(foreignPedagogy, foreignPedagogyErr, "beta_pedagogy_events"),
    "A não lê telemetria pedagógica de B"
  );

  if (await tableReady("placement_attempts")) {
    const { error: placementSeedErr } = await admin.from("placement_attempts").insert({
      user_id: userB.id,
      placement_version: 2,
      declared_experience: "zero",
      answers: [{ questionId: "q1", answer: "nihao", hintUsed: false, responseMode: "choice" }],
    });
    assert(!placementSeedErr, `seed placement_attempts B (${placementSeedErr?.message ?? "ok"})`);
    const { data: foreignPlacement, error: foreignPlacementErr } = await clientA
      .from("placement_attempts")
      .select("id,user_id")
      .eq("user_id", userB.id);
    assert(
      blockedReadOk(foreignPlacement, foreignPlacementErr, "placement_attempts"),
      "A nao le placement de B"
    );
  }

  if (await tableReady("placement_onboarding_drafts")) {
    const { error: draftSeedErr } = await admin.from("placement_onboarding_drafts").insert({
      user_id: userB.id,
      placement_version: 2,
      declared_experience: "zero",
      answers: [{ questionId: "q1", answer: "nihao", hintUsed: false, responseMode: "choice" }],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    assert(!draftSeedErr, `seed placement_onboarding_drafts B (${draftSeedErr?.message ?? "ok"})`);
    const { data: foreignDraft, error: foreignDraftErr } = await clientA
      .from("placement_onboarding_drafts")
      .select("user_id")
      .eq("user_id", userB.id);
    assert(
      blockedReadOk(foreignDraft, foreignDraftErr, "placement_onboarding_drafts"),
      "A nao le draft de onboarding de B"
    );
  }

  if (await tableReady("organizations") && (await tableReady("organization_members"))) {
    const slug = `rls-b-${stamp}`;
    const { data: orgB, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: "Org B RLS",
        slug,
        plan: "business",
        status: "active",
        billing_mode: "pilot_grant",
      })
      .select("id")
      .maybeSingle();
    assert(!orgErr && orgB?.id, `seed organizations B (${orgErr?.message ?? "ok"})`);
    if (orgB?.id) {
      createdOrgIds.push(orgB.id);
      const { error: memberErr } = await admin.from("organization_members").insert({
        organization_id: orgB.id,
        user_id: userB.id,
        role: "owner",
        seat_status: "active",
        joined_at: new Date().toISOString(),
      });
      assert(!memberErr, `seed organization_members B (${memberErr?.message ?? "ok"})`);
      const { data: foreignOrg, error: foreignOrgErr } = await clientA
        .from("organizations")
        .select("id,name")
        .eq("id", orgB.id);
      assert(blockedReadOk(foreignOrg, foreignOrgErr, "organizations"), "A nao le organizacao de B");
      const { data: foreignMembers, error: foreignMembersErr } = await clientA
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgB.id);
      assert(
        blockedReadOk(foreignMembers, foreignMembersErr, "organization_members"),
        "A nao le membership Business de B"
      );
    }
  }

  // A NÃO atualiza perfil de B.
  const { data: updatedProfile, error: updateProfileErr } = await clientA
    .from("profiles")
    .update({ name: "hacked-by-a" })
    .eq("id", userB.id)
    .select("id");
  assert((updatedProfile ?? []).length === 0, "A não altera perfil de B");
  // Alguns projetos retornam erro; outros retornam 0 rows — ambos ok.
  if (updateProfileErr) {
    console.log(`· update perfil B rejeitado: ${updateProfileErr.message.slice(0, 80)}`);
  }

  // A NÃO atualiza progresso de B.
  const { data: updatedProgress } = await clientA
    .from("user_progress")
    .update({ xp_total: 1 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert((updatedProgress ?? []).length === 0, "A não altera progresso de B");

  // A NÃO atualiza economia de B.
  const { data: updatedEco } = await clientA
    .from("user_economy")
    .update({ qi: 1 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert((updatedEco ?? []).length === 0, "A não altera economia de B");

  const { data: updatedSrs, error: updatedSrsErr } = await clientA
    .from("user_srs")
    .update({ interval_days: 99 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert(blockedWriteOk(updatedSrs, updatedSrsErr, "user_srs"), "A não altera user_srs de B");

  const { data: updatedMissions, error: updatedMissionsErr } = await clientA
    .from("user_missions")
    .update({ progress: 99 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert(blockedWriteOk(updatedMissions, updatedMissionsErr, "user_missions"), "A não altera user_missions de B");

  const { data: updatedChests, error: updatedChestsErr } = await clientA
    .from("user_chests")
    .update({ quantity: 0 })
    .eq("user_id", userB.id)
    .select("user_id");
  assert(blockedWriteOk(updatedChests, updatedChestsErr, "user_chests"), "A não altera user_chests de B");

  // Endpoint admin: is_beta_admin deve ser false para usuário comum.
  const { data: isAdmin, error: adminErr } = await clientA.rpc("is_beta_admin");
  assert(!adminErr, `is_beta_admin responde (${adminErr?.message ?? "ok"})`);
  assert(isAdmin === false, "usuário comum não é beta admin");

  // apply_subscription_event não é executável por authenticated.
  const { error: applyErr } = await clientA.rpc("apply_subscription_event", {
    p_user_id: userB.id,
    p_customer_id: "cus_hack",
    p_subscription_id: `rls_test_${stamp}`,
    p_status: "canceled",
    p_price_id: null,
    p_current_period_start: null,
    p_current_period_end: null,
    p_cancel_at_period_end: true,
    p_event_created: 1,
  });
  assert(Boolean(applyErr), "authenticated não executa apply_subscription_event");

  // Confirma que B ainda tem os dados intactos (via service_role).
  const { data: stillB } = await admin
    .from("user_progress")
    .select("xp_total")
    .eq("user_id", userB.id)
    .maybeSingle();
  assert(stillB?.xp_total === 1234, "progresso de B intacto após tentativas de A");
} catch (error) {
  failures += 1;
  console.error("ERRO:", error instanceof Error ? error.message : error);
} finally {
  for (const orgId of createdOrgIds) {
    await admin.from("organization_members").delete().eq("organization_id", orgId);
    await admin.from("organization_entitlement_grants").delete().eq("organization_id", orgId);
    await admin.from("organizations").delete().eq("id", orgId);
  }
  await cleanup(createdIds);
  console.log("limpeza: usuários A/B removidos");
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nOK: test:rls passou — A não lê/altera dados de B.");
