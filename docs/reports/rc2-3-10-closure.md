# RC2.3.10 — Cloud Launch Certification · Closure

**Veredito:** a infraestrutura de produção **não está certificada**. `cloud.certification = BLOCKED`. Esta wave mediu a produção real, fechou a provenance de artefato no código e preparou, sem aplicar, tudo o que depende de escrita aprovada. Detalhe por gate: `docs/release/rc2-3-10-cloud-matrix.json` (31 gates).

## Git

| | |
|---|---|
| BASE_SHA | `7d1890adf8350d839463a290aaa01dd604e4618f` (`main` após #320 + #321; não havia andado) |
| HEAD_SHA | head do PR [matstangherlin/longyu#322](https://github.com/matstangherlin/longyu/pull/322) na hora do merge (ver o PR) |
| Currículo | fingerprint `5a64821d0b7d`, 134 lições, 113 temas, 30 CultureItems: **inalterados** |

## Hosted CI

Ver `rc2-3-10-parent-ci-truth.md`. Local, sobre o head da wave: typecheck, `gate:rc2-3-9-stack-convergence` (441 passos, 24/24), `gate:rc2-3-10-cloud` (validate + mutações), `validate:product-truth`, build e `validate:apk-provenance` passaram. A seção "Resultado hospedado do #322" abaixo traz Chromium, Firefox, WebKit, Android, Security e as suites canônicas do PR.

## Artifact

| Surface | Estado |
|---|---|
| Web SHA (produção) | **não provado**: `*.netlify.app` bloqueado nesta sessão e nenhum status do Netlify na `main` → `OA-PROD-WEB-SHA`. Não há prova de que o deploy `[release]` do #320 rodou. |
| APK SHA | o CI desempacota o APK do head e verifica SHA, fingerprint, canal e ausência de segredo (`validate:apk-provenance`) |
| Fingerprint | `5a64821d0b7d` embutido no bundle e no `version.json` |

## Database

| Item | Status | Resumo |
|---|---|---|
| Migration history | `BLOCKED` | 36 linhas em produção × 56 arquivos; 19 `MATCH` por conteúdo, 11 `UNKNOWN` (inclui 3 linhas placeholder com SQL aplicado por fora do histórico), 6 `PROD_ONLY`, 27 `REPO_ONLY` |
| Schema diff | `BLOCKED` | social/família/business/pearl chamados pelo cliente e **ausentes em produção**; `_jev_triage_tmp` só em produção; diff por coluna pendente |
| Backup/export | `OWNER_ACTION_REQUIRED` | plano free sem backup/PITR; runbook pronto |
| Retenção | `OWNER_ACTION_REQUIRED` | função existe, não agendada; migration dry-run preparada |
| RLS | `BLOCKED` | isolamento **provado** (anon/A não leem nem alteram B; insert em nome de B recusado); policy de liga com recursão `42P17`; GRANTs largos pendentes |

## Backend

### Edge Functions: `BLOCKED`

| Função | Repo | Produção | Status |
|---|---|---|---|
| create-checkout-session | sim | v10 (2026-08-04) | repo mais novo (squash 2026-09-09); conteúdo não comparado |
| create-billing-portal | sim | v9 (2026-08-04) | idem |
| stripe-webhook | sim | v11 (2026-08-08) | idem |
| delete-account | sim | v10 (2026-08-08) | idem |
| create-account | sim | v9 (2026-09-02) | **lido**: produção sem placement; o repo chama `save_placement_onboarding_draft`, que não existe em produção → **não** redeployar antes das migrations |
| issue-anon-ingestion-session | sim | v3 (2026-08-08) | repo mais novo; não comparado |
| sign-in-identifier | sim | v1 (2026-09-24) | repo tocado no mesmo dia; não comparado |
| triage-feedback | sim | v1 (2026-10-07) | **lido**: sem kill switch, breaker e dedupe → redeploy via workflow após o merge |
| commit-placement | sim | **ausente** | depende de migrations ausentes |
| finalize-onboarding | sim | **ausente** | idem |
| submit-business-lead | sim | **ausente** | idem |

Nada foi redeployado às cegas (regra da wave).

### Jev · rate limits · Turnstile

- `JEV_LEARNER_RUNTIME_DISABLED` **PASS**.
- `JEV_SERVER_TRIAGE_PASS` `OWNER_ACTION_REQUIRED`.
- Rate limits: no banco **presentes**; no dashboard do Auth não legíveis → `OWNER_ACTION_REQUIRED`.
- Turnstile: fail-closed testado; falta a lista de secrets da Edge → `OWNER_ACTION_REQUIRED`.

## Identity (Prompt 10)

| Provider | Code | Dashboard | Redirect | Web Test | Android Test | Status |
|---|---|---|---|---|---|---|
| Google | `CODE_READY` | não legível | `OA-AUTH-REDIRECT-URLS` | `NOT_RUN` | `NOT_RUN` | `CONFIG_REQUIRED` |
| Apple | `CODE_READY` | não legível | idem | `NOT_RUN` | `NOT_RUN` | `CONFIG_REQUIRED` |
| Microsoft | `CODE_READY` | não legível | idem | `NOT_RUN` | `NOT_RUN` | `CONFIG_REQUIRED` |
| Email | `VERIFIED` | SMTP padrão (não certificado) | allowlist no `create-account` | — | — | e-mail próprio `CONFIG_REQUIRED` |

Android OAuth: `NOT_RUN` (só com aparelho real). Linking manual: decisão separada (`OA-AUTH-MANUAL-LINKING`); nenhum linking automático foi habilitado.

## Operations

| Item | Status |
|---|---|
| Sentry | `CONFIG_REQUIRED`: SDK opcional, lazy e com scrubbing pronto; falta projeto + DSN + host na CSP |
| Headers | `NOT_RUN` ao vivo; config boa (CSP, `frame-ancestors`, `nosniff`, microfone `self`); HSTS explícito adiado até haver domínio próprio |
| Rollback | `NOT_RUN`: drill passo a passo em `rc2-3-10-rollback-drill.md` |
| Cloud smoke | `NOT_RUN`: script + workflow prontos (conta de QA semeada) |

## Economics

Free tier: DB em 4 % (20,7 MB). Projeção: **SAFE a 100 MAU** com retenção de 30 d, **WATCH a 500**, **UPGRADE_REQUIRED a 1 000** sem reduzir telemetria/snapshot. Egress, invocações e créditos do Netlify: `OA-USAGE-READINGS`. Nenhum plano comprado; overage pago forçado off.

## Governance: #273

O #273 **não** deve ser mergeado. É a tentativa antiga de certificação cloud (stack obsoleta, projeto de preview da org hoje `INACTIVE`, que não foi tocado). Ele fica como **histórico/governança**. A RC2.3.10 resolve a necessidade direto no `MandarimProject`, sem ressuscitar essa arquitetura.

**Não pode ser fechado agora:** a matriz tem `BLOCKED`, `OWNER_ACTION_REQUIRED`, `CONFIG_REQUIRED` e `NOT_RUN`. Ele só vira `ISSUE_273_RESOLUTION_READY` quando migration history, schema, backup, retenção, RLS, Edge, auth, e-mail, observabilidade, rollback, smoke e orçamento estiverem `PASS` com evidência. A recomendação de fechamento sai daí (`OA-273-RUNBOOK-APPROVAL`).

## Leituras e escritas em produção

- **Leituras:** veja a matriz (`productionReads`). Todas via Supabase MCP, schema/agregados, sem conteúdo de linha.
- **Escritas executadas:** **nenhuma**. As sondas de RLS rodaram em sub-blocos desfeitos; os DELETEs ficaram retidos pelo MCP e não rodaram.
- **Não executadas (por regra):**
  - redeploy da `triage-feedback`;
  - fix da policy de liga;
  - retenção de telemetria;
  - drop de `_jev_triage_tmp`;
  - qualquer reparo em `supabase_migrations`;
  - configurações de Auth/SMTP/provedores;
  - rollback no Netlify.

## Owner actions restantes (RC2.3.10)

`docs/release/owner-actions.json`, cada uma com o passo exato, a evidência esperada, se é leitura ou escrita, e o risco:
- `OA-PROD-WEB-SHA`
- `OA-DATA-EXPORT`
- `OA-SCHEMA-DIFF`
- `OA-MIGRATION-RECONCILIATION-DECISION`
- `OA-TELEMETRY-RETENTION-DECISION`
- `OA-JEV-CONSOLE-CHECK`
- `OA-EDGE-SECRET-NAMES`
- `OA-AUTH-RATE-LIMITS-READ`
- `OA-LEAGUE-POLICY-FIX`
- `OA-JEV-TMP-TABLE`
- `OA-PRIVACY-SNAPSHOT-EMAIL`
- `OA-RESEND-DOMAIN`
- `OA-SUPABASE-SMTP`
- `OA-AUTH-RECOVERY-TEMPLATE`
- `OA-AUTH-REDIRECT-URLS`
- `OA-AUTH-GOOGLE`, `OA-AUTH-APPLE`, `OA-AUTH-MICROSOFT`
- `OA-AUTH-ANDROID-OAUTH-TEST`
- `OA-SENTRY-PROJECT`
- `OA-ROLLBACK-DRILL`
- `OA-CLOUD-SMOKE-RUN`
- `OA-USAGE-READINGS`
- `OA-PHYSICAL-PROVENANCE`
- `OA-273-RUNBOOK-APPROVAL`
- `OA-OWNER-CLOUD-ACCEPTANCE`

## Checklist físico (Android, depois desta wave)

1. **Provenance:** instale o APK do head do PR; abra `/qa/device?expect=<SHA do head>`; confira o SHA, o fingerprint `5a64821d0b7d`, a versão e o canal `dev`. Só siga em frente com **MATCH**.
2. **Auth:** e-mail; confirmação; recovery; Google/Apple/Microsoft (quando configurados); logout; login de novo; troca de conta; claim de progresso; deep link.
3. **Core:** Jornada; primeira lição; áudio; Hànzì; fala (incluindo o drill de contraste no Pinyin Lab: gravar e ouvir); Cultura; Revisão; Seu Domínio; Praticar o que preciso.
4. **Sync:** concluir uma atividade; fechar e reabrir o app; o progresso continua lá; outra conta não vê esse progresso.
5. **Feedback/Jev:** feedback sintético; o app não trava com a triagem fora do ar.
6. **Rede:** offline; voltar online; sync sem duplicar.
7. **Erros:** nenhuma flag de QA ou painel DEV na UI do aluno; nenhum segredo.

## Fora do escopo (respeitado)

Sem features novas, sem mudança de currículo, sem Jev para o aluno, sem preço ou cobrança (RC2.3.11), sem launch.
