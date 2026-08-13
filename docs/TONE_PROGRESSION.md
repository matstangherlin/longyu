# Progressão de tons (PED-005)

Atualizado com a remessa de bugs de aparelho (pós `#158`/`#159`). Tip: `npm run beta:rc-status`.

## Escada

1. **2 tons contrastantes** (ex.: 1º × 3º) — só ouvir e escolher entre duas curvas  
2. **4 contornos** — opções completas, ainda com ajuda  
3. **Pinyin com tom** — marcas diacríticas entram na explicação  
4. **Palavra conhecida** — hànzì já visto + tom  
5. **Mistura** — palavra + significado + tom juntos (só depois dos degraus)

## Regras de UI (`StepTone`)

- `toneChoices` opcional no `LessonStep` limita as opções (ex.: `[1, 3]`)  
- No modo `guided`, o significado fica oculto até erro ou dica  
- Após o primeiro erro: comparação visual dos contornos + “Ouvir devagar”  
- `p1-o-que-e-tom` começa com contraste 1×3 antes da família completa

## O que evitar no início

Não testar ao mesmo tempo: áudio novo + vocabulário novo + pinyin com tom + significado.

## Validador

`npm run validate:tone-progression` (também no `validate:beta`) trava regressões que coloquem quiz/mistura ou 4 tons antes do contraste binário.
