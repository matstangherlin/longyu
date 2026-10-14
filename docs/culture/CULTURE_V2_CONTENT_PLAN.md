# Culture V2 Content Plan — RC2.3.13E

## Paths (12)

| Path | Focus | Existing route / items |
| --- | --- | --- |
| Vida cotidiana | routine, markets, delivery, housing | `everyday-china` (partial) |
| Etiqueta e relações | 面子, guanxi, gifts, hospitality | `first-meetings`, social items |
| Comida e mesa | shared dishes, chopsticks, toasts | `table-food` |
| Família | kinship, parents, expectations | `home-visits` / `family-terms` |
| Escola e universidade | gaokao, teachers, student life | `teacher-title` (gap) |
| Trabalho | hierarchy, meetings | `office-hours` (gap) |
| Cidades e transporte | metro, HSR, taxi | `metro-qr` |
| China digital | WeChat, Alipay, Douyin | `digital-pay` |
| Festivais | Spring Festival, Qingming, Mid-Autumn… | `festivals` |
| História e símbolos | dynasties, dragon, writing | festival/history items |
| China contemporânea | urbanization, generations | contemporary category |
| Diferenças regionais | north/south, food, accents | **gap** |

## 13E flagship set (template validation)

1. `shared-dishes` — À mesa na China  
2. `digital-pay` — WeChat / vida digital  
3. `family-terms` — Família e relações  
4. `thanks-keqi` — 面子 / 客气  
5. `metro-qr` — Transporte urbano  

Depth schema: `src/data/cultureDeepSchema.ts` (`FLAGSHIP_DEEP`).

## Gaps (high value, for 13F)

WeChat social life · mobile payments depth · delivery · regional differences · work hierarchy · school/exams · housing · modern dating/family · high-speed rail · gift etiquette · 面子 / guanxi expansions.

## Rules

- Depth > count — no mass 200-card generation in 13E.  
- Culture never blocks Mandarin Journey.  
- Absolute stereotypes → human review flags.  
- Deep historical/social claims need source metadata.  
- 13F scales the proven template across the corpus.
