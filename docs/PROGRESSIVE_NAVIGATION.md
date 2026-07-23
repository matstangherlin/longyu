# Navegação progressiva do Longyu

Data: 2026-07-22
Escopo: descoberta e navegação. Currículo, SRS, progressão de desbloqueio,
autenticação, Supabase, Stripe e políticas de segurança **não** foram alterados.

## Objetivo

O Longyu tem muitas áreas (Jornada, Treino, Revisão, Pinyin, Hànzì, Fala,
Leitura, Biblioteca, Missões, Conquistas, Liga, Loja, Perfil, Conta, Ajustes,
Plano Pro). Um iniciante não deve receber tudo de uma vez. Esta entrega
implementa **divulgação progressiva**: mostrar primeiro o necessário para o
estágio atual e revelar o resto conforme o aluno avança — sem remover nada.

## Fonte única de verdade (sem duplicar regras)

O estágio e a disponibilidade de cada área são **derivados** de dados que já
existem no store. Não há campo novo de "estágio" persistido.

- `src/lib/learnerStage.ts` — funções puras que calculam o estágio e a
  disponibilidade reaproveitando `journeyUnlocks`/`proAccess`
  (`isTreinoUnlocked`, `isEngineUnlocked`, `ENGINE_UNLOCK_COPY`, …).
- `src/hooks/useLearnerProfile.ts` — liga o store às funções puras.

### Estágios (derivados de estados reais da Jornada)

| Estágio | Sinal derivado | Foco |
| --- | --- | --- |
| 1 · Início | onboarding concluído | Jornada + primeira lição, Conta, Ajuda |
| 2 · Praticando | `isTreinoUnlocked` (3 lições ou 1ª revisão) | Treino, Revisão, Pinyin, progresso |
| 3 · Caracteres | `isEngineUnlocked("hanzi")` (revisão da Fase Hànzì) | Hànzì, Biblioteca, leitura de caracteres |
| 4 · Fala e leitura | `isEngineUnlocked("leitura")` (Microtexto 1) | Fala, Leitura, Imersão, áudio |
| 5 · Recorrente | estágio ≥ 2 **e** engajamento (medalha, liga ou sequência ≥ 3) | Missões, Conquistas, Liga, Loja |

O estágio 5 é um _overlay_ de engajamento sobre o estágio de aprendizado
(`learningStage` 1–4), então motivação ganha presença sem esconder o
aprendizado. As condições usam estados reais do currículo — nunca um número
fixo que envelhece (`l1-rev`, `l5-rev`, `l13`).

## Mapa final de navegação

### Barra inferior (mobile) — no máximo 5 destinos, adaptativa

| Estágio | Destinos |
| --- | --- |
| 1 | Jornada · Perfil · Mais |
| 2–4 | Jornada · Praticar · Revisão · Perfil · Mais |
| 5 | Jornada · Praticar · Revisão · Missões · Mais |

### Sidebar (desktop) — compacta, estilo Duolingo

Poucas abas de alta frequência (teto **7**, incluindo Mais). Hànzì, Imersão e
áreas satélite ficam no popover/página "Mais" — não na barra principal.

| Estágio | Destinos |
| --- | --- |
| 1 | Jornada · Perfil · Mais |
| 2–4 | Jornada · Praticar · Revisão · Perfil · Mais |
| 5 | Jornada · Praticar · Revisão · Missões · Ligas · Perfil · Mais |

O item **Mais** abre um **popover curto** (clique, não hover) com atalhos que
ainda não estão na barra + link “Ver menu completo” para `/mais`.

### Menu "Mais" — catálogo completo, agrupado por objetivo

Sempre exaustivo (nenhuma rota fica inacessível):

- **Aprender**: Treino, Revisão, Pinyin, Hànzì, Fala, Leitura, Biblioteca, Imersão.
- **Motivação**: Missões, Conquistas, Ligas, Loja, Amigos.
- **Conta**: Perfil, Conta, Plano Pro, Dados locais, Ajustes, Ajuda, Sobre.

O catálogo vive em `src/components/layout/nav.tsx` (`NAV` + `MORE_CATALOG`),
consumido tanto pela sidebar (dropdown) quanto pela página `/mais`.

## Estados de cada área (na página "Mais")

| Estado | Quando | Como aparece |
| --- | --- | --- |
| Disponível | sem restrição, já conhecida | card normal |
| Recomendada / Nova | recém-relevante para o estágio e ainda não vista | destaque + selo "Nova" |
| Bloqueada por progressão | gate real (Pinyin/Hànzì/Leitura/Fala/Treino) | selo "Depois" + explicação do quê/quando/porquê; **a rota continua acessível** |
| Pro | Plano Pro | selo "Pro" |
| Dinâmica | ex.: Revisão com itens prontos | selo com contagem |

