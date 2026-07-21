# Relatório de destravamento de cenas de conversa

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | f8135bd4b2bee243b622480bf2fc0cb1f6b05d89 |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-07-21T22:30:53.122Z |
| Lições | 110 |
| Hash da Jornada | 889271f39a22 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Cenas no catálogo | 38 |
| Cenas usadas (autoral ou gerada) | 38 |
| Cenas nunca usadas | 0 |
| Lições com cena gerada | 92 |
| Conversas geradas (total) | 92 |

A elegibilidade e a rotação abaixo saem de `analyzeConversationSceneCoverage`
(a mesma fonte usada pelo motor e por `validate:conversation-scenes`), então
espelham o que o aluno realmente encontra ao percorrer a jornada.

## Diagnóstico e correções

Partida: 33 cenas no catálogo, mas apenas ~18 apareciam em algum plano; ~15
ficavam eternamente sem uso. Causas identificadas e correções aplicadas:

1. **requiredRefs excessivos.** Cenas simples exigiam todas as frases de
   abertura/fechamento (请问, 谢谢, 不客气, 再见, 请再说一遍) antes de aparecer.
   → Separação `requiredRefs` (essencial) / `optionalRefs` (auxiliar) e
   variantes por estágio (ex.: `pedir-agua` iniciante = 你好 + 水).
2. **Cenas dedicadas vazando para a geração comum** (`de-onde-sou` dominava
   ~22 planos). → A geração comum exclui cenas `dedicatedLesson`/multi-novidade.
3. **Uma única cena dominando a rotação.** → Penalidade de recência graduada
   (janela ampla de 10 cenas), medida com rotação encadeada como um aluno real.
4. **Papéis sem lição de destino.** Cenas `module_review` e `immersion` nunca
   eram inseridas. → Inserções autorais em revisões de módulo e uma unidade
   dedicada de **Imersão** (mercado, estação, casa de amigo).
5. **requiredRef nunca ensinado** (`chunk:womenchifanba` em `revisao-restaurante`).
   → Reclassificado como novidade (`newRefs`) da própria revisão.
6. **Catálogo curto (V1 de 2 falas).** → Migração integral para V2: comum 6–10
   falas / 2–3 intervenções; revisão 10–14 / 3–5; imersão 14–24 / 5–8, com
   ramos de erro e `sceneId` preservado. Dificuldade derivada do papel V2
   (não mais dos limiares antigos de 4/8 falas).

Resultado: **33/33 cenas** aparecem em algum plano, nenhuma acima de 15% das
lições e nenhuma intenção acima de 20% das conversas geradas.

## Mapa de destravamento

