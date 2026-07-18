# Changelog

Todas as mudanças notáveis do Longyu são documentadas aqui.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [SemVer](https://semver.org/lang/pt-BR/) com sufixo pré-release (`-beta.N`).

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

### Mantido

- Todas as funcionalidades pedagógicas atuais (lições, Hànzì Builder, imagens reais, conversation_scene V2, revisão, feedback, sync).
- Feedback beta com Supabase e painel admin.

## [0.1.0] — anterior

Beta privada / desenvolvimento interno.
