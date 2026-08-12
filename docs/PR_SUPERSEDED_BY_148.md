# PRs da rodada B001/B002 — status pós-#148

**Main de referência:** `3622885` (merge #148 — produção, transferência e revisão mais amigáveis)

Auditoria em 2026-08-12: comparação `git log origin/main..origin/<branch>` e diff dos arquivos sensíveis (`LessonPlayer`, `immediateRemediation`, `PieceAssembly`, `buildAssemblyFeedback`, `steps`, guards QA/viewport).

> **Não fazer merge cego** das PRs #143/#145/#146/#147 — reintroduziriam versões antigas do player, revisão e guards.

---

## Pode encerrar com segurança (superseded by #148)

### #147 — `cursor/qa-regression-guard-3856`
- **Commits únicos vs main:** nenhum (`git log origin/main..branch` vazio).
- **Conteúdo:** `e2e/qa-regression-guard.spec.ts`, `scripts/test-qa-regression-guard.mjs`, estabilização estrela/build/transfer.
- **Veredito:** **100% incorporado** via #144 (fix-star) + #148. Base era `fix-star-review-coherence` (já merged).
- **Ação:** fechar como *Superseded by #148*.

### #143 — `cursor/production-transfer-ux-3856`
- **Commits únicos vs main:** 3 (`914df07`, `bd9b07a`, `aad381f`).
- **Overlap:** B002 dump, produção/transferência guiada, `COMMUNICATIVE_GOAL_LABELS`, `test:production-ux`.
- **Main já tem:** layout `data-production-*`, `goalHint`, `FRAME_INTRO_EASE`, `test:immediate-remediation` ampliado, `validate:production-transfer`, E2E transfer em `qa-regression-guard.spec.ts`, `docs/PRODUCTION_REVIEW_FRIENDLINESS.md`.
- **Risco de merge:** reverte `LessonPlayer`, `immediateRemediation`, `reviewCopy`, guards e `PieceAssembly` (~670 linhas só no player).
- **Delta útil restante:** nenhum — abordagem de labels/goals da #143 foi substituída pela de #148.
- **Ação:** fechar como *Superseded by #148*.

### #145 — `cursor/sentence-build-assembly-ux-3856`
- **Commits únicos vs main:** 1 (`b3a9fa9`).
- **Main já tem:** `PieceAssembly.tsx`, `buildAssemblyFeedback.ts`, `test:assembly-ux`, montagem na revisão (#144 + #148).
- **Risco de merge:** apagaria `buildAssemblyFeedback.ts` e `PieceAssembly.tsx` da main.
- **Ação:** fechar como *Superseded by #148* (montagem já na main).

### #146 — `cursor/lesson-player-ux-hardening-3856`
- **Commits únicos vs main:** 1 (`d1febf8`) — copy curta, modal, tom, fala.
- **Main:** ainda usa copy longa (`Continuar e perder perfeição`, instrução tonal longa, etc.).
- **Risco de merge:** reverte todo o pacote #148 (~2857 linhas removidas vs main).
- **Ação:** fechar como *Superseded by #149* (não mergear a branch inteira).

### #142 — `cursor/fix-review-corruption-3856`
- **Estado:** já **CLOSED**.
- **Veredito:** B002 coberto em main (#144 + #148 + `test:immediate-remediation`).

### #144 — `cursor/fix-star-review-coherence-3856`
- **Estado:** já **MERGED**.
- **Papel:** base da cadeia revisão/estrela; conteúdo absorvido por #148.

---

## Manter aberta — delta útil ainda não na main

### #149 — `cursor/integrate-player-ux-hardening-3856` ✅ extrair, não #146
- **Commits únicos vs main:** 3 (integração seletiva pós-#148 + fixes E2E).
- **Toca apenas:** copy em `LessonPlayer`/`steps`/`speech`/`PronunciationPractice`, `scripts/test-player-ux.mjs`, `test:speech`, `e2e/pedagogy.spec.ts`, `e2e/lesson-player-helpers.ts`.
- **Não toca:** `immediateRemediation`, `PieceAssembly`, `buildAssemblyFeedback`, `qa-regression-guard`.
- **Merge:** limpo (`merge-tree` sem conflitos).
- **Testes:** `npm run test:player-ux` passa na branch; falha 15 asserts na main atual.
- **Ação:** **merge recomendado** como PR pequena — é o extrato correto de #146.

---

## Outras PRs da rodada (fora do escopo #143–#147)

| PR | Papel | Status |
|----|-------|--------|
| #148 | Consolidação produção/revisão/transfer | **Merged** — referência |
| #150 | Docs beta pós-#148 | Aberta — complementar |
| #151 | Auditoria B002 pós-#148 | Aberta — complementar |
| #152 | E2E mobile B001 (proxy) | Aberta — complementar |

---

## Comandos de verificação

```bash
# Commits que a branch ainda tem e main não
git log origin/main..origin/cursor/<branch> --oneline

# Diff sensível (exemplo #143 — nunca mergear cego)
git diff origin/main origin/cursor/production-transfer-ux-3856 -- \
  src/features/lesson/LessonPlayer.tsx \
  src/features/lesson/immediateRemediation.ts \
  src/features/lesson/PieceAssembly.tsx

# #149 — único delta copy aprovado
git diff origin/main origin/cursor/integrate-player-ux-hardening-3856 --stat
npm run test:player-ux   # na branch #149
```

---

## Resumo executivo

| PR | Encerrar? | Motivo |
|----|-----------|--------|
| **#147** | ✅ Sim | Zero commits ahead of main |
| **#143** | ✅ Sim | #148 cobre UX + B002; merge regrediria player |
| **#145** | ✅ Sim | Montagem já na main |
| **#146** | ✅ Sim | Usar #149 em vez dela |
| **#149** | ❌ Não — mergear | Único extrato seguro de copy UX pós-#148 |
| **#142** | ✅ Já fechada | — |
| **#144** | ✅ Já merged | — |
