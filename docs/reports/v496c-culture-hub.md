# V4.9.6C — Culture Hub + cultura distribuída

Mandarim + contexto + comportamento + vida real. Sem trivia, sem estereótipo absoluto, sem blog.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | #240 — V4.9.6B aprendizagem integrada (**ainda aberto** no momento desta remessa) |
| SHA de origem | `f5b0cd274537b0cac27ecef6b1890a52e54c576b` (`Atualizar sharp para 0.35.4 e fechar o npm audit`) |
| `main` antiga | **não usada** |
| Branch | `cursor/v496c-culture-hub-6ae2` |
| Fingerprint da Jornada | `43d5272e1d4b` |

Quando #240 mergear, rebasear esta remessa no SHA real do merge — não na `main` antiga.

A V4.9.6B já deixou `Lesson.cultureItemId`. Esta remessa **usa** o campo. A pedagogia 4.9.6B (coerência de conversa, memória de hànzì, tons, rotina/tempo) não foi reconstruída.

## Arquitetura

Duas camadas:

1. **Culture Hub** — rota `/cultura`, aba desktop própria, atalho mobile em Mais.
2. **Cultura distribuída** — no máximo **1** touchpoint por aula, no **final** (vitória do player e card na ficha da aula). Nunca no meio de ditado, conversa, produção, tom ou Hanzi Builder.

Modelo: `src/data/culture.ts` (`CultureItem` com PT+EN, `scope`, `sources`, mini-check, `relatedLessonIds` / chunks / hànzì).

Progresso cultural é **separado** de SRS, hànzì mastery e vocabulário produtivo. Completar um item dá **3 XP** idempotente (`culture-complete:<id>`) e **não** desbloqueia aula de mandarim.

Telemetria local (com consentimento, sem texto privado, sem RPC pedagógico novo): `culture_open`, `culture_complete`, `culture_save`, `culture_from_journey`.

Gancho para V4.9.7–4.9.9: `FUTURE_UNIT_CULTURE_HOOKS` em `src/data/cultureDistribution.ts`. Unidade funcional nova deve escolher cultura no mesmo PR.

## Categorias

| Id | Rótulo PT | Rótulo EN |
|----|-----------|-----------|
| `home_visits` | Casa e visitas | Home and visits |
| `table_food` | Mesa e comida | Table and food |
| `social_etiquette` | Etiqueta social | Social etiquette |
| `gifts` | Presentes | Gifts |
| `school_work` | Escola e trabalho | School and work |
| `festivals` | Festivais e tradições | Festivals and traditions |
| `contemporary_china` | China contemporânea | Contemporary China |
| `daily_life` | Vida cotidiana | Daily life |
| `transport_public` | Transporte e espaço público | Transport and public space |
| `communication_relations` | Comunicação e relações | Communication and relations |

## CultureItems (18)

| id | categoria | scope | min | aulas relacionadas |
|----|-----------|-------|-----|--------------------|
| `visiting-home` | home_visits | broad | 3 | p7-imersao-casa-amigo, l24, l2 |
| `host-insistence` | home_visits | broad | 3 | p7-imersao-casa-amigo, l26, l4 |
| `shared-dishes` | table_food | broad | 3 | l26b, l26, p7-imersao-mercado |
| `chopsticks-rest` | table_food | broad | 2 | l26b, l26 |
| `greetings-nihao` | social_etiquette | informal | 3 | l2, p1-primeira-conversa, l13-dialogo-ola, l3, l29 |
| `thanks-keqi` | social_etiquette | informal | 3 | l4, p1-qingwen-cortesia, l2 |
| `qingwen-ask` | communication_relations | formal | 3 | p1-qingwen-cortesia, l11, p6-cidade-lugares |
| `family-terms` | home_visits | broad | 3 | l24, l25, p7-imersao-casa-amigo |
| `teacher-title` | school_work | formal | 3 | p6-rotina-trabalho, l9, l10 |
| `gift-receiving` | gifts | broad | 3 | l4, p7-imersao-casa-amigo, p1-qingwen-cortesia |
| `four-and-eight` | gifts | regional | 3 | l19, l20, l27, p4-num-45 |
| `spring-festival` | festivals | historical | 4 | l24, l25, p6-rotina-trabalho |
| `mid-autumn` | festivals | historical | 3 | l24, l4, l26 |
| `qingming` | festivals | historical | 3 | l24, p6-rotina-trabalho |
| `dragon-boat` | festivals | regional | 3 | l26, l26b, p6-natureza |
| `digital-pay` | contemporary_china | generational | 3 | l27, p6-compras, p6-survival-mandarin |
| `metro-qr` | transport_public | broad | 3 | p6-cidade-lugares, p7-imersao-estacao, p6-direcoes |
| `office-hours` | school_work | informal | 3 | p6-rotina-trabalho, p6-horarios, l9 |

