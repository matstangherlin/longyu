# Changelog

Todas as mudanças notáveis do Longyu são documentadas aqui.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [SemVer](https://semver.org/lang/pt-BR/) com sufixo pré-release (`-beta.N`).

## [Não lançado]

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
