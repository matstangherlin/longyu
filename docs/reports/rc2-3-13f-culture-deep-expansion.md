# RC2.3.13F — Culture Deep Expansion

## Mission

Transform Culture from curiosity cards into intentional **scene → context → why → act → Mandarin → decision → transfer** learning, while Culture never blocks Mandarin Journey.

## Before → After

| Metric | Before (13E) | After (13F) |
| --- | --- | --- |
| CultureItems | 30 | **36** |
| Native culture lessons | 30 | **36** (hub-only additions) |
| Journey culture nodes | 20 | **20** (unchanged) |
| Path taxonomy | 5 routes | **12 V2 paths** |
| FLAGSHIP_DEEP | 5 | **11** |
| Curriculum fingerprint | `5a64821d0b7d` | **`fea5455e1461`** (hub-only Culture native entries; Mandarin lesson/topic counts unchanged) |

## 12 paths

1. Vida cotidiana — `delivery-life` (EXPANSION_PENDING)
2. Etiqueta e relações — greetings, 客气, 请问, gifts, **guanxi**
3. Comida e mesa — shared dishes, chopsticks
4. Família — visits, insistence, family terms
5. Escola e universidade — 老师, **Gaokao**
6. Trabalho — office-hours (EXPANSION_PENDING)
7. Cidades e transporte — metro QR, **high-speed rail**
8. China digital — **WeChat life**, digital pay
9. Festivais — Spring / Lantern / Mid-Autumn / Qingming / Dragon Boat
10. História e símbolos — timeline + dynasties + classics
11. China contemporânea — hotel register, bargaining
12. Diferenças regionais — **regional-china** foundation

## New hub-only nodes (6)

`wechat-life` · `high-speed-rail` · `gaokao-context` · `guanxi-relations` · `delivery-life` · `regional-china`

## Corpus mapping

See `docs/culture/culture-v2-inventory.json` — **36/36 mapped, 0 orphans**.

## Freeze honesty

`RC2_3_13F_CULTURE_DEEP_EXPANSION_EXCEPTION` documents intentional Culture count bump. Mandarin lessons/topics, Journey culture nodes, Mastery, SRS, billing, and JEV learner runtime remain frozen.

## Gates

- `gate:rc2-3-13f-culture-deep-expansion` — validate + ≥36 mutation kills
- Parent `gate:rc2-3-13e-progression-shell-culture` remains required

## Known gaps

- Thin paths marked `EXPANSION_PENDING` rather than fake filler
- Viewport emulated proof + hosted E2E stamped after CI green
- No final beta RC mint (13G still ahead)
