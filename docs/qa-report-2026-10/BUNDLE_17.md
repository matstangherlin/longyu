# Bundle e cache — prompt 17 (LGY-030, R-20)

Medido em 26/10/2026 (horário de Brasília), depois do #374.

## Antes

Build de preview do #374 (`index-CeG2b6kV.js`):

| Chunk | Bruto | Gzip |
|---|---:|---:|
| entry | 2.920.880 | 829.210 |

O entry passa de 2,9 MB porque `src/lib/store.ts` importa `ALL_LESSONS` de `src/data/journey.ts`. Esse arquivo está no grafo congelado do currículo. Tirá-lo do entry é outro passo, com exceção de congelamento.

## Depois

Build de produção deste prompt (`npm run build`):

| Chunk | Bruto | Gzip |
|---|---:|---:|
| `index-Dq20xpJO.js` (entry) | 2.706.227 | 774.387 |
| `react-vendor-CtWOg_9b.js` | 239.320 | 78.674 |
| `supabase-vendor-CQPPzcvI.js` | 214.033 | 55.245 |
| Total do grafo estático de `/` | 3.159.580 | 908.306 |

`/jornada` ainda pede `JourneyPage` à parte (cerca de 56 KB brutos / 18 KB gzip). A meta da R-20 é 307.200 bytes gzip. O gzip medido é 908.306. `enforceGoal` fica `false` em `scripts/bundle-budget.json`. O que o CI barra é o entry passar de 2.706.227 bytes brutos.

O precache do Workbox continua com teto de 3 MB. O entry ficou abaixo disso (2,71 MB). O limite não foi aumentado.

## Cache no Netlify

O bloco `/*` segue com a CSP intacta. Um caminho mais específico só substitui o header que ele mesmo declara. Por isso `/assets/*` ganha `Cache-Control: public, max-age=31536000, immutable` e continua com a CSP de `/*`.

`/`, `/index.html`, `/sw.js` e `/manifest.webmanifest` ficam `no-cache`.

Áudio em `dist/audio/` não tem hash no nome. Não entrou no cache de um ano.

`curl -I` no deploy preview continua humano. Este ambiente não publica o site.
