# Relatório de cobertura de cenas de conversa

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 285c56a885ce751eb8e70a16c75f8d964db12709 |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-07-20T14:56:03.139Z |
| Lições | 108 |
| Hash da Jornada | 88316737b78b |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Cenas no catálogo | 33 |
| Cenas V2 (nós/ramificação) | 21 |
| Cenas V1 (lines + checkpoint) | 12 |
| Intenções distintas | 33 |
| Passos autorais na jornada | 33 |
| Lições com cena gerada no plano | 95 |
| Cenas geradas distintas | 22 |
| Cenas nunca usadas (autoral ou plano) | 0 |
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
| primeiro-cumprimento | legacy | greet | 2 | 1 | — | 1 | 2 | 3 |
| perguntando-se-esta-bem | legacy | ask-wellbeing | 2 | 1 | — | 1 | 3 | 6 |
| agradecendo | legacy | thank | 2 | 1 | — | 1 | 3 | 3 |
| despedida | legacy | farewell | 2 | 1 | — | 1 | 1 | 1 |
| me-apresentando | legacy | introduce-self | 2 | 1 | — | 1 | 1 | 3 |
| revisao-cumprimento-completo | legacy | greet-review | 6 | 1 | — | 1 | 2 | 9 |
| pedir-repeticao | legacy | ask-repeat | 2 | 1 | — | 1 | 1 | 3 |
| cortesia-loja | legacy | polite-question | 2 | 1 | — | 1 | 1 | 9 |
| de-onde-sou | legacy | ask-origin | 2 | 1 | — | 1 | 1 | 0 |
| nao-entendi-reparo | legacy | repair-not-understood | 2 | 1 | — | 1 | 1 | 0 |
| nao-falo-chinês | legacy | cannot-speak | 2 | 1 | — | 1 | 1 | 8 |
| como-se-chama | legacy | ask-name | 2 | 1 | — | 1 | 1 | 7 |
| pedir-agua | common | ask-water | 4 | 1 | sim | 1 | 1 | 6 |
| pedir-cha | common | ask-tea | 6 | 1 | sim | 1 | 0 | 1 |
| perguntar-quantidade | common | ask-quantity | 6 | 1 | sim | 1 | 1 | 1 |
| comprar-itens | module_review | buy-items | 8 | 2 | sim | 1 | 1 | 1 |
| identificar-pessoa | common | identify-person | 4 | 1 | sim | 1 | 1 | 0 |
| encontrar-amigo | common | meet-friend | 4 | 1 | sim | 1 | 1 | 0 |
| onde-esta | common | ask-where | 4 | 1 | sim | 1 | 1 | 0 |
| apontar-natureza | common | point-nature | 5 | 1 | sim | 1 | 1 | 1 |
| sala-de-aula | common | classroom-intro | 4 | 1 | sim | 1 | 0 | 6 |
| pedir-ajuda | common | ask-help | 6 | 1 | sim | 1 | 1 | 0 |
| fale-de-novo | common | ask-slow-repeat | 5 | 1 | sim | 1 | 0 | 5 |
| encontro-amanha | common | plan-tomorrow | 4 | 1 | sim | 1 | 0 | 11 |
| o-que-e-isto | common | ask-what-object | 5 | 1 | sim | 1 | 1 | 0 |
| conversa-em-casa | common | home-chat | 4 | 1 | sim | 1 | 0 | 8 |
| conversa-na-loja | common | shop-chat | 6 | 1 | sim | 1 | 1 | 0 |
| revisao-restaurante | module_review | restaurant-review | 8 | 3 | sim | 1 | 1 | 1 |
| revisao-numeros | module_review | numbers-review | 6 | 2 | sim | 1 | 0 | 1 |
| revisao-hanzi-natureza | module_review | hanzi-nature-review | 6 | 2 | sim | 1 | 1 | 0 |
| imersao-mercado | immersion | immersion-market | 11 | 2 | sim | 2 | 1 | 1 |
| imersao-estacao | immersion | immersion-station | 10 | 3 | sim | 2 | 1 | 0 |
| imersao-casa-amigo | immersion | immersion-visit | 11 | 3 | sim | 2 | 1 | 0 |

## Cenas nunca usadas

Nenhuma — todas as cenas aparecem na jornada (autoral) ou em planos gerados.

## Conversation Vocabulary Loop (cobertura reversa)

| Indicador | Valor |
|-----------|------:|
| Variantes com manifesto gerado | 34 |
| Itens de vocabulário mapeados | 410 |
| Textos exibidos sem referência canônica (aviso) | 6 |
| Refs declarados nunca exibidos (aviso) | 40 |

