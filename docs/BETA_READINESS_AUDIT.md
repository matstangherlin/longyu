# Longyu — Auditoria de prontidão beta (`0.2.0-beta.1`)

**Data (UTC):** 2026-07-21  
**Commit auditado (base):** `7d12997` + correções desta auditoria (ver PR)  
**Branch da auditoria:** `cursor/beta-readiness-audit-0157`  
**Método:** instalação limpa (`rm -rf node_modules dist` + `npm ci`), validadores, build, E2E multi-browser, inspeção de código/docs/PRs.  
**Regra:** nada marcado como aprovado sem execução real nesta rodada.

## Veredito

### **NO-GO** para declarar a beta pública “pronta”

Percentual geral objetivo: **78%**.

Os critérios automatizados de conteúdo/pedagogia e o build local estão fortes, mas os critérios de lançamento listados pelo produto **não** estão todos verdes: CI GitHub falha por billing, WebKit E2E falhou no offline PWA, RPC de telemetria pedagógica ausente no Supabase remoto, Stripe Test Mode real e devices físicos ainda pendentes.

---

## Percentuais por área

Critério: média ponderada de evidência (teste automatizado = peso cheio; código/docs = parcial; não executado = 0 no item).

| Área | % | Base objetiva |
|------|--:|---|
| Produto | 82 | Fluxos smoke/E2E Chromium + Firefox verdes; paywall/conta/jornada ok; QA real device pendente |
| Pedagogia | 90 | Depth média 91, novelty OK, corpus OK após correção, 2 avisos <70 em tons |
| Conversa | 84 | 38/38 cenas V2, pedagogia OK, loop passa com 202 avisos de item antigo sem tarefa dedicada |
| Conteúdo | 92 | 0 conceitos visuais não usados; imagens 100% elegíveis; Hànzì Builder OK |
| Backend | 72 | Sync/snapshot/economy-server OK localmente; `submit_beta_pedagogy_event` ausente no remoto |
| Assinatura | 70 | Webhook/entitlements/pro-offer OK em teste; Stripe Test Mode live não executado (sem chaves) |
| Segurança | 80 | Secrets no dist OK; privacy/RPC hardening OK; CI remoto inoperante (billing) |
| Mobile | 74 | Chromium mobile/tablet OK; Firefox OK; WebKit 61✓/2✗ (offline); device real pendente |
| Deploy | 65 | Rollback documentado; flags em `netlify.toml` corretas; CI main vermelho por billing |
| Documentação | 88 | Checklist/relatório/PRs atualizados nesta rodada; inconsistências Stripe/README corrigidas |

**Geral (média simples das 10 áreas): 78%.**

---

## Critérios de lançamento (checklist objetiva)

| Critério | Estado | Evidência |
|---|---|---|
| Conversas cumprem limites mínimos | ✅ teste | `validate:conversation-pedagogy` — 38 cenas, médias ok |
| Vocabulário das conversas com cobertura de tarefas | ⚠️ parcial | Loop 422/624 cobertos; 202 avisos (itens antigos) |
| Itens novos com múltiplas exposições | ⚠️ parcial | Corpus/pedagogia: alguns itens 3–4/5 exposições (avisos) |
| SRS recebe itens relevantes | ✅ teste | `validate:conversation-vocabulary-srs` |
| Relatórios atualizados | ✅ nesta rodada | Regenerados + freshness |
| CI verde | ❌ operacional | GitHub Actions: billing/spending limit |
| Build verde | ✅ teste | `npm run build` |
| E2E verde | ⚠️ parcial | Chromium 89✓; Firefox 56✓; WebKit 61✓/2✗ |
| Sem segredo no frontend | ✅ teste | `validate:frontend-secrets` |
| Rollback documentado | ✅ docs | `BETA_RELEASE_CHECKLIST.md` |
| Flags de produção corretas | ✅ código + toml | `VITE_ALLOW_PRO_PREVIEW=false`, `VITE_USE_TEST_FIXTURES=false`, `production_beta` |
| Pendências manuais registradas | ✅ | Seções abaixo |

---

## Testes executados nesta rodada

| Comando | Resultado | Notas |
|---|---|---|
| `rm -rf node_modules dist` + `npm ci` | ✅ | 452 packages; 5 vulns npm audit (não bloqueante aqui) |
| `npm run validate:beta` | ✅ | Após correção corpus (多/少/饿) |
| `npm run build` | ✅ | PWA precache ~3.0 MB |
| `npm run validate:frontend-secrets` | ✅ | |
| `npm run test:e2e` | ✅ | **89 passed**, 2 skipped (Chromium + mobile + tablet + reduced-motion) |
| `npm run test:e2e:firefox` | ✅ | **56 passed**, 3 skipped |
| `npm run test:e2e:webkit` | ❌ | **61 passed**, 2 failed (offline PWA webkit + mobile-safari), 4 skipped |
| `npm run test:entitlements` | ✅ | (via validate:beta e isolado) |
| `npm run test:subscription-webhook` | ✅ | |
| `npm run test:pro-offer-engine` | ✅ | |
| `npm run test:economy-server` | ✅ | |
| `npm run validate:economy` / `validate:economy-server` | ✅ | |
| `npm run validate:sync-merge` / `validate:progress-snapshot` | ✅ | |
| `npm run validate:conversation-loop` | ✅ c/ avisos | 202 avisos |
| `npm run validate:conversation-vocabulary-srs` | ✅ | |
| `npm run verify:beta-feedback` | ❌ parcial | `submit_beta_feedback` ok; `submit_beta_pedagogy_event` **ausente** no schema remoto |

