# Status de readiness da beta — Security / Backend

Atualizado em: 2026-08-13  
Escopo: Remessa 1 / PR #163  
Base reaplicada: `origin/main` em `8716ebbfb96e3d859c4fe5bfbd6095dfeb3339f2`

## Decisão

**Ainda não liberar nem fazer merge para `main`.**

O código, os testes locais, o build e os E2E estão verdes, mas a migration de
Pérolas ainda não foi executada e atacada em um Supabase isolado. O projeto
`longyu-preview` está pausado e não pôde ser restaurado porque a organização
`Noba` usa o plano Free e já tem dois projetos ativos. Produção não foi alterada.

## Economia de Pérolas e entitlement Pro

| Controle | Status | Evidência |
|---|---|---|
| Claim sem `p_evidence` do navegador | ✅ | RPC recebe somente o milestone ID |
| Catálogo fechado de milestones | ✅ | `pearl_milestone_catalog` |
| Mês atual e fase existente | ✅ | validação UTC + catálogo de fases |
| Claim único real | ✅ | PK `(user_id, milestone_id)` e crédito condicionado ao `INSERT ... RETURNING` |
| Replay / duas abas | ✅ local | lock por usuário + unicidade + testes; staging real pendente |
| 11 → 12 Pérolas | ✅ local | teste puro e harness de staging preparado |
| Sem double spend | ✅ local | ativação serializada; passe já ativo confirma Pro sem novo débito |
| Conta cloud sem Pro otimista | ✅ | callback só roda após `ok && is_pro` do servidor |
| Storage adulterado | ✅ | hidratação sempre força `serverIsPro=false`, inclusive na versão atual |
| Resposta atrasada / troca de conta | ✅ | resposta e intenção ficam vinculadas ao perfil de origem |
| Offline / falha de RPC | ✅ | mantém intenção pendente, sem liberar Pro |
| Fonte final dos gates cloud | ✅ | `serverIsPro` confirmado pelo servidor |

Também foi removida do validador a expectativa antiga de liberar Pro por e-mail
QA. Contas cloud de teste seguem a mesma fronteira de confiança da produção.

## Gates executados

| Gate | Resultado em 2026-08-13 |
|---|---|
| `npm run typecheck` | ✅ passou |
| `npm run validate:beta` | ✅ passou dentro do gate formal |
| `npm run validate:security-boundaries` | ✅ passou |
| `npm run test:pearl-economy` | ✅ passou, incluindo adulteração e resposta atrasada |
| `npm run test:entitlements` | ✅ passou |
| `npm run validate:economy-server` | ✅ passou |
| `npm run test:economy-server` | ✅ passou |
| `npm run build` (`production_beta`) | ✅ passou |
| E2E focal após correção do runner | ✅ 73/73 |
| `npm run test:e2e` | ✅ 202 passaram, 2 ignorados por configuração |
| `npm run verify:beta-feedback` | ✅ RPCs e capability remotas responderam |
| `npm run verify:production` | ✅ endpoints mínimos responderam; Auth health retornou 401 como aviso |
| `npm run gate:public-beta` | ✅ execução final completa passou |
| `npm run beta:rc-status` | ⏳ executar com a branch limpa após o commit |

O runner E2E agora cria um build `preview` isolado e permite preview Pro somente
nesse servidor de testes. O build formal de produção continua bloqueando fixtures
e preview Pro.

## Supabase staging / preview

Status: **bloqueador**.

- `longyu-preview` (`wpnmygzxqvmpdlcuwrjp`): inativo.
- Tentativa de restore: recusada por limite de dois projetos Free ativos.
- Projetos ativos atuais: produção Longyu e `atomurus`.
- A produção (`drjcfalvlbbeblmmyhwj`) termina na migration
  `20260810175737_beta_experience_telemetry`; o hotfix de Pérolas não está aplicado.
- A branch Supabase `main` está marcada `MIGRATIONS_FAILED` e não existe branch de
  desenvolvimento utilizável.
