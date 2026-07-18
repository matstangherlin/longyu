# Longyu — Checklist da beta pública `0.2.0-beta.1`

## Ambientes

| Ambiente | Como identificar | Uso |
|---|---|---|
| **Development** | `npm run dev` (`import.meta.env.DEV`) | Local; Pro Preview permitido |
| **Preview** | Netlify Deploy Preview · `VITE_APP_ENV=preview` | PRs; sem misturar com produção |
| **Production Beta** | Site principal · `VITE_APP_ENV=production_beta` | Beta pública |

### Guardrails obrigatórios

- [ ] `VITE_ALLOW_PRO_PREVIEW` **não** é `true` em Production Beta
- [ ] `VITE_USE_TEST_FIXTURES` **não** é `true` em Production Beta
- [ ] Deploy Preview usa `VITE_APP_ENV=preview` (nunca `production_beta`)
- [ ] Conta QA `teste@longyu.app` tem Pro só para si (não concede a outros)
- [ ] Nenhum `service_role` / `sk_live` / `whsec_` em variável `VITE_*`
- [ ] Scripts `seed:test-account` só rodam localmente (nunca no build)

## Versionamento na UI

- [ ] Sobre mostra `v0.2.0-beta.1`
- [ ] Rodapé da landing mostra versão
- [ ] Modal de feedback mostra versão
- [ ] Painel `/admin/feedback` mostra ambiente + versão

## Comunicação

- [ ] Aviso discreto na landing e em Sobre:
  > O Longyu está em beta. Algumas atividades ainda estão sendo aprimoradas. Seu feedback ajuda a construir o curso.
- [ ] Aviso **não** aparece em todas as telas (jornada, player, etc.)

## Smoke tests (E2E)

Cobertura em `e2e/smoke.spec.ts` + `e2e/beta-smoke.spec.ts` + `e2e/pedagogy.spec.ts`:

- [ ] Tela inicial (landing)
- [ ] Cadastro (`/conta`)
- [ ] Login (`/login`)
- [ ] Recuperação de senha (`/esqueci-senha`)
- [ ] Teste de nível (onboarding em `/conta`)
- [ ] Primeira lição
- [ ] Erro e correção (revisão Pro)
- [ ] Hànzì Builder
- [ ] Imagem real
- [ ] `conversation_scene`
- [ ] Conclusão da lição
- [ ] Sincronização (copy de progresso / conta)
- [ ] Revisão
- [ ] Paywall (`/pro`, sem Pro Preview)
- [ ] Fim do Pro (entitlements / trial expirado — `test:entitlements`)
- [ ] Envio de feedback (modal abre)
- [ ] Mobile 360×640

## Critérios para publicar

Só considerar pronto quando **todos** passarem:

1. `npm run validate:beta`
2. `npm run build`
3. `npm run test:e2e`
4. Nenhuma lição comum abaixo de 60 (`validate:exercise-depth -- --beta`)
5. Nenhuma revisão de módulo abaixo de 70
6. Feedback chega ao banco (`npm run verify:beta-feedback` no ambiente com Supabase)
7. Pro expira corretamente (`npm run test:entitlements`)
8. Nenhum segredo no frontend (`npm run validate:frontend-secrets` após build)
9. Mobile funciona em 360 px (suite e2e mobile)
10. Relatório salvo em `docs/BETA_0.2.0_RELEASE_REPORT.md`

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
npm run validate:beta
npm run build
npm run validate:frontend-secrets
npm run test:e2e
npm run test:entitlements
npm run verify:beta-feedback   # requer env Supabase
```
