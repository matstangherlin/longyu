# V4.9.7A.1 — Culture Quest Engine

Cultura deixa de ser artigo+botão Concluir e passa a ser missão: contexto → decisão → feedback → memória → domínio.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#242 — V4.9.7A China Survival I (restaurante)** |
| SHA de origem (HEAD da 242) | `22bdf8c43068d05c2a2b898f34d5e20888c08eda` |
| SHA de merge da #242 | *preencher com o SHA real do merge em `main`* |
| Branch | `cursor/v497a1-culture-quest-6ae2` |
| Fingerprint da Jornada | `f6430d1a11be` (inalterado — cultura não muda o currículo de mandarim) |

Preservado integralmente:

- Restaurant Mission `l26c`, `pedir-cardapio`, `revisao-restaurante`, `imersao-restaurante`
- `CHINA_SURVIVAL_RESTAURANT_ARC`, memória CORE de 菜, tons, listening, produção independente
- 18 CultureItems, fontes, `scope`, rejeições `REJECTED_UNVERIFIED`
- Gates anteriores (culture-content, culture-distribution, china-survival-restaurant, teach-before-test, i18n, sync, validate:beta)

## UX antiga → UX nova

| Antes | Agora |
|-------|--------|
| Card → texto → texto → mini-check → Concluir (3 XP) | Uma tarefa por tela, CTA Verificar/Continuar |
| Hub: chips de categoria + grid de catálogo | Passaporte, próxima missão, rotas, selos, explorar |
| Sem estrelas / selos / review | ★★★, 7 selos, revisão espaçada cultural |
| Touchpoint abre artigo | Touchpoint abre **Culture Mission** |

## Conversão (18/18)

Todos os CultureItems têm missão com contexto, ≥2 tarefas, feedback, memory target, PT+EN.

### Flagship (história + diálogo)

1. `visiting-home` — Jantar na casa de Mei (sapatos, 请进, segunda oferta de chá)
2. `host-insistence` — 再吃一点吧 / 谢谢，我吃饱了
3. `shared-dishes` — almoço com Mei e Wang, pratos no centro
4. `gift-receiving` — duas mãos, 谢谢, abrir ou não
5. `digital-pay` — QR no caixa, 可以刷卡吗？ / 现金
6. `metro-qr` — fluxo na porta, 请问，地铁站在哪里？

### Piloto restaurante (#242)

- `l26` → `host-insistence`
- `l26b` → `shared-dishes`
- `l26c` → `chopsticks-rest` (mesa visual: hashis na horizontal vs. em pé no arroz)

### Curtas (contexto + 2–3 tarefas + recall)

`greetings-nihao`, `thanks-keqi`, `qingwen-ask`, `family-terms`, `teacher-title`, `four-and-eight`, `spring-festival`, `mid-autumn`, `qingming`, `dragon-boat`, `office-hours`, `chopsticks-rest`

## Totais

| Métrica | Valor |
|---------|-------|
| CultureItems convertidos | 18 |
| Flagship | 6 |
| CultureSteps | 99 |
| Story beats | 40 |
| Memory targets | 18 |
| Rotas | 5 |
| Selos | 7 |
| XP da missão | 8 (idempotente `culture-complete:<id>`; replay não duplica) |
| Estrelas | 1 = concluiu · 2 = ≥70% · 3 = ≥90% + recall |
| Review | +1 / +3 / +7 / +21 dias, namespace separado do SRS lexical |

## Rotas

1. Primeiros encontros — 你好 / 谢谢 / 请问
2. Casa e visitas — entrada, insistência, presente, família
3. Mesa chinesa — pratos compartilhados, hashis
4. China cotidiana — QR, metrô, horário, 老师
5. Festivais — Primavera, Meio Outono, Qingming, Barco-Dragão, 4 e 8

## Migração

Persist `longyu-v1` **v22**. `cultureCompletedIds` do v21 viram `CultureMasteryRecord` com **1 estrela** (nunca 3 automáticas), `reviewDueAt` no futuro, memory targets agendados. Arrays antigos permanecem e são union no sync.

## PT / EN

Chrome em `src/locales/pt-BR.ts` e `en.ts`. Copy pedagógica inline nas missões. Diálogo mandarim canônico (谢谢, 请进, 不要了, 买单, 好吃) só cobra o que a Jornada já ensinou.

## Gates novos

- `validate:culture-missions` / `test:culture-missions`
- `validate:culture-memory` / `test:culture-memory`
- `validate:culture-gamification` / `test:culture-gamification`

Mutações 1–12 cobertas (missão ausente, só texto, sem memória, flagship sem decisão, XP no open, replay de XP, 3★ automático, resposta no prompt, review no SRS, sem EN, touchpoint≠artigo, migração v21).

## E2E

`e2e/culture-hub.spec.ts`: hub + próxima missão, feedback contextual (sem "ERRADO"), vitória/estrelas/XP, persistência, PT/EN, l2→missão→volta, **l26c→chopsticks-rest→Jornada**, mobile 390×844.

## Não feito (de propósito)

- V4.9.7B compras / WeChat
- Moeda nova, Culture Streak, loja de badges, AI tutor, Stories, vídeo, Pronunciation Score, Tone Analyzer
- 100 CultureItems
- Transformar práticas em regras absolutas (badge Pode variar)

O foco é: **cultura → experiência → decisão → feedback → memória → domínio**.
