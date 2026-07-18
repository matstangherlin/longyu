# Changelog

Todas as mudanças notáveis do Longyu são documentadas aqui.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [SemVer](https://semver.org/lang/pt-BR/) com sufixo pré-release (`-beta.N`).

## [Não lançado]

### Privacidade — consentimento pedagógico opt-in

- `getTelemetryConsent()` passa a retornar **false** sem escolha explícita; nenhum evento pedagógico é enviado antes da decisão.
- Modal compacto “Ajude a melhorar o Longyu” após cadastro/primeiro acesso ao painel (Permitir / Agora não / Ver detalhes).
- Ajustes → **Privacidade e dados**: toggle, detalhes do que é coletado, limpar fila, exportação, exclusão de conta e política.
- Revogar limpa a fila local imediatamente, preserva progresso e feedback manual.
- Perfil Supabase: `pedagogy_analytics_consent`, `consented_at`, `revoked_at` (migration `011`).
- Servidor: `submit_beta_pedagogy_event` exige consentimento no perfil autenticado; allowlist `conversation_*` alinhada ao app (migration `012`).
- Validador `validate:privacy-consent` no portão `validate:beta`.

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