## Testes não executados

| Item | Motivo |
|---|---|
| CI GitHub Actions completo | Spending limit / billing da conta — jobs nem iniciam |
| Stripe Checkout/Webhook live (Test Mode) | Sem `.env.local` / `STRIPE_*` neste ambiente |
| `test:rls` / `gate:production` (se existirem só em PRs abertos) | Não no `package.json` do main atual |
| Device real iOS Safari / Chrome Android / PWA instalada | Ambiente headless; ver `REAL_DEVICE_QA.md` |
| `npm audit fix` / remediação de CVEs | Fora do escopo de prontidão pedagógica |

---

## Falhas encontradas

1. **Corpus inválido (bloqueava validate:beta se o exit fosse respeitado):** `多`/`少`/`饿` em `l24`/`l26b` sem entrada em `CHARACTERS` / `newHanzi`.  
   **Correção:** caracteres adicionados; distractores prematuros trocados; `饿` em `l26b`; `validate-corpus.mjs` agora faz `process.exit(1)` em erro.
2. **CI main vermelho** desde pushes recentes: anotação GitHub “account payments have failed / spending limit”.
3. **WebKit offline PWA:** `page.reload` → “WebKit encountered an internal error” (webkit + mobile-safari).
4. **RPC `submit_beta_pedagogy_event` ausente** no projeto Supabase remoto (migração/hardening não aplicada ou cache).
5. **Loop de conversa:** 202 itens antigos sem tarefa dedicada pós-conversa na mesma lição (avisos; imersão trata a conversa como prática).

---

## Correções realizadas nesta auditoria

- `src/data/characters.ts` — `多`, `少`, `饿`
- `src/data/journey.ts` — distractores sem antecipar preço; `饿` em `l26b`
- `scripts/validate-corpus.mjs` — falha dura com `process.exit`
- Relatórios em `reports/` regenerados
- Docs: release report, checklist, classificação de PRs, inconsistências README/ROADMAP/DEPLOY

---

## Bloqueadores / pendências

### Bloqueadores (impedem GO)

1. CI GitHub inoperante (billing/spending limit) — critério “CI verde”.
2. E2E WebKit não verde (offline PWA) — critério “E2E verde” se cross-browser conta.
3. Deploy da RPC `submit_beta_pedagogy_event` (e migrações de pedagogia) no Supabase de produção.

### Pendências altas

1. Stripe Test Mode end-to-end com chaves reais (runbook em `SUBSCRIPTION_E2E_REPORT.md`).
2. Smoke em iPhone Safari + Android Chrome reais (PWA standalone).
3. Confirmar Netlify production: `VITE_APP_ENV=production_beta` e flags preview/fixtures `false` no painel (já no `netlify.toml`).

### Pendências médias

1. Reduzir avisos do Conversation Loop (itens antigos sem tarefa dedicada).
2. Elevar profundidade de `p1-o-que-e-tom` e `p2-comparar-tom-1-4` (68 → ≥70).
3. Revisar 5 vulnerabilidades npm (`npm audit`).
4. Bundle JS ~3 MB — code-splitting pós-beta.

### Melhorias pós-beta

1. PR #43 — player para conversas longas (mergeable, draft).
2. PR #39 — migrations RLS idempotentes para Preview.
3. Economia 100% autoritativa no servidor (Fase 4).
4. Analytics/dashboard admin (avaliar #11 vs o que já está em main).
5. Fechar PRs obsoletos em conflito (ver `OPEN_PRS_CLASSIFICATION.md`).

---

## Recomendação da próxima remessa

1. **Operacional:** restaurar billing do GitHub Actions; reaplique migrações de pedagogia (`submit_beta_pedagogy_event`) no Supabase; rode `verify:beta-feedback` verde.  
2. **Qualidade:** investigar falha WebKit offline (ou marcar como informativo no CI, já `continue-on-error`, mas documentar).  
3. **Produto:** merge seletivo de #43 (player longo) e #39 (preview migrations); fechar PRs obsoletos.  
4. **Go-live:** só após CI verde + WebKit/Firefox aceitos + Stripe Test Mode + smoke em 1 iPhone e 1 Android.

Enquanto isso, o app pode continuar em **beta fechada / soft launch** com progresso local + sync, mas **não** deve ser anunciado como “beta pública pronta” segundo os critérios desta auditoria.
