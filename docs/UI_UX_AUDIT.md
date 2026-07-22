# Auditoria de UI/UX do Longyu

Data da auditoria: 2026-07-22  
Base auditada: `main` em `b858447d2d50b68792334ccc04d779a5bce23e41`  
Escopo: interface e acessibilidade. Currículo, SRS, progressão, autenticação, Supabase, Stripe e políticas de segurança não foram alterados.

## Resumo executivo

O Longyu já tinha uma identidade própria forte — paleta quente, tipografia serifada nos destaques, hànzì com presença e mascote reconhecível — mas a aplicação acumulou variações locais de cards, botões, títulos, badges e alvos de toque. A maior inconsistência não era de cor: era de densidade, peso visual e comportamento.

A padronização desta entrega é incremental. Ela fortalece os componentes compartilhados, o shell e as telas com maior impacto transversal, preservando todos os fluxos e rotas existentes.

## Método e breakpoints

A auditoria combinou leitura do código com inspeção real da aplicação publicada em:

- 360 × 640 (telefone de referência);
- 768 × 1024 (tablet retrato);
- 1440 × 900 (desktop largo);
- temas claro e escuro;
- navegação pública, onboarding e sessão local autenticada.

Também foram revisados os contratos existentes de `prefers-reduced-motion`, safe area, modo foco do player, persistência de tema e rotas protegidas.

## Inventário de padrões existentes

### Estrutura e navegação

- `AppShell` coordena Sidebar, TopBar, TabBar, feedback, bootstrap e modo foco.
- `HubLayout` fornece página, cabeçalho, seção, grids, cards de navegação, hero, Pro e estado vazio.
- Landing, onboarding e autenticação usam composição própria fora do shell.
- O player de lição e testes usam modo foco, corretamente ocultando navegação e FAB.
- Desktop e mobile possuem navegação específica; a arquitetura foi preservada.

### Componentes visuais

- `primitives.tsx` já concentrava `Card`, `Button`, `ProgressBar`, `Pill`, `HubCard` e `SectionTitle`.
- Existiam estados vazios e cabeçalhos duplicados no `HubLayout`.
- Cards quase sempre recebiam borda e sombra, mesmo quando não eram interativos.
- Botões tinham cinco variantes, mas faltavam estados semânticos explícitos para perigo, premium, texto e loading.
- Barras de progresso não expunham semântica de `progressbar`.
- Modais já fechavam com Escape e bloqueavam o scroll, mas não prendiam/restauravam foco.

### Temas e movimento

- Tokens RGB já separam fundo, superfície, texto, borda, acento, sucesso, erro e premium.
- Os três temas existentes foram preservados: Notion Clay, China Modern e Longyu Dark.
- O tema escuro aplicava sombras mais pesadas do que o claro.
- A folha global já respeitava `prefers-reduced-motion`; a nova base estende esse contrato aos novos componentes.

## Inconsistências encontradas

### Bloqueadoras ou de alto impacto

1. Alvos de toque menores que 44 × 44 px:
   - Sidebar desktop: links medidos com 32 px de altura.
   - TopBar: atalhos de estatística entre aproximadamente 27 e 32 px.
   - Onboarding: voltar com 36 × 36 px.
   - Ajustes: switches com 28 px de altura.
   - Algumas ações em Login, Perfil, Loja, Mais, Sobre e estados bloqueados eram links inline entre 15 e 36 px.
2. Biblioteca e Conquistas usavam filtros com margem negativa e largura `min-content`, produzindo largura de documento acima da viewport em 360 px.
3. Modal compartilhado não possuía foco inicial, contenção de Tab ou restauração do foco anterior.
4. O footer do onboarding encostava no limite inferior em 360 × 640 e podia competir com a safe area/teclado.
5. Cards de hub em duas colunas ficavam estreitos demais em 320–360 px.
6. O tema escuro ampliava sombras de praticamente todos os cards, aumentando peso e ruído visual.

### Médio impacto

- Cabeçalhos e estados vazios eram implementados em paralelo entre primitives e HubLayout.
- Descrições de hub usavam 11 px e truncamento de uma linha, diminuindo legibilidade em português.
- Filtros selecionáveis não informavam `aria-pressed`.
- Links que pareciam botões continham elementos `button` aninhados em `Link` em cards de hub.
- Progressos visuais não tinham nome ou valor semântico para leitores de tela.
- A densidade de Ajustes, Missões e Jornada é alta; a causa principal é a soma de microbadges e controles compactos.

### Baixo impacto e observações

