# PRs da rodada B001/B002 — status pós-#148 / #158

**Main de referência:** `5636e48` (merge #158 — remessa aparelho + tip atual)

Auditoria em 2026-08-12: comparação `git log origin/main..origin/<branch>` e diff dos arquivos sensíveis (`LessonPlayer`, `immediateRemediation`, `PieceAssembly`, `buildAssemblyFeedback`, `steps`, guards QA/viewport).

> **Não fazer merge cego** das PRs #143/#145/#146/#147 — reintroduziriam versões antigas do player, revisão e guards.

---

## Pode encerrar com segurança (superseded)

### #147 — `cursor/qa-regression-guard-3856`
- **Veredito:** **100% incorporado** via #144 + #148.
- **Ação:** fechar como *Superseded by #148*.

### #143 — `cursor/production-transfer-ux-3856`
- **Risco de merge:** reverte `LessonPlayer`, `immediateRemediation`, `reviewCopy`, guards e `PieceAssembly`.
- **Ação:** fechar como *Superseded by #148*.

### #145 — `cursor/sentence-build-assembly-ux-3856`
- **Main já tem:** `PieceAssembly.tsx`, `buildAssemblyFeedback.ts`, `test:assembly-ux`.
- **Ação:** fechar como *Superseded by #148*.

### #146 — `cursor/lesson-player-ux-hardening-3856`
- **Risco de merge:** reverte o pacote #148.
- **Ação:** fechar como *Superseded by #149* (mergear só o extrato #149 — já na main via #157).

### Ondas antigas (conflitantes / já absorvidas)
Fechar se ainda abertas: **#24, #22, #21, #20, #19, #18, #11, #10, #9, #8, #7, #5, #4**.

---

## Já merged (não reabrir)

| PR | Papel |
|----|-------|
| #148 | Consolidação produção/revisão/transfer |
| #149 | Extrato UX hardening (via #157) |
| #152 | E2E mobile B001 (via #157) |
| #156 | Scaffold / prerequisite progression |
| #157 | Merge UX + mobile E2E |
| #158 | Remessa aparelho B003/B004/B001/PED-005/VIS |

---

## Comandos de verificação

```bash
git log origin/main..origin/cursor/<branch> --oneline
git diff origin/main origin/cursor/<branch> -- \
  src/features/lesson/LessonPlayer.tsx
```
