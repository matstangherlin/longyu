# Relatório de cobertura de cenas de conversa

Gerado em: 2026-07-16T13:42:06.775Z

## Resumo

| Indicador | Valor |
|-----------|------:|
| Cenas no catálogo | 33 |
| Cenas V2 (nós/ramificação) | 21 |
| Cenas V1 (lines + checkpoint) | 12 |
| Intenções distintas | 33 |
| Passos autorais na jornada | 18 |
| Lições com cena gerada no plano | 95 |
| Cenas geradas distintas | 10 |
| Cenas nunca usadas (autoral ou plano) | 15 |
| Rotação sob contexto (anti "primeira cena") | OK |

## Cenas por papel

| Papel | Cenas |
|-------|------:|
| legacy | 12 |
| common | 14 |
| module_review | 4 |
| immersion | 3 |

## Cenas por cenário

| Cenário | Cenas |
|---------|------:|
| school | 3 |
| park | 5 |
| shop | 8 |
| street | 8 |
| classroom | 5 |
| home | 4 |

## Catálogo

| Cena | Papel | Intenção | Falas | Intervenções | Ramificada | Conclusões | Uso autoral | Uso gerado |
|------|-------|----------|------:|-------------:|-----------:|-----------:|------------:|-----------:|
| primeiro-cumprimento | legacy | greet | 2 | 1 | — | 1 | 2 | 2 |
| perguntando-se-esta-bem | legacy | ask-wellbeing | 2 | 1 | — | 1 | 3 | 0 |
| agradecendo | legacy | thank | 2 | 1 | — | 1 | 3 | 0 |
| despedida | legacy | farewell | 2 | 1 | — | 1 | 1 | 0 |
| me-apresentando | legacy | introduce-self | 2 | 1 | — | 1 | 1 | 0 |
| revisao-cumprimento-completo | legacy | greet-review | 6 | 1 | — | 1 | 2 | 33 |
| pedir-repeticao | legacy | ask-repeat | 2 | 1 | — | 1 | 1 | 0 |
| cortesia-loja | legacy | polite-question | 2 | 1 | — | 1 | 1 | 8 |
| de-onde-sou | legacy | ask-origin | 2 | 1 | — | 1 | 1 | 22 |
| nao-entendi-reparo | legacy | repair-not-understood | 2 | 1 | — | 1 | 1 | 0 |
| nao-falo-chinês | legacy | cannot-speak | 2 | 1 | — | 1 | 1 | 0 |
| como-se-chama | legacy | ask-name | 2 | 1 | — | 1 | 1 | 0 |
| pedir-agua | common | ask-water | 4 | 1 | sim | 1 | 0 | 0 |
| pedir-cha | common | ask-tea | 6 | 1 | sim | 1 | 0 | 2 |
| perguntar-quantidade | common | ask-quantity | 6 | 1 | sim | 1 | 0 | 4 |
| comprar-itens | module_review | buy-items | 8 | 2 | sim | 1 | 0 | 0 |
| identificar-pessoa | common | identify-person | 4 | 1 | sim | 1 | 0 | 0 |
| encontrar-amigo | common | meet-friend | 4 | 1 | sim | 1 | 0 | 0 |
| onde-esta | common | ask-where | 4 | 1 | sim | 1 | 0 | 0 |
| apontar-natureza | common | point-nature | 5 | 1 | sim | 1 | 0 | 0 |
| sala-de-aula | common | classroom-intro | 4 | 1 | sim | 1 | 0 | 0 |
| pedir-ajuda | common | ask-help | 6 | 1 | sim | 1 | 0 | 0 |
| fale-de-novo | common | ask-slow-repeat | 5 | 1 | sim | 1 | 0 | 9 |
| encontro-amanha | common | plan-tomorrow | 4 | 1 | sim | 1 | 0 | 13 |
| o-que-e-isto | common | ask-what-object | 5 | 1 | sim | 1 | 0 | 0 |
| conversa-em-casa | common | home-chat | 4 | 1 | sim | 1 | 0 | 1 |
| conversa-na-loja | common | shop-chat | 6 | 1 | sim | 1 | 0 | 0 |
| revisao-restaurante | module_review | restaurant-review | 8 | 3 | sim | 1 | 0 | 0 |
| revisao-numeros | module_review | numbers-review | 6 | 2 | sim | 1 | 0 | 1 |
| revisao-hanzi-natureza | module_review | hanzi-nature-review | 6 | 2 | sim | 1 | 0 | 0 |
| imersao-mercado | immersion | immersion-market | 11 | 2 | sim | 2 | 0 | 0 |
| imersao-estacao | immersion | immersion-station | 10 | 3 | sim | 2 | 0 | 0 |
| imersao-casa-amigo | immersion | immersion-visit | 11 | 3 | sim | 2 | 0 | 0 |