- A mistura de emoji, caracteres chineses e ícones vetoriais é mais evidente no onboarding. Ela funciona como personalidade, mas deve ser reduzida onde o símbolo também comunica estado.
- Tabelas do Plano Pro usam scroll interno e não estouram o documento, porém uma futura visualização em cards pode ser mais confortável em 320 px.
- Hànzì e pinyin têm hierarquia própria e foram preservados; não foi encontrada razão para alterar o conteúdo ou a lógica de exibição.

## Telas auditadas

| Área | Estado observado | Ação nesta entrega |
| --- | --- | --- |
| Landing | Boa identidade; CTAs claros; Entrar menor que o alvo recomendado | Coberta pela base global de foco, tipografia e overflow; testes existentes preservados |
| Onboarding | Voltar pequeno; footer no limite; resultado do diagnóstico denso | Voltar 44 px, progresso semântico, footer sticky com safe area e seleção semântica |
| Login/criação de conta | Links e espaçamento compactos | Hierarquia mobile, card mais leve e link de criação com alvo 44 px |
| Jornada | Densa, muitos badges | Cards e grids compartilhados mais legíveis; shell mais consistente |
| Player/conclusão | Modo foco correto | Preservado; nenhum chrome reintroduzido |
| Treino/Revisão | Consistentes com hubs, ainda densos em alguns estados | Recebem HubLayout, botões e cards consolidados |
| Biblioteca | Filtros causavam overflow do documento | Scroll contido, snap, foco e `aria-pressed` |
| Fala/Pinyin/Hànzì/Leitura | Estados bloqueados e tabs compactos | Recebem nova base; tabs compartilhadas ganham alvo mínimo |
| Missões | Maior concentração de microações/badges | Recebe base de botão/pill; simplificação estrutural adicional fica como P1 |
| Conquistas | Filtros excediam viewport; duas colunas apertadas | Filtros contidos; 1 coluna abaixo de 390 px; EmptyState comum |
| Liga/Loja/Plano Pro | Bons containers; links compactos e tabela interna | Recebem base global; tabela Pro permanece com scroll interno |
| Perfil/Conta/Dados locais | Visuais relacionados, ações pontuais pequenas | Recebem shell, foco e botões consolidados; migração completa de rows fica incremental |
| Ajustes | Muito conteúdo e switch de 28 px | Switch 44 px, temas semânticos, modal acessível, safe area |
| Ajuda/Sobre/Mais | Hubs coerentes, ações inline compactas | Recebem HubLayout e base de foco/toque |
| Menus desktop/mobile | Sidebar 32 px; TopBar compacta | Links/controles 44 px; TabBar explícita e segura |
| Modais | Escape e scroll lock existentes | Trap de foco, foco inicial, restauração e viewport dinâmica |
| Vazio/erro/loading | Duplicados ou ausentes na base | `EmptyState`, `ErrorState` e `LoadingState` compartilhados |

## Design system consolidado

### Tipografia

- Título de página: 24 px no mobile e aproximadamente 27 px em telas maiores.
- Título de seção: 16–18 px.
- Título de card: 14–16 px.
- Texto de apoio: 14 px / 20 px.
- Legenda e metadado: mínimo visual de 11–12 px quando não interativo.
- Hànzì mantém `Noto Serif SC` e presença própria sem disputar com o título da página.

### Espaçamento

A base reutiliza a escala do Tailwind e concentra os novos padrões em 4, 8, 12, 16, 20, 24 e 32 px. Hub pages usam separação de 20 px, cards usam 12–20 px e controles interativos têm altura mínima de 44 px.

### Cards

Foram introduzidas variantes semânticas:

- `basic`;
- `interactive`;
- `progress`;
- `reward`;
- `info`;
- `premium`;
- `alert`;
- `empty`.

A sombra escura foi reduzida e hover/pressed/focus aparecem apenas onde há interação.

### Botões

A base agora cobre:

- principal;
- secundário;
- ghost;
- soft;
- outline;
- sucesso;
- perigo;
- premium;
- texto;
- ícone;
- loading;
- disabled.

Todos possuem foco visível e altura mínima de 44 px.

### Badges e progresso

`Pill` mantém tons funcionais sem forçar caixa alta em todos os contextos. `ProgressBar` agora expõe valor, máximo, porcentagem e nome para tecnologias assistivas.

## Componentes consolidados

- `Card`
- `Button`
- `ButtonLink` (CTA de navegação com o visual do `Button`)
- `AnchorButton` (âncora nativa com o visual do `Button`)
- `buttonClasses` (base de estilo compartilhada por Button/ButtonLink/AnchorButton)
- `ActionButton` (do sistema `page.tsx`, agora sobre `ButtonLink`)
- `Pill`
- `ProgressBar`
- `PageHeader`
- `SectionHeader`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `HubPage`
- `HubHeader`
- `HubSection`
- `HubNavCard`
- `HubEmptyState`
- `ModalOverlay`
- `Sidebar`
- `TopBar`
- `TabBar`
- `SettingSwitch`

