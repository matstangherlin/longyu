# RC2.2.32 — Closure

**Wave:** Audio & Learner Experience Consistency  
**Base:** `main` após merge do PR #308 (`d6339330…`)  
**PR title:** `RC2.2.32 — Canonical Voice, Speech UX, Guidance Delivery & Sensory Consistency`

## O que mudou

1. **Voz canônica** — FIXED_CONTENT não cai mais em TTS nativo/web; asset → player → DEGRADED. Instrumentação `FIXED_CONTENT_NATIVE_TTS_FALLBACK`. Superfícies que chamavam `speak()` direto (Tone, Lesson steps, Immersion, Pinyin, gloss, arcade) passam por `playMandarinAudio`.
2. **Fala** — fluxo OUÇA→GRAVE→OUÇA VOCÊ→COMPARE preservado; mensagem humana para falha de reconhecimento; pares de contraste com mesma voz; tip inline na primeira fala.
3. **Guidance** — camada pedagógica INLINE separada do orçamento global; tips em Hànzì, Tone Trace, Image Choice, Contrast, Speech; botão `?`.
4. **Sensorial** — matriz evento→visual/som/haptic documentada; preferência `hapticsEnabled` intacta.
5. **Conversas** — validador de integridade (vazias/cortadas/scaffold); progressão continua state-first.

## O que não mudou

- **#273** — não tocado (billing/cloud/Play Internal)
- Supabase / sync remoto
- Pedagogy V6 (Descoberta obrigatória, orçamento 7–15, etc.)
- Corpus de áudio 657 entradas (sem regeneração)
- Package Android / identity
- Orçamento global de popups (1 / 2)

## Testes

| Camada | Comando / evidência | Estado |
|---|---|---|
| Gates RC2.2.32 | `npm run gate:rc2-2-32` | **PASS** (12 mutações mortas + typecheck) |
| Unit | `npm run test:rc232-unit` | **PASS** |
| Typecheck | `npm run typecheck` | **PASS** |
| Lint/build web | `npm run build` | **PASS** (Vite + PWA; log em artifacts) |
| Android debug APK | `npm run android:debug` | **NOT_RUN** (SDK Android ausente neste ambiente) |
| Emulator / E2E | conforme pipeline | NOT_RUN neste ambiente |
| Físico owner | matriz `docs/release/rc2-2-32-physical-matrix.json` | **NOT_RUN** |

## Status de release (evidência verdadeira)

| Gate | Valor |
|---|---|
| CODE_READY | **YES** (gates + typecheck + web build) |
| WEB_PASS | NOT_RUN (build OK; runtime E2E/owner ainda pendente) |
| APK_PASS | NOT_RUN (sem Android SDK no agent; CI/owner) |
| PHYSICAL_OWNER_PASS | NOT_RUN |

**Não** declarar Closed Beta ready enquanto físicos estiverem `NOT_RUN`.

## Bugs restantes (conhecidos / fora desta onda)

- Profundidade cultural / Visual First / Pedagogy V6 — próximas remessas (RC2.3.x)
- Mapa de Domínio produto — RC2.3.6
- Distribuição visual nas primeiras 20 sessões — RC2.3.1
- Repetição pedagógica 你好 — RC2.3.0

## Confirmação #273

**#273 não foi tocado nesta onda.** Nenhum billing client, nenhuma trilha Play Internal/cloud nova.
