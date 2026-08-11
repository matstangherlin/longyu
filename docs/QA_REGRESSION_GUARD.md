# Guarda de regressão QA

Protege correções dos bugs encontrados no QA humano (transferência, produção livre, B002 revisão/estrela, sentence build e player mobile).

## Como rodar

```bash
npm run test:qa-regression-guard          # lógica + contratos de source
npx playwright test e2e/qa-regression-guard.spec.ts --project=mobile-chrome
```

Incluído em `validate:beta` via `test:qa-regression-guard`.

## O que está protegido

| # | Regressão | Onde |
|---|-----------|------|
| 1 | Transferência sem estrutura / situação / input | `test:qa-regression-guard` + e2e transfer |
| 2 | Revisão pós-erro usa só o item correto | remediação unitária + e2e review |
| 3 | Pinyin e hanzi da revisão desalinhados | remediação (answerPinyin ↔ answer) |
| 4 | “Correto” vem de outro item | answer/display sem `/` e coerentes |
| 5 | Dump concatenado `你好 / 你好吗 / …` no prompt | `isConcatenatedDump` + source guard no `LessonPlayer` |
| 6 | Status (“Pulou…”) como alternativa | `isNonOptionAnswer` + e2e opções |
| 7 | Recuperação de estrela quebrada | `activityErrorFromMistake` → pending → e2e offer→correct |
| 8 | Sentence build de revisão sem peças certas | kind `build` + e2e peças |
| 9 | CTA inacessível no mobile | sticky actions no viewport |
| 10 | Player desalinhado ao avançar steps | frame fixed + scroll reset |

## Critério “falha no bug / passa na correção”

No estado bugado (ex.: `errorHanziForStep` com `lines.map(...).join(" / ")`), o script falha no source guard e nos asserts de dump. Com as correções de revisão/produção/assembly, passa.

## Relação com outros testes

- `test:immediate-remediation` / `test:review-ux` / `test:assembly-ux` — focos mais estreitos.
- `e2e/review-remediation.spec.ts` / `e2e/lesson-player-viewport.spec.ts` — coberturas irmãs; esta suíte une os fluxos QA num único contrato.
