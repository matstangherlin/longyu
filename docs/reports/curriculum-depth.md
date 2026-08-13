# Curriculum depth — piloto Pedagogia V3

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 31391f1ace978c314fad736d9b5bb111831d9601 |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-13T23:05:22.734Z |
| Lições | 123 |
| Hash da Jornada | 097e4a23fa3e |

Mastery Loop ≠ SRS. Mastery = aquisição inicial em 4 passes; SRS = retenção depois.

## l2 — Olá

- Tema: Cumprimentos — Ola
- Funções: cumprimentar; iniciar contato
- Estruturas: 你好; 你好 + nome; cumprimento situacional
- Meta lexical nova: 5
- Meta produtiva: 3

### Pass 1 — Descoberta
- Tipos: audio_to_action, contextual_choice, image_choice, comprehend, match_pairs, intro, listen_select, hanzi_build, fill_blank, sentence_build, dialogue_choice, tone_pair, produce, conversation_scene
- Scaffold removido: Português + pinyin + imagem
- Produção exigida: produce, conversation_scene
- Expansão semântica: score 9 (lexemas novos 3, chunks 1, combinações 1)
- Reaproveitado em rede: 你好

### Pass 2 — Consolidação
- Tipos: dialogue_completion, contextual_choice, image_choice, comprehend, listen_select, fill_blank, sentence_build, match_pairs, produce, hanzi_build, conversation_scene, dialogue_choice, tone_pair
- Scaffold removido: PT limitado + pinyin sob demanda
- Produção exigida: dialogue_completion, produce, conversation_scene
- Expansão semântica: score 8.6 (lexemas novos 1, chunks 0, combinações 2)
- Reaproveitado em rede: 你好 → 你好，我叫...

### Pass 3 — Produção
- Tipos: produce, hanzi_build, fill_blank, sentence_build, image_choice, comprehend, conversation_scene, listen_select, dialogue_choice, tone_pair, match_pairs, sentence_transform, reverse_recall
- Scaffold removido: Hànzì/áudio primeiro; tradução depois
- Produção exigida: produce, conversation_scene, sentence_transform, reverse_recall
- Expansão semântica: score 14 (lexemas novos 2, chunks 1, combinações 3)
- Reaproveitado em rede: 你好 → 你好，我叫... → cumprimento em encontro

### Pass 4 — Domínio
- Tipos: conversation_scene, listen_select, dialogue_choice, image_choice, comprehend, produce, hanzi_build, fill_blank, sentence_build, tone_pair, match_pairs, reverse_recall, dialogue_completion
- Scaffold removido: Sem tradução antecipada
- Produção exigida: conversation_scene, produce, reverse_recall, dialogue_completion
- Expansão semântica: score 10.1 (lexemas novos 0, chunks 0, combinações 3)
- Reaproveitado em rede: 你好 → 你好，我叫... → cumprimento em encontro

## l3 — Tudo bem?

- Tema: Cumprimentos — Tudo bem?
- Funções: perguntar estado; responder; devolver pergunta
- Estruturas: 你好吗？; 我很好; 你呢？
- Meta lexical nova: 6
- Meta produtiva: 4

### Pass 1 — Descoberta
- Tipos: contextual_choice, comprehend, image_choice, listen, listen_select, dialogue_choice, sentence_build, fill_blank, hanzi_build, produce, conversation_scene
- Scaffold removido: Português + pinyin + imagem
- Produção exigida: produce, conversation_scene
- Expansão semântica: score 9.1 (lexemas novos 2, chunks 2, combinações 1)
- Reaproveitado em rede: 你好吗？

### Pass 2 — Consolidação
- Tipos: substitution_drill, dialogue_completion, comprehend, image_choice, listen_select, sentence_build, fill_blank, listen, dialogue_choice, produce, conversation_scene, hanzi_build
- Scaffold removido: PT limitado + pinyin sob demanda
- Produção exigida: dialogue_completion, produce, conversation_scene
- Expansão semântica: score 12.7 (lexemas novos 3, chunks 1, combinações 2)
- Reaproveitado em rede: 你好吗？ → 我很好，你呢？

