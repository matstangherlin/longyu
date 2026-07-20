# Relatório de consistência visual

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 02cf1e43fe55450c0a0fea51fe3424b339833e8f |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-07-20T21:52:27.321Z |
| Lições | 108 |
| Hash da Jornada | e15ec5502b20 |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Assets no catálogo | 37 |
| Estilo photo | 2 |
| Estilo realistic_illustration | 2 |
| Estilo flat_illustration | 33 |
| Candidatos a substituição | 20 |
| Cenas contextuais (VisualScene) | 0 |
| Erros | 0 |
| Avisos | 4 |

Consistência garantida por família de estilo (realistic = photo +
realistic_illustration; flat = flat_illustration). Nenhuma pergunta mistura
famílias — ver docs/VISUAL_ASSET_GUIDE.md.

## Estilo majoritário por categoria

| Categoria | Estilo majoritário |
|-----------|--------------------|
| people | flat_illustration |
| nature | flat_illustration |
| quantity | flat_illustration |
| animals | flat_illustration |
| food | flat_illustration |
| actions | flat_illustration |
| objects | flat_illustration |

## Catálogo

| Asset | Conceito | Estilo | Fundo | Tamanho | Dimensão | Problemas | Substituir? |
|-------|----------|--------|-------|--------:|----------|-----------|:-----------:|
| person | 人 pessoa | photo | neutral | 19.4 KB | 600×600 | — | sim |
| tree | 木 árvore | flat_illustration | neutral | 0.6 KB | 600×600 | — | — |
| mouth | 口 boca | photo | neutral | 13.3 KB | 600×600 | — | sim |
| sun | 日 sol | flat_illustration | neutral | 0.8 KB | 600×600 | — | — |
| moon | 月 lua | flat_illustration | neutral | 0.7 KB | 600×600 | — | — |
| mountain | 山 montanha | flat_illustration | neutral | 0.7 KB | 600×600 | — | — |
| water | 水 água | flat_illustration | neutral | 0.6 KB | 600×600 | — | — |
| fire | 火 fogo | flat_illustration | neutral | 0.9 KB | 600×600 | — | — |
| big | 大 grande | realistic_illustration | neutral | 7.2 KB | 600×600 | — | sim |
| small | 小 pequeno | realistic_illustration | neutral | 3.3 KB | 600×600 | — | sim |
| woman | 女 mulher | flat_illustration | neutral | 4.3 KB | 600×600 | — | sim |
| child | 子 criança | flat_illustration | neutral | 4.7 KB | 600×600 | — | sim |
| mother | 妈 mãe | flat_illustration | neutral | 5.1 KB | 600×600 | — | sim |
| father | 爸 pai | flat_illustration | neutral | 6.7 KB | 600×600 | — | sim |
| friend | 朋 amigo | flat_illustration | neutral | 6.4 KB | 600×600 | — | sim |
| crowd | 众 multidão | flat_illustration | neutral | 15.3 KB | 600×600 | — | sim |
| sky | 天 céu | flat_illustration | neutral | 1.0 KB | 600×600 | — | — |
| woods | 林 bosque | flat_illustration | neutral | 1.1 KB | 600×600 | — | sim |
| forest | 森 floresta | flat_illustration | neutral | 2.0 KB | 600×600 | — | sim |
| horse | 马 cavalo | flat_illustration | neutral | 4.6 KB | 600×600 | — | sim |
| fish | 鱼 peixe | flat_illustration | neutral | 5.1 KB | 600×600 | — | sim |
| rice | 饭 arroz | flat_illustration | neutral | 5.9 KB | 600×600 | — | sim |
| tea | 茶 chá | flat_illustration | neutral | 3.5 KB | 600×600 | — | sim |
| meat | 肉 carne | flat_illustration | neutral | 4.8 KB | 600×600 | — | sim |
| vegetables | 菜 verdura | flat_illustration | neutral | 4.4 KB | 600×600 | — | sim |
| eat | 吃 comer | flat_illustration | neutral | 6.4 KB | 600×600 | — | sim |
| drink | 喝 beber | flat_illustration | neutral | 4.4 KB | 600×600 | — | sim |
| book | 书 livro | flat_illustration | neutral | 7.4 KB | 600×600 | — | — |
| car | 车 carro | flat_illustration | neutral | 5.3 KB | 600×600 | — | — |
| home | 家 casa | flat_illustration | neutral | 3.7 KB | 600×600 | — | — |
| money | 钱 dinheiro | flat_illustration | neutral | 5.8 KB | 600×600 | — | — |
| ticket | 票 bilhete | flat_illustration | neutral | 5.9 KB | 600×600 | — | — |
| one | 一 um | flat_illustration | neutral | 3.1 KB | 600×600 | — | — |
| two | 二 dois | flat_illustration | neutral | 4.3 KB | 600×600 | — | — |
| three | 三 três | flat_illustration | neutral | 5.5 KB | 600×600 | — | — |
| four | 四 quatro | flat_illustration | neutral | 6.6 KB | 600×600 | — | — |
| five | 五 cinco | flat_illustration | neutral | 7.4 KB | 600×600 | — | — |

## Avisos

- **person**: estilo photo diverge do majoritário da categoria people (flat_illustration)
- **mouth**: estilo photo diverge do majoritário da categoria people (flat_illustration)
- **big**: estilo realistic_illustration diverge do majoritário da categoria quantity (flat_illustration)
- **small**: estilo realistic_illustration diverge do majoritário da categoria quantity (flat_illustration)

---

_Substituir = estilo diverge do majoritário da categoria, arquivo grande, ou item na lista de prioridade do guia. Não é obrigatório trocar por foto — o alvo é aparência profissional, consistência e boa leitura no mobile._

<!-- integridade:af39314f19c180b0 -->
