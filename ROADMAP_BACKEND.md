# Roadmap Backend Longyu

> **Status (jul/2026):** Fases 0–3 implementadas (auth, sync, Edge Functions, RLS). Secrets/webhook Stripe e Edge Functions de checkout estão no projeto (ver [`docs/DEPLOY_CHECKLIST.md`](docs/DEPLOY_CHECKLIST.md)). Fase 4 (economia 100% autoritativa no servidor) ainda pendente. Fase 5: validação **Stripe Test Mode live** e endurecimento operacional ainda pendentes (testes locais de webhook/entitlements já existem). Auditoria beta: [`docs/BETA_READINESS_AUDIT.md`](docs/BETA_READINESS_AUDIT.md).

Objetivo: preparar o Longyu para conta real, sincronizacao, assinatura Pro e pagamento sem quebrar o MVP local atual.

Preferencia de stack: Supabase Auth + Postgres/RLS + Supabase Edge Functions ou API propria para operacoes server-side; Stripe para cartao no primeiro ciclo de pagamento.

## Principios

- O MVP local continua funcionando com Zustand + `localStorage` (`longyu-v1`) como hoje.
- Backend entra por adaptador, nao por reescrita: `LocalRepository` primeiro, `SupabaseRepository` depois.
- Nenhuma chave secreta no front. O front pode ter apenas `VITE_SUPABASE_URL` e chave anon/publishable protegida por RLS.
- `service_role`, Stripe secret key e webhook signing secret ficam somente em servidor/Edge Functions.
- Pro nunca e decidido pelo cliente. O cliente apenas exibe o estado retornado pelo servidor.
- Qi, Cargas, baus, missoes e recompensas devem continuar locais no MVP; no backend real, viram mutacoes validadas no servidor.
- Primeiro objetivo de backend: identidade + backup/sync. Segundo: economia autoritativa. Terceiro: pagamentos.

## 1. Auth

Usar Supabase Auth com email e senha.

Campos de autenticacao:

- email: gerenciado pelo Supabase Auth.
- senha: gerenciada pelo Supabase Auth; nunca salvar senha em tabela propria.

Campos de perfil em `profiles`:

- nome.
- data de nascimento.
- idioma nativo.
- idioma alvo.

Regras:

- `profiles.id` deve referenciar `auth.users.id`.
- Criar perfil via trigger pos-signup ou endpoint `complete_profile`.
- Validar `native_language` e `target_language` por lista permitida, por exemplo `pt-BR` e `zh-CN` no MVP.
- Data de nascimento deve ter finalidade clara: idade minima, personalizacao pedagogica ou compliance. Se nao for usada no produto, reavaliar antes de coletar.

Fluxos:

1. Cadastro: email + senha + nome + data de nascimento + idioma nativo + idioma alvo.
2. Login: email + senha.
3. Recuperacao de senha: Supabase Auth.
4. Sessao: Supabase client guarda sessao; dados pedagogicos continuam no modo local ate o usuario optar por migrar.
5. Logout: nao apaga progresso local automaticamente.

## 2. Tabelas

### `profiles`

Perfil humano e preferencia linguistica.

Campos sugeridos:

