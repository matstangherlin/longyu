# Paid Beta — Real Device QA Contract (V4.6)

**Automação NÃO declara** “Android aprovado”, “iPhone aprovado” ou “physical QA passed”
sem evidência humana assinada neste documento.

Estados permitidos: `NOT_RUN` · `PASS` · `FAIL`

Commit / build sob teste: _(preencher na sessão humana)_  
Testador: _(nome)_ · Data: _(YYYY-MM-DD)_

---

## AUTOMATED EVIDENCE

Preenchido por CI / `validate:beta` / Playwright. Não substitui QA físico.

| Check | Status | Notes |
|-------|--------|-------|
| validate:beta | NOT_RUN | |
| build | NOT_RUN | |
| E2E Chromium | NOT_RUN | |
| E2E Firefox | NOT_RUN | |
| E2E WebKit | NOT_RUN | |
| Security (CodeQL / gitleaks / npm audit) | NOT_RUN | |
| test:transfer-target-integrity | NOT_RUN | |
| validate:transfer-target-integrity | NOT_RUN | |
| test:paid-beta-regression-sentinels | NOT_RUN | |
| test:qa-mode-isolation | NOT_RUN | |

---

## HUMAN DEVICE EVIDENCE

**Nunca preencher como PASS automaticamente.**  
Só `PASS`/`FAIL` após teste em aparelho real, com notes.

### Android Chrome

| Case | device | OS | browser | viewport ~ | build/commit | status | notes |
|------|--------|-----|---------|------------|--------------|--------|-------|
| Journey scroll | | | | | | NOT_RUN | |
| Abrir/fechar Lesson Player | | | | | | NOT_RUN | |
| Hànzì Builder | | | | | | NOT_RUN | |
| Atividade com teclado | | | | | | NOT_RUN | |
| transfer_task L15 | | | | | | NOT_RUN | |
| Review | | | | | | NOT_RUN | |
| Áudio | | | | | | NOT_RUN | |
| Imagens | | | | | | NOT_RUN | |
| Missões | | | | | | NOT_RUN | |
| Rotação portrait/landscape | | | | | | NOT_RUN | |

### iPhone Safari

| Case | device | OS | browser | viewport ~ | build/commit | status | notes |
|------|--------|-----|---------|------------|--------------|--------|-------|
| Journey scroll | | | | | | NOT_RUN | |
| Abrir/fechar Lesson Player | | | | | | NOT_RUN | |
| Hànzì Builder | | | | | | NOT_RUN | |
| Atividade com teclado | | | | | | NOT_RUN | |
| transfer_task L15 | | | | | | NOT_RUN | |
| Review | | | | | | NOT_RUN | |
| Áudio / autoplay fallback | | | | | | NOT_RUN | |
| Imagens | | | | | | NOT_RUN | |
| Missões | | | | | | NOT_RUN | |
| Safe-area | | | | | | NOT_RUN | |
| Sticky CTA | | | | | | NOT_RUN | |

### Desktop Chrome

| Case | device | OS | browser | viewport ~ | build/commit | status | notes |
|------|--------|-----|---------|------------|--------------|--------|-------|
| Journey | | | | | | NOT_RUN | |
| Lesson Player | | | | | | NOT_RUN | |
| Review | | | | | | NOT_RUN | |
| Pro | | | | | | NOT_RUN | |
| Business page | | | | | | NOT_RUN | |
| Missões | | | | | | NOT_RUN | |

### Fast path

Usar `/qa` (DEV/preview only) para percorrer fixtures críticas em minutos,
sem mutar progresso/economia/SRS. Ver `src/lib/qaSession.ts`.
