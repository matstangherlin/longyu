-- Reversão de qa-22-graduated-lesson-qi.sql.
-- Recria grant_lesson_reward exatamente como em
-- supabase/migrations/20260808170000_harden_client_reward_claims.sql, que é o
-- corpo em produção (conferido só com leitura em 28/10/2026:
-- md5(pg_get_functiondef) = 9e2b34129237625bd3a82319f52e7ab2). O servidor volta
-- a pagar o pacote fixo de 3★ e ignora p_stars. Antes de reverter, desligue
-- VITE_GRADUATED_LESSON_QI no Netlify: senão uma conclusão de 1★ recebe o pacote
-- de 3★ do servidor. Lançamentos já gravados no ledger ficam como estão.

create or replace function public.grant_lesson_reward(
  p_lesson_id text,
  p_attempt_id text,
  p_stars integer default 3,
  p_no_skip boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_economy;
  v_key text;
  v_qi integer := 0;
  v_is_pro boolean;
  v_lesson text := left(trim(coalesce(p_lesson_id, '')), 64);
  v_attempt text := left(trim(coalesce(p_attempt_id, '')), 64);
  v_verified boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_lesson = '' or v_attempt = '' then
    raise exception 'lesson_id e attempt_id obrigatórios';
  end if;
  if length(v_attempt) < 8 then
    raise exception 'attempt_id inválido';
  end if;

  -- p_stars / p_no_skip são ignorados de propósito (anti-cheat).

  if to_regclass('public.referral_eligible_lessons') is not null
     and not exists (
       select 1
       from public.referral_eligible_lessons lesson
       where lesson.lesson_id = v_lesson and lesson.enabled
     ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_lesson');
  end if;

  -- Evidência: conclusão verificada OU sessão de referral já fechada nesta lição.
  if to_regclass('public.referral_verified_lesson_completions') is not null then
    select exists (
      select 1
      from public.referral_verified_lesson_completions completion
      where completion.user_id = v_uid and completion.lesson_id = v_lesson
    ) into v_verified;
  end if;

  if not v_verified and to_regclass('public.referral_lesson_sessions') is not null then
    select exists (
      select 1
      from public.referral_lesson_sessions session
      where session.user_id = v_uid
        and session.lesson_id = v_lesson
        and session.completed_at is not null
    ) into v_verified;
  end if;

  if not v_verified then
    return jsonb_build_object('ok', false, 'error', 'attestation_required');
  end if;

  v_key := left('lesson-reward:' || v_lesson, 128);
  v_row := public.economy_ensure_row(v_uid);
  v_is_pro := public.economy_user_is_pro(v_uid);

  if public.economy_ledger_exists(v_uid, v_key) then
    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'economy', public.economy_row_to_json(v_row),
      'rewards', '[]'::jsonb
    );
  end if;

  -- Pacote fixo de conclusão attestada (não depende do cliente).
  v_qi := (public.economy_constants()->>'lesson_three_star_qi')::integer
       + (public.economy_constants()->>'lesson_no_skip_qi')::integer;
  if v_is_pro then
    v_qi := v_qi + (public.economy_constants()->>'pro_lesson_qi_bonus')::integer;
  end if;

  update public.user_economy
  set qi = qi + v_qi, updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  perform public.economy_insert_ledger(
    v_uid, 'grant_lesson_reward', v_qi, 'qi', v_lesson, v_key,
    jsonb_build_object(
      'lesson_id', v_lesson,
      'attempt_id', v_attempt,
      'stars', 3,
      'no_skip', true,
      'once_per_lesson', true,
      'client_metrics_ignored', true,
      'server_attested', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'economy', public.economy_row_to_json(v_row),
    'rewards', jsonb_build_array(jsonb_build_object('type', 'qi', 'amount', v_qi))
  );
end;
$$;

revoke all on function public.grant_lesson_reward(text, text, integer, boolean) from public;
grant execute on function public.grant_lesson_reward(text, text, integer, boolean) to authenticated;
