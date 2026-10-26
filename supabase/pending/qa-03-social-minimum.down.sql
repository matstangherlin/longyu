-- Reversão de qa-03-social-minimum.sql.
-- Derruba só funções e tabelas que esse arquivo cria.
-- Não derruba colunas de profiles: avatar_key, league_tier, public_weekly_xp,
-- public_streak e show_in_search podem já ter dado escrito. O drop fica
-- comentado.

begin;

drop function if exists public.get_public_profiles_by_ids(uuid[]);
drop function if exists public.get_public_profile_by_username(text);
drop function if exists public.search_public_profiles(text);

-- DROP TABLE ativo em supabase/pending quebra o gate R08
-- (DESTRUCTIVE_SQL_IN_PENDING). As tabelas nascem vazias neste pacote.
-- Descomente só na reversão, enquanto ninguém gravou linha.
-- drop table if exists public.social_activity_events;
-- drop table if exists public.user_follows;

-- alter table public.profiles drop column if exists show_in_search;
-- alter table public.profiles drop column if exists public_streak;
-- alter table public.profiles drop column if exists public_weekly_xp;
-- alter table public.profiles drop column if exists league_tier;
-- alter table public.profiles drop column if exists avatar_key;

notify pgrst, 'reload schema';

commit;
