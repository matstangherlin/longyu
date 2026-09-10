# V4.9.8A.2 — Runtime bug sweep

Auditoria de runtime após o merge da #247 (`26054e95514cc6b2e5ab4839816fbffb79743c3b`). Superfícies: 19 Culture Lessons, Culture Hub, Culture Review, nós CULTURE_LESSON da Jornada, Ligas.

Classificação: **BLOCKER** / **HIGH** / **MEDIUM** / **LOW**. BLOCKER e HIGH entram nesta PR.

## Cultura

| ID | Superfície | Achado | Classe | Estado |
|----|------------|--------|--------|--------|
| C1 | `culture-qingwen-ask` | QA real: “Você lembra?” / “Ordene o pedido…” / zero peças / Verificar. A bridge antiga usava `taskKind: sequence` sem motor no LessonPlayer. | BLOCKER | Corrigido: `sentence_build` real com 请问 / 地铁站怎么走？ / 谢谢. Verificar desabilitado até haver peça. |
| C2 | 19 lessons scored | Contrato de affordance (escolha ≥2, fill com bank, pares ≥2, montagem com peças). | BLOCKER | Gate `validate:culture-playability` — 19/19 PASS, 0 affordance vazia. |
| C3 | LessonPlayer | “Salvar para depois” no meio da aula. | HIGH | Removido do player. Persistência de step continua em `lessonSessionStepById`. Save só no card do Hub. |
| C4 | Flagships | Histórias sem fala Mandarin + áudio (SpeakButton / autoplay / replay). | HIGH | `visiting-home`, `host-insistence`, `shared-dishes`, `chopsticks-rest`, `digital-pay`, `metro-qr`, `bargaining-context`, `gift-receiving` com beats de personagem + `audioText` + MandarinText. |
| C5 | Review | Overlay `culture-seq-*` (sequence fake) podia reaparecer. | HIGH | Review mapeia sequence → `sentence_build`. Variantes sem opções/peças são puladas. |
| C6 | `CultureMissionPlayer` | Código morto ainda no tree; risco de rota pública. | HIGH | Sem rota em `routes.tsx`. Módulo LEGACY só redireciona para `/licao/culture-{id}/player`. |
| C7 | Vitória | Cultura concluída / Perfect / acertos / erros / precisão / XP real. | MEDIUM | `culture.lessonComplete`, chip Perfect em 3★, `culture-score` no modelo padrão. Economia: `LESSON_BASE_XP=10` + `LESSON_THREE_STAR_XP_BONUS=5`. Replay `firstCompletion` → 0. |
| C8 | Hub vs Jornada | Dois caminhos de XP. | HIGH (preexistente, revalidado) | Mesmo `culture-{id}`; `grantXp: false` no patch cultural; `leagueXpKeyLesson`. |
| C9 | Mobile 390 | Peças de “Ordene” abaixo do CTA sticky. | HIGH | E2E 390×844: peça 请问 acima de Verificar. |
| C10 | Resume | Sair no meio e voltar ao step 1. | MEDIUM | Já existia no LessonPlayer padrão (`setLessonSessionStep`). Sem persistência exclusiva de Cultura. |
| C11 | Culture Review | `sentence_build` errado travava sem “Tentar de novo” porque o StepRenderer sempre passava `onMistake`. | HIGH | `engineMistake` só existe quando o player trata o erro. Review mostra retry. |
| C12 | Hub card | `culture-save` era irmão do `Link`, então o e2e não achava o botão. | MEDIUM | `data-testid="culture-card"` no wrapper. |
| C13 | QA PWA | Preview com SW antigo servia o player da #247 (“Salvar para depois” no topo, sem `sentence_build`). | LOW | Não é regressão de código. Atualizar o SW / incognito mostra o bundle desta PR. |

## Ligas

| ID | Superfície | Achado | Classe | Estado |
|----|------------|--------|--------|--------|
| L1 | `/ligas` cloud | Ranking demo / “Aluno 1” para usuário autenticado. `useLeagueData` só ia ao vivo se `authMode === "cloud"`. | BLOCKER | Sessão Supabase promove intent cloud mesmo com `authMode` local stale. Enquanto a sessão não resolve, **não** há bots. |
| L2 | RPC error | Falha de `get_league_standings` virava demo silenciosa. | BLOCKER | Superfície `error` + “Não foi possível carregar a liga.” + Tentar novamente. Cache live opcional. |
| L3 | Standings vazios | Liga live vazia preenchida com bots. | HIGH | Superfície `empty`, copy “Nenhum participante nesta divisão ainda.” |
| L4 | Privacy | Ranking não pode vazar email/id. | HIGH | Parser só usa `display_name`, `avatar_letter`, `weekly_xp`, `rank`, `streak`, `is_me`, `is_pro`. SQL seleciona `p.name`, não email. Fallback `Aluno` (nunca “Aluno Demo”). |
| L5 | Score | XP local total no lugar de `weekly_xp`. | HIGH | Linha usa `row.weekly_xp` do RPC / fixture. |
| L6 | Culture XP → liga | Primeira conclusão cultural fora do pipeline de XP semanal. | HIGH | `claimReward` → `syncLeagueXpToServerAsync` + `add_league_weekly_xp` idempotente por `source_key`. Sem `cultureLeagueXpSync`. |
| L7 | Fixtures | Precisa de A/B/C só em test/dev. | MEDIUM | `leagueLiveFixture` gated por `isTestFixturesAllowed()` (preview/dev). Nunca em `production_beta`. |

## Não BLOCKER / fora desta PR

- V4.9.8B Hotel + Aeroporto — não iniciado.
- Áudio humano gravado — TTS existente.
- Story Mode / IA cultural / Culture Streak / moeda nova — não criados.
- RPC live com 3 contas cloud reais no projeto Supabase de produção — coberto por fixture A=100 / B=80 / C=40 em preview + contrato SQL. Não se inventaram usuários de produção.

## Resultado

Todos os BLOCKER e HIGH desta lista foram corrigidos nesta PR. MEDIUM de resume e vitória também.
