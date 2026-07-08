-- Longyu initial schema (Fase C prep). Apply via Supabase CLI or SQL editor.
-- RLS: usuário autenticado só acessa próprias linhas (user_id = auth.uid()).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  native_language text not null default 'pt-BR',
  target_language text not null default 'zh-CN',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  completed_lessons text[] not null default '{}',
  lesson_task_progress jsonb not null default '{}',
  learned_chars text[] not null default '{}',
  learned_chunks text[] not null default '{}',
  current_lesson_id text,
  placement jsonb,
  streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active date,
  xp_total integer not null default 0,
  xp_today integer not null default 0,
  weekly_xp integer not null default 0,
  monthly_xp integer not null default 0,
  client_snapshot_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_economy (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  qi integer not null default 0,
  dragon_pearls integer not null default 0,
  streak_shields integer not null default 0,
  daily_charges integer not null default 5,
  max_daily_charges integer not null default 5,
  used_charges integer not null default 0,
  energy_day date not null default current_date,
  focus_pass_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_srs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  domain text not null,
  track text not null,
  ease numeric not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  due_at timestamptz not null default now(),
  last_grade text,
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id, domain, track)
);

create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null,
  mission_id text not null,
  period_key text not null,
  progress jsonb not null default '{}',
  claimed boolean not null default false,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, scope, mission_id, period_key)
);

create table if not exists public.user_chests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chest_type text not null,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, chest_type)
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  reward jsonb,
  unique (user_id, achievement_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_event_id text unique,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  kind text not null,
  amount integer not null,
  currency text not null default 'brl',
  status text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_economy enable row level security;
alter table public.user_srs enable row level security;
alter table public.user_missions enable row level security;
alter table public.user_chests enable row level security;
alter table public.user_achievements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "user_progress_select_own" on public.user_progress for select to authenticated using (auth.uid() = user_id);
create policy "user_progress_insert_own" on public.user_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "user_progress_update_own" on public.user_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_economy_select_own" on public.user_economy for select to authenticated using (auth.uid() = user_id);
create policy "user_economy_insert_own" on public.user_economy for insert to authenticated with check (auth.uid() = user_id);
create policy "user_economy_update_own" on public.user_economy for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_srs_select_own" on public.user_srs for select to authenticated using (auth.uid() = user_id);
create policy "user_srs_insert_own" on public.user_srs for insert to authenticated with check (auth.uid() = user_id);
create policy "user_srs_update_own" on public.user_srs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_missions_select_own" on public.user_missions for select to authenticated using (auth.uid() = user_id);
create policy "user_missions_insert_own" on public.user_missions for insert to authenticated with check (auth.uid() = user_id);
create policy "user_missions_update_own" on public.user_missions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_chests_select_own" on public.user_chests for select to authenticated using (auth.uid() = user_id);
create policy "user_chests_insert_own" on public.user_chests for insert to authenticated with check (auth.uid() = user_id);
create policy "user_chests_update_own" on public.user_chests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_achievements_select_own" on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "user_achievements_insert_own" on public.user_achievements for insert to authenticated with check (auth.uid() = user_id);

create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "transactions_select_own" on public.transactions for select to authenticated using (auth.uid() = user_id);