- `id uuid primary key references auth.users(id) on delete cascade`
- `name text not null`
- `birth_date date`
- `native_language text not null default 'pt-BR'`
- `target_language text not null default 'zh-CN'`
- `onboarding_completed boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `user_progress`

Progresso macro da jornada.

Campos sugeridos:

- `user_id uuid primary key references profiles(id) on delete cascade`
- `completed_lessons text[] not null default '{}'`
- `lesson_task_progress jsonb not null default '{}'`
- `learned_chars text[] not null default '{}'`
- `learned_chunks text[] not null default '{}'`
- `current_lesson_id text`
- `placement jsonb`
- `streak integer not null default 0`
- `longest_streak integer not null default 0`
- `last_active date`
- `xp_total integer not null default 0`
- `xp_today integer not null default 0`
- `weekly_xp integer not null default 0`
- `monthly_xp integer not null default 0`
- `client_snapshot_version integer not null default 1`
- `updated_at timestamptz not null default now()`

### `user_economy`

Saldos e limites que futuramente precisam ser autoritativos.

Campos sugeridos:

- `user_id uuid primary key references profiles(id) on delete cascade`
- `qi integer not null default 0`
- `dragon_pearls integer not null default 0`
- `streak_shields integer not null default 0`
- `daily_charges integer not null default 5`
- `max_daily_charges integer not null default 5`
- `used_charges integer not null default 0`
- `energy_day date not null default current_date`
- `focus_pass_until timestamptz`
- `updated_at timestamptz not null default now()`

Observacao: enquanto a economia for local, essa tabela pode ser apenas backup. Quando virar autoritativa, compras, recuperacoes, retries, baus e recompensas devem passar por RPC/Edge Function.

### `user_srs`

Fila de revisao por item, dominio e habilidade.

Campos sugeridos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `item_type text not null` (`char`, `chunk`, `vocab`)
- `item_id text not null`
- `domain text not null` (`som`, `significado`, `forma`, `uso`, `fala`, `leitura`)
- `track text not null`
- `ease numeric not null default 2.5`
- `interval_days integer not null default 0`
- `repetitions integer not null default 0`
- `lapses integer not null default 0`
- `due_at timestamptz not null default now()`
- `last_grade text`
- `updated_at timestamptz not null default now()`

Indice unico:

- `(user_id, item_type, item_id, domain, track)`

### `user_missions`

Estado de missoes diarias, semanais e mensais.

Campos sugeridos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `scope text not null` (`daily`, `weekly`, `monthly`)
- `mission_id text not null`
- `period_key text not null`
- `progress jsonb not null default '{}'`
- `claimed boolean not null default false`
- `claimed_at timestamptz`
- `updated_at timestamptz not null default now()`

Indice unico:

- `(user_id, scope, mission_id, period_key)`

### `user_chests`

Inventario e historico de baus.

Campos sugeridos:

- `user_id uuid not null references profiles(id) on delete cascade`
- `chest_type text not null` (`small`, `dragon`, `monthly`, `legendary`)
- `quantity integer not null default 0`
- `updated_at timestamptz not null default now()`

Chave primaria:

- `(user_id, chest_type)`

Tabela auxiliar futura: `user_chest_openings` para auditoria de abertura e recompensas aplicadas.

### `user_achievements`

Conquistas desbloqueadas.

Campos sugeridos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `achievement_id text not null`
- `unlocked_at timestamptz not null default now()`
- `reward jsonb`

Indice unico:

- `(user_id, achievement_id)`

### `subscriptions`

Estado Pro derivado do Stripe.

Campos sugeridos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `stripe_customer_id text`
- `stripe_subscription_id text unique`
- `status text not null` (`trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`)
- `price_id text`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Regra de produto:

- Pro ativo = calculado no servidor a partir de `status in ('trialing', 'active')` e periodo valido.
- O front nunca grava `isPremium`.

### `transactions`

Historico financeiro e eventos economicos auditaveis.

Campos sugeridos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references profiles(id) on delete set null`
- `stripe_event_id text unique`
- `stripe_checkout_session_id text`
- `stripe_payment_intent_id text`
- `stripe_invoice_id text`
- `stripe_subscription_id text`
- `kind text not null` (`subscription_payment`, `refund`, `chargeback`, `manual_adjustment`)
- `amount integer not null`
- `currency text not null default 'brl'`
- `status text not null`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

## 3. Seguranca

### Supabase Auth

- Usar Supabase Auth para email/senha, recuperacao de senha e sessao.
- Nao criar tabela propria de senhas.
- Nao expor `service_role` ao navegador.
- Usar o token JWT do usuario autenticado para chamadas ao Supabase.

### RLS

Habilitar RLS em todas as tabelas do schema publico.

Padrao de policy para tabelas com `user_id`:

```sql
alter table user_progress enable row level security;

create policy "user_progress_select_own"
on user_progress for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "user_progress_insert_own"
on user_progress for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "user_progress_update_own"
on user_progress for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);
```

Para `profiles`, usar `id = auth.uid()`:

```sql
alter table profiles enable row level security;

create policy "profiles_select_own"
on profiles for select
to authenticated
using (auth.uid() is not null and auth.uid() = id);

create policy "profiles_update_own"
on profiles for update
to authenticated
using (auth.uid() is not null and auth.uid() = id)
with check (auth.uid() is not null and auth.uid() = id);
```

