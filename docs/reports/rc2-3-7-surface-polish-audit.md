# RC2.3.7 — Surface Polish Audit

Derived from source by `scripts/generate-rc2-3-7-surface-audit.mjs` (machine-readable: [`rc2-3-7-surface-polish-audit.json`](rc2-3-7-surface-polish-audit.json)). 20 learner-facing surfaces.

| Surface | Route | Exit | Return anchor | Loading | Empty | Error | Completion | SFX calls (kinds) | Haptic (events) | First-use guidance | Reduced motion |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Jornada | `/jornada` | ✓ | ✓ | — | ✓ | — | ✓ | 2 (qiGain) | — | 14 | — |
| Lesson Player | `/licao/:id/player` | ✓ | ✓ | — | ✓ | ✓ | ✓ | 70 (blocked, lessonComplete, success, error, streak, step, phaseExit, chestReady, qiSpend, qiGain, pieceSelect, tap) | answerWrong, answerCorrect, lessonComplete | 0 | ✓ |
| Revisão | `/revisao` | ✓ | ✓ | — | ✓ | ✓ | ✓ | 3 (pieceSelect) | — | 1 | — |
| Praticar | `/treino` | ✓ | — | — | ✓ | ✓ | ✓ | 0 (—) | — | 4 | — |
| Seu Domínio | `/dominio` | — | — | — | ✓ | — | — | 0 (—) | — | 2 | — |
| Praticar o que preciso | `/revisao?sessao=dominio` | ✓ | ✓ | — | ✓ | ✓ | ✓ | 3 (pieceSelect) | — | 1 | — |
| Pinyin Lab | `/pinyin` | ✓ | — | — | ✓ | ✓ | ✓ | 2 (—) | — | 0 | — |
| Tons | `/som` | ✓ | — | — | ✓ | ✓ | ✓ | 3 (qiGain) | selection, piecePlaced | 2 | — |
| Fala | `/fala` | ✓ | — | ✓ | ✓ | ✓ | ✓ | 2 (qiGain) | — | 0 | — |
| Hànzì | `/hanzi` | ✓ | — | — | ✓ | ✓ | ✓ | 1 (streak) | answerCorrect, answerWrong, piecePlaced | 1 | — |
| Atlas | `/hanzi/atlas` | ✓ | — | — | ✓ | — | ✓ | 0 (—) | — | 1 | — |
| Ideogramas | `/ideogramas` | — | — | — | — | — | ✓ | 0 (—) | — | 0 | — |
| Culture Hub | `/cultura` | ✓ | — | — | ✓ | — | ✓ | 0 (—) | — | 1 | — |
| Culture Lesson | `/cultura/:id` | — | — | — | — | — | — | 0 (—) | — | 1 | — |
| Imersão | `/imersao` | ✓ | — | — | ✓ | ✓ | ✓ | 3 (qiGain) | — | 1 | — |
| Missões | `/missoes` | ✓ | — | — | ✓ | — | ✓ | 2 (chestReady) | — | 0 | — |
| Phase Challenge | `/teste/fase/:id` | ✓ | — | — | ✓ | ✓ | ✓ | 4 (blocked, spend) | — | 0 | — |
| Perfil | `/perfil` | ✓ | — | — | ✓ | — | ✓ | 0 (—) | — | 0 | — |
| Mais | `/mais` | — | — | — | — | — | ✓ | 0 (—) | — | 1 | — |
| Premium | `/pro` | ✓ | ✓ | — | ✓ | ✓ | — | 0 (—) | — | 0 | — |

## Reading

- **Exit**: hub pages (Seu Domínio, Ideogramas, Mais) use the shell back/tab bar; SmartBack now has a parent for `/dominio` (→ Revisão). Activity surfaces (lesson, review, practice, speech, Hànzì) expose their own exit.
- **Safe areas** are applied by the app shell (`AppShell`, `--app-safe-top/bottom`) and by focus activities (lesson player, victory, phase challenge); pages inherit them.
- **Sound** concentrates in the lesson player (results, completion, economy). Decorative `tap` on piece removal and on "Tentar de novo" removed (see sensory audit). Review/practice only use `pieceSelect` on selection.
- **Haptics** only in lesson results, Hànzì writing/builder, tone trace and settings preview; none on navigation, scroll or audio.
- **Loading**: lazy pages use the shared `waitForLazyPage` fallback; no engine text is ever shown ("Carregando…").
- **Empty states**: Seu Domínio "Continue praticando para vermos seu progresso." (UNKNOWN ≠ FAILURE); review/practice/missions have neutral empty copy.
