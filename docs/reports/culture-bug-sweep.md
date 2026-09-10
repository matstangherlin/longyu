# Culture bug sweep — V4.9.8A.1

Varredura do Hub, Jornada, player e progresso depois de migrar Cultura para lições nativas.

## BLOCKER

Nenhum. `/cultura/:id` válido abre o `LessonPlayer`. Id inválido mostra `culture-missing` sem crash. Nós `CULTURE_LESSON` não entram em `ALL_LESSONS`, então o ponteiro da Jornada não relocka.

## HIGH

Nenhum após o corte da injeção `setCultureBridgeOpen(true)`. Completar a lição nativa sincroniza Hub (`cultureCompletedIds`) e Jornada (`completedLessons`) via persist v24. Finish cultural não alimenta SRS lexical.

## MEDIUM

| Item | Notas |
|------|--------|
| `CultureMissionPlayer.tsx` ainda no tree | Não é mais o renderer do Hub. Catálogo de missões continua para revisão/legado. Remoção fica para uma limpeza posterior, não desta remessa. |
| Bridges de catálogo | `CULTURE_JOURNEY_BRIDGES` existe; `cultureBridgeForLesson()` retorna `undefined`. Overlay mid-lesson não volta. |
| Vitória de aula de mandarim ainda pode mostrar touchpoint | Só quando `lessonDomain !== "culture"`. Atalho válido para a lição nativa. |

## LOW

| Item | Notas |
|------|--------|
| Revisão de sequência | `CultureReviewPage` usa `StepRenderer` para escolha; `sequence` legado permanece como fallback. |
| `phaseTier: "avancado"` nas flats culturais | Só metadado de `getLesson`; as flats não estão em `ALL_LESSONS`. |
| Estrelas fake ☆☆☆ | Vitória cultural reusa `lessonStars` + `hadMistakes`. Não há overlay de 3★ no Hub sem conclusão. |

## Correções feitas neste sweep

- Touchpoint de cultura **não** aparece na vitória de uma lição cultural (evita atalho para a mesma aula).
- Banner `culture-seen-on-journey` quando o conceito já foi praticado na Jornada (pula `intro`).
- Overlay EN para o par `888` em `four-and-eight`.
- `TOPIC_INCOMPLETE` tem copy no bloqueio de deep link.
- Vitória com `src=jornada` volta à Jornada; `from=/licao/…` no touchpoint devolve à aula de mandarim.
- Abrir o player de uma aula de mandarim **não** marca o CultureItem como `in_progress` (`startCultureItem` só no domínio cultura).
- Erro numa lição cultural **não** abre a revisão imediata lexical nem despeja na Jornada; a vitória cultural permanece.