Tabelas que nao devem aceitar escrita direta do cliente:

- `subscriptions`
- `transactions`
- futuramente mutacoes sensiveis de `user_economy`
- historico de baus/recompensas quando economia virar server-side

Nessas tabelas, permitir no maximo `select own` para o usuario e fazer `insert/update` apenas via `service_role` em webhook ou Edge Function.

### Pro server-side

- O cliente pode pedir `GET /me/entitlements`.
- O servidor calcula `is_pro` a partir de `subscriptions`.
- Recursos Pro devem checar entitlement no servidor quando houver backend.
- UI local pode continuar com preview Pro no MVP, mas esse preview deve ser separado de assinatura real.

### Economia server-side futura

Quando o backend assumir economia:

- `spend_qi(amount, reason)` vira RPC/Edge Function.
- `consume_charge(activity_type)` vira RPC/Edge Function.
- `open_chest(chest_type)` vira RPC/Edge Function que sorteia e aplica recompensa no servidor.
- `claim_mission(scope, mission_id)` vira RPC/Edge Function idempotente.
- Cliente envia intencao; servidor valida saldo, estado, limites diarios e idempotencia.

## 4. Migracao do progresso local

Fluxo desejado:

1. Usuario usa Longyu local normalmente.
2. Usuario cria conta.
3. App pergunta: "Migrar progresso deste dispositivo para sua conta?"
4. Se aceitar, app envia snapshot local para endpoint autenticado.
5. Servidor valida payload e salva progresso em transacao.
6. App marca a conta como sincronizada e mantem copia local como cache/offline.

Snapshot local inicial:

- `completedLessons`
- `lessonTaskProgress`
- `learnedChars`
- `learnedChunks`
- `srs`
- `points`/Qi
- `dragonPearls`
- `streakShields`
- `dailyEnergy`
- `dailyTasks`
- `weeklyMissions`
- `monthlyMission`
- `missionHistory`
- `chests`
- `chestOpenHistory`
- `achievementsUnlocked`
- `achievementHistory`
- `placement`
- `xpTotal`, `xpToday`, `weeklyXp`, `monthlyXp`

Endpoint sugerido:

- `POST /api/import-local-progress`
- Auth obrigatoria.
- Body: `{ schemaVersion, idempotencyKey, snapshot }`
- Idempotencia por `(user_id, idempotency_key)`.
- Resposta: `{ ok, importedAt, serverRevision }`

Regras de conflito:

- Primeira migracao: servidor aceita snapshot completo.
- Se ja existe progresso remoto: perguntar se deseja manter remoto, substituir remoto ou mesclar.
- Mescla segura inicial: uniao de licoes concluidas, maximo de XP/Qi somente se origem for confiavel local pre-migracao, SRS por `updated_at` mais recente.
- Depois da migracao, mutacoes sensiveis devem ir para servidor quando online.

Arquitetura de compatibilidade:

- Criar camada `src/lib/repositories/learningRepository.ts`.
- Implementacoes:
  - `localLearningRepository`: usa Zustand/localStorage atual.
  - `supabaseLearningRepository`: usa Supabase e cache local.
- Feature flag:
  - `VITE_BACKEND_MODE=local` por padrao.
  - `VITE_BACKEND_MODE=supabase` apenas quando backend estiver pronto.

## 5. Pagamento

Primeira etapa: Stripe com cartao para assinatura Pro.

Fluxo:

1. Usuario autenticado clica em assinar Pro.
2. Front chama endpoint autenticado `POST /api/billing/create-checkout-session`.
3. Servidor cria ou reutiliza `stripe_customer_id`.
4. Servidor cria Checkout Session em modo subscription usando `price_id` de uma allowlist server-side.
5. Usuario paga no Checkout do Stripe.
6. Stripe chama webhook.
7. Webhook valida assinatura do Stripe.
8. Webhook atualiza `subscriptions` e `transactions`.
9. App consulta entitlement no servidor e libera Pro.

