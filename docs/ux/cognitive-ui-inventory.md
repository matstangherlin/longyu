# RC2.3.13A — Cognitive UI inventory

Mapped against tip parent `#330` / `9326efbe`. Audit only for Home and learning flows; structural changes in this wave focus on More Options, Account, Logout, CTA hierarchy.

| Surface | Purpose | Primary action | Secondary | Nav in | Nav out | CTA count (pre) | Obvious problems |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Journey `/jornada` | Continue learning path | Continuar / open next capsule | Review teasers, culture gates | Tab · TopBar | Lesson, culture, review | High | Deferred to 13B home redesign |
| Practice `/treino` | Choose skill drills | Open a practice mode | Sheet of Hànzì/Pinyin/Fala… | Tab sheet | Mode hubs | Medium | Sheet still useful; keep |
| Seu Domínio `/dominio` | Mastery snapshot | Explore domains | Links from Review | Deep / profile | Domains | Low | Not in bottom tab — OK secondary |
| Culture `/cultura` | Culture Journey (ProgressionShell) | Continuar cultura | Atlas `/cultura/explorar`, Review | Tab + segmented switch with Journey | Item pages | Medium | RC2.3.13E — second progression beside Journey; never blocks Mandarin |
| Missions `/missoes` | Daily goals | Claim / open mission | — | Tab | Mission detail | Medium | Gamification — keep secondary weight |
| Profile `/perfil` | Learner identity | Edit / view progress | Conta, amigos | TopBar avatar · More | Conta, social | Medium | Distinct from Conta |
| More sheet | Quick secondary destinations | Open a row | See all options | Tab Mais | Routes · `/mais` | High (pre) | Card grid + primary “Ver menu completo” + full-width Sair |
| More page `/mais` | Full catalog | Open area card | Feedback | Sheet footer · tab | Catalog routes | High | You-block tiles; Sair as wide row |
| Account `/conta` | Auth, security, prefs | Manage account | Delete (danger) | More · Profile | Settings, privacy | High | Sair competed with primary rows; IA scattered |
| Settings `/config/*` | Preferences | Toggle/save | Categories | Conta · More | Subcategories | Medium | Conventional — keep |
| Achievements `/conquistas` | Medals | Browse | — | More progress | — | Low | Must not overpower Journey |
| Leagues `/ligas` | Weekly XP rank | View league | — | More progress | — | Low | Secondary |
| Store `/loja` | Cosmetics / energy | Browse / buy (test) | — | More · TopBar | — | Low | Secondary |
| Lesson shell | Complete activity | Continuar / answer | Listen again | Journey | Victory / next | Medium | Audit-only in 13A |
| Review `/revisao` | SRS round | Começar revisão | Grade buttons | Practice / journey | Dominio | Medium | Audit-only |
| Speech `/fala` | Speaking practice | Record / continue | Fallback CTAs | Practice | — | Medium | Audit-only |
| Hànzì `/ideogramas` | Character practice | Trace / continue | — | Practice | — | Medium | Audit-only |

## One primary purpose (Phase 1)

| Surface | Single job |
| --- | --- |
| More sheet | Reach a secondary destination quickly — not “also log out as hero CTA” |
| Account | Manage identity/security/prefs — logout is last-resort destructive |
| Journey | Continue learning (13B) |

## CTA hierarchy (canonical)

| Level | Treatment | Examples |
| --- | --- | --- |
| Primary | Filled accent | Continuar, Começar, Abrir Praticar |
| Secondary | Outline / row + chevron | Settings rows, Ouvir novamente |
| Tertiary | Text / ghost | Ver todas as opções → |
| Destructive | Text/icon wrong color; confirm for commit | Sair da conta; Excluir uses filled danger only after confirm |