| sceneId | intent | requiredRefs | firstEligibleLesson | currentBlockReason | recommendedAction |
|---------|--------|--------------|---------------------|--------------------|-------------------|
| primeiro-cumprimento | greet | chunk:nihao | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| perguntando-se-esta-bem | ask-wellbeing | chunk:nihaoma, chunk:wohenhao | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| agradecendo | thank | chunk:xiexie, chunk:bukeqi | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| despedida | farewell | chunk:zaijian | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| me-apresentando | introduce-self | chunk:nihao, chunk:wojiao | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| revisao-cumprimento-completo | greet-review | chunk:nihao, chunk:nihaoma, chunk:wohenhao, chunk:xiexie, chunk:zaijian | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| pedir-repeticao | ask-repeat | chunk:tingbudong, chunk:qingzaishuoyibian, chunk:nihaoma, chunk:wojiao | p3-wobuhui-shuo-zhongwen | — | nenhuma (já aparece nos planos) |
| cortesia-loja | polite-question | chunk:qingwen, chunk:nihao, chunk:nihaoma, chunk:wohenhao | p1-qingwen-cortesia | — | nenhuma (já aparece nos planos) |
| de-onde-sou | ask-origin | chunk:nihao, chunk:wature, char:ni, char:ren, char:shi | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| nao-entendi-reparo | repair-not-understood | chunk:tingbudong, chunk:qingzaishuoyibian, chunk:wobuhui, chunk:nihao, chunk:nihaoma | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| nao-falo-chinês | cannot-speak | chunk:nihao, chunk:wobuhui, chunk:nihaoma | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| como-se-chama | ask-name | chunk:nihao, chunk:nijiaoshenme, chunk:wojiao | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| pedir-agua | ask-water | chunk:nihao, chunk:qingwen, chunk:woyao, char:shui, chunk:xiexie, chunk:qingzaishuoyibian, chunk:bukeqi, chunk:zaijian | l14 | — | nenhuma (já aparece nos planos) |
| pedir-cha | ask-tea | chunk:nihao, chunk:nihaoma, chunk:xiexie, chunk:woxianghe, chunk:zheshishenme, chunk:qingzaishuoyibian, chunk:bukeqi | l25 | — | nenhuma (já aparece nos planos) |
| perguntar-quantidade | ask-quantity | chunk:nihao, chunk:woyao, chunk:zheshishenme, chunk:woxianghe, char:san, chunk:duoshaoqian, chunk:taiguile, chunk:xiexie, chunk:bukeqi | l27 | — | nenhuma (já aparece nos planos) |
| identificar-pessoa | identify-person | chunk:zheshimama, chunk:wohenhao, chunk:nihao, chunk:xiexie | l24 | — | nenhuma (já aparece nos planos) |
| encontrar-amigo | meet-friend | chunk:nihao, chunk:pengyou, chunk:nihaoma, chunk:wohenhao, chunk:womenzouba, chunk:zheshishenme | l28 | — | nenhuma (já aparece nos planos) |
| onde-esta | ask-where | chunk:qingwen, char:shan, chunk:zaina, chunk:nashirenm, chunk:nihao, chunk:xiexie, chunk:bukeqi | l25 | — | nenhuma (já aparece nos planos) |
| apontar-natureza | point-nature | chunk:wohenhao, chunk:nashirenm, char:shan, chunk:zheshishenme, char:mu, char:bu, char:shi, char:ri, char:yue | l25 | — | nenhuma (já aparece nos planos) |
| sala-de-aula | classroom-intro | chunk:nihao, chunk:nijiaoshenme, chunk:wojiao, chunk:qingzaishuoyibian, chunk:wohenhao | p3-wobuhui-shuo-zhongwen | — | nenhuma (já aparece nos planos) |
| pedir-ajuda | ask-help | chunk:qingwen, chunk:nihao, chunk:tingbudong, chunk:wobuhui, chunk:wohuishuoyidian, chunk:zheshishenme, chunk:xiexie, chunk:bukeqi | l25 | — | nenhuma (já aparece nos planos) |
| fale-de-novo | ask-slow-repeat | chunk:nihao, chunk:nijiaoshenme, chunk:wohuishuoyidian, chunk:qingzaishuoyibian, chunk:wojiao, chunk:wohenhao | l11-falo-pouco | — | nenhuma (já aparece nos planos) |
| encontro-amanha | plan-tomorrow | chunk:mingtianjian, chunk:nihao, chunk:wohenhao, chunk:zaijian | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| o-que-e-isto | ask-what-object | chunk:zheshishenme, chunk:woxianghe, chunk:zheshishui, chunk:nihaoma, chunk:nihao, chunk:xiexie | l25 | — | nenhuma (já aparece nos planos) |
| conversa-em-casa | home-chat | chunk:nihao, chunk:nihaoma, chunk:wohenhao | p1-o-que-e-mandarim | — | nenhuma (já aparece nos planos) |
| conversa-na-loja | shop-chat | chunk:nihao, chunk:woyao, chunk:duoshaoqian, chunk:zheshishenme, char:bu, chunk:taiguile, chunk:xiexie, chunk:bukeqi, chunk:zaijian | l27 | — | nenhuma (já aparece nos planos) |
| comprar-itens | buy-items | chunk:nihao, chunk:nihaoma, chunk:wohenhao, chunk:qingwen, chunk:woxianghe, char:you, chunk:duoshaoqian, char:shi10, chunk:taiguile, char:bu, char:shi, chunk:woyao, char:san, chunk:qingzaishuoyibian, chunk:xiexie, chunk:zaijian | l10-rev | — | nenhuma (já aparece nos planos) |
| revisao-restaurante | restaurant-review | chunk:woele, chunk:nihao, chunk:woyao, chunk:qingzaishuoyibian, chunk:woxianghe, chunk:haochi, chunk:duoshaoqian, char:shi10, chunk:xiexie, chunk:zaijian, chunk:nihaoma, chunk:taiguile, chunk:wohenhao | l10-rev | — | nenhuma (já aparece nos planos) |
| revisao-numeros | numbers-review | chunk:nihao, char:yi, char:er, char:san, char:si, char:wu, char:liu, char:qi, char:ba8, char:jiu, char:shi10, char:bu, char:shi, chunk:woyousangepengyou, chunk:qingzaishuoyibian, chunk:wohenhao, chunk:nihaoma | l9-rev | — | nenhuma (já aparece nos planos) |
| revisao-hanzi-natureza | hanzi-nature-review | chunk:nihaoma, chunk:wohenhao, chunk:zheshishenme, char:mu, char:lin, char:sen, char:shan, char:ri, char:yue, char:ming, char:bu, char:shi, char:san, chunk:qingzaishuoyibian | l10-rev | — | nenhuma (já aparece nos planos) |
| imersao-mercado | immersion-market | chunk:nihao, chunk:nihaoma, chunk:wohenhao, chunk:qingwen, chunk:woxianghe, char:you, char:san, chunk:woyao, chunk:duoshaoqian, char:shi10, chunk:taiguile, char:bu, chunk:qingzaishuoyibian, chunk:xiexie, chunk:zaijian, chunk:bukeqi | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| imersao-estacao | immersion-station | chunk:qingwen, chunk:nashirenm, chunk:nihao, chunk:qingzaishuoyibian, chunk:xiexie, chunk:bukeqi, char:shi10, chunk:woyao, chunk:zaijian | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| imersao-casa-amigo | immersion-visit | chunk:nihao, chunk:xiexie, chunk:zheshimama, chunk:qingzaishuoyibian, chunk:zheshibaba, chunk:woxianghe, char:bu, chunk:nihaoma, chunk:wohenhao, chunk:zaijian, chunk:taiguile, chunk:woele | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| comentar-ceu | comment-sky | char:shan, chunk:nashitian, chunk:jintianhenhao, chunk:qingzaishuoyibian, chunk:zaijian, char:tian_sky, chunk:wohenhao | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| esta-e-minha-casa | show-home | chunk:nihao, chunk:zheshimama, chunk:zheshishenme, chunk:zheshiwodejia, chunk:wohuijia, chunk:qingzaishuoyibian, chunk:zaijian, chunk:wohenhao, char:ma_question, char:jia | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| pedir-cardapio | order-menu | chunk:woele, chunk:womenchifanba, chunk:nihao, chunk:woyaofan, chunk:woyaocai, chunk:woyaoyu, chunk:woyaorou, chunk:woxiangheshui, chunk:qingzaishuoyibian, chunk:xiexie, chunk:bukeqi, chunk:zaijian, chunk:wohenhao, char:ma_question, char:fan_rice, char:cai_dish, char:rou_meat, char:yu_fish, char:he_drink | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| mostrar-livro | show-book | chunk:nihao, chunk:zheshishenme, chunk:zheshishu, chunk:wokanshu, chunk:qingzaishuoyibian, chunk:xiexie, chunk:bukeqi, chunk:zheshishui, chunk:wohenhao, chunk:zaijian, chunk:taiguile, chunk:duoshaoqian, char:ma_question, char:shu_book | p7-imersao-mercado | — | nenhuma (já aparece nos planos) |
| onde-esta-o-carro | ask-car-where | chunk:qingwen, chunk:nihao, chunk:chezainali, chunk:piaoduoshaoqian, chunk:woyaopiao, chunk:qingzaishuoyibian, chunk:xiexie, chunk:bukeqi, chunk:zaijian, chunk:taiguile, chunk:wohenhao, char:che, char:piao_ticket, char:na_that | p7-imersao-estacao | — | nenhuma (já aparece nos planos) |

