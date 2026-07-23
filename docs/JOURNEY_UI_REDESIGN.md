# Reformulação da Jornada

Data: 2026-07-23
Escopo: experiência visual e hierarquia de informação da Jornada. **Não** foram
alterados: conteúdo das lições, ordem curricular, regras pedagógicas, SRS,
backend, segurança, pagamentos, o mecanismo de sincronização nem o mascote.

## Objetivo

Fazer a Jornada responder de imediato onde o aluno está, o que já concluiu, qual
é a próxima lição, o que falta na unidade, quais revisões estão pendentes e quais
recompensas estão próximas — transmitindo caminho e continuidade, não uma lista
longa de lições.

## O que mudou

### 1. Cabeçalho funcional (`JourneyHeader`)

Substitui o antigo `JourneyHeroCard` por um cabeçalho compacto que reúne, em uma
hierarquia clara de ações:

- contexto: **Fase · Unidade**, sequência (streak) e indicador **offline** discreto;
- **título do módulo** (checkpoint temático) + **objetivo curto** + próxima lição;
- anel de progresso da unidade (acessível, `role="img"` com rótulo);
- **ação principal** `Continuar` / `Começar primeira lição` — prioridade máxima;
- **ação recomendada secundária**: `Revisar N itens` (só quando há SRS pendente),
  em estilo suave e texto positivo, sem competir com o Continuar;
- **estado de Jornada concluída**: mascote + mensagem própria, sem `Continuar`.

### 2. Unidades compactas + caminho focado

Antes, no desktop, **todas** as unidades renderizavam o caminho completo de nós.
Agora:

- a **unidade atual** fica aberta e destacada (borda de acento + brilho);
- unidades **concluídas** e **futuras** ficam **compactas** (só o card-resumo com
  título, objetivo, progresso e estado), com um controle de expandir dedicado;
- expandir/recolher é um `<button>` real de largura total (alvo de toque amplo,
  `aria-expanded` + rótulo); há também um `Ver tudo`/`Focar atual` global;
- o caminho das unidades recolhidas **não é renderizado** — para um aluno
  avançado, a página passa de 110+ nós para ~10 (a unidade atual), melhorando
  densidade e performance.

O checkpoint temático (antes uma faixa separada) foi **consolidado** no card da
unidade: um separador a menos, sem repetir descrições.

### 3. Continuidade ("continuar de onde parou")

- localiza a próxima lição recomendada (`currentLessonId`, regra existente);
- rola até o nó atual **apenas se ele não estiver já visível**, evitando saltos;
- a lição atual é reconhecível por posição, contraste, anel, rótulo "AGORA" e
  `aria-current="step"`;
- como as unidades anteriores ficam compactas, o aluno nunca "cai" no início de
  uma jornada longa.

### 4. Revisões diferenciadas

- **Revisão de SRS** (recomendada): no cabeçalho e no painel lateral, com contagem
  e texto positivo — não bloqueia a progressão.
- **Revisão curricular** (nó dourado no caminho): mantém cor e rótulo próprios
  (`Revisar`, ícone de estrela), distinta da revisão de SRS.

### 5. Painel lateral (desktop) enxuto

Reduzido a informação útil e **sem duplicar o cabeçalho**: Revisão pendente (só
quando há itens), Missão do dia e Progresso geral (o streak saiu — já está no
cabeçalho). No tablet/mobile o painel é substituído pelos "chips" no fluxo.

### 6. Offline, acessibilidade e movimento

- Indicador **offline** discreto (`useOnline`); a Jornada continua usável com
  dados locais e não expõe erros técnicos do backend.
- Anel de progresso e barras com rótulo acessível; nós são `<button>` reais.
- O pulso da lição atual e as transições respeitam `prefers-reduced-motion`.

## Componentes criados / consolidados

| Componente | Situação |
| --- | --- |
| `JourneyHeader` | Novo — substitui `JourneyHeroCard`; reúne contexto, ação principal e revisão |
| `useOnline` (`src/hooks/useOnline.ts`) | Novo — status de conectividade para o indicador offline |
| `ModuleBlock` | Reformulado — unidade compacta/expansível, checkpoint incorporado |
| `ThemeCheckpointCard` | Removido — o tema foi incorporado ao card da unidade |
| `JourneySidePanel` | Enxugado — Revisão + Missão + Progresso geral, sem duplicar o cabeçalho |
| `UnitProgressRing` | Acessível (`role="img"` + rótulo) e reduced-motion |
| `LessonNode` | `aria-current="step"` na lição atual; pulso reduced-motion |

## Tabela de estados de lição

| Estado | Aparência | CTA / comportamento |
| --- | --- | --- |
| Próxima (atual) | Nó maior, anel de acento, rótulo "AGORA"/"Quase"/progresso, `aria-current` | Abre a lição |
| Disponível | Nó de acento com ícone da habilidade | Abre a lição |
| Em andamento | Ícone de refazer, anel de progresso parcial, rótulo "Quase" | Retoma a lição |
| Concluída | Nó menor, cor da unidade, check, estrelas | Reabrir/refazer |
| Bloqueada | Cadeado, superfície neutra, `cursor-help` | Explica o pré-requisito (toast) |
| Revisão (curricular) | Nó dourado, ícone estrela, rótulo "Revisar" | Abre a revisão da unidade |
| Pro | Selo "Pro"; abre paywall honesto | Abre o paywall Pro |
| Recomendada (SRS) | Ação suave no cabeçalho/painel: "Revisar N itens" | Vai para `/revisao` |

Estados de unidade: **atual** (destacada, expandida), **concluída** (compacta,
check), **futura** (compacta, opacidade, cadeado + teste de pular quando cabível).

## Estados de tela

Novo usuário (Começar), com progresso (Continuar), meio de unidade, unidade
concluída (compacta), Jornada concluída (mascote + mensagem), revisão pendente
(ação secundária), offline (indicador discreto), reduced motion (sem pulso).

## Evidências visuais

Capturas em `scratchpad` (360×760 novo/claro, 360×820 dark, 1440×900 desktop):
cabeçalho com ação principal + revisão, unidade atual expandida e unidades
concluídas compactas, painel lateral enxuto. Anexadas na conversa.

## Testes

`e2e/journey-redesign.spec.ts` (10 casos): usuário novo (Começar + `aria-current`),
com progresso (Continuar), revisão pendente (ação secundária + link), Jornada
concluída, unidades compactas (poucos nós renderizados), expandir unidade,
indicador offline, reduced motion, painel lateral desktop, foco por teclado no
controle de expandir. Todos passam.

## Comandos e resultados

- `npm run typecheck` — OK
- `npm run build` — OK
- `npm run validate:copy` / `validate:lesson-victory-ui` / `validate:glossary-ui` — OK
- E2E: `journey-redesign` 10/10, `pedagogy` 8/8, `mobile-device` (mobile-chrome) 8/8,
  `smoke`/`beta-smoke` (jornada/foco/conta) 6/6, `progressive-nav` (amostra) OK,
  `ui-consistency` (aninhamento em `/jornada`) OK.

## Melhorias futuras (não implementadas)

- Virtualização opcional do caminho da unidade atual quando uma única unidade
  tiver muitos nós (hoje não é necessário — ~10 nós).
- Persistir a posição de rolagem exata ao voltar do player (hoje o foco vai ao nó
  atual, que já é o comportamento desejado).
- Ilustração/preparação dedicada para imersões e revisões finais (marcos) com
  card especial — a base de estados já está pronta para receber.
- Animação curta de entrada do cabeçalho respeitando reduced-motion.
- Snapshot de regressão visual por tema em CI.