## Cenas nunca usadas

| Cena | Intenção | Refs necessários |
|------|----------|------------------|
| pedir-agua | ask-water | chunk:nihao, chunk:qingwen, chunk:woyao, char:shui, chunk:xiexie, chunk:qingzaishuoyibian, chunk:bukeqi, chunk:zaijian |
| comprar-itens | buy-items | chunk:nihao, chunk:qingwen, chunk:duoshaoqian, char:shi10, char:bu, chunk:taiguile, chunk:woyao, chunk:qingzaishuoyibian, chunk:xiexie, chunk:zaijian, chunk:zheshishenme |
| identificar-pessoa | identify-person | chunk:nashirenm, chunk:zheshimama, chunk:wohenhao, chunk:nihao, chunk:xiexie |
| encontrar-amigo | meet-friend | chunk:nihao, chunk:pengyou, chunk:nihaoma, chunk:wohenhao, chunk:womenzouba, chunk:zheshishenme |
| onde-esta | ask-where | chunk:qingwen, char:shan, chunk:zaina, chunk:nashirenm, chunk:nihao, chunk:xiexie, chunk:bukeqi |
| apontar-natureza | point-nature | chunk:wohenhao, chunk:nashirenm, char:shan, chunk:zheshishenme, char:mu, char:bu, char:shi, char:ri, char:yue |
| sala-de-aula | classroom-intro | chunk:nihao, chunk:nijiaoshenme, chunk:wojiao, chunk:qingzaishuoyibian, chunk:wohenhao, chunk:woshixuesheng |
| pedir-ajuda | ask-help | chunk:qingwen, chunk:nihao, chunk:tingbudong, chunk:wobuhui, chunk:wohuishuoyidian, chunk:zheshishenme, chunk:xiexie, chunk:bukeqi |
| o-que-e-isto | ask-what-object | chunk:zheshishenme, chunk:woxianghe, chunk:zheshishui, chunk:nihaoma, chunk:nihao, chunk:xiexie |
| conversa-na-loja | shop-chat | chunk:nihao, chunk:woyao, chunk:duoshaoqian, chunk:zheshishenme, char:bu, chunk:taiguile, chunk:xiexie, chunk:bukeqi, chunk:zaijian |
| revisao-restaurante | restaurant-review | chunk:woele, chunk:womenchifanba, chunk:nihao, chunk:woyao, chunk:zheshishenme, chunk:qingzaishuoyibian, chunk:woxianghe, chunk:nihaoma, chunk:haochi, chunk:duoshaoqian, char:shi10, chunk:xiexie, chunk:zaijian |
| revisao-hanzi-natureza | hanzi-nature-review | chunk:wohenhao, chunk:zheshishenme, char:mu, char:lin, char:sen, char:ming, char:shan, chunk:nihaoma, char:ri, char:yue, char:shi |
| imersao-mercado | immersion-market | chunk:nihao, chunk:nihaoma, chunk:wohenhao, chunk:qingwen, char:you, chunk:woxianghe, chunk:woyao, char:san, char:bu, chunk:duoshaoqian, char:shi10, chunk:taiguile, chunk:zheshishenme, chunk:xiexie, chunk:zaijian |
| imersao-estacao | immersion-station | chunk:qingwen, chunk:zaina, chunk:nashirenm, chunk:nihao, chunk:xiexie, chunk:bukeqi, char:shi10, chunk:woyao, chunk:qingzaishuoyibian, chunk:zheshishenme, chunk:zaijian, chunk:huochezhanzainali, chunk:piaoduoshaoqian, chunk:dengyixia |
| imersao-casa-amigo | immersion-visit | chunk:nihao, chunk:xiexie, chunk:zheshimama, chunk:zheshishenme, chunk:zheshibaba, chunk:woxianghe, chunk:nihaoma, char:bu, chunk:wohenhao, chunk:zaijian, chunk:mingtianjian, chunk:renshinihengaoxing |

_Cena não usada = nenhum foco de lição cobre todos os refs dela ainda; ela fica disponível para os próximos módulos._

---

_Falas contadas no caminho principal (entry → correctNextNodeId). Ramos de erro (wrongNextNodeId) também são validados quanto a vocabulário e alcançabilidade._
