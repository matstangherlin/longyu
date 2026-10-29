# SRS — o que mudou no prompt 21 (LGY-015, LGY-027 · R1, R3, R4 · R-18)

Branch `claude/qa-21-srs-evidencia`, empilhada no PR do prompt 20. O algoritmo continua o mesmo (SM-2 com passos de aprendizado). FSRS não entrou.

## Regras: antes × depois

| Regra | Antes | Depois |
|---|---|---|
| O que a lição gradua (`finish()`) | Todo item **exibido** levava `good`, inclusive intro, flashcard e escuta. Só depois o errado virava `again`. | Cada item fica com a **melhor evidência** da lição. Exibido sem resposta: só entra em aprendizado (`ensureSrs`, sem nota). Acerto sem ajuda: `good`. Acerto com ajuda (pediu ajuda ou retry): `hard`. Erro: só `again` (não leva `good` antes). |
| Passes no mesmo dia | Os 4 passes de domínio empilhavam promoções: 1 h → 1 d → ≈2,6 d → ≈6,6 d sem recordação espaçada. | Uma promoção por item por dia vinda da lição (`lastPromotedDay`, dia local). A revisão continua com os passos intra-dia (10 min, 1 h) como antes. |
| Intervalo máximo | Nenhum. | `MAX_INTERVAL_DAYS = 365`. |
| Ease | Sem teto (`easy` +0,18 a cada vez). | `MAX_EASE = 2,8`. Piso igual (1,25 no `again`, 1,3 no `hard`/`good`). |
| Lapso | `again` zerava o intervalo. Ao reaprender, voltava a 1 dia. | `again` guarda o intervalo anterior (`lapseIntervalDays`). Ao graduar de novo: `max(1 dia, intervaloAnterior × 0,5)`, com o teto de 365 d. |
| Leech | O campo `lapses` existia e não era usado. | 8 lapsos → `leech: true`. O item sai da fila normal (`dueItems` e itens fracos) e aparece em **Palavras difíceis** na /revisao. A remediação mostra hànzì, pinyin, sentido e dica, e depois testa sem a dica. Dois acertos seguidos tiram do leech. |
| Etapa avaliada sem alvo | 289 de 5.451 etapas avaliadas (5,3%) não geravam alvo ao errar. | 103 de 5.451 (1,9%). Ver a tabela abaixo. |

Migração: os campos novos são opcionais. Item salvo antes desta versão continua válido, com o mesmo `due` e o mesmo intervalo. Nada é rebaixado ao carregar. Os tetos entram na próxima revisão do item. Um item antigo com 9 lapsos só vira leech no próximo `again`. O `test:srs-evidence` cobre isso.

## Números (cenários do passo 1)

`node scripts/test-srs-evidence.mjs` passa nesta branch. Na cabeça do PR do prompt 20 (sem estas mudanças), o mesmo teste falha logo no primeiro cenário, porque `lessonEvidenceGrade` não existe.

Medido com a regra antiga (`srs.ts` da base):

| Cenário | Antes | Depois |
|---|---|---|
| (b) 4 passes no mesmo dia, todos certos | intervalo 6,6 dias (4 promoções) | 1 promoção, item no passo de 1 h |
| (d) 10 `good` seguidos a partir de 5 dias | 73.158 dias | ≤ 365 dias |
| (e) 20 `easy` seguidos | ease 6,1 | ease ≤ 2,8 |
| (f) 8 lapsos | sem marcação | `leech: true`, fora da fila normal |

## Alvos de revisão (R4)

Auditoria das etapas avaliadas em todos os passes das 134 lições (`isEvaluableQuestionStep`):

| Tipo | Sem alvo antes | Sem alvo depois | Por quê sobra |
|---|---|---|---|
| `dialogue_choice` | 59 | 55 | resposta é conceito em português (aulas "O que é…" da fase 1) |
| `conversation_scene` | 59 | 0 | agora usa `newRefs`/`learnedRefs` da cena |
| `audio_to_action` | 41 | 0 | tipo não tinha regra |
| `match_pairs` | 28 | 28 | pares em português/pinyin, sem hànzì |
| `listen_select` | 28 | 0 | item fora do "ensinado": vale o item que a etapa testou |
| `image_choice` | 25 | 8 | palavra fora do catálogo (ex.: 银行, 公园) |
| `substitution_drill` | 19 | 0 | tipo não tinha regra |
| `translation_build` | 6 | 0 | resposta em português: usa as partes em hànzì |
| outros 11 tipos (`price_task`, `sign_reading`, `map_direction`, `produce`, `fill_blank`, `conversation_repair`, `place_label`, `contextual_choice`, `transfer_task`, `compare_with_image`, `city_context`) | 24 | 12 | preço em 元, lugar fora do catálogo, direção/rótulo em português |

`audio_discrimination`, citado no relatório com 91%, já gerava alvo em todas as etapas nesta base (pares via `pairReveal`). O teste fixa isso: um erro agenda os dois itens do contraste.

O que sobra não tem item no catálogo (`ItemType` só aceita `char`, `chunk` e `radical`). Resolver exige item novo de currículo, que está congelado.

`lint:content` CL007 (etapa com mandarim e sem alvo): linha de base **46 → 6**. As 6 são `18元`, `50元`, `38元`, `公园`, `银行` (duas vezes). Linha de base total: 62 → 22 entradas.

## Métricas

Evento novo `srs_summary`, só com contagens e respeitando o opt-in de telemetria:

- fim da lição: `source: "lesson"`, `promoted`, `assisted`, `exposed`, `lapses`, `leeches`;
- fim da revisão: `source: "review"` ou `"leech_review"`, `reviewed`, `promoted`, `lapses`, `leeches`.

O servidor só grava tipos do allowlist. O SQL está em `supabase/pending/qa-21-srs-telemetry.sql` (rollback em `.down.sql`) e **não foi aplicado**. Até lá o servidor responde `invalid_event_type` e o cliente descarta o evento em silêncio.

Leitura só de leitura em produção (28/10/2026): `submit_beta_pedagogy_event` ainda não aceita `mastery_pass_started`/`mastery_pass_completed`. Ou seja, `20260814010000_mastery_pass_telemetry.sql` também não está em produção. O arquivo pendente parte dessa migration e a inclui. Conferir no ledger antes de aplicar.

## Fora de escopo (registrado)

- N3: `accuracy >= 0.7` marca significado, forma e fala de uma vez. Não mudou.
- FSRS com retenção 0,90: experimento, não nesta fase.
- Item de catálogo para palavras de lugar e preço: conteúdo novo, depois da beta fechada.