### Pass 3 — Produção
- Tipos: produce, sentence_build, fill_blank, hanzi_build, comprehend, image_choice, conversation_scene, listen, listen_select, dialogue_choice, reverse_recall
- Scaffold removido: Hànzì/áudio primeiro; tradução depois
- Produção exigida: produce, conversation_scene, reverse_recall, reverse_recall
- Expansão semântica: score 12.3 (lexemas novos 1, chunks 0, combinações 3)
- Reaproveitado em rede: 你好吗？ → 我很好，你呢？ → mini dialogo de bem-estar

### Pass 4 — Domínio
- Tipos: conversation_scene, listen_select, dialogue_choice, comprehend, image_choice, produce, listen, sentence_build, fill_blank, hanzi_build, dialogue_completion, reverse_recall
- Scaffold removido: Sem tradução antecipada
- Produção exigida: conversation_scene, produce, dialogue_completion, reverse_recall
- Expansão semântica: score 11.1 (lexemas novos 0, chunks 0, combinações 3)
- Reaproveitado em rede: 你好吗？ → 我很好，你呢？ → mini dialogo de bem-estar

## l26b — No cardápio

- Tema: Restaurante / cardapio
- Funções: pedir comida; pedir bebida; perguntar preco; pedir a conta
- Estruturas: 我要 + comida; 我想喝 + bebida; 多少钱; 买单
- Meta lexical nova: 12
- Meta produtiva: 6

### Pass 1 — Descoberta
- Tipos: contextual_choice, audio_to_action, image_choice, compare_with_image, intro, sentence_build, fill_blank, hanzi_build, conversation_scene
- Scaffold removido: Português + pinyin + imagem
- Produção exigida: conversation_scene
- Expansão semântica: score 8.8 (lexemas novos 4, chunks 0, combinações 1)
- Reaproveitado em rede: 我要水

### Pass 2 — Consolidação
- Tipos: contextual_choice, substitution_drill, image_choice, compare_with_image, sentence_build, fill_blank, conversation_scene, free_production, hanzi_build, transfer_task
- Scaffold removido: PT limitado + pinyin sob demanda
- Produção exigida: conversation_scene, free_production, free_production, transfer_task, free_production
- Expansão semântica: score 17.2 (lexemas novos 5, chunks 2, combinações 2)
- Reaproveitado em rede: 我要水 → 我想喝水

### Pass 3 — Produção
- Tipos: free_production, sentence_build, fill_blank, hanzi_build, image_choice, compare_with_image, conversation_scene, transfer_task, sentence_transform, reverse_recall
- Scaffold removido: Hànzì/áudio primeiro; tradução depois
- Produção exigida: free_production, free_production, free_production, conversation_scene, transfer_task, sentence_transform, reverse_recall
- Expansão semântica: score 23 (lexemas novos 4, chunks 4, combinações 3)
- Reaproveitado em rede: 我要水 → 我想喝水 → 你要苹果还是香蕉？

### Pass 4 — Domínio
- Tipos: conversation_scene, free_production, transfer_task, image_choice, compare_with_image, sentence_build, fill_blank, hanzi_build, contextual_choice, reverse_recall
- Scaffold removido: Sem tradução antecipada
- Produção exigida: conversation_scene, free_production, free_production, transfer_task, free_production, reverse_recall, reverse_recall
- Expansão semântica: score 18.4 (lexemas novos 1, chunks 1, combinações 4)
- Reaproveitado em rede: 我要水 → 我想喝水 → 你要苹果还是香蕉？ → pedir a conta

## p6-cidade-lugares — Cidade e lugares

- Tema: Cidade e lugares
- Funções: perguntar localizacao; dizer destino
- Estruturas: X 在哪里？; 我去 + lugar
- Meta lexical nova: 10
- Meta produtiva: 5

### Pass 1 — Descoberta
- Tipos: contextual_choice, audio_to_action, image_choice, compare_with_image, comprehend, intro, fill_blank, sentence_build, dialogue_choice, dictation, hanzi_build, conversation_scene
- Scaffold removido: Português + pinyin + imagem
- Produção exigida: conversation_scene
- Expansão semântica: score 12 (lexemas novos 3, chunks 3, combinações 1)
- Reaproveitado em rede: 超市在哪里？

