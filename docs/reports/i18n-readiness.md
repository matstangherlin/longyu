# i18n readiness — V4.7.1

Auditoria de identidade de idioma. **Esta PR nao traduz nada para ingles.**
Lancamento atual permanece **pt-BR → zh-CN**.

Gerado com a arvore V4.7.1. Sem catalogo EN. Sem duplicar a Journey.

## Campos canonicos

Nao derivar lingua a partir de `country`. Nao misturar `BR` com `pt-BR`.

| Campo | Significado | Lancamento atual |
| --- | --- | --- |
| `country` | Rotulo de UI do pais (ex.: Brasil) | Brasil |
| `country_code` | ISO 3166-1 alpha-2 | `BR` |
| `interface_locale` | Idioma da interface | `pt-BR` |
| `instruction_locale` | Lingua usada para ensinar | `pt-BR` |
| `native_language` | Lingua principal do aluno | `pt-BR` |
| `target_language` | Idioma estudado | `zh-CN` |

Codigo: `src/lib/i18n/identity.ts`. Persistencia: `public.profiles` (migration `20260827023000_placement_onboarding_handoff.sql`).

## Rota futura (nao implementar agora)

A mesma conta podera ter `instruction_locale` diferente, por exemplo:

- `pt-BR` → `zh-CN` (produto atual)
- `en` → `zh-CN` (futuro)

Nao duplicar banco nem a Journey inteira. O ponteiro pedagogico continua unico; so o envelope de instrucao/significado ganha locale.

## Regra para dados chineses

Dados **canonicos chineses** sao independentes do idioma da interface:

- hanzi
- pinyin
- audio
- estrutura-alvo / target structure

**Nao** duplicar por locale.

Ganham locale somente:

- meaning
- instructions
- hints
- explanations
- contrastes da lingua de origem (pt-BR hoje; en no futuro)

## Classificacao de strings

| Classe | O que e | Onde vive hoje | Locale? |
| --- | --- | --- | --- |
| `APP_UI` | Chrome do app: nav, botoes, vazios, erros de tela | `src/components`, `src/features/*` (exceto marketing/auth) | Sim, futuro `interface_locale` |
| `MARKETING` | Landing, SEO, paginas publicas, Business | `src/features/landing`, `src/features/marketing`, `src/lib/seo.ts`, `src/features/business` | Sim, futuro `interface_locale` (copy de aquisicao) |
| `AUTH` | Login, cadastro, confirmar email, finalizar cadastro, senha | `src/features/auth`, `src/features/onboarding`, Edge `create-account` | Sim, futuro `interface_locale` |
| `PEDAGOGICAL_INSTRUCTION` | Enunciados, titulos de passo, "toque", "diga", feedback de exercicio | `src/data/journey.ts`, `LessonPlayer`, `topicMasterySpecs`, `foundationTopicPlans` | Sim, futuro `instruction_locale` |
| `PEDAGOGICAL_TRANSLATION` | Significado em lingua de origem, glosas, `meaningPt` | `src/data/vocabulary.ts`, `gloss.ts`, chunks, Atlas | Sim, por `instruction_locale` / native |
| `SOURCE_LANGUAGE_SPECIFIC` | Fonetica e contrastes feitos para falante de portugues (ex. "nao e o 'r' do portugues") | `src/data/pinyinLab.ts`, `toneTrainer.ts`, `errorDiagnosis.ts`, `perceptionDrills.ts` | Sim, e **nao** reutilizar cegamente em `en` |
| `CHINESE_CANONICAL` | Hanzi, pinyin, audio, ordem estrutural | `src/data/characters.ts`, `hanziAtlas.ts`, `chunks.ts`, audio TTS | **Nao**. Um so acervo. |
| `LEGAL` | Privacidade, termos, consentimento | `src/features/privacy`, copy de telemetria | Sim, locale juridico (pode divergir da UI) |
| `EMAIL` | Confirmacao, reset de senha | Supabase Auth templates (projeto, nao neste repo) + mensagens Edge | Sim, templates por locale no provedor |

## Areas com texto hardcoded (principais)

Nenhuma destas listas e um inventario linha a linha. Sao as superficies que uma futura extracao deve priorizar.

### APP_UI

