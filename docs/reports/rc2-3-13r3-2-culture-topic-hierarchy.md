# RC2.3.13R.3.2 — Culture Topic Hierarchy & Subtopic Progression

```text
PRE-BETA FREEZE EXCEPTION.

APPROVED CULTURE INFORMATION-ARCHITECTURE CHANGE.

NO NEW CURRICULUM.
NO NEW CULTURE LESSONS.
NO MASTERY CHANGE.
NO ECONOMY CHANGE.
```

## Freeze

`PRE_BETA_FREEZE_EXCEPTION` = `OWNER_APPROVED_CULTURE_INFORMATION_ARCHITECTURE`

Reason: current Culture root mixes topic selection and node progression, creating clutter and poor scalability.

## Parent

| Field | Value |
|---|---|
| Parent PR | #348 |
| Parent HEAD | `86f9dddfc02f7a2ffae90df9eed60d30dfee9c21` |
| Branch | `cursor/rc2-3-13r3-2-culture-topic-hierarchy-af1a` |
| PR | #350 |
| `learnerRuntimeSha` | `02813d55a6a87a06181bac222c503f3fe4bf6373` |
| Fingerprint | `29bb02ec0336` (unchanged) |

## Old Culture architecture

Root simultaneously showed:

- current-path card
- **Trocar de caminho**
- horizontal path chips
- progression bubbles
- current / locked nodes

## New hierarchy

```text
CULTURA (topic hub)
  → TOPIC (rectangular card)
    → SUBTOPIC (existing Culture V2 path)
      → NODES (ProgressionPath bubbles)
```

## Topic grouping table

| Topic id | Title (PT) | Existing path ids |
|---|---|---|
| `vida_cotidiana` | Vida cotidiana | `vida_cotidiana` |
| `relacoes_etiqueta` | Relações e etiqueta | `etiqueta_relacoes`, `familia` |
| `comida_celebracoes` | Comida e celebrações | `comida_mesa`, `festivais` |
| `escola_trabalho` | Escola e trabalho | `escola_universidade`, `trabalho` |
| `cidades_digital` | Cidades e vida digital | `cidades_transporte`, `china_digital` |
| `historia_china` | História da China | `historia_simbolos` |
| `china_contemporanea` | China contemporânea | `china_contemporanea`, `diferencas_regionais` |

All 12 canonical paths mapped exactly once. Orphans = 0. Duplicate memberships = 0. Empty topics = 0.

## Content conservation

| Corpus | Count | Status |
|---|---|---|
| CultureItems | 36 | preserved |
| Culture native | 36 | preserved |
| Journey Culture nodes | 20 | preserved |
| Culture paths | 12 | preserved (now subtopics) |
| FLAGSHIP_DEEP | 11 | preserved |

## Progress migration

- Historical `pathOverride` was session-only (not persisted).
- `longyu.progression.cultureAnchor` values `path:{id}` / `node:{id}` migrate via `migrateCulturePathToTopic`.
- Topic progress = completed eligible nodes / total eligible nodes across child paths.
- No progress reset.

## Routing

| Surface | Route |
|---|---|
| Culture root (topic hub) | `/cultura` |
| Topic detail | `/cultura/topico/:topicId` |
| Culture lesson (unchanged) | `/cultura/:id` → LessonPlayer |
| Node return | `?from=/cultura/topico/{topicId}` |

Back: topic detail → Culture root. Node exit/complete → same topic detail when opened from topic.

## Artifact state

| Artifact | Status |
|---|---|
| #348 DEVICE_QA APK `fc72f9e3…` | **STALE** after R.3.2 runtime |
| New Owner QA APK | NOT_BUILT until hosted green on R.3.2 HEAD |

## Hosted local smoke (Playwright)

| Check | Result |
|---|---|
| Culture root topic hub | PASS (7 cards, Continue, Explore por tópico) |
| No Trocar de caminho | PASS |
| No root path chips / bubbles | PASS |
| Topic detail multi-subtopic | PASS (`relacoes_etiqueta` → etiqueta + família, 2 bubble paths) |
| Back → root | PASS |
| 360×640 horizontal overflow | PASS (none) |

Artifacts: `/opt/cursor/artifacts/culture-root-*.png`, `culture-topic-*.png`, `culture-topic-hierarchy-demo.webm`.

## Physical state

`NOT_RUN` — only real device may set PHYSICAL_PASS.

## Gates

- `validate:culture-topic-hierarchy`
- `gate:rc2-3-13r3-2-culture-topic-hierarchy` (81 mutation kills)
- Fingerprint chain PASS (`29bb02ec0336`)
- Product Truth regenerated PASS
