# Final typography inventory — RC2.3.13R

Semantic roles live in `src/index.css` (`@layer components`):

| Role | Class | Typical use |
|------|-------|-------------|
| Display | `type-display` | Rare hero |
| Page title | `type-page-title` | Journey/Culture headers, PageHeader |
| Section title | `type-section-title` | SectionHeader |
| Card title | `type-card-title` | Culture path, review cards |
| Body | `type-body` / `type-body-strong` | Explanations / emphasis |
| Supporting | `type-supporting` | Subtitles, descriptions |
| Label | `type-label` | Secondary controls |
| Eyebrow | `type-eyebrow` / `type-eyebrow-muted` | CAMINHO ATUAL / PRÓXIMO PASSO |
| Button | `type-button` | Primary CTA text |
| Caption | `type-caption` | Meta |
| Mandarin | `type-mandarin-example` / `type-mandarin-primary` | Learning targets |
| Pinyin / translation | `type-pinyin` / `type-translation` | Support lines |

## Surfaces (13R closure)

| Surface | Page title | Card/section | Body | Eyebrow | CTA | Mandarin |
|---------|------------|--------------|------|---------|-----|----------|
| TopBar | brand wordmark | — | counters `text-[11px]` compact | — | avatar | — |
| Journey / ProgressionShell | `type-page-title` | — | `type-supporting` | — | switch `type-button` | bubbles |
| Culture current path | shell page title | `type-card-title` | `type-supporting` + `type-body-strong` | `type-eyebrow` | Button `type-button` | in nodes |
| Culture path picker | — | — | — | — | `type-label` secondary | — |
| Dynamic Aula | Guided header | — | Teacher bubble | — | lesson CTA | `text-5xl` intentional large |
| Review | `type-page-title` | `type-card-title` | `type-supporting` | `type-eyebrow*` | Button | serif targets |
| Tasks / player | LessonFocusHeader compact | — | step copy | `11px` meta badges | lesson CTA | target roles |
| Modals / feedback | existing | — | body | — | Button | — |
| Bottom nav | — | — | label xs | — | — | — |

## Rules

- Equivalent semantic roles share a class — no random `text-[13px]` vs `text-[18px]` for the same role.
- Mandarin may be larger than Latin; role consistency matters more than identical pixels.
- Secondary actions (`Trocar de caminho`) stay visually weaker than primary CTAs.