## Testes adicionados

`e2e/ui-consistency.spec.ts` verifica:

- ausência de overflow horizontal em rotas principais a 360 × 640;
- alvos mínimos da navegação mobile;
- alvos e teclado na navegação desktop;
- tema escolhido em Ajustes e persistência após reload;
- `prefers-reduced-motion`;
- foco contido/restaurado e Escape em modal.

Os testes existentes da landing, modo foco, player, mascote e tema continuam fazendo parte da cobertura.

## Segunda entrega — CTAs de navegação e densidade (2026-07-22)

Continuação incremental da padronização, focada em corrigir um antipadrão
transversal e reduzir densidade sem tocar em currículo, SRS, autenticação,
Supabase, Stripe ou segurança.

### Problema estrutural corrigido: `<button>` dentro de `<a>`

A auditoria inicial já apontava links que pareciam botões com `button` aninhado
em `Link`. Uma varredura completa encontrou **~39 ocorrências** de
`<Link><Button/></Link>` em 14 telas e, além disso, dois geradores centrais do
padrão:

- `ActionButton` (do sistema `src/components/ui/page.tsx`) embrulhava um
  `<Button>` em `<Link>` sempre que recebia `to` — reproduzindo o aninhamento em
  Conta, Perfil, Plano e Dados locais;
- `ContaPage` ainda embrulhava um `ActionButton` em `<Link>`.

Um `<button>` dentro de um `<a>` é HTML inválido, quebra a navegação por teclado
(dois alvos focáveis sobrepostos), confunde leitores de tela e produz largura
imprevisível quando o âncora é inline e o botão é `w-full`.

### Solução: primitivos de CTA compartilhados

- `buttonClasses(variant, size, className)` extrai a base de estilo do `Button`.
- `ButtonLink` renderiza um `Link` do React Router com o visual do `Button`.
- `AnchorButton` cobre âncoras nativas (href externo, `mailto`, download).
- `ActionButton` passou a usar `ButtonLink` quando há `to`.

Resultado: um CTA fica idêntico seja `<button>` ou link, com um único ponto de
verdade para o estilo. Nenhum rótulo, rota ou ação foi alterado.

### Densidade de Missões

O `MissionCard` exibia até cinco badges (Pro + estado + três recompensas). O
badge de estado era redundante (o estado já aparece no ícone, na borda do card,
na barra de progresso e no rótulo do botão) e foi removido; as três pílulas de
recompensa foram consolidadas em um único selo. O card passou de até 5 para no
máximo 2 badges, preservando toda a informação.

### Verificação

- `typecheck` e `build` limpos.
- Sonda de DOM em 360 × 640 nas rotas principais: **zero** `a button` /
  `button a` (Conta caiu de 1 para 0) e **zero** overflow horizontal.
- Novo teste E2E `CTAs de navegação não aninham elementos interativos`.
- Validadores `validate:lesson-victory-ui` e `validate:glossary-ui` passam.

## Pendências visuais

### P1

- ~~Reduzir microbadges simultâneos em Missões~~ (feito nesta entrega). Jornada
  já não concentra microbadges após a primeira entrega; revisitar se surgirem.
- ~~Migrar ações inline de navegação que embrulhavam botões em `Link`~~ (feito:
  primitivos `ButtonLink`/`ActionButton`). Restam ações inline puramente textuais
  em Loja e Sobre que podem virar `Button`/`SettingsRow` quando conveniente.
- Criar uma variante móvel em cards para a comparação do Plano Pro, evitando depender de scroll de tabela em 320 px.
- Aplicar um `SettingsRow` compartilhado às seções de Ajustes, Conta e Dados
  locais. Observação: os dois toggles existentes (Ajustes e Imersão) são
  visualmente distintos por intenção; unificá-los exige decisão de design antes
  de consolidar, então a extração ficou adiada para não alterar a aparência atual.

### P2

- Unificar gradualmente os ícones decorativos do onboarding; preservar emoji apenas quando expressar personalidade.
- Revisar truncamentos de descrições longas em Biblioteca e Perfil.
- Capturar snapshots de regressão visual por tema em CI.

### P3

- Refinar densidade de tablets em paisagem com composições específicas de duas colunas.
- Documentar tokens no Storybook ou catálogo interno se o projeto adotar uma ferramenta já existente; nenhuma dependência foi adicionada nesta entrega.

## Critério de não regressão

Nenhuma rota, funcionalidade, regra curricular, regra de SRS, autenticação, Supabase, Stripe, política de segurança, mascote ou mecanismo de progressão foi removido ou alterado. A intervenção é de apresentação, semântica e acessibilidade.