A explicação de uma área bloqueada usa a copy baseada na Jornada
(`ENGINE_UNLOCK_COPY`/`TREINO_UNLOCK_COPY`), por exemplo:
_"Conclua a lição «Olá» para treinar frases em voz alta."_

## Descoberta de recursos (primeira sessão e liberações)

- Card discreto no hub da Jornada (`FeatureDiscoveryCard`) — nunca um modal,
  nunca em sequência com outro modal, nunca durante uma lição.
- Um anúncio por vez, dispensável ("Depois") e persistido.
- Conjunto curado (`useFeatureDiscovery`): Treino, Pinyin, Hànzì, Leitura,
  Missões — um por transição de estágio, para não cansar.
- Usa o mascote e uma frase curta ("Você liberou o Treino").

### Persistência e migração de usuários antigos

A memória de "já apresentado" fica em `src/lib/featureDiscovery.ts`, numa única
chave `localStorage` (`longyu:seen-intros`) **fora** do store de contas — são
dicas de UI, não progresso, então não entram em sincronização/merge nem exigem
migração do store.

`initializeDiscovery` roda uma vez e marca como vistas todas as áreas já
relevantes para o estágio atual. Assim:

- **Usuário novo** (estágio 1): nada é semeado além do básico; ao liberar o
  Treino (estágio 2), recebe o anúncio.
- **Usuário antigo** (ex.: estágio 3 no primeiro acesso pós-atualização): tudo
  o que já usa é semeado como visto → **sem enxurrada de modais**; apenas o que
  liberar depois é anunciado.

Nenhum onboarding é reiniciado; nenhuma área já usada é bloqueada.

## Rotas diretas / deep links

A navegação principal é um recorte por estágio, mas **toda rota continua
funcionando** por URL direta e pelo menu "Mais". Áreas com gate real de
progressão mostram a explicação do próprio gate (via as páginas existentes),
sem redirecionar silenciosamente. Nenhuma rota foi removida.

## Componentes e arquivos alterados

Novos:

- `src/lib/learnerStage.ts` — derivação de estágio e disponibilidade (puro).
- `src/lib/featureDiscovery.ts` — memória local de apresentações.
- `src/hooks/useLearnerProfile.ts` — perfil derivado do store.
- `src/hooks/useFeatureDiscovery.ts` — próximo anúncio + dispensa.
- `src/components/system/FeatureDiscoveryCard.tsx` — card do hub.

Alterados:

- `src/components/layout/nav.tsx` — catálogo único `NAV`, `mobileNavForStage`,
  `desktopNavForStage` (teto 7), `moreFlyoutGroups` (popover), `MORE_CATALOG`
  (página `/mais`: Aprender/Motivação/Conta).
- `src/components/layout/TabBar.tsx` — barra inferior adaptativa; badge de SRS
  movido para Revisão.
- `src/components/layout/Sidebar.tsx` — sidebar adaptativa por estágio.
- `src/features/more/MorePage.tsx` — grupos por objetivo + estados derivados.
- `src/features/journey/JourneyPage.tsx` — insere o card de descoberta abaixo do
  CTA principal (hierarquia: ação principal → descoberta → resto).

## Acessibilidade e responsividade

- Barra inferior mantém `aria-current`, alvos ≥ 44 px e `safe-area-inset-bottom`.
- Nenhum overflow horizontal em 360 × 640 (verificado em todos os estágios).
- Card de descoberta é `role="status"`/`aria-live="polite"`, dispensável por
  teclado, e respeita `prefers-reduced-motion` (mascote com blink desligável).

## Testes

`e2e/progressive-nav.spec.ts`:

- usuário novo (poucos destinos, Jornada em foco);
- Treino liberado (prática + revisão entram);
- usuário recorrente (Missões na barra);
- rota direta funciona fora da barra do estágio;
- "Mais" agrupado por objetivo + estado "Depois";
- descoberta anuncia uma vez e não repete após dispensar;
- migração: usuário antigo não recebe enxurrada;
- sidebar desktop cresce com o progresso, alvos ≥ 44 px.

Ajustes de asserção: os CTAs da landing viraram links (ButtonLink) na entrega
anterior; os testes de smoke/mobile passaram a checar `role: "link"`.

## Comandos e resultados

- `npm run typecheck` — OK.
- `npm run build` — OK.
- `progressive-nav.spec.ts` (chromium) — 8/8.
- `ui-consistency.spec.ts` (nav/tema/modal/aninhamento) — 5/5.
- `mobile-device.spec.ts` (landing, mobile-chrome) — 2/2.
- `smoke`/`beta-smoke` (landing) — 7/7.