### Texto exibido sem referência canônica standalone

_Glifos mostrados que só existem dentro de chunks (sem `char:` dedicado). O caminho direto já garante que foram ensinados; falta um ref standalone para reúso granular em SRS._

- identificar-pessoa (advanced): sem referência canônica → "那"
- onde-esta (advanced): sem referência canônica → "那"
- onde-esta (advanced): sem referência canônica → "里"
- apontar-natureza (advanced): sem referência canônica → "那"
- imersao-estacao (advanced): sem referência canônica → "那"
- imersao-estacao (advanced): sem referência canônica → "里"

### Refs declarados que não aparecem no texto exibido (over-declaração)

- cortesia-loja (advanced): ref declarado nunca exibido → chunk:nihaoma
- nao-entendi-reparo (advanced): ref declarado nunca exibido → chunk:nihao
- nao-entendi-reparo (advanced): ref declarado nunca exibido → chunk:nihaoma
- nao-falo-chinês (advanced): ref declarado nunca exibido → chunk:nihaoma
- pedir-cha (advanced): ref declarado nunca exibido → chunk:nihaoma
- pedir-cha (advanced): ref declarado nunca exibido → chunk:zheshishenme
- perguntar-quantidade (advanced): ref declarado nunca exibido → chunk:woxianghe
- perguntar-quantidade (advanced): ref declarado nunca exibido → chunk:zheshishenme
- comprar-itens (advanced): ref declarado nunca exibido → chunk:zheshishenme
- identificar-pessoa (advanced): ref declarado nunca exibido → chunk:nihao
- identificar-pessoa (advanced): ref declarado nunca exibido → chunk:wohenhao
- identificar-pessoa (advanced): ref declarado nunca exibido → chunk:zheshimama
- encontrar-amigo (advanced): ref declarado nunca exibido → chunk:zheshishenme
- onde-esta (advanced): ref declarado nunca exibido → chunk:nashirenm
- onde-esta (advanced): ref declarado nunca exibido → chunk:nihao
- apontar-natureza (advanced): ref declarado nunca exibido → chunk:nashirenm
- apontar-natureza (advanced): ref declarado nunca exibido → chunk:wohenhao
- sala-de-aula (advanced): ref declarado nunca exibido → chunk:wohenhao
- pedir-ajuda (advanced): ref declarado nunca exibido → chunk:wobuhui
- pedir-ajuda (advanced): ref declarado nunca exibido → chunk:wohuishuoyidian
- pedir-ajuda (advanced): ref declarado nunca exibido → chunk:zheshishenme
- fale-de-novo (advanced): ref declarado nunca exibido → chunk:wohenhao
- encontro-amanha (advanced): ref declarado nunca exibido → chunk:wohenhao
- o-que-e-isto (advanced): ref declarado nunca exibido → chunk:nihao
- o-que-e-isto (advanced): ref declarado nunca exibido → chunk:nihaoma
- o-que-e-isto (advanced): ref declarado nunca exibido → chunk:woxianghe
- conversa-na-loja (advanced): ref declarado nunca exibido → chunk:taiguile
- conversa-na-loja (advanced): ref declarado nunca exibido → chunk:zheshishenme
- revisao-restaurante (advanced): ref declarado nunca exibido → chunk:zheshishenme
- revisao-numeros (advanced): ref declarado nunca exibido → chunk:nihaoma
- revisao-numeros (advanced): ref declarado nunca exibido → chunk:wohenhao
- revisao-hanzi-natureza (advanced): ref declarado nunca exibido → chunk:nihaoma
- revisao-hanzi-natureza (advanced): ref declarado nunca exibido → chunk:wohenhao
- imersao-mercado (advanced): ref declarado nunca exibido → chunk:woxianghe
- imersao-mercado (advanced): ref declarado nunca exibido → chunk:zheshishenme
- imersao-estacao (advanced): ref declarado nunca exibido → chunk:nashirenm
- imersao-estacao (advanced): ref declarado nunca exibido → chunk:zaina
- imersao-estacao (advanced): ref declarado nunca exibido → chunk:zheshishenme
- imersao-casa-amigo (advanced): ref declarado nunca exibido → chunk:nihaoma
- imersao-casa-amigo (advanced): ref declarado nunca exibido → chunk:wohenhao


---

_Falas contadas no caminho principal (entry → correctNextNodeId). Ramos de erro (wrongNextNodeId) também são validados quanto a vocabulário e alcançabilidade. O Vocabulary Loop mapeia o vocabulário realmente exibido em cada variante para reúso em atividades e revisões._

<!-- integridade:4b3823d4d4bc5eff -->