- Nenhuma DDL ou migration deste trabalho foi aplicada em produção.

O harness `npm run test:pearl-staging` está pronto e recusa explicitamente o ref
de produção. Em staging ele cobre:

1. milestone arbitrário e mês inválido;
2. tentativa de enviar `p_evidence`;
3. saldo 11 e ativação insuficiente;
4. evidência autoritativa produzida por RPC e claim 11 → 12;
5. replay de milestone;
6. duas sessões simultâneas para claim;
7. duas ativações simultâneas e replay do passe;
8. limpeza dos usuários temporários.

Próxima ação operacional: liberar uma vaga pausando `atomurus`, restaurar
`longyu-preview`, aplicar as migrations e rodar o harness; ou aprovar uma branch
Supabase paga. Branches Supabase são isoladas e recebem migrations em sequência,
conforme a [documentação de Branching](https://supabase.com/docs/guides/deployment/branching).

## Security Advisor do Supabase

Leitura atual de produção: **57 avisos, 0 errors**.

| Categoria | Quantidade | Tratamento |
|---|---:|---|
| RLS habilitado sem policy | 13 | parte é deny-by-default intencional; revisar tabela a tabela |
| Função com `search_path` mutável | 14 | migration nova já endurece os RPCs de Pérolas e `economy_row_to_json`; backlog restante abaixo |
| `SECURITY DEFINER` executável por `anon` | 2 | ingestão anônima intencional, com capability/rate limit; manter sob revisão |
| `SECURITY DEFINER` executável por `authenticated` | 27 | RPCs autenticadas intencionais; validar menor privilégio por assinatura |
| Proteção contra senha comprometida desativada | 1 | bloqueada pelo plano Free |

Funções atualmente reportadas com `search_path` mutável:

`iso_week_key`, `week_ends_at`, `economy_row_to_json`, `economy_rand01`,
`economy_mission_reward`, `economy_mission_is_pro`,
`economy_activity_consumes_charge`, `economy_constants`,
`beta_pedagogy_context_digest`, `beta_pedagogy_rate_bucket_key`,
`beta_pedagogy_identity_match`, `_referral_random_code`,
`economy_mission_goal` e `sanitize_pedagogy_metadata`.

As funções novas usam `security definer set search_path = ''` e referências
qualificadas, seguindo o [hardening oficial de funções](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).

Foi adicionado `npm run configure:supabase-leaked-passwords -- --apply`, que altera
somente `password_hibp_enabled` e confirma a resposta da API. Não foi executado:
a organização está no plano Free e a proteção HIBP é oferecida em Pro ou superior,
conforme a [documentação de segurança de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Produção, Stripe e RLS

- Endpoints REST e Edge mínimos responderam na verificação remota.
- `verify:production` deixou de retornar falso verde quando a configuração está ausente.
- O smoke `verify:beta-feedback` criou eventos de verificação rate-limited e passou.
- O teste RLS A ≠ B registrado no projeto é histórico de 2026-08-04; não foi
  repetido em produção nesta remessa.
- O E2E Stripe Test Mode completo e o checkout humano continuam pendentes.
- Nenhum deploy final foi disparado.

## QA físico e release

Pendente, sem marcar como concluído por automação:

- Android real;
- iPhone real / Safari;
- Chrome mobile real;
- teclado aberto e fechado;
- sticky footer e header;
- fluxos de imagem, revisão, montagem e `odd_one_out`;
- rodada humana L1–L20;
- Stripe Test Mode completo.

## Bloqueadores restantes

1. disponibilizar staging/preview isolado;
2. aplicar a migration e passar `test:pearl-staging` nesse ambiente;
3. decidir pausa do `atomurus` ou custo de branch/upgrade Supabase;
4. habilitar proteção HIBP após upgrade do plano;
5. executar QA físico e Stripe humano antes da decisão final de beta pública.