### Pass 2 — Consolidação
- Tipos: substitution_drill, image_choice, compare_with_image, comprehend, fill_blank, sentence_build, conversation_scene, dialogue_choice, dictation, free_production, transfer_task, hanzi_build
- Scaffold removido: PT limitado + pinyin sob demanda
- Produção exigida: conversation_scene, free_production, transfer_task
- Expansão semântica: score 13 (lexemas novos 2, chunks 2, combinações 2)
- Reaproveitado em rede: 超市在哪里？ → 我去超市

### Pass 3 — Produção
- Tipos: free_production, fill_blank, sentence_build, dictation, hanzi_build, image_choice, compare_with_image, comprehend, conversation_scene, transfer_task, dialogue_choice, reverse_recall, sentence_transform
- Scaffold removido: Hànzì/áudio primeiro; tradução depois
- Produção exigida: free_production, conversation_scene, transfer_task, reverse_recall, sentence_transform
- Expansão semântica: score 14.6 (lexemas novos 2, chunks 2, combinações 3)
- Reaproveitado em rede: 超市在哪里？ → 我去超市 → pedir direcao + destino

### Pass 4 — Domínio
- Tipos: conversation_scene, free_production, transfer_task, dialogue_choice, dictation, image_choice, compare_with_image, comprehend, fill_blank, sentence_build, hanzi_build, reverse_recall, dialogue_completion
- Scaffold removido: Sem tradução antecipada
- Produção exigida: conversation_scene, free_production, transfer_task, reverse_recall, dialogue_completion
- Expansão semântica: score 9.2 (lexemas novos 0, chunks 0, combinações 3)
- Reaproveitado em rede: 超市在哪里？ → 我去超市 → pedir direcao + destino

## p7-imersao-estacao — Imersão: na estação

- Tema: Estacao / transporte
- Funções: comprar bilhete; perguntar preco; achar hotel/estacao
- Estruturas: 车/票; 票多少钱; 地铁/火车; 酒店在哪里？
- Meta lexical nova: 10
- Meta produtiva: 5

### Pass 1 — Descoberta
- Tipos: contextual_choice, audio_to_action, image_choice, compare_with_image, comprehend, intro, odd_one_out, sentence_build, hanzi_build, audio_discrimination, fill_blank, dialogue_choice, dictation, conversation_scene
- Scaffold removido: Português + pinyin + imagem
- Produção exigida: conversation_scene
- Expansão semântica: score 9 (lexemas novos 3, chunks 1, combinações 1)
- Reaproveitado em rede: 我要票

### Pass 2 — Consolidação
- Tipos: contextual_choice, substitution_drill, image_choice, compare_with_image, comprehend, odd_one_out, sentence_build, audio_discrimination, fill_blank, hanzi_build, conversation_scene, dialogue_choice, conversation_repair, dictation, free_production, transfer_task
- Scaffold removido: PT limitado + pinyin sob demanda
- Produção exigida: conversation_scene, conversation_repair, free_production, transfer_task, free_production
- Expansão semântica: score 21.5 (lexemas novos 5, chunks 5, combinações 2)
- Reaproveitado em rede: 我要票 → 票多少钱？

### Pass 3 — Produção
- Tipos: conversation_repair, free_production, sentence_build, hanzi_build, fill_blank, dictation, image_choice, compare_with_image, comprehend, odd_one_out, conversation_scene, transfer_task, audio_discrimination, dialogue_choice, reverse_recall, sentence_transform
- Scaffold removido: Hànzì/áudio primeiro; tradução depois
- Produção exigida: conversation_repair, free_production, free_production, conversation_scene, transfer_task, reverse_recall, sentence_transform
- Expansão semântica: score 14.3 (lexemas novos 1, chunks 1, combinações 3)
- Reaproveitado em rede: 我要票 → 票多少钱？ → cena de compra na estacao

### Pass 4 — Domínio
- Tipos: conversation_scene, conversation_repair, free_production, transfer_task, dialogue_choice, dictation, image_choice, compare_with_image, comprehend, odd_one_out, sentence_build, hanzi_build, audio_discrimination, fill_blank, reverse_recall, dialogue_completion
- Scaffold removido: Sem tradução antecipada
- Produção exigida: conversation_scene, conversation_repair, free_production, transfer_task, free_production, reverse_recall, dialogue_completion
- Expansão semântica: score 12.7 (lexemas novos 0, chunks 0, combinações 3)
- Reaproveitado em rede: 我要票 → 票多少钱？ → cena de compra na estacao

<!-- integridade:b302c959e4a17cff -->
