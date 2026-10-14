# RC2.3.10 — Orçamento free tier

**Gate `FREE_TIER_BUDGET_PASS` = `OWNER_ACTION_REQUIRED`** (`OA-USAGE-READINGS`: egress, invocações de Edge e créditos do Netlify não são legíveis pelo agente). Nenhum upgrade e nenhum overage foi ativado (`ALLOW_PAID_OVERAGE=false` forçado em `budgetPolicy.ts`).

## Leituras reais (2026-10-08)

| Fonte | Valor | Limite free (`platform-budget-registry.json`) |
|---|---|---|
| Supabase DB | **20,7 MB** | 500 MB (4 %) |
| Supabase usuários Auth | 15 (4 ativos em 30 dias) | 50 000 MAU |
| Supabase storage | 0 buckets / 0 objetos | 1 GB |
| `beta_pedagogy_events` | 1 888 linhas · 3,0 MB · ~1,6 KB/evento com índices | — |
| `user_progress` | 14 linhas · 1,29 MB → **~92 KB por aluno** (snapshot do cliente) | — |
| Ritmo de telemetria | ~217 eventos/semana nas últimas 8 semanas, com ~4 ativos → ~54 eventos ≈ 88 KB por ativo/semana | — |
| Web, carga inicial (gzip) | ~0,9 MB (`dist/index.html` + JS/CSS iniciais) | Netlify: 300 créditos/mês; 20 créditos/GB; deploy de produção 15 |
| Egress, invocações Edge, créditos Netlify, envios Resend | **não legíveis** → `OA-USAGE-READINGS` | 5 GB · 500 000 · 300 · 3 000/mês (100/dia) |
| Sentry | sem projeto | ~5 000 erros/mês (plano developer) |
| Jev | só triagem admin (5 feedbacks no total) | créditos desconhecidos (`OA-JEV-CONSOLE-CHECK`) |

## Projeções

Premissas: alunos registrados ≈ 2× MAU (linhas de progresso); ritmo de telemetria dos testers atuais (pessimista: são usuários intensos); 20 sessões/mês por MAU; 5 cargas completas do web por MAU/mês (o service worker absorve as repetições).

| MAU | DB sem retenção (12 meses) | DB com 30 d raw | Egress | Netlify | Resend | Veredito |
|---|---|---|---|---|---|---|
| 100 | ~490 MB (telemetria acumulada) | **~77 MB (15 %)** | ~0,2 GB | ~0,5 GB → ~70 créditos | folgado | **SAFE** com retenção · **WATCH** sem |
| 500 | estoura | **~300 MB (60 %)** | ~0,9 GB | ~2,3 GB → ~105 créditos | folgado | **WATCH** |
| 1 000 | estoura | ~560 MB (> 100 %); ~380 MB (76 %) com 14 d | ~1,8 GB | ~4,5 GB → ~150 créditos | ok | **UPGRADE_REQUIRED** (ou 14 d + amostragem de telemetria) |
| 5 000 | estoura | estoura | ~9 GB (> 5 GB) | ~22 GB → estoura | pico de 100/dia | **UPGRADE_REQUIRED** |

Leitura: o primeiro limite a ceder é o **banco**, por dois fatores. A telemetria bruta sem retenção, e o snapshot de progresso de ~92 KB por aluno. O segundo é o **egress** (download do snapshot a cada sync).

## Retenção da telemetria (Prompt 7)

| Opção | Raw | DB a 500 MAU | Perda analítica |
|---|---|---|---|
| **A (recomendada)** | 30 d + agregados diários | ~300 MB | eventos individuais com mais de 30 d (agregados ficam) |
| B | 60 d | ~490 MB | menor |
| C | 90 d | estoura perto de 500 MAU | mínima |

- A função de limpeza **já existe em produção** (`cleanup_beta_pedagogy_events`): agrega em `beta_pedagogy_daily_metrics` e depois apaga só `created_at < cutoff`. Mas **não está agendada**: hoje `daily_metrics` está vazia.
- Migration preparada, **não aplicada**: `supabase/pending/rc2-3-10-telemetry-retention.sql`. Ela faz um cron semanal em **dry run** (só conta), registra cada execução em `telemetry_retention_runs` e só passa para delete real com uma instrução separada aprovada.
- Decisão: `OA-TELEMETRY-RETENTION-DECISION` → `OWNER_ACTION_REQUIRED`. Nenhum dado foi apagado.