Cada item tem as sete seções de aprendizagem (situação, perceber, por quê, na prática, variação, mandarim relacionado, mini-check) em PT-BR e EN.

## Fontes

Resumos apenas — texto das fontes não foi copiado.

| publisher | exemplo de URL |
|-----------|----------------|
| UNESCO Intangible Cultural Heritage | https://ich.unesco.org/en/RL/dragon-boat-festival-00225 |
| The State Council of the PRC | https://english.www.gov.cn/news/202412/05/content_WS6750dd47c6d0868f4e8edab6.html |
| General Office of the State Council | https://www.gov.cn/zhengce/content/202511/content_7047090.htm |
| China.org.cn (CICG) | http://www.china.org.cn/travel/beijingguide/2008-05/20/content_15355396.htm |
| China Daily | https://www.chinadaily.com.cn/english/doc/2004-01/09/content_297514.htm |
| People's Bank of China | https://www.pbc.gov.cn/zhifujiesuansi/128525/128545/128643/5589365/index.html |
| Journal of Pragmatics (Gu Yueguo, 1990) | https://doi.org/10.1016/0378-2166(90)90082-O |
| Acta Linguistica Academica | https://doi.org/10.1556/2062.2019.66.2.6 |
| China Culture | http://en.chinaculture.org/2014-12/09/content_584311.htm |
| Haidian District (tradução do aviso de feriados 2026) | https://en.bjhd.gov.cn/workinginhaidian/supportingservices/publicholidays/202512/t20251211_4797062.shtml |

Accessed at: 2026-09-08.

## Itens rejeitados (falta de evidência)

| id | status | motivo |
|----|--------|--------|
| `cold-at-host-home` | **REJECTED_UNVERIFIED** | A afirmação viral de que dizer “estou com frio” na casa de alguém é automaticamente rude não tem fonte institucional/acadêmica sólida. A literatura de polidez documenta o contrário (嘘寒问暖 como cuidado; 今天很冷 como clima). **Não publicado.** |
| `never-finish-or-always-finish-plate` | REJECTED_UNVERIFIED | Guias de viagem se contradizem (esvaziar o prato vs deixar um pouco). Sem norma única oficial. |
| `never-give-umbrellas` | REJECTED_UNVERIFIED | Homófono 伞/散 aparece em listas da internet; suporte oficial/acadêmico insuficiente para afirmação forte. |

O gate `validate:culture-content` **exige** que `cold-at-host-home` permaneça `REJECTED_UNVERIFIED`.

## Unidades e distribuição

Ineligíveis (motivo explícito):

| unidade | motivo |
|---------|--------|
| `u2-1` | Laboratório de contorno tonal |
| `u2-2` | Drill fonético de tons |
| `u4-1` | Radicais como peças lógicas |
| `u4-2` | Laboratório fono-semântico |
| `u5-0` | Lógica de construção de caracteres |
| `u5-1` | Pedagogia de números 1–10 |
| `u5-2` | Alfabetização de compostos, não situação social |

