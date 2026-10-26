# Rastreador — QA v1.1 (26/10/2026)

Linha de base do prompt 01. Nenhum item foi corrigido neste PR. Status inicial de bug: `aberto`. Status inicial de regressão: `não executado`. A suíte R-01…R-20 é o prompt 30.

Branch deste registro: `cursor/qa-01-linha-de-base-b56e`. Produção lida em 26/10/2026 (America/Sao_Paulo): SHA `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e`. `main`: `98967c393de3bcf6b13611bac5ca01015fbfbee3`.

## Bugs e riscos

| ID | Título | Sev. | Onda / fase | Prompt | Status | Branch / PR | Evidência |
|---|---|---|---|---|---|---|---|
| LGY-001 | Drift `profiles.instruction_locale` | P0 | Onda 1 | 03, 04 | em PR | [#362](https://github.com/matstangherlin/longyu/pull/362) | SQL no #361, não aplicado. Em 26/10 o build do #370 contra produção ainda recebeu HTTP 400 em `profiles?select=instruction_locale`: a coluna não existe. |
| LGY-002 | Backend social 404 (`search_public_profiles`, `user_follows`, `social_activity_events`) | P0 | Onda 1 | 03, 04, 24 | em PR | [#362](https://github.com/matstangherlin/longyu/pull/362) | SQL no #361. Cliente: fila social descarta quando o domínio está off; sync de perfil social passa pelo gate. |
| LGY-003 | Edge Functions não publicadas | P0 | Onda 1 | 03, 05 | em PR | [#363](https://github.com/matstangherlin/longyu/pull/363) | CORS no repo. Deploy humano. Placement e business continuam fora da allowlist. |
| LGY-004 | CORS dos headers `x-longyu-*` | P0 | Onda 1 | 05 | em PR | [#363](https://github.com/matstangherlin/longyu/pull/363) | `browserAllowedHeaders()` nas funções do navegador. Produção só muda depois do workflow manual. |
| LGY-005 | Progresso vaza entre contas | P0 | Onda 1 | 06 | em PR | [#364](https://github.com/matstangherlin/longyu/pull/364) | `buildCloudAccount` não copia mais a conta anterior. Logout guarda o slot e zera a casca. Claim só do anônimo `local`. E2E `@qa-r05` no Chromium. Contas QA já misturadas: reset humano. |
| LGY-006 | Login sem erro e sem timeout | P1 | Onda 1 | 07 | em PR | [#365](https://github.com/matstangherlin/longyu/pull/365) | Senha errada: alerta em pt-BR e botão "Entrar" de volta em < 3 s. Token lento: timeout + "Tentar de novo". Navegação sai de /login em < 2 s depois do 200. |
| LGY-007 | Logout inconsistente e `/login` com sessão | P1 | Onda 1 | 07 | em PR | [#365](https://github.com/matstangherlin/longyu/pull/365) | Push de logout estoura em 4 s e a sessão local cai mesmo assim. /login e /comecar com sessão vão para /jornada. No celular, Sair fica em Mais e em /conta. |
| LGY-008 | "Salvando…" infinito; nome não persiste | P1 | Onda 1 | 08 | em PR | [#366](https://github.com/matstangherlin/longyu/pull/366) | Saída cedo do push não deixa mais o chip em "Salvando…". Schema vira erro na hora. Nome grava só `profiles.name` e o store muda depois. E2E `@qa-r06` no Chromium. |
| LGY-009 | Recompensa de missão não aplicada | P1 | Onda 2 | 19 | aberto | — | Registrado. |
| LGY-010 | Interpolação / digitação nas primeiras lições | P1 | Onda 1 | 09 | em PR | [#367](https://github.com/matstangherlin/longyu/pull/367) | `joinSentence` tira `..`, `.?` e `?.` do enunciado. Reticências ficam. Fingerprint do currículo não mudou. |
| LGY-011 | Etapa 你好 sem a peça 好 | P1 | Onda 1 | 09 | em PR | [#367](https://github.com/matstangherlin/longyu/pull/367) | Passe 3 do laboratório responde 你好 e o banco inclui 好. `你` sozinho não passa. `你 好` e `你好。` passam. |
| LGY-012 | Comparação de áudio sem "Não posso ouvir agora" | P1 | Onda 1 | 11 | em PR | [#369](https://github.com/matstangherlin/longyu/pull/369) | "Não posso ouvir agora" abre o modo visual na sessão. "Seguir sem avaliar" não gasta Fôlego nem vida. Erro mostra o tom. E2E `@qa-r17` no Chromium. |
| LGY-013 | Reset: a UI promete código e o e-mail traz link | P1 | Fase 1 | 13 | em PR | [#371](https://github.com/matstangherlin/longyu/pull/371) | Modelo de recuperação só com código. Link `otp_expired` mostra o erro e não abre a senha nova. Painel e SMTP continuam humanos. |
| LGY-014 | @apelido, convite e feed | P1 | Onda 2 | 08, 24 | em PR | [#366](https://github.com/matstangherlin/longyu/pull/366) | Parte cliente: sucesso ou erro no @apelido; social desligado explica e não mostra Salvar. Convite e feed continuam no prompt 24. |
| LGY-015 | SRS gradua exposição | P1 | Onda 2 | 21 | aberto | — | Registrado. |
| LGY-016 | `economy.ts` diverge de `energyPolicy.ts` | P2 | Onda 2 | 20 | aberto | — | Registrado. |
| LGY-017 | Imersão pausada mas a sessão inicia | P2 | Onda 2 | 20 | aberto | — | Registrado. |
| LGY-018 | Qi cai de 17 para 7 | P2 | Onda 2 | 19 | aberto | — | Registrado. |
| LGY-019 | Ligas: rank, "Aluno local" e XP | P2 | Onda 2 | 06, 08, 19 | em PR | [#364](https://github.com/matstangherlin/longyu/pull/364), [#366](https://github.com/matstangherlin/longyu/pull/366) | Parte local: "Você" lê a conta ativa, que não herda mais XP/nome de outra. Nome visível de placeholder é "Aluno", nunca "Aluno local". Rank e matemática do servidor continuam no prompt 19. |
| LGY-020 | "XP hoje" 0, modal de sequência, conquistas | P2 | Onda 2 | 19 | aberto | — | Registrado. |
| LGY-021 | Enunciados sem pergunta; tom de 谢 | P2 | Onda 1 | 09 | em PR | [#367](https://github.com/matstangherlin/longyu/pull/367) | Objetivo de autoria não vira enunciado. Tom de 谢 dentro de 谢谢 pergunta a 1ª sílaba. |
| LGY-022 | Nome "Matheus" fixo | P2 | Onda 1 | 09 | em PR | [#367](https://github.com/matstangherlin/longyu/pull/367) | Sem nome, Lucas. Com nome, o primeiro nome. Nunca "você". A cena de apresentação pergunta o nome. E2E em l9. |
| LGY-023 | Etapas puladas pela validação | P2 | Onda 1 | 09 | em PR | [#367](https://github.com/matstangherlin/longyu/pull/367) | Fases 1–2 no plano atual: 0 etapas inválidas. Pulo restante avisa o Sentry sem PII. O DSN de produção ainda não está no bundle. |
| LGY-024 | Contagens e idiomas misturados | P2 | Onda 2 | 23 | aberto | — | Registrado. |
| LGY-025 | Revisão Free corta a fila antes de ordenar | P2 | Onda 2 | 23 | aberto | — | Registrado. |
| LGY-026 | Concluir com ~0% e ganhar 2 estrelas | P2 | Onda 2 | 22 | aberto | — | Registrado. |
| LGY-027 | 10,1% sem alvo de revisão | P2 | Onda 2 | 21 | aberto | — | Registrado. O prompt 11 agenda `pinyin`/`hard` só quando a etapa já tem alvo. Etapa sem alvo continua aqui. |
| LGY-028 | 吧 com fonético de 马 | P2 | Onda 2 | 25 | aberto | — | Registrado. |
| LGY-029 | Soft 404 e perfis públicos | P2 | Fase 1 | 16 | aberto | — | Registrado. |
| LGY-030 | Bundle ~3 MB e cache | P2 | Fase 1 | 17 | aberto | — | Produção serve `index-BAuS39Wg.js` com 2 824 359 bytes (797 KB gzip). Medição do `main` fica no prompt 17. |
| LGY-031 | 75–80% das etapas sem feedback de erro | P2 | Onda 2 | 22 | aberto | — | Registrado. |
| LGY-032 | `/perfil` diz "Amigos em breve" | P3 | Fase 1 | 16 | aberto | — | Registrado. |
| LGY-033 | Vitória avança sozinha | P3 | Onda 2 | 20 | aberto | — | Registrado. |
| LGY-034 | Sem horário de renovação das Cargas | P3 | Onda 2 | 20 | aberto | — | Registrado. |
| LGY-035 | Busca desligada sem indicação | P3 | Fase 1 | 16 | aberto | — | Registrado. |
| LGY-036 | Erros no console | P3 | Onda 1 | 04, 23 | em PR | [#362](https://github.com/matstangherlin/longyu/pull/362) | 42703/404 de schema não vão para `console.error`. Um aviso Sentry por objeto, por sessão. |
| LGY-037 | Gitleaks vermelho | P2 | Fase 0 | 02 | em PR | [#360](https://github.com/matstangherlin/longyu/pull/360) `cursor/qa-02-higiene-seguranca-b56e` | Scan do histórico: 8 achados. Fixture Stripe allowlist exata. Os 6 JWTs restantes são `role: anon` do projeto `drjcfalvlbbeblmmyhwj`; nenhum `service_role`. O scan agendado continua vermelho até decisão humana sobre allowlist da anon key pública. |
| LGY-038 | Sem branch protection | P2 | Fase 0 | 02 | em PR | [#360](https://github.com/matstangherlin/longyu/pull/360) `cursor/qa-02-higiene-seguranca-b56e` | Guia em `BRANCH_PROTECTION.md`. Relatório humano de 26/10: a ruleset "Protect main branch" já está ativa desde 08/08/2026 (PR + 5 checks). A API deste agente tinha respondido 403. Falta o Matty conferir se o próprio usuário está em bypass. |
| LGY-039 | Sem staging | P2 | Fase 1 | 03, 12 | em PR | [#361](https://github.com/matstangherlin/longyu/pull/361), [#370](https://github.com/matstangherlin/longyu/pull/370) | Runbook no #370. Em 26/10 o Matty deixou o staging pendente: plano Free, MandarimProject e atomurus ativos. Nada foi pausado nem criado. |
| LGY-040 | Privacidade, termos, LGPD e CDC | P2 | Fase 1 | 15 | aberto | — | Registrado. Dados do controlador ficam em branco até o Matty preencher. |
| LGY-041 | Menores de 18 | P2 | Fase 1 | 15 | aberto | — | Padrão recomendado: só 18+ na beta fechada. Sem decisão confirmada. |
| LGY-042 | Sem "Reportar problema" | P2 | Fase 1 | 14 | aberto | — | Registrado. |
| LGY-043 | Versão, tag e release | P3 | Fase 0 / Fase 1 | 02, 14 | em PR | [#360](https://github.com/matstangherlin/longyu/pull/360) `cursor/qa-02-higiene-seguranca-b56e` | Só a parte Node/README: `NODE_VERSION` 20 → 22. Tag e GitHub Release continuam no prompt 14. |
| LGY-044 | Google Play: chaves e teste fechado | P3 | Fase 1 / Fase 3 | 18 | aberto | — | Registrado. |
| LGY-045 | Higiene do repositório | P3 | Fase 0 | 02 | em PR | [#360](https://github.com/matstangherlin/longyu/pull/360) `cursor/qa-02-higiene-seguranca-b56e` | README reescrito no topo; `.env.production` auditado (só valores públicos); classificação de PRs atualizada. Repo continua público (D2 não executada). |
| LGY-046 | Escopo grande para uma pessoa | P3 | Fase 1 | 16 | aberto | — | Risco de capacidade. O prompt 16 trata a parte "esconder o que não é o loop principal". |
| LGY-047 | WebKit instável nos E2E | P3 | Fase 1 | 18, 30 | aberto | — | Este prompt rodou só Chromium. WebKit ficou de fora de propósito. |

## Regressão R-01…R-20

Nenhum caso foi executado no prompt 01. "Automatizado?" descreve o plano do prompt 30, não um teste que já exista com a tag `@qa-rXX`.

| ID | Caso | Resultado esperado | Automatizado? | Arquivo / comando | Ambiente | Status |
|---|---|---|---|---|---|---|
| R-01 | Schema em dia | 0 respostas 4xx do PostgREST em `/jornada`, `/perfil`, `/conta`, `/amigos` | `npm run check:schema-health` + `e2e/schema-drift-r01.spec.ts` `@qa-r01` | `scripts/check-schema-health.mjs` | preview local + produção só leitura | Health check de produção ainda exit 1. E2E local: páginas carregam, no máximo 1 request interceptado. |
| R-02 | Cadastro e reset | Mensagens corretas; link expirado tratado | `e2e/qa-auth-recovery.spec.ts` `@qa-r02` | [#371](https://github.com/matstangherlin/longyu/pull/371) · `CI=1 npx playwright test e2e/qa-auth-recovery.spec.ts --project=chromium` | preview local, Supabase interceptado | em PR — Chromium 3/3. Link expirado e código simulado. Caixa real fica para o staging, que ainda não existe. |
| R-03 | Login inválido | Mensagem pt-BR em menos de 3 s; botão volta | `e2e/qa-auth-session.spec.ts` `@qa-r03` | `npx playwright test e2e/qa-auth-session.spec.ts --project=chromium` | preview local, token simulado | em PR — Chromium: senha errada < 3 s; timeout devolve o botão. |
| R-04 | Login e logout | Sai no primeiro clique; `/login` logado redireciona | `e2e/qa-auth-session.spec.ts` `@qa-r04` | mesmo spec | preview local | em PR — logout com a nuvem travada < 12 s no topo e em Mais (390 px). /login e /comecar logados vão para /jornada. WebKit não instalado nesta máquina. |
| R-05 | Isolamento entre contas | Progresso de uma conta não aparece na outra | `e2e/qa-account-isolation.spec.ts` `@qa-r05` | `npx playwright test e2e/qa-account-isolation.spec.ts --project=chromium` | preview local | em PR — Chromium 2/2 depois da correção. Antes: Bruno herdava @anafree, 474 XP, 7 lições e sequência 2; logout apagava o slot de Ana. mobile-safari não executa este arquivo (o projeto só inclui `mobile-device.spec.ts`). |
| R-06 | Perfil | Nome persiste; indicador de salvamento termina | `e2e/qa-profile-save.spec.ts` `@qa-r06` | `CI=1 npx playwright test e2e/qa-profile-save.spec.ts --project=chromium --grep @qa-r06` | preview local | em PR — Chromium 3/3. Nome sobrevive ao reload. 42703 mantém o nome anterior e o chip mostra "Tentar de novo". mobile-chrome não executa este arquivo. |
| R-07 | Cargas Free | Cobra 1/0/0/1; 0/5 persiste | prompt 30, `@qa-r07` | `e2e/qa-regression-r07.spec.ts` (ainda não existe) | local | não executado |
| R-08 | Missões | Cargas e Qi creditados; card "Resgatada" | prompt 30, `@qa-r08` | `e2e/qa-regression-r08.spec.ts` (ainda não existe) | local | não executado |
| R-09 | Qi | Nunca diminui sem gasto | prompt 30, `@qa-r09` | `e2e/qa-regression-r09.spec.ts` (ainda não existe) | local | não executado |
| R-10 | Seguir | Seguir e deixar de seguir persistem | prompt 30, `@qa-staging` | `e2e/qa-regression-r10.spec.ts` (ainda não existe) | staging | não executado |
| R-11 | Casos-limite sociais | Limites do relatório (bloqueio, duplicata, próprio usuário) | prompt 30, `@qa-staging` | `e2e/qa-regression-r11.spec.ts` (ainda não existe) | staging | não executado |
| R-12 | @apelido e convite | Apelido resolvível; convite abre o destino certo | feedback no `@qa-r06`; convite no prompt 30, `@qa-staging` | `e2e/qa-profile-save.spec.ts` (só o feedback). Convite: `e2e/qa-regression-r12.spec.ts` (ainda não existe) | preview local do feedback; convite em staging | em PR — 23505 mostra "Este @apelido já está em uso." Convite não executado (prompt 24). |
| R-13 | Revisão Free | Sessão com os 20 itens mais prioritários | prompt 30, `@qa-r13` | `e2e/qa-regression-r13.spec.ts` (ainda não existe) | local | não executado |
| R-14 | Preflight `x-longyu-*` | Preflight responde 2xx | prompt 30, `@qa-staging` | `e2e/qa-regression-r14.spec.ts` (ainda não existe) | staging | não executado |
| R-15 | Excluir conta | Conta some e a sessão encerra | prompt 30, `@qa-staging` | `e2e/qa-regression-r15.spec.ts` (ainda não existe) | staging | não executado |
| R-16 | Lint de conteúdo | 0 violações | `npm run lint:content` | [#368](https://github.com/matstangherlin/longyu/pull/368) · `docs/qa-report-2026-10/LINT_CONTEUDO.md` | local | em PR — fases 1–2 em zero. Linha de base: 62 nas fases 3+ (CL003 6, CL004 4, CL005 4, CL006 2, CL007 46). Meta no fim da Onda 2: linha de base vazia. |
| R-17 | Escuta sem áudio | Etapa concluível sem áudio e sem custo | `e2e/qa-listening-fallback.spec.ts` `@qa-r17` | [#369](https://github.com/matstangherlin/longyu/pull/369) · `CI=1 npx playwright test e2e/qa-listening-fallback.spec.ts --project=chromium` | preview local | em PR — Chromium 1/1. Contraste mā (1º) × má (2º). A rota de QA não mostra o medidor de Fôlego; o caminho não chama `spendFolego`. mobile-safari não executa este arquivo. |
| R-18 | SRS | Item só apresentado não gradua; erro gera alvo | prompt 30, unitário | `npm run test:srs-evidence` (nome a confirmar no prompt 21) | local | não executado |
| R-19 | Paywall | CTAs levam a páginas que existem | prompt 30, `@qa-r19` | `e2e/qa-regression-r19.spec.ts` (ainda não existe) | local | não executado |
| R-20 | Desempenho | JS inicial < 300 KB gzip; cache imutável | prompt 30, passo de script | `npm run check:bundle-budget` depois de `npm run build` (prompt 17) | local | não executado |
