# Changelog — Longyu Beta

Convenção de versão:
- `0.1.x` — correções e patches do beta
- `0.x.0` — recurso novo do beta
- `1.0.0` — lançamento estável

## 0.2.0 — 2026-07-10

### Adicionado
- Metadados de build (`VITE_APP_VERSION`, `VITE_COMMIT_SHA`, `VITE_BUILD_TIME`, `VITE_RELEASE_CHANNEL`)
- Exibição discreta da versão em Sobre, Ajuda, feedback e tela de erro
- Modal “Novidades” ao detectar nova versão
- Atualização PWA com espera segura (lição, checkout, sync, recompensa)
- Script `npm run release:check` para validar releases

### Melhorado
- Deploy rastreável com SHA e horário de build
- Headers Netlify: `index.html` sem cache incorreto; assets com hash em cache longo

### Corrigido
- Risco de usuários presos em bundle antigo após deploy

### Conhecido
- Atualização PWA depende do service worker instalado (HTTPS/PWA)

## 0.1.0 — 2026-07-01

### Adicionado
- Beta privado com jornada, lições, revisão e progresso local

### Conhecido
- Assinatura Pro em validação com Stripe