## Detalhe por cena

| sceneId | papel | req | opt | novo | elegível comum | uso autoral | uso gerado |
|---------|-------|----:|----:|-----:|:--------------:|------------:|-----------:|
| primeiro-cumprimento | common | 1 | 0 | 0 | sim | 2 | 3 |
| perguntando-se-esta-bem | common | 2 | 0 | 0 | sim | 3 | 6 |
| agradecendo | common | 2 | 0 | 0 | sim | 3 | 2 |
| despedida | common | 1 | 0 | 0 | sim | 1 | 1 |
| me-apresentando | common | 2 | 0 | 0 | sim | 1 | 3 |
| revisao-cumprimento-completo | common | 5 | 0 | 0 | sim | 2 | 8 |
| pedir-repeticao | common | 4 | 0 | 0 | sim | 1 | 4 |
| cortesia-loja | common | 4 | 0 | 1 | sim | 1 | 8 |
| de-onde-sou | common | 5 | 0 | 1 | — | 1 | 0 |
| nao-entendi-reparo | common | 5 | 0 | 0 | — | 1 | 0 |
| nao-falo-chinês | common | 3 | 0 | 0 | sim | 1 | 8 |
| como-se-chama | common | 3 | 0 | 0 | sim | 1 | 7 |
| pedir-agua | common | 8 | 0 | 0 | sim | 1 | 6 |
| pedir-cha | common | 7 | 0 | 0 | sim | 1 | 0 |
| perguntar-quantidade | common | 9 | 0 | 0 | sim | 1 | 1 |
| identificar-pessoa | common | 4 | 0 | 1 | sim | 1 | 0 |
| encontrar-amigo | common | 6 | 0 | 0 | sim | 1 | 0 |
| onde-esta | common | 7 | 0 | 0 | sim | 1 | 0 |
| apontar-natureza | common | 9 | 0 | 0 | sim | 1 | 1 |
| sala-de-aula | common | 5 | 0 | 0 | sim | 0 | 6 |
| pedir-ajuda | common | 8 | 0 | 0 | sim | 1 | 0 |
| fale-de-novo | common | 6 | 0 | 0 | sim | 0 | 6 |
| encontro-amanha | common | 4 | 0 | 0 | sim | 0 | 12 |
| o-que-e-isto | common | 6 | 0 | 0 | sim | 1 | 0 |
| conversa-em-casa | common | 3 | 0 | 1 | sim | 0 | 9 |
| conversa-na-loja | common | 9 | 0 | 0 | sim | 1 | 0 |
| comprar-itens | module_review | 16 | 0 | 0 | — | 1 | 0 |
| revisao-restaurante | module_review | 13 | 0 | 1 | — | 1 | 0 |
| revisao-numeros | module_review | 17 | 0 | 0 | — | 1 | 0 |
| revisao-hanzi-natureza | module_review | 14 | 0 | 0 | — | 1 | 1 |
| imersao-mercado | immersion | 16 | 0 | 0 | — | 1 | 0 |
| imersao-estacao | immersion | 9 | 0 | 3 | — | 1 | 0 |
| imersao-casa-amigo | immersion | 12 | 0 | 2 | — | 1 | 0 |
| comentar-ceu | common | 7 | 0 | 0 | — | 1 | 0 |
| esta-e-minha-casa | common | 10 | 0 | 0 | — | 1 | 0 |
| pedir-cardapio | module_review | 19 | 0 | 0 | — | 1 | 0 |
| mostrar-livro | common | 14 | 0 | 0 | — | 1 | 0 |
| onde-esta-o-carro | common | 14 | 0 | 0 | — | 1 | 0 |

## Cenas ainda sem uso

Nenhuma — todas as cenas do catálogo aparecem em algum plano (autoral ou gerado).

---

_requiredRefs = vocabulário que a cena mostra e exige aprendido; optionalRefs
enriquecem sem bloquear; newRefs é a novidade controlada da própria cena._

<!-- integridade:5e622be698841aa8 -->
