-- Smoke estático/local da fronteira de economia (executar após a migration).
-- Confirma que authenticated não escreve saldos/inventário direto.

begin;

do $$
begin
  if has_table_privilege('authenticated', 'public.user_economy', 'INSERT')
     or has_table_privilege('authenticated', 'public.user_economy', 'UPDATE')
     or has_table_privilege('authenticated', 'public.user_chests', 'INSERT')
     or has_table_privilege('authenticated', 'public.user_missions', 'UPDATE')
     or has_table_privilege('authenticated', 'public.user_achievements', 'INSERT') then
    raise exception 'FAIL: authenticated ainda pode escrever tabelas de economia';
  end if;

  if not public.league_source_key_acceptable('lesson:l1:attempt:abc12345') then
    raise exception 'FAIL: source_key de lição deveria ser aceito';
  end if;

  if public.league_source_key_acceptable('forge-xp-1') then
    raise exception 'FAIL: source_key arbitrário não pode ser aceito';
  end if;

  if not public.economy_period_key_acceptable(
    'daily',
    to_char((timezone('utc', now()))::date, 'YYYY-MM-DD')
  ) then
    raise exception 'FAIL: period_key de hoje deveria ser aceito';
  end if;

  if public.economy_period_key_acceptable('daily', '1999-01-01') then
    raise exception 'FAIL: period_key antigo não pode ser aceito';
  end if;
end;
$$;

rollback;
