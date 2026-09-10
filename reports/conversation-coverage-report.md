# Relatório de cobertura de cenas de conversa

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 465390e64799 |
| HEAD no instante da geração | 2417cd6ce4bec58d16e677a61fb4d18033bf187a |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-10T18:53:28.149Z |
| Lições | 131 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Cenas no catálogo | 48 |
| Cenas V2 (nós/ramificação) | 48 |
| Cenas V1 autorais (sem nós) | 0 |
| Fallback V1 derivado (lines/checkpoint) | 48 |
| Intenções distintas | 48 |
| Passos autorais na jornada | 53 |
| Lições com cena gerada no plano | 100 |
| Cenas geradas distintas | 41 |
| Cenas nunca usadas (autoral ou plano) | 0 |
| Rotação sob contexto (anti "primeira cena") | OK |

## Cenas por papel

| Papel | Cenas |
|-------|------:|
| common | 34 |
| module_review | 8 |
| immersion | 6 |

## Cenas por cenário

| Cenário | Cenas |
|---------|------:|
| school | 5 |
| park | 7 |
| shop | 10 |
| street | 12 |
| classroom | 6 |
| home | 6 |
| hotel | 1 |
| airport | 1 |

## Catálogo

| Cena | Papel | Intenção | Falas | Intervenções | Ramificada | Conclusões | Uso autoral | Uso gerado |
|------|-------|----------|------:|-------------:|-----------:|-----------:|------------:|-----------:|
| primeiro-cumprimento | common | greet | 7 | 2 | sim | 1 | 3 | 0 |
| perguntando-se-esta-bem | common | ask-wellbeing | 6 | 2 | sim | 1 | 2 | 1 |
| agradecendo | common | thank | 6 | 2 | sim | 1 | 3 | 1 |
| despedida | common | farewell | 6 | 2 | sim | 1 | 1 | 0 |
| me-apresentando | common | introduce-self | 6 | 2 | sim | 1 | 1 | 5 |
| revisao-cumprimento-completo | common | greet-review | 9 | 3 | sim | 1 | 0 | 2 |
| pedir-repeticao | common | ask-repeat | 7 | 2 | sim | 1 | 2 | 4 |
| cortesia-loja | common | polite-question | 7 | 2 | sim | 1 | 1 | 3 |
| de-onde-sou | common | ask-origin | 6 | 2 | sim | 1 | 1 | 0 |
| conhecer-alguem | module_review | meet-someone | 13 | 5 | sim | 1 | 1 | 0 |
| nao-entendi-reparo | common | repair-not-understood | 8 | 3 | sim | 1 | 1 | 0 |
| nao-falo-chinês | common | cannot-speak | 6 | 2 | sim | 1 | 1 | 6 |
| como-se-chama | common | ask-name | 6 | 2 | sim | 1 | 2 | 10 |
| pedir-agua | common | ask-water | 8 | 3 | sim | 1 | 1 | 6 |
| pedir-cha | common | ask-tea | 7 | 2 | sim | 1 | 1 | 3 |
| perguntar-quantidade | common | ask-quantity | 8 | 3 | sim | 1 | 1 | 1 |
| identificar-pessoa | module_review | identify-person | 11 | 5 | sim | 1 | 1 | 0 |
| encontrar-amigo | common | meet-friend | 6 | 2 | sim | 1 | 1 | 0 |
| onde-esta | common | ask-where | 8 | 2 | sim | 1 | 1 | 2 |
| apontar-natureza | common | point-nature | 7 | 3 | sim | 1 | 1 | 4 |
| sala-de-aula | module_review | classroom-intro | 11 | 5 | sim | 1 | 1 | 2 |
| pedir-ajuda | common | ask-help | 7 | 2 | sim | 1 | 1 | 2 |
| fale-de-novo | common | ask-slow-repeat | 7 | 3 | sim | 1 | 0 | 4 |
| encontro-amanha | common | plan-tomorrow | 9 | 3 | sim | 1 | 1 | 8 |
| o-que-e-isto | common | ask-what-object | 7 | 2 | sim | 1 | 1 | 2 |
| conversa-em-casa | common | home-chat | 6 | 2 | sim | 1 | 0 | 1 |
| conversa-na-loja | common | shop-chat | 9 | 3 | sim | 2 | 1 | 1 |
| comprar-itens | module_review | buy-items | 12 | 5 | sim | 1 | 1 | 1 |
| revisao-restaurante | module_review | restaurant-review | 12 | 4 | sim | 1 | 1 | 0 |
| revisao-numeros | module_review | numbers-review | 10 | 4 | sim | 1 | 1 | 1 |
| revisao-hanzi-natureza | module_review | hanzi-nature-review | 10 | 4 | sim | 1 | 1 | 0 |
| imersao-mercado | immersion | immersion-market | 20 | 8 | sim | 2 | 1 | 0 |
| imersao-estacao | immersion | immersion-station | 17 | 6 | sim | 2 | 1 | 0 |
| imersao-casa-amigo | immersion | immersion-visit | 14 | 6 | sim | 2 | 1 | 0 |
| comentar-ceu | common | comment-sky | 6 | 2 | sim | 1 | 1 | 0 |
| esta-e-minha-casa | common | show-home | 7 | 2 | sim | 1 | 1 | 0 |
| pedir-cardapio | module_review | order-menu | 14 | 5 | sim | 1 | 1 | 0 |
| imersao-restaurante | immersion | immersion-restaurant | 22 | 7 | sim | 2 | 1 | 0 |
| mostrar-livro | common | show-book | 7 | 2 | sim | 1 | 1 | 0 |
| onde-esta-o-carro | common | ask-car-where | 7 | 2 | sim | 1 | 1 | 0 |
| falar-de-estudo | common | study | 7 | 3 | sim | 1 | 1 | 6 |
| rotina-e-trabalho | common | work-routine | 10 | 3 | sim | 1 | 1 | 0 |
| que-horas-sao | common | ask-time | 7 | 2 | sim | 1 | 1 | 0 |
| nao-me-sinto-bem | common | health | 7 | 3 | sim | 1 | 1 | 0 |
| como-esta-o-tempo | common | weather | 6 | 2 | sim | 1 | 1 | 0 |
| checkin-hotel | immersion | hotel | 18 | 8 | sim | 2 | 1 | 0 |
| no-aeroporto | immersion | airport | 17 | 7 | sim | 2 | 1 | 0 |
| pegar-taxi | common | taxi | 7 | 2 | sim | 1 | 2 | 0 |

