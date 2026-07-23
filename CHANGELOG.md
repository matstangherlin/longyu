# Changelog

Todas as mudanças notáveis do Longyu são documentadas aqui.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [SemVer](https://semver.org/lang/pt-BR/) com sufixo pré-release (`-beta.N`).

## [Não lançado]

### Reformulação da Jornada (2026-07-23)

- Cabeçalho funcional (`JourneyHeader`): Fase · Unidade, objetivo curto, anel de
  progresso acessível, ação principal `Continuar`/`Começar` e ação recomendada
  secundária `Revisar N itens` (só com SRS pendente), além de indicador offline
  e estado de Jornada concluída (com mascote).
- Unidades concluídas e futuras ficam **compactas** e expansíveis; só a unidade
  atual abre o caminho de nós — de 110+ nós para ~10 no desktop de um aluno
  avançado, melhorando densidade e performance. O checkpoint temático foi
  incorporado ao card da unidade (um separador a menos).
- Continuidade robusta: rola até a lição atual só quando ela não está visível
  (sem saltos de layout); a lição atual expõe `aria-current="step"`.
- Revisão de SRS (recomendada, positiva) separada visualmente da revisão
  curricular (nó dourado no caminho). Painel lateral desktop enxuto (Revisão,
  Missão, Progresso geral), sem duplicar o cabeçalho.
- Acessibilidade e movimento: nós são botões reais, barras/anel com rótulo, e o
  pulso da lição atual respeita `prefers-reduced-motion`. Novo hook `useOnline`.
- Testes: `e2e/journey-redesign.spec.ts` (novo, progresso, revisão, concluída,
  unidades compactas, expandir, offline, reduced motion, painel, teclado).

### Navegação progressiva e descoberta de recursos (2026-07-22)

- Estágio do aluno **derivado** de dados que já existem (lições, SRS, medalhas,
  liga, sequência) — sem nova fonte de verdade. `src/lib/learnerStage.ts`
  reaproveita as regras de desbloqueio de `journeyUnlocks`/`proAccess`.
- Navegação principal adaptativa: barra inferior mobile com no máximo 5 destinos,
  variando por estágio (novo: Jornada · Perfil · Mais; recorrente: + Missões);
  sidebar desktop cresce conforme o progresso. Todas as rotas continuam
  acessíveis por URL direta e pelo menu "Mais".
- Menu "Mais" reorganizado em **Aprender · Motivação · Conta**, com estados
  derivados por área (recomendada, nova, bloqueada com explicação do quê/quando,
  Pro) — áreas bloqueadas explicam em vez de mostrar só um cadeado.
- Descoberta de recursos: card discreto no hub da Jornada (com o mascote) anuncia
  uma área recém-liberada por vez, dispensável e persistido. Nunca modal, nunca
  em sequência, nunca durante uma lição.
- Migração segura de usuários antigos: a memória de "já apresentado" vive em
  `localStorage` (fora do store, sem tocar sync/merge) e é semeada com o que já
  é relevante — sem enxurrada de anúncios ao atualizar.
- Testes: `e2e/progressive-nav.spec.ts` (novo/treino/recorrente/rota direta/
  descoberta/migração/desktop). Asserções de CTA da landing atualizadas para
  `role: "link"` (os CTAs viraram links na entrega anterior).

### Padronização de CTAs e densidade de missões (2026-07-22)

- Novos primitivos `ButtonLink` e `AnchorButton` (mesmo visual de `Button`) e
  helper `buttonClasses`, eliminando o antipadrão `<Link><Button/></Link>` — um
  `<button>` aninhado em `<a>`, que é HTML inválido e prejudica teclado e
  leitores de tela. Migrados ~39 CTAs em 14 telas (Jornada, Missões, Revisão,
  Liga, Hànzì, Imersão, Landing, Ajustes, player de lição, paywall Pro e mais).
- `ActionButton` (sistema `page.tsx`) passou a renderizar um link real quando
  recebe `to`, corrigindo o mesmo aninhamento nas telas de Conta, Perfil, Plano
  e Dados locais de uma só vez; `ContaPage` deixou de embrulhar o botão em `Link`.
- Cards de missão mais leves: removido o badge de estado redundante (já indicado
  por ícone, borda, barra de progresso e rótulo do botão) e as três pílulas de
  recompensa consolidadas em um único selo — de até 5 badges para no máximo 2.
- Novo teste E2E garante ausência de elementos interativos aninhados
  (`a button` / `button a`) nas rotas principais, incluindo os dois sistemas de
  componentes.

### Padronização visual e acessibilidade (2026-07-22)

- Design system incremental com variantes semânticas de Card, Button e Pill,
  cabeçalhos compartilhados e estados Empty/Loading/Error.
- Shell desktop/mobile com alvos de toque de 44 px, foco visível e proteção
  contra overflow horizontal; safe areas e modo foco do player preservados.
- Biblioteca e Conquistas com filtros horizontais contidos e semântica de
  seleção; hubs mais legíveis em telas de 320–360 px.
- Onboarding com navegação acessível, progresso semântico e CTA protegido da
  safe area; Login e Ajustes com hierarquia e controles consistentes.
- Modais com foco inicial, contenção de Tab, Escape e restauração de foco.
- Auditoria documentada em `docs/UI_UX_AUDIT.md` e nova suíte E2E de
  responsividade, tema, reduced motion e teclado.

### Auditoria de prontidão beta (2026-07-21)

- Instalação limpa + `validate:beta` + build + E2E Chromium/Firefox; WebKit falhou no offline PWA.
- Correção de corpus: caracteres `多`/`少`/`饿` no catálogo; distractores sem antecipar preço; exit duro em `validate-corpus`.
- Relatórios/checklist/release atualizados; classificação de PRs abertas sem fechamento automático.
- Veredito: **NO-GO** (78%) — ver `docs/BETA_READINESS_AUDIT.md`.

### Conversation Vocabulary Loop → SRS

- Ao concluir (ou abandonar) uma conversa, o manifesto de vocabulário entra na
  fila de revisão espaçada com **prioridade pelo desempenho**: erro, abandono,
  várias tentativas, novidade e resposta da intenção (alta); acerto com
  assistência / pouco praticada (média); acerto imediato / consolidada (baixa).
- Deduplicação pedagógica: preferir **chunk** a cada hànzì isolado; preservar
  itens SRS já existentes; alternar domínios (som, significado, forma, uso,
  fala, leitura) nas revisões futuras.
- Histórico enriquecido (`assistanceLevel`, `mainAnswer`, `errorRefs`, `setting`)
  sincroniza no snapshot/merge; a mesma cena com erro não volta só por isso —
  a intenção reabre noutro cenário depois de revisar o conteúdo.
- Testes: `validate:conversation-vocabulary-srs` (no `validate:beta`).

### Fase Pós-Conversa (plano pedagógico)

- Após cada `conversation_scene`, o plano injeta **2–4 tarefas adaptativas**
  (revisão/imersão: **3–8**) com estágio `post_conversation` e metadados
  `postConversationPhase` / `postConversationTaskType`.
- Seleção adaptativa por desempenho (erros recentes), `conversationVariantLevel`,
  repetição de cena e papel do vocabulário (novo vs antigo): significado, áudio,
  produção, cenário alternativo, reparo, imagem e Hànzì Builder quando adequado.
- Player: faixa compacta **Pós-Conversa** na primeira tarefa; rótulo na barra de
  progresso; telemetria `post_conversation_shown`.
- `ProOfferEngine`: momento protegido `post_conversation` (sem ofertas Pro na
  sequência imediata após a conversa).
- Validadores, testes de loop/migração, relatório do loop e E2E atualizados.

### Migração completa V1→V2 (conversas)

- **33/33 cenas** do catálogo usam **nós + ramificação** como fonte principal;
  nenhuma cena autoral V1 (`lines` + `checkpoint` manual) restante.
- `sceneV2` continua derivando `lines` + `checkpoint` dos nós para fallback do
  player V1 (`VITE_ENABLE_CONVERSATION_V2=false`), feature flag e relatórios
  antigos — sem duplicação manual no catálogo.
- Validador exige nós em todas as cenas, confere derivação lines/checkpoint e
  remove tratamento especial de papel `legacy`.
- Novo `validate:conversation-migration`: flag V2 on/off, histórico antigo,
  currículo, resposta correta/errada, repetição, abandono, fim, variantes
  guided/independent/audio_first e Conversation Vocabulary Loop.
- Build: limite do Workbox PWA ajustado para precache do bundle principal (~3 MB).

### Conversa: áudio automático ao avançar

- Nas cenas de conversa, cada fala toca sozinha ao aparecer (Continuar /
  Responder / abertura da cena). O botão de áudio permanece para ouvir de novo.

### Catálogo de conversas V2 expandido

- **Todas as 33 cenas** do catálogo passam a ser V2 (nós + ramificação), com
  `sceneId` preservado para não quebrar histórico/`conversationHistory`.
- Novos mínimos pedagógicos: comum **6–10 falas / 2–3 intervenções**; revisão de
  módulo **10–14 / 3–5**; imersão **14–24 / 5–8**, com ≥2 caminhos e ≥2 finais.
- Diálogos com início contextual, desenvolvimento, objetivo comunicativo, reação
  e encerramento; ramos de erro com pista + reformulação (erro não encerra a
  cena). Situações de reparo (não entendi / repita / confirme) entram no fluxo.
- Compatibilidade: `sceneV2` deriva `lines` + `checkpoint` de fallback para o
  player V1 (`VITE_ENABLE_CONVERSATION_V2=false`); o histórico continua chaveado
  por `sceneId`.
- `revisao-numeros` inserida à mão em `l9-rev` para manter 33/33 no destravamento.
- Limites em `validate:conversation-scenes`, testes de vocabulário/loop, relatórios
  de cobertura e destravamento atualizados.
- Dificuldade derivada do **papel V2** (comum leve → 1; comum densa/revisão → 2;
  imersão → 3), para as fases iniciais continuarem a preferir cenas adequadas.
- `pedir-cha` inserida como aquecimento em `p7-imersao-casa-amigo` (33/33 no
  destravamento após o reajuste de dificuldade).

### Correção — microfone no celular (reconhece de verdade)

- O botão **Falar** falhava em Chrome/Edge Android: sem liberar o mic antes do
  SpeechRecognition e com escuta curta demais (`continuous: false`), o app
  caía em "não ouvi" / falha como se o microfone não funcionasse.
- Agora: `getUserMedia` só para pedir permissão e **libera o stream**; em
  seguida o reconhecimento roda sozinho com `continuous` + interim, timeout
  maior e botão **Parar**. Erros viram mensagens claras (permissão, rede, etc.).
- Gravação para playback continua só no desktop (no mobile gravar junto disputa
  o mic).

### Natureza em SVG flat (padrão visual único)

- Conceitos de natureza (`mountain`, `tree`, `sun`, `moon`, `water`, `fire`,
  `sky`, `woods`, `forest`) passaram de foto/WebP para **SVG chapado** na mesma
  linguagem visual do restante do catálogo (fundo pale mint, formas geométricas
  suaves, sem textura fotográfica).
- Metadados atualizados para `flat_illustration` / `neutral`; a categoria
  `nature` fica unificada na família flat.
- Guia (`docs/VISUAL_ASSET_GUIDE.md`) aceita SVG como formato preferido para
  ilustração chapada.

### Catálogo visual 100% SVG flat

- Os **37** conceitos de exercício com imagem agora usam SVG na mesma estética
  (pessoas, objetos, comida, ações, quantidade, animais). Fotos e renders 3D
  (`person`, `mouth`, `big`, `small`) foram substituídos.
- Gerador: `scripts/generate-flat-svgs.py`. Validações
  `validate:visual-consistency` / `validate:image-exercises` atualizadas.

### Correções — robustez da lição e microfone no celular

- **Fim da tela branca ao errar tudo**: um `ErrorBoundary`
  (`src/components/system/ErrorBoundary.tsx`) agora envolve o conteúdo das
  páginas (dentro do shell) e a raiz do app. Uma exceção de render — como a que
  aparecia ao errar todas as tarefas e cair no fluxo de fim de lição — deixa de
  desmontar a árvore inteira; em vez da tela branca o aluno vê uma recuperação
  no estilo do site (Tentar novamente / Voltar para a Jornada / Recarregar),
  com o progresso preservado. O boundary se reseta ao trocar de rota, então dá
  para sair de uma tela quebrada pela navegação sem recarregar.
- **Revisão de erros à prova de travamento**: se um erro gerar um exercício de
  correção sem opções nem peças jogáveis, a resposta é revelada e o avanço é
  liberado, em vez de prender o aluno numa tela sem botão utilizável.
- **Microfone volta a funcionar no celular**: em `PronunciationPractice`, a
  gravação de playback (`MediaRecorder`/`getUserMedia`) não roda mais em
  dispositivos de toque — ela disputava o microfone com o reconhecimento de
  fala e o quebrava no mobile. Agora o reconhecimento fica com o microfone
  sozinho no celular; o playback segue disponível no desktop. A mensagem para
  navegadores sem reconhecimento (Safari do iPhone) explica a alternativa de
  ouvir e repetir em voz alta.

### Conversation Vocabulary Loop — reúso no plano real da lição

- **A ligação altera o plano REAL** entregue ao player: `buildLessonPracticePlan`
  agora injeta, DEPOIS de cada conversa, tarefas que praticam o vocabulário
  exibido (`applyConversationVocabularyLoop` em `lessonTasks.ts`). Cada item
  relevante mostrado numa conversa aparece em ≥1 atividade posterior; itens
  novos/errados ganham ≥2 modalidades cognitivamente diferentes, com ≥1
  recuperação ativa; a resposta principal é reaplicada em contexto.
- **Créditos primeiro** (não incha a lição): tarefas já existentes que reusam o
  vocabulário contam; só o que falta é adicionado, respeitando tetos de
  repetição semântica, o limite de "mesma resposta correta" (≤2, alinhado ao
  `validate:exercise-depth`), transformação cognitiva, limites de Hànzì Builder e
  a progressão de estágios. O acumulador de tetos é compartilhado entre as
  conversas da lição (duas conversas não repetem a mesma resposta além do teto).
- **Metadados na tarefa derivada** (consumidos pelo player): `conversationDerived`,
  `conversationSourceSceneId`, `conversationCoveredRef`, `conversationModality`,
  `conversationExposureNumber` e `conversationDerivedReason` (erro vs regra).
- **Validador** `validate:conversation-loop` (no `validate:beta`): falha quando
  vocabulário de conversa fica sem tarefa posterior, palavra nova tem uma só
  exposição/modalidade, tarefa derivada vem antes da conversa, todas as derivadas
  são da mesma modalidade, a resposta principal nunca é recuperada ou um item de
  ramo de erro nunca é revisto. Relatório `reports/conversation-loop-report.md`
  (conversas analisadas, vocabulário exibido/coberto, reúso médio, itens sem
  cobertura, modalidades).
- **Testes** `test:conversation-loop`: lição comum, revisão de módulo, imersão,
  conversa sem/com novidade, com erro, V1/V2, variante beginner, plano no limite,
  substituição de exercício superficial e preservação da ordem pedagógica.

### Conversation Vocabulary Loop — caminho inverso do vocabulário

- **Núcleo** `src/data/conversationVocabulary.ts`: dado a variante EFETIVAMENTE
  exibida de uma conversa (V1 ou V2, incluindo variantes beginner/intermediate/
  advanced), extrai de forma determinística todo o vocabulário mostrado — chunks,
  hànzì, palavras, intenção, respostas esperadas — a partir do caminho principal,
  ramos de erro, interações e explicações, para reúso nas atividades da mesma
  lição e nas revisões.
- **Função central** `buildManifestForResolvedVariant(scene, resolved)`: recebe a
  variante JÁ RESOLVIDA (a mesma que o player exibe), garantindo que o manifesto
  represente exatamente o que foi mostrado; `buildConversationVocabularyManifest(scene, context)`
  é o atalho que resolve e delega.
- **`expectedAnswers`** no manifesto: respostas esperadas do aluno (texto cru),
  além dos seletores `itemsByRole`/`itemsBySource` e `reusableRefsFromManifest`.
- **Referências canônicas** (`chunk:<id>` / `char:<id>`) via segmentação por
  correspondência mais longa: um chunk cadastrado nunca é quebrado em partículas
  soltas; os hànzì que o compõem ficam em `charRefs` (reúso granular em SRS).
- **Papéis** por item: obrigatório, auxiliar, novo, antigo (reutilizado), apenas
  exposto e "exige resposta" (aparece numa resposta esperada) — acumuláveis.
- **Não resolvido nunca é ignorado**: texto exibido sem referência no catálogo é
  registrado em `coverage.unresolvedTexts` + `warnings` (aviso de desenvolvimento
  via `warnUnresolvedConversationVocabulary`), sem inventar IDs.
- **Cobertura reversa** integrada ao `validate:conversation-scenes` (relatório
  `conversation-coverage-report.md`): sinaliza refs declarados que nunca aparecem
  no texto (over-declaração) e glifos sem `char:` standalone (ex.: 那/里, hoje só
  dentro de chunks) — como avisos, sem quebrar o portão.
- **Testes** `validate:conversation-vocabulary` (14 casos: V1, V2, ramificada,
  variantes, ramo de erro, opcional ausente, item novo/antigo, texto sem
  referência, deduplicação, chunk com vários hànzì, palavra repetida) + verificação
  de determinismo em todas as cenas reais. Comportamento das conversas inalterado.

### Privacidade — consentimento pedagógico opt-in

- `getTelemetryConsent()` passa a retornar **false** sem escolha explícita; nenhum evento pedagógico é enviado antes da decisão.
- Modal compacto “Ajude a melhorar o Longyu” após cadastro/primeiro acesso ao painel (Permitir / Agora não / Ver detalhes).
- Ajustes → **Privacidade e dados**: toggle, detalhes do que é coletado, limpar fila, exportação, exclusão de conta e política.
- Revogar limpa a fila local imediatamente, preserva progresso e feedback manual.
- Perfil Supabase: `pedagogy_analytics_consent`, `consented_at`, `revoked_at` (migration `011`).
- Servidor: `submit_beta_pedagogy_event` exige consentimento no perfil autenticado; allowlist `conversation_*` alinhada ao app (migration `012`).
- Hardening pedagógico (migration `013`): rate limit (auth/anon + por tipo), whitelist de metadata, limites de tamanho, digest UA com rotação diária (sem IP), sessão anônima opcional, retenção 90 dias com agregados diários.
- Validador `validate:privacy-consent` no portão `validate:beta`.
- Validador `validate:pedagogy-rpc-hardening` no portão `validate:beta`.

### Identidade visual consistente dos exercícios com imagem

- **Guia oficial** (`docs/VISUAL_ASSET_GUIDE.md`): dois estilos — Conceito isolado
  e Cena contextual — e a regra de ouro de não misturar famílias de estilo numa
  mesma pergunta.
- **Metadados** em `VisualConcept`/`VisualScene`: `visualStyle`
  (photo/realistic_illustration/flat_illustration), `backgroundStyle`
  (neutral/contextual/transparent) e `subjectCount`, auditados contra o arquivo real.
- **Grades sempre consistentes**: `defaultVisualDistractors` só escolhe
  distractores da mesma família de estilo (realistic vs flat) — nenhuma pergunta
  mistura foto com desenho chapado, sem remover cobertura visual.
- **Renderer**: `object-contain` para fundo neutro (sem cortar o sujeito),
  `object-cover` para cena contextual; skeleton e quadro de altura fixa evitam
  layout shift; fallback de ícone/emoji quando a imagem falha.
- **Auditoria automática** (`validate:visual-consistency` →
  `reports/visual-consistency-report.md`): dimensão, proporção, tamanho,
  transparência, metadados, ausência de URL externa, alt e consistência de
  distractores; lista candidatos a substituição por prioridade.
- **Testes visuais** (`e2e/visual.spec.ts`): imagem principal, grade de opções,
  mobile 360px, modo escuro e fallback de erro de carregamento.

### Diversidade de conversas pelo histórico real do aluno

- **`conversationHistory`** no progresso do aluno (cena, intenção, lição,
  resultado, tentativas; máx. 100, mais recente primeiro). Viaja no snapshot da
  conta e é mesclado no sync (união deduplicada por cena+lição+timestamp).
- **Rotação personalizada**: a pontuação de seleção usa o histórico real —
  penaliza a cena da última lição, das últimas conversas, a intenção e o cenário
  repetidos; e favorece cenas nunca realizadas, intenção/cenário pouco
  praticados e cenas que trabalham um erro recente.
- **`conversationVariantLevel`** (guided → assisted → independent → audio_first):
  uma cena que reaparece volta num nível acima (sem tradução, depois só áudio),
  nunca na mesma versão. Aluno novo recebe a versão guiada; aluno avançado, a
  independente.
- **Retorno pedagógico após erro**: a mesma cena não reaparece na lição seguinte;
  primeiro o vocabulário/intenção é revisto e, mais tarde, a intenção volta em
  outro cenário.
- **Métricas** de conversa (sem respostas livres): `conversation_shown`,
  `conversation_completed`, `conversation_repeated`, `conversation_error`, com
  intenção e nível da variante.

### Integração das cenas de conversa com o currículo

- **Cobertura**: todas as 33 cenas do catálogo agora aparecem em algum plano real
  (antes ~18); nenhuma cena passa de 15% das lições e nenhuma intenção passa de
  20% das conversas geradas.
- **`optionalRefs`**: novo campo separa o vocabulário essencial (requiredRefs) do
  auxiliar; a elegibilidade só exige o essencial, o auxiliar apenas enriquece.
- **Variantes por estágio** (`variants`): uma cena pode ter versões iniciante /
  intermediária / avançada; a avançada nunca aparece antes do currículo
  correspondente (ex.: pedir água começa em 你好 + 水).
- **Rotação justa**: penalidade de recência graduada (janela de 10) impede que
  uma única cena domine; a cobertura é medida com rotação encadeada, como um
  aluno real percorre a jornada.
- **Inserções autorais**: cenas de água, identificar pessoa, onde está, sala de
  aula, pedir ajuda, o que é isto, loja, revisões e uma unidade dedicada de
  **Imersão** (mercado, estação, casa de amigo).
- **`validate:conversation-scenes`** reforçado: falha se uma cena comum elegível
  nunca é usada, se uma cena/intenção domina, se requiredRefs têm frases
  desnecessárias, se optionalRefs são tratados como obrigatórios, ou se uma cena
  de imersão entra em lição comum. Novo relatório `conversation-unlock-report.md`.

## [0.2.0-beta.1] — 2026-07-18

Primeira beta pública do Longyu.

### Adicionado

- Versionamento `0.2.0-beta.1` visível de forma discreta em Sobre, rodapé da landing, modal de feedback e painel admin.
- Ambientes explícitos: **Development**, **Preview**, **Production Beta**.
- Feature flags de rollback: `VITE_ENABLE_CONVERSATION_V2`, `VITE_ENABLE_TELEMETRY`, `VITE_ENABLE_BETA_FEEDBACK`.
- Aviso discreto de beta na landing e em Sobre (não em todas as telas).
- Checklist de release (`docs/BETA_RELEASE_CHECKLIST.md`) com critérios de publicação e rollback.
- Smoke tests E2E ampliados para os fluxos críticos da beta.
- Guardrails de deploy: bloqueio de Pro Preview e fixtures de teste no ambiente principal.

### Segurança / entitlements

- Pro Preview nunca libera no ambiente principal (`production_beta`), mesmo com flag vazada.
- Conta QA (`teste@longyu.app`) não propaga Pro para outros usuários no mesmo dispositivo (logout / troca de conta).
- Variáveis de Preview isoladas do contexto Netlify `production`.
- `EntitlementBootstrap` só sobrescreve Pro com resposta do servidor quando há sessão cloud.

### Corrigido

- Revisão Pro: hooks de atalho após early return causavam React #300 na reidratação.

### Mantido

- Todas as funcionalidades pedagógicas atuais (lições, Hànzì Builder, imagens reais, conversation_scene V2, revisão, feedback, sync).
- Feedback beta com Supabase e painel admin.

## [0.1.0] — anterior

Beta privada / desenvolvimento interno.
