-- QA 2026-10 · prompt 22 (LGY-026, R7) — Qi graduado na 1ª conclusão.
-- NÃO APLICADO. Hoje grant_lesson_reward ignora p_stars e paga sempre o pacote
-- de 3★ (5 + 2, +3 no Pro). Com o cliente graduado, uma conclusão de 1★ pediria
-- 3 Qi e o servidor pagaria 7. Esta versão usa p_stars só para PAGAR MENOS:
--   * 3★, p_stars ausente ou acima de 3: o mesmo pacote de hoje;
--   * 2★ = 4 Qi; 1★ (ou 0/negativo) = 3 Qi; sem bônus abaixo de 3★.
-- Nada mais muda: mesma attestação (referral session / conclusão verificada),
-- mesma chave de ledger por lição (uma vez só), mesmos grants.
-- Anti-cheat: um cliente que mente as estrelas recebe no máximo o pacote que já
-- recebe hoje. O servidor não sabe as estrelas reais; isto não é uma prova.
-- Base: 20260808170000_harden_client_reward_claims.sql = corpo em produção
-- (conferido só com leitura em 28/10/2026, md5 9e2b34129237625bd3a82319f52e7ab2).
-- Ordem: aplicar em staging, conferir, aplicar em produção com backup, e só
-- então ligar VITE_GRADUATED_LESSON_QI=true no Netlify.
-- Rollback: qa-22-graduated-lesson-qi.down.sql.

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
  v_stars integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_lesson = '' or v_attempt = '' then
    raise exception 'lesson_id e attempt_id obrigatórios';
  end if;
  if length(v_attempt) < 8 then
    raise exception 'attempt_id inválido';
  end if;

  -- QA22 — p_stars só pode REDUZIR o pacote: 3★, valor ausente ou acima de 3
  -- pagam o mesmo pacote de hoje; 1★ e 2★ pagam menos (0 ou menos conta como
  -- 1★: a conclusão foi attestada). p_no_skip continua ignorado (anti-cheat).
  v_stars := greatest(1, least(3, coalesce(p_stars, 3)));

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

  -- Conclusão attestada. 3★: o pacote de hoje (base + sem pular + Pro).
  -- 1★ = 3 e 2★ = 4, sem bônus (LESSON_ONE_STAR_QI / LESSON_TWO_STAR_QI em
  -- src/data/economy.ts). Uma vez por lição, como antes.
  if v_stars >= 3 then
    v_qi := (public.economy_constants()->>'lesson_three_star_qi')::integer
         + (public.economy_constants()->>'lesson_no_skip_qi')::integer;
    if v_is_pro then
      v_qi := v_qi + (public.economy_constants()->>'pro_lesson_qi_bonus')::integer;
    end if;
  elsif v_stars = 2 then
    v_qi := 4;
  else
    v_qi := 3;
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
      'stars', v_stars,
      'no_skip', true,
      'graduated_lesson_qi', true,
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