Eventos Stripe importantes:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`

Regras:

- Nao confiar em retorno do navegador para ativar Pro.
- Webhook e a fonte da verdade.
- `stripe_event_id` deve ser unico para idempotencia.
- Reprocessar webhook deve ser seguro.
- O front nao envia preco livre; envia apenas `plan_key`, e servidor traduz para `price_id`.

Pix depois:

- Cartao primeiro para reduzir variaveis de assinatura recorrente.
- Pix entra em fase posterior apos validar fluxo suportado para o modelo de cobranca escolhido.
- Se Pix for usado como pagamento avulso, separar de assinatura recorrente.
- Webhook continua sendo a fonte de verdade para ativar ou registrar compra.

## 6. LGPD

Dados minimos:

- Coletar email via Supabase Auth.
- Coletar nome para personalizacao.
- Coletar data de nascimento somente se houver finalidade clara.
- Coletar idioma nativo e alvo para produto.
- Nao coletar CPF, endereco ou dados de cartao no app; Stripe coleta dados de pagamento.

Direitos do usuario:

- Exportar dados: gerar JSON com `profiles`, progresso, economia, SRS, missoes, baus, conquistas, assinaturas e transacoes visiveis.
- Apagar conta: apagar Supabase Auth e dados pedagogicos por cascade; manter registros financeiros apenas quando houver obrigacao legal, com minimizacao/anomizacao quando possivel.
- Corrigir dados: tela de perfil para nome, data de nascimento e idiomas.
- Revogar consentimentos opcionais quando existirem.

Documentos necessarios:

- Politica de privacidade em portugues.
- Termos de uso.
- Politica de cookies/analytics se analytics for adicionado.
- Texto claro no cadastro explicando finalidade da data de nascimento.

Operacao:

- Registrar finalidade de cada dado.
- Definir retencao para logs, webhooks e transacoes.
- Evitar analytics com dados pedagogicos identificaveis no MVP.
- Criar canal de suporte para exportacao/exclusao manual ate existir automacao completa.

## Roadmap por fases

### Fase 0 - Preparacao sem backend

- Manter MVP local.
- Criar este roadmap.
- Mapear snapshot Zustand atual.
- Criar tipos compartilhados para export/import de progresso.

### Fase 1 - Supabase base

- Criar projeto Supabase.
- Criar migrations SQL das tabelas.
- Habilitar RLS em todas as tabelas.
- Criar policies `own data`.
- Criar trigger para `profiles` apos signup ou endpoint `complete_profile`.
- Testar RLS com usuario A e usuario B.

### Fase 2 - Auth real sem migrar economia

- Adicionar cliente Supabase.
- Criar telas de cadastro/login/recuperacao.
- Persistir sessao Supabase.
- Criar perfil remoto.
- MVP local segue funcionando para usuarios sem conta.
- Usuario logado ainda pode usar progresso local ate aceitar migracao.

### Fase 3 - Migracao e sync

- Criar endpoint `import-local-progress`.
- Criar schema de validacao do snapshot.
- Salvar progresso em transacao.
- Criar cache local com `serverRevision`.
- Implementar "migrar agora" e "deixar para depois".
- Criar exportacao JSON local/remota.

### Fase 4 - Economia autoritativa

- Mover Qi, Cargas, baus, missoes e recompensas para RPC/Edge Functions.
- Tornar operacoes idempotentes.
- Criar ledger/auditoria para ajustes de economia.
- Manter fallback local apenas em modo offline/local.

### Fase 5 - Stripe Pro

- Criar produtos e precos no Stripe.
- Criar endpoint de Checkout.
- Criar webhook com verificacao de assinatura.
- Atualizar `subscriptions` e `transactions` via service role.
- Criar endpoint `me/entitlements`.
- Remover qualquer decisao real de Pro do cliente.

### Fase 6 - LGPD e operacao

- Exportar dados.
- Apagar conta.
- Politica de privacidade.
- Logs de auditoria minimos.
- Runbook de suporte e incidentes.

## Checklist de aceite

- MVP local continua abrindo e salvando em `localStorage`.
- Usuario sem conta nao perde progresso.
- Usuario local pode criar conta e escolher migrar ou nao.
- RLS impede acesso entre usuarios.
- `subscriptions` e `transactions` nao aceitam escrita do cliente.
- Pro real vem do servidor/webhook, nao de flag local.
- Chaves secretas ficam fora do front.
- Exportar/apagar dados documentado.

## Referencias oficiais

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe webhook signature verification: https://docs.stripe.com/webhooks/signature