Unidades sociais/cotidianas elegíveis (8) têm ≥ 1 CultureItem relacionado via `relatedLessonIds`.

## Lessons com `cultureItemId` (15)

| aula | CultureItem |
|------|-------------|
| `l2` | greetings-nihao |
| `l4` | thanks-keqi |
| `p1-primeira-conversa` | greetings-nihao |
| `p1-qingwen-cortesia` | qingwen-ask |
| `l9` | teacher-title |
| `l24` | family-terms |
| `l26` | host-insistence |
| `l26b` | shared-dishes |
| `l27` | digital-pay |
| `p6-rotina-trabalho` | office-hours |
| `p6-cidade-lugares` | metro-qr |
| `p6-compras` | digital-pay |
| `p7-imersao-mercado` | shared-dishes |
| `p7-imersao-estacao` | metro-qr |
| `p7-imersao-casa-amigo` | visiting-home |

Nenhuma aula `perception_lab`, laboratório de tom puro ou Hanzi Builder recebeu touchpoint.

## PT / EN

O hub nasce bilingue. Catálogo `culture:` em `src/locales/pt-BR.ts` e `src/locales/en.ts`. Conteúdo pedagógico usa `instructionLocale`. Chrome usa o locale da interface.

## E2E

`e2e/culture-hub.spec.ts`:

1. abrir `/cultura`
2. filtrar categoria
3. abrir item
4. PT-BR
5. EN
6. completar
7. salvar para depois
8. persistir ao voltar
9. abrir CultureItem a partir da ficha da aula
10. voltar exatamente para `/licao/:id`
11. viewport 390×844
12. id inválido → `culture-missing`, rota não quebra
13. player no meio da aula **não** mostra o touchpoint (CTA de vitória continua independente)

## Mobile

Cards com `min-h`, filtros em scroll horizontal, botões `min-h-11`/`min-h-12`, sem hover obrigatório. Barra inferior mobile permanece com 5 abas; Cultura entra em Mais / sidebar desktop após Revisão.

## Gates

- `validate:culture-content` / `test:culture-content`
- `validate:culture-distribution` / `test:culture-distribution`
- Preservados: conversation coherence, hanzi memory, tone integration, routine time
- `validate:i18n`, `test:i18n`, `validate:journey-en`, `validate:lesson-catalog`, `validate:lessons`
- `validate:progress-snapshot`, `validate:sync-merge`
- `validate:beta`, `build`

## Mutações

| # | caso | resultado |
|---|------|-----------|
| 1 | CultureItem sem fonte | `MISSING_SOURCE` |
| 2 | sem EN | `MISSING_EN` |
| 3 | relatedLessonId inexistente | `UNKNOWN_LESSON` |
| 4 | id duplicado | `DUPLICATE_ID` |
| 5 | sem scope | `MISSING_SCOPE` |
| 6 | cultureItemId em aula fantasma | `UNKNOWN_CULTURE_ON_LESSON` |
| 7 | unidade elegível vazia | `ELIGIBLE_UNIT_EMPTY` |
| 8 | touchpoint bloqueia conclusão | player mantém `topic-victory-return`; card é opcional e dismissível |
| 9 | concluir cultura altera Hanzi/SRS | `applyCultureComplete` só devolve ids culturais |

## Pronto quando

1. Aba Cultura funcional (`/cultura`)
2. 18 conteúdos (meta 15–20)
3. Todos com fonte e scope
4. PT-BR e EN
5. Jornada com cultura distribuída (15 aulas)
6. Sem cultura forçada em lab técnico
7. Abrir CultureItem não impede concluir a aula
8. Progresso próprio (persist v21 + merge por união)
9. Currículo atual aponta para o hub
10. Hooks prontos para V4.9.7 / 4.9.8 / 4.9.9
11. `validate:beta` verde
12. `build` verde
