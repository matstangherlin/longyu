# Longyu — Checklist da beta pública `0.2.0-beta.1`

Atualizado na auditoria de 2026-07-21. Itens só ficam marcados com evidência desta rodada ou de produção já documentada. Ver [`BETA_READINESS_AUDIT.md`](./BETA_READINESS_AUDIT.md).

## Ambientes

| Ambiente | Como identificar | Uso |
|---|---|---|
| **Development** | `npm run dev` (`import.meta.env.DEV`) | Local; Pro Preview permitido |
| **Preview** | Netlify Deploy Preview · `VITE_APP_ENV=preview` | PRs; sem misturar com produção |
| **Production Beta** | Site principal · `VITE_APP_ENV=production_beta` | Beta pública |

### Guardrails obrigatórios

- [x] `VITE_ALLOW_PRO_PREVIEW` **não** é `true` em Production Beta — evidência: `netlify.toml` `[context.production]` = `"false"`; `validate:app-environment` OK
- [x] `VITE_USE_TEST_FIXTURES` **não** é `true` em Production Beta — evidência: `netlify.toml` = `"false"`
- [x] Deploy Preview usa `VITE_APP_ENV=preview` (nunca `production_beta`) — evidência: `netlify.toml` `[context.deploy-preview]`
- [ ] Conta QA `teste@longyu.app` tem Pro só para si (não concede a outros) — **pendente operacional** (não revalidado nesta rodada)
- [x] Nenhum `service_role` / `sk_live` / `whsec_` em variável `VITE_*` — evidência: `validate:frontend-secrets` no `dist/`
- [x] Scripts `seed:test-account` só rodam localmente (nunca no build) — evidência: código/scripts; build não invoca seed

## Versionamento na UI

- [x] Sobre mostra `v0.2.0-beta.1` — e2e `beta-smoke` (sobre: versão)
- [x] Rodapé da landing mostra versão — e2e + código
- [x] Modal de feedback mostra versão — e2e feedback modal
- [ ] Painel `/admin/feedback` mostra ambiente + versão — **não revalidado** nesta rodada (requer admin)

## Comunicação

- [x] Aviso discreto na landing e em Sobre (copy de beta) — e2e beta-smoke
- [x] Aviso **não** aparece em todas as telas (jornada, player, etc.) — e2e / inspeção de rotas

## Smoke tests (E2E)

Cobertura em `e2e/smoke.spec.ts` + `e2e/beta-smoke.spec.ts` + `e2e/pedagogy.spec.ts` (+ mobile-device):

- [x] Tela inicial (landing)
- [x] Cadastro (`/conta`)
- [x] Login (`/login`)
- [x] Recuperação de senha (`/esqueci-senha`)
- [x] Teste de nível (onboarding em `/conta`)
- [x] Primeira lição
- [x] Erro e correção (revisão Pro)
- [x] Hànzì Builder
- [x] Imagem real
- [x] `conversation_scene`
- [x] Conclusão da lição
- [x] Sincronização (copy de progresso / conta)
- [x] Revisão
- [x] Paywall (`/pro`, sem Pro Preview)
- [x] Fim do Pro (entitlements / trial — `test:entitlements`)
- [x] Envio de feedback (modal abre)
- [x] Mobile 360×640 (Chromium)
- [ ] Mobile WebKit offline PWA — **falhou** nesta rodada
- [ ] Device real iOS/Android — **pendente**

## Critérios para publicar

Só considerar pronto quando **todos** passarem:

1. [x] `npm run validate:beta` — executado OK (após correção corpus)
2. [x] `npm run build` — OK
3. [x] `npm run test:e2e` — 89 passed (Chromium suite)
4. [x] Nenhuma lição comum abaixo de 60 (`validate:exercise-depth -- --beta`)
5. [x] Nenhuma revisão de módulo abaixo de 70
6. [ ] Feedback completo no banco (`verify:beta-feedback`) — feedback OK; **pedagogy RPC ausente**
7. [x] Pro expira corretamente (`test:entitlements`)
8. [x] Nenhum segredo no frontend (`validate:frontend-secrets` após build)
9. [x] Mobile funciona em 360 px (suite e2e Chromium)
10. [x] Relatório salvo em `docs/BETA_0.2.0_RELEASE_REPORT.md`
11. [ ] CI GitHub Actions verde — **bloqueado por billing**
12. [ ] E2E WebKit verde — **2 falhas offline**
13. [ ] Stripe Test Mode live — **sem credenciais nesta rodada**

**Estado agregado:** NO-GO (ver relatório de release).

## Rollback (sem apagar progresso)

O progresso do aluno fica em localStorage + snapshot Supabase. Rollback de front **não** apaga dados.

### 1. Voltar ao deploy anterior (Netlify)

1. Netlify → **Deploys** → selecione o deploy estável anterior.
2. **Publish deploy** (ou “Lock” no deploy bom antes de experimentar).
3. Confirme a URL de produção e rode smoke manual (landing + login + uma lição).
4. Progresso na nuvem permanece; o SW atualiza com `autoUpdate`.

### 2. Desativar funcionalidade por feature flag

No Netlify → Environment variables (contexto **production**), defina e faça **Clear cache and deploy**:

| Flag | Efeito |
|---|---|
| `VITE_ENABLE_CONVERSATION_V2=false` | Player de conversa cai no V1 (lines/checkpoint) |
| `VITE_ENABLE_TELEMETRY=false` | Para envio de eventos pedagógicos |
| `VITE_ENABLE_BETA_FEEDBACK=false` | Para envio de feedback (UI ainda abre; submit recusa) |
| `VITE_ALLOW_PRO_PREVIEW=false` | Garante Pro Preview off (já é o padrão em prod) |

### 3. Desativar temporariamente conversas V2

```bash
# Netlify UI ou CLI — Production Beta
VITE_ENABLE_CONVERSATION_V2=false
```

Redeploy. Cenas com `nodes` usam o caminho V1 derivado de `lines`. Progresso intacto.

### 4. Desativar telemetria

```bash
VITE_ENABLE_TELEMETRY=false
```

Além do consentimento do usuário em Configurações. Eventos enfileirados param de enviar.

### 5. Manter progresso do usuário intacto

- **Não** limpe o projeto Supabase nem rode `TRUNCATE` em `learning` / progresso.
- **Não** incremente a versão de persistência Zustand de forma destrutiva sem migração.
- Rollback de front e flags **não** tocam `client_snapshot` / localStorage do aluno.
- Se precisar “desligar” o app: publique deploy anterior; dados persistem.

## Comandos úteis

```bash
rm -rf node_modules dist && npm ci
npm run validate:beta
npm run build
npm run validate:frontend-secrets
npm run test:e2e
npm run test:e2e:firefox
npm run test:e2e:webkit
npm run test:entitlements
npm run verify:beta-feedback   # requer env Supabase
```
