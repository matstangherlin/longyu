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

### Stop condition

**Do not open RC2 yet.** Next remessa: **V4.11A.3 — China History Essentials + Culture Atlas Closure + RC2 Content Freeze**.