- `src/components/layout/nav.tsx` — Jornada, Treino, Revisao, Missoes, etc.
- `src/components/layout/AppShell.tsx`, `TopBar.tsx`, `TabBar.tsx`, `Sidebar.tsx`
- `src/features/journey/JourneyPage.tsx`
- `src/features/treino/TreinoPage.tsx`, `src/features/revisao/RevisaoPage.tsx`
- `src/features/missoes/MissoesPage.tsx`, `src/features/loja/LojaPage.tsx`
- `src/features/settings/SettingsPage.tsx`, `src/features/perfil/ProfilePage.tsx`
- `src/components/system/ErrorBoundary.tsx` — "Carregando…", erros de tela
- `src/lib/auth/localAuthPolicy.ts` — `BACKEND_UNAVAILABLE_MESSAGE`

### MARKETING

- `src/features/landing/LandingPage.tsx` — hero, CTAs, "PT-BR → Mandarim"
- `src/features/marketing/MarketingPage.tsx` + rotas SEO em `src/lib/seo.ts`
- `src/features/business/BusinessPage.tsx`
- `public/robots.txt`, `index.html` meta, JSON-LD `inLanguage: pt-BR`

### AUTH

- `src/features/onboarding/ComecarPage.tsx` — funil /comecar (objetivos, autoavaliacao, CTA de conta)
- `src/features/auth/LoginPage.tsx`, `ConfirmEmailPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- `src/features/auth/FinalizeCadastroPage.tsx` + `src/lib/auth/onboardingCopy.ts`
- `src/features/onboarding/LegacyLocalMigrationPage.tsx`
- `src/services/authService.ts`, `supabase/functions/create-account/index.ts` (anti-enum em pt-BR)

### PEDAGOGICAL_INSTRUCTION

- `src/data/journey.ts` — titulos de fase/unidade/licao e corpos de `intro`
- `src/data/topicMasterySpecs.ts`, `topicMasteryBonus.ts`, `foundationTopicPlans.ts`
- `src/features/lesson/LessonPlayer.tsx` — chrome de atividade ("Confirmar", "Entendi", "Continuar")
- `src/data/productionTasks.ts` — enunciados em pt-BR
- `src/lib/placement/questions.ts` — prompts do Placement 2.0 em pt-BR

### PEDAGOGICAL_TRANSLATION

- `src/data/vocabulary.ts` — `meaningPt`, `notePt`
- `src/data/gloss.ts`, `src/data/chunks.ts`
- `src/data/hanziAtlas.ts` / importacoes de significado
- Exercicios `meaning` / reverse recall que mostram portugues

### SOURCE_LANGUAGE_SPECIFIC

- `src/data/pinyinLab.ts`, `src/data/toneTrainer.ts`, `src/data/perceptionDrills.ts`
- `src/data/errorDiagnosis.ts` — razoes de erro em analogia com o portugues
- Comparacoes de som (ex. "nao e o X do portugues") e dicas de tom para BR
- Placement e LessonPlayer usam `toLocaleLowerCase("pt-BR")` em normalizacao de resposta — isso e regra de matching, nao copy, mas e especifico da lingua fonte

### CHINESE_CANONICAL

- `src/data/characters.ts`, `src/data/radicals.ts`, `src/data/hanziBuilder.ts`
- `src/data/hanziAtlas.ts` (forma, leitura, audio)
- Campos `hanzi` / `pinyin` / `audioText` em journey, chunks, conversation scenes
- TTS / `SpeakButton` — o texto falado e chines, independente da UI

### LEGAL

- `src/features/privacy/PrivacyPage.tsx`
- Modal de telemetria (`src/components/privacy/*`)
- Copy de exclusao de conta em `src/features/account/AccountPage.tsx`

### EMAIL

- Templates de confirmacao / recovery no projeto Supabase (fora desta arvore)
- Mensagens genericas de `create-account` e `resendConfirmationEmail` (pt-BR no cliente)

## Edge / services

Mensagens de usuario em pt-BR (nao EN) em:

- `supabase/functions/create-account/index.ts`
- `supabase/functions/commit-placement/index.ts`
- `supabase/functions/finalize-onboarding/index.ts` (codigos `missing_draft` / `commit_failed` mapeados no cliente)
- `src/services/authService.ts`, `cloudSyncCoordinator.ts`, `placementCommit.ts`

SQL / RPC usa identificadores em ingles e comentarios em portugues ASCII. Nao e copy de UI.

## O que esta PR nao faz

- Nao adiciona dicionario EN
- Nao envolve i18n library (`react-i18next`, etc.)
- Nao duplica licoes
- Nao muda `target_language` do lancamento

Proximo passo futuro: extrair `APP_UI` + `AUTH` primeiro; manter `CHINESE_CANONICAL` como fonte unica; so entao ramificar `PEDAGOGICAL_TRANSLATION` e `SOURCE_LANGUAGE_SPECIFIC`.
