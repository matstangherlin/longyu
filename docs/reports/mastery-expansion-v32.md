# Mastery Expansion V3.2 + Survival Mandarin

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 35a9000032202c0e4cee20ff34bec1f2b8abc63b |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-13T23:51:04.636Z |
| Lições | 127 |
| Hash da Jornada | 2a47338adf21 |


Base: China Real V3.1. Expande Mastery para mais blocos da Jornada,
adiciona Survival Mandarin e onda 2 de cidades com funcao lexical propria.

## Cobertura Mastery: 16 / 127 licoes

- `l2` — Olá
- `l3` — Tudo bem?
- `l4` — Obrigado
- `l24` — Pai e mãe
- `l26b` — No cardápio
- `l27` — Na loja
- `p6-rotina-trabalho` — Rotina e trabalho
- `p6-cidade-lugares` — Cidade e lugares
- `p6-china-cidades` — Cidades da China
- `p6-china-cidades-2` — Mais cidades: Chengdu, Xi'an, Nanjing
- `p6-china-ruas` — Ruas e endereços
- `p6-horarios` — Que horas são?
- `p6-direcoes` — Direções
- `p6-compras` — Compras: roupas e itens
- `p6-survival-mandarin` — Survival: pagar, hotel, ajuda
- `p7-imersao-estacao` — Imersão: na estação

## Orcamento por pass (anti-fadiga)

- Pass 1: 6–9 passos graduados preferidos
- Pass 2: 6–9 passos graduados preferidos
- Pass 3: 7–10 passos graduados preferidos
- Pass 4: 7–10 passos graduados preferidos

## China Real onda 2

- **成都** — Chengdu; eixo food_sichuan; lexemas: 四川菜, 辣, 不辣
- **西安** — Xian; eixo history_tourism; lexemas: 古城, 这里很老
- **南京** — Nanjing; eixo history_tourism; lexemas: 南京路, 古城

## Survival Mandarin

### payment
- 现金 — dinheiro vivo
- 微信支付 — WeChat Pay
- 支付宝 — Alipay
- 可以刷卡吗？ — Posso pagar com cartao?

### phone
- 手机 — celular
- 充电 — carregar (bateria)
- 充电器 — carregador
- Wi-Fi — Wi-Fi

### hotel
- 护照 — passaporte
- 房间 — quarto
- 房卡 — cartao do quarto
- 前台 — recepcao

### needs
- 洗手间在哪里？ — Onde fica o banheiro?
- 我需要帮助 — Preciso de ajuda
- 医院在哪里？ — Onde fica o hospital?

## Novos kinds de mundo real

- `sign_reading` — placas (出口/入口/地铁/医院)
- `menu_reading` — mini cardapio
- `price_task` — 28元
- `route_sequence` — 一直走 → 左转 → 地铁站
- `schedule_reading` — horario curto de trem

## Producao M4 com equivalentes

- Ex.: 我要水 ≈ 我要水 / 我要水。 / 我想喝水 / 我想喝水。

## Tamanho de planos (amostra)

### l4
- Pass 1: 11 passos · kinds: audio_to_action, contextual_choice, comprehend, image_choice, match_pairs, intro, listen_select, sentence_build, fill_blank
- Pass 2: 11 passos · kinds: contextual_choice, dialogue_completion, comprehend, image_choice, listen_select, sentence_build, fill_blank, match_pairs
- Pass 3: 12 passos · kinds: sentence_build, fill_blank, comprehend, image_choice, conversation_scene, listen_select, dialogue_choice, reverse_recall, sentence_transform
- Pass 4: 12 passos · kinds: conversation_scene, listen_select, dialogue_choice, comprehend, image_choice, sentence_build, fill_blank, tone_pair, reverse_recall

### p6-survival-mandarin
- Pass 1: 11 passos · kinds: sign_reading, contextual_choice, image_choice, comprehend, intro, sentence_build, fill_blank, dialogue_choice, spot_error, dictation
- Pass 2: 12 passos · kinds: contextual_choice, sign_reading, reverse_recall, image_choice, comprehend, sentence_build, fill_blank, spot_error, conversation_scene, dialogue_choice
- Pass 3: 13 passos · kinds: free_production, sentence_build, fill_blank, dictation, image_choice, comprehend, conversation_scene, contextual_choice, sign_reading, dialogue_completion
- Pass 4: 13 passos · kinds: conversation_scene, free_production, transfer_task, dialogue_choice, dictation, image_choice, comprehend, sentence_build, fill_blank, sign_reading, reverse_recall

### p6-china-cidades-2
- Pass 1: 11 passos · kinds: contextual_choice, place_label, image_choice, intro, sentence_build, fill_blank, dialogue_choice, conversation_scene
- Pass 2: 11 passos · kinds: city_context, contextual_choice, image_choice, sentence_build, fill_blank, conversation_scene, dialogue_choice, free_production
- Pass 3: 13 passos · kinds: free_production, conversation_repair, sentence_build, fill_blank, image_choice, conversation_scene, transfer_task, place_label, contextual_choice, reverse_recall
- Pass 4: 13 passos · kinds: conversation_scene, free_production, transfer_task, conversation_repair, dialogue_choice, image_choice, sentence_build, fill_blank, city_context, reverse_recall, menu_reading

### p6-china-cidades
- Pass 1: 11 passos · kinds: contextual_choice, place_label, comprehend, image_choice, intro, odd_one_out, sentence_build, fill_blank, dialogue_choice, spot_error
- Pass 2: 11 passos · kinds: city_context, contextual_choice, odd_one_out, comprehend, image_choice, sentence_build, fill_blank, spot_error, conversation_scene, dialogue_choice
- Pass 3: 12 passos · kinds: free_production, conversation_repair, sentence_build, fill_blank, odd_one_out, comprehend, image_choice, conversation_scene, reverse_recall, sentence_transform
- Pass 4: 12 passos · kinds: conversation_scene, free_production, transfer_task, conversation_repair, dialogue_choice, odd_one_out, comprehend, image_choice, sentence_build, city_context, reverse_recall

<!-- integridade:1b1e71c7172a236e -->