## Cenas nunca usadas

Nenhuma — todas as cenas aparecem na jornada (autoral) ou em planos gerados.

## Conversation Vocabulary Loop (cobertura reversa)

| Indicador | Valor |
|-----------|------:|
| Variantes com manifesto gerado | 49 |
| Itens de vocabulário mapeados | 687 |
| Textos exibidos sem referência canônica (aviso) | 0 |
| Refs declarados nunca exibidos (aviso) | 12 |

### Refs declarados que não aparecem no texto exibido (over-declaração)

- identificar-pessoa (advanced): ref declarado nunca exibido → chunk:wohenhao
- sala-de-aula (advanced): ref declarado nunca exibido → chunk:wojiao
- sala-de-aula (advanced): ref declarado nunca exibido → chunk:wozaixuezhongwen
- conversa-na-loja (advanced): ref declarado nunca exibido → chunk:zheshishenme
- comprar-itens (advanced): ref declarado nunca exibido → chunk:zheshishenme
- revisao-restaurante (advanced): ref declarado nunca exibido → chunk:zheshishenme
- imersao-mercado (advanced): ref declarado nunca exibido → chunk:zheshishenme
- pedir-cardapio (advanced): ref declarado nunca exibido → chunk:zheshishenme
- imersao-restaurante (advanced): ref declarado nunca exibido → chunk:zheshishenme
- rotina-e-trabalho (advanced): ref declarado nunca exibido → chunk:zaijian
- que-horas-sao (advanced): ref declarado nunca exibido → chunk:zaijian
- checkin-hotel (advanced): ref declarado nunca exibido → chunk:woxuyaobangzhu


---

_Falas contadas no caminho principal (entry → correctNextNodeId). Ramos de erro (wrongNextNodeId) também são validados quanto a vocabulário e alcançabilidade. O Vocabulary Loop mapeia o vocabulário realmente exibido em cada variante para reúso em atividades e revisões._

<!-- integridade:62c6b47fc1f683c9 -->
