# Beta final — readiness da RC

Atualizado em: 2026-08-13

## Decisão

**Código pronto para integração em `main`; ainda não pronto para liberar a beta pública.**

Esta remessa consolida o hardening da economia/Pro, a expansão visual e o novo
exercício `compare_with_image`. A execução desta remessa não inclui deploy manual,
aplicação de migration em produção nem tag de RC pública; automações já configuradas
no repositório permanecem sob controle do GitHub.

## Entregas consolidadas

- Pérolas calculadas por dados autoritativos do servidor, catálogo fechado e
  claim único por `(user_id, milestone_id)`.
- Conta cloud só recebe Pro após confirmação do servidor; offline/falha mantém
  intenção pendente e `serverIsPro` continua sendo a autoridade.
- Catálogo visual com 87 conceitos e 87 assets locais, incluindo vocabulário de
  viagem, transporte, hotel, compras, restaurante e relações não ambíguas.
- 68 exercícios `image_choice` autorais, com cobertura concreta e dedicada em
  100% segundo os validadores do projeto.
- `compare_with_image` integrado ao player e à jornada: 4 passos autorais,
  níveis 1–3, modos palavra→imagem e imagem→palavra, feedback pedagógico,
  preload/fallback e layout mobile.
- Estabilização dos E2E contra rota lazy, fila assíncrona de medalhas, scroll
  anchoring e resposta acidental da grade visual durante o setup.

## Evidência automatizada

| Verificação | Resultado |
|---|---|
| `npm run validate:beta` | passou na tip consolidada |
| `npm run build` | passou; apenas avisos conhecidos de chunks/imports |
| `npm run test:e2e` | 206 passaram; 2 pulados por configuração explícita |
| `npm run validate:compare-with-image` | 4 passos, níveis 1–3, 2 modos |
| `npm run validate:image-exercises` | 68 passos, 87 conceitos, cobertura 100% |
| `npm run validate:visual-consistency` | 87 assets, 0 candidato a substituição |
| `npm run validate:visual-assets` | passou |
| `npm run test:pearl-economy` | passou |
| `npm run test:entitlements` | passou |
| `npm run validate:economy-server` | passou |
| `npm run test:economy-server` | passou |
| `npm run validate:security-boundaries` | passou |
| `npm run verify:beta-feedback` | passou; capability e RPCs responderam |
| `npm run verify:production` | endpoints mínimos responderam; Auth health 401 como aviso |

Os comandos acima não substituem a execução da migration em staging, um checkout
Stripe completo nem o uso do aplicativo em aparelhos físicos.

## Staging e backend

Status: **bloqueador para beta pública**.

- Staging remoto Longyu não está configurado (`BLOCKED_REMOTE_STAGING`).
  A migration de hardening de Pérolas não foi aplicada em produção nesta remessa.
- A migration de hardening de Pérolas não foi aplicada em produção nesta
  remessa.
- O harness `npm run test:pearl-staging` está pronto, recusa o projeto de
  produção e ainda precisa de `LONGYU_STAGING_PROJECT_ID`.
- O teste de staging deve cobrir milestone inválido/forjado, 11→12 Pérolas,
  replay, duas abas, dupla ativação e ausência de double spend.

## QA humano obrigatório

Permanece pendente, sem marcação automática:

- Android físico e Chrome mobile;
- iPhone físico, Safari e PWA;
- teclado aberto/fechado, header e sticky footer;
- imagens, `compare_with_image`, `odd_one_out`, montagem e revisão;
- rodada pedagógica humana L1–L20;
- VoiceOver/TalkBack e contraste formal;
- e-mail real, sincronização entre dois dispositivos e 5–15 testadores;
- checkout Stripe Test Mode ponta a ponta.

## Riscos residuais

1. migration crítica ainda não testada em staging isolado;
2. QA físico pode revelar diferenças de Safari/Android não reproduzidas por
   emulação;
3. checkout e webhook Stripe ainda exigem validação humana em Test Mode;
4. Security Advisor do Supabase mantém avisos documentados no relatório de
   backend, incluindo funções antigas com `search_path` mutável;
5. o build mantém avisos não bloqueantes de chunks grandes e imports mistos.

## Critério de liberação

A decisão atual é **pronto para `main`, ainda não pronto para beta pública**.
Mudar para “pronto para beta pública” somente após staging verde, QA físico
registrado, Stripe Test Mode concluído e nova execução dos gates na SHA congelada
de `origin/main`.
