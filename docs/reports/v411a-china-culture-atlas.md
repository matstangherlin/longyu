# V4.11A — China Culture Atlas

## Remessa V4.11A.2 — Culture Hub 2.0 + Source Truth + Flagship Culture Wave

### Identity

| Field | Value |
|-------|-------|
| START_SHA | `b83ccdb5c83f39f75fe9209676a30b2751151bfe` |
| BASE_MAIN_SHA | `40be45dd040c687cfbb710997abe099f9bc3b394` |
| Branch | `cursor/culture-hub-2-5b4f` (from `claude/bold-wright-7y973w`) |

### BEFORE (at START_SHA)

| Metric | Value |
|--------|-------|
| CultureItems | 20 |
| Culture Native Lessons | 20 |
| Journey Culture nodes | 20 |
| Festivals | 4 |
| History | 0 |
| Legends/Literature | 0 |
| Symbols | 1 |
| Life in China | 15 |
| Core Mandarin lessons | 134 |
| Teaching topics | 113 |
| Journey fingerprint | `7c054f2255e7` |

### Source audit (holiday2026)

| Item | Before | Decision |
|------|--------|----------|
| four-and-eight | chinaOrgTaboos + holiday2026 | Removed holiday2026 (not year-specific claim) |
| spring-festival | govSpringFestival + holiday2026 + holidayEn | Kept evergreen + annual; added `yearFacts[2026]` |
| mid-autumn | holiday2026 + holidayEn only | Added Britannica evergreen + yearFact |
| qingming | holiday2026 + holidayEn only | Added ihchina + UNESCO solar terms + yearFact |
| dragon-boat | UNESCO + China Culture + holiday2026 | Already had evergreen; holiday2026 remains year_specific |

**Policy:** `holiday2026` is valid for `year_specific` / public-holiday schedule claims only. It cannot be the sole source of an evergreen festival claim.

### Hub before → after

| Before | After |
|--------|-------|
| Primary discovery = CATEGORY_FILTERS | Primary = 5 CULTURE_COLLECTIONS cards |
| Flat card grid | Featured (≤3) + collection grid + secondary topic filters |
| Empty shelves showed nothing useful | History shows "Em preparação" (no fake 0/0) |
| No collection route | `/cultura/colecao/:collectionId` |

### Featured

`CULTURE_FEATURED_ITEMS` = `spring-festival`, `sun-wukong`, `chinese-dragon`

### Content wave

| ID | Action | kind | Placement |
|----|--------|------|-----------|
| spring-festival | EXTENDED | festival | Journey (existing) |
| lantern-festival | NEW | festival | hub-only |
| chinese-dragon | NEW | symbol | hub-only |
| sun-wukong | NEW | literature | hub-only |
| journey-to-the-west | NEW | literature | hub-only |

### AFTER

| Metric | Value |
|--------|-------|
| CultureItems | **24** |
| Culture Native Lessons | **24** |
| Journey Culture nodes | **20** (unchanged count; 4 hub-only) |
| Festivals collection | 5 |
| History | 0 (preparing) |
| Legends & Literature | 2 |
| Symbols | 2 |
| Life in China | 15 |
| Core Mandarin lessons | **134** |
| Teaching topics | **113** |
| Journey fingerprint | **`943a8f9fb720`** (real; advanced from `7c054f2255e7` because `cultureNative.ts` + `cultureLessons.ts` are CURRICULUM_SOURCES — hub-only wave). Core 134 / topics 113 unchanged. Freeze updated with explicit justification. |

### Gates added

- `validate:culture-source-coverage` / `test:culture-source-coverage`
- `validate:culture-festival-date-policy` / `test:culture-festival-date-policy`
- `validate:culture-truth-classification` / `test:culture-truth-classification`
- `validate:culture-legend-vs-history` / `test:culture-legend-vs-history`
- `validate:culture-no-lexical-pollution` / `test:culture-no-lexical-pollution`
- `validate:culture-hub-collections` / `test:culture-hub-collections`

### Mutations covered (this remessa)

Hub ignores collections · featured missing id · evergreen-only-annual · yearFact 2027×holiday2026 · yearFact without verifiedAt · Lantern without source · Wukong/Xiyouji as history · biography without frame · dragon universalisation · 孙悟空 in newRefs · 西游记 SRS seed · culture→weak lexical · empty 0/0 UX · hub-only fake node (integration)

### Stop condition (V4.11A.2)

Next remessa stacked: **V4.11A.3 — China History Essentials + Culture Atlas Closure + RC2 Content Freeze**.

---

## Remessa V4.11A.3 — China History Essentials + Atlas Closure + RC2 Content Freeze

### Identity

| Field | Value |
|-------|-------|
| START_SHA_REAL | `30aef8101d7022843fda6a3c5b09985500d16f65` (#266 HEAD ancestor) |
| Branch | `cursor/culture-history-essentials-5b4f` (stacked on `cursor/culture-hub-2-5b4f`) |
| PR base | `cursor/culture-hub-2-5b4f` (not `main`) |
| Fingerprint before | `943a8f9fb720` |
| Fingerprint after | **`516692632525`** (real; CURRICULUM_SOURCES include culture native lessons) |

### BEFORE → AFTER

| Metric | Before (#266) | After (V4.11A.3) |
|--------|---------------|------------------|
| CultureItems | 24 | **30** |
| Culture Native Lessons | 24 | **30** |
| History collection | 0 (Em preparação) | **6** |
| Journey Culture nodes | 20 | **20** (history wave hub-only) |
| Core Mandarin lessons | 134 | **134** |
| Teaching topics | 113 | **113** |
| Journey fingerprint | `943a8f9fb720` | **`516692632525`** |

### History items (order)

1. `china-history-timeline` — overview / mental map  
2. `qin-unification` — 秦 Qín  
3. `han-dynasty` — 汉 Hàn (+ 汉字 cultural link)  
4. `tang-dynasty` — 唐 Táng  
5. `song-dynasty` — 宋 Sòng  
6. `ming-qing` — 明/清 late empire  

All six: `kind=history`, hub-only, durable sources (≥ museum / encyclopedia / UNESCO where applicable), teach-before-test, PT-BR + EN.

### Featured

`CULTURE_FEATURED_ITEMS` = `spring-festival`, `sun-wukong`, `china-history-timeline`

### Kind firewall

| Item | kind | Collection |
|------|------|------------|
| sun-wukong | literature | Legends & Literature |
| journey-to-the-west | literature | Legends & Literature |
| chinese-dragon | symbol | Symbols |

### Gates added

- `validate:culture-history-integrity` / `test:culture-history-integrity`
- `validate:culture-history-chronology` / `test:culture-history-chronology`

### RC2_CONTENT_FREEZE

| Field | Value |
|-------|-------|
| `CURRICULUM_FREEZE` | `RC2_CONTENT_FREEZE` |
| `RC_BASE_FINGERPRINT` | `516692632525` |
| `RC2_CONTENT_FREEZE_SHA` | `24ba129d79e61124c7d6dd3aaa3756eb9a6adf40` |
| `RELEASE_CANDIDATE_SHA` / `release_candidate_sha` | **empty** (no deploy candidate yet) |
| Old `40be45d` as RC2 candidate | **superseded** |

### Lexical firewall

History Mandarin labels (秦/汉/唐/宋/明/清) are culture-only: no `newRefs`, no Mandarin SRS seed, Culture Review for mistakes.

### Stop condition (Atlas closed)

**Do not add more Culture content.** Next phase: **RC2 — Public Beta Candidate & Operational Evidence** (live cloud, Stripe, devices, gate:public-beta).
