# RC2.2.14B: detecção automática de idioma e escolha do curso

Roda junto da RC2.2.14 (mesma branch `claude/admiring-cray-4fx10i`). Não
substitui a RC2.2.14. O owner abre o PR.

**Regra central**
- **Interface** (menus): detecção automática do idioma do sistema. A escolha manual prevalece.
- **Curso** (explicações, traduções, dicas e glosas): escolha explícita.
  - O idioma do aparelho só recomenda um curso, e só quando corresponde a um curso disponível. Nunca seleciona sozinho.
  - Hànzì, pinyin, áudio e nomes são os mesmos em qualquer curso.

---

## 1. Base SHA

| | |
|---|---|
| Base | `origin/main` `0c5ad5ae8fb0964f10574c8049b9095b392775b0` (#287) |
| Branch | `claude/admiring-cray-4fx10i` (RC2.2.14 + RC2.2.14B) |
| Fingerprint do currículo | `c48b008c9c1e` (inalterado) |
| #273 | intocada |
| Migration Supabase | nenhuma |

A coluna `profiles.instruction_locale` já existia: é gravada no cadastro pela
edge function `create-account` e tem política RLS de update-own. Ela é
reutilizada como o curso da conta.

## 2. Idiomas de interface suportados

`SUPPORTED_INTERFACE_LOCALES` em `src/i18n/config.ts`:

| Locale | Rótulo |
|---|---|
| `pt-BR` | Português (Brasil) |
| `en` | English |

## 3. Cursos suportados

`COURSE_DIRECTIONS` em `src/i18n/courseDirection.ts`. É um registro de dados: o
picker, a recomendação, Configurações e o chip do onboarding renderizam a
partir dele.

| id | fonte | instrução | alvo | disponível |
|---|---|---|---|---|
| `pt-zh` | pt | `pt-BR` | zh | sim |
| `en-zh` | en | `en` | zh | sim |
| `es-zh` | es | — | zh | não (registrado) |
| `fr-zh` | fr | — | zh | não (registrado) |
| `de-zh` | de | — | zh | não (registrado) |

**Para abrir um curso novo**
1. Marque `available: true`.
2. Defina `instructionLocale`.
3. Registre as traduções/overlays desse idioma.

O onboarding não precisa ser redesenhado. O gate `COURSE_LIST_HARDCODED`
impede que um componente de UI escreva a lista de cursos à mão.

Na UI em PT, os cursos aparecem como "Português → Mandarim" e "Inglês →
Mandarim". O nome do idioma vem de `Intl.DisplayNames` no idioma da interface.

## 4. Regras de resolução pelo sistema

**Fonte única**
- `src/lib/platform/systemLocale.ts` lê `navigator.languages`.
- No Android, o WebView do Capacitor expõe ali o idioma do aparelho, sem plugin novo.
- Nenhum componente lê `navigator.language` diretamente. O gate `NAVIGATOR_LANGUAGE_SPREAD` só permite os dois pontos de diagnóstico que já existiam.

**`resolvePreferredInterfaceLocale()`** (`src/i18n/locale.ts`):
1. escolha manual (`interfaceLocaleSource = "user"`) → o valor escolhido;
2. idioma do sistema → primeiro idioma suportado da lista:
   - `pt`, `pt-BR`, `pt-PT` → `pt-BR`;
   - `en`, `en-US`, `en-GB` → `en`;
3. nenhum suportado → `en` (fallback do sistema);
4. sem sistema legível (Node, pré-render) → valor salvo, senão o padrão do produto.

**Ordem de boot** (`main.tsx`, antes do primeiro render, então a tela não pisca):
1. `setSystemLanguageProvider(systemLanguageTags)`;
2. `bootstrapInterfaceLocale()`;
3. `onSystemLanguageChange(refreshSystemInterfaceLocale)`;
4. `bootstrapCourseDirection()`.

**Troca do idioma do aparelho com o app aberto**
- Web: o evento `languagechange` chama `refreshSystemInterfaceLocale()`.
- Android: trocar o idioma do aparelho recria a Activity, e a próxima abertura já resolve de novo.
- Nos dois casos, a interface só acompanha no modo "sistema".

## 5. Fallback

- Idioma sem suporte (`es-ES`, `fr-FR`, `de`, `zh-CN`, `ja`) → interface em inglês, sem quebrar e sem recomendar curso.
- A pessoa escolhe o curso normalmente.
- O gate `UNSUPPORTED_LOCALE_UNSAFE` executa o resolvedor com esses idiomas.

## 6. Escolha manual

**Chaves no `localStorage`**
- `longyu:interface-locale`: o idioma;
- `longyu:interface-locale-source`: `system` ou `user`.

**Comportamento**
- Escolher PT ou EN em Configurações grava `user`. O sistema não sobrescreve mais, nem no boot nem no `languagechange`.
- "Usar idioma do sistema" grava `system` e volta a acompanhar o aparelho. A folha mostra "Detectado: …".
- Um valor salvo antes da RC2.2.14B (sem fonte) só existia por escolha manual, por isso é tratado como `user`.
- Mudar a interface nunca muda o curso, e vice-versa. O gate `LOCALE_AND_COURSE_SAME_VARIABLE` cobre isso, e `provider.setLocale` não chama mais `followInterfaceLocale`.

## 7. Seletor de curso

**Tela:** rota `/curso?next=…` (`CoursePickerPage`).
- Eyebrow "🐉 Seu curso", título "Como você quer aprender mandarim?".
- Dois cartões clicáveis por inteiro (`role="radiogroup"` / `role="radio"`).
- Nada vem selecionado. "Continuar" fica desabilitado até a escolha.
- "Recomendado" aparece só quando o sistema corresponde.

**Acessibilidade**
- `aria-label` completo, por exemplo "Português para Mandarim, recomendado, não selecionado".
- A bandeira é auxiliar (`aria-hidden`). O nome do idioma sempre aparece em texto (gate `FLAG_ONLY_LABEL`).

**Háptico**
- `selection` ao tocar num cartão.
- `answerCorrect` (sucesso leve) ao confirmar.
- Nenhum na detecção automática (gate `HAPTIC_ON_DETECTION`).

**Analytics:** `course_direction_selected` com `{ course_direction }`, sem PII (evento local do funil).

**Quando aparece**
- Só quando não há curso. Uma segunda abertura vai direto (gate `PICKER_EVERY_OPEN`).
- "Já tenho uma conta" vai para o login sem picker: o curso da conta prevalece.
- Cadastro e onboarding não perguntam de novo. Mostram "Curso: X · Alterar" (`CourseDirectionChip`, gate `SIGNUP_ASKS_TWICE`).

**Landing do celular / Android**
- O botão e a folha de idioma saíram do header (gate `LANDING_LANGUAGE_CONTROL`).
- Não há botão PT↔EN permanente em lugar nenhum.
- `OnboardingLanguageSwitcher` e `CourseLanguageSwitcher` foram removidos.

**Configurações › Aprendizagem**, seção "Idioma e curso" com duas linhas:
- **Idioma do aplicativo** abre uma folha com:
  - "Usar idioma do sistema" + "Detectado: …";
  - Português (Brasil);
  - English.
- **Curso** abre uma folha com:
  - cartões de rádio;
  - "Isso muda as explicações e traduções. Seu progresso é mantido.";
  - o aviso ao trocar: "Seu progresso em mandarim será mantido. Apenas as explicações e traduções serão exibidas em inglês.";
  - "Alterar curso".

O antigo "Foco do curso" saiu (gate `SETTINGS_NOT_MINIMAL`).

## 8. Integração com o teste guiado

- `/teste-guiado` sem curso redireciona para `/curso?next=%2Fteste-guiado` (gate `GUIDED_WITHOUT_COURSE`).
- A landing já aponta para o picker quando falta curso.
- O teste guiado continua sem persistência de progresso.
- **Textos de ensino** (explicações, traduções, dicas, título final) usam o idioma de instrução do curso (`tc(...)`).
- **Botões e cabeçalho** usam o idioma da interface.
- Hànzì, pinyin e áudio da Lição 1 são os mesmos nos dois cursos.
- O mesmo guard vale para `/comecar` (gate `ONBOARDING_WITHOUT_COURSE`).

## 9. Migração de contas existentes

Ordem de `resolveCourseDirection` (`activeCourseDirection()`):
1. **Curso da conta configurada** (`store.courseDirection`, por conta). É a autoridade.
2. **Escolha temporária do aparelho** (`longyu:course-direction-pending`), feita antes de existir conta.
   - Ao concluir o cadastro, `bootstrapCourseDirection()` a leva para a conta e limpa a pendência (gate `PENDING_NOT_MIGRATED`).
3. **Conta local antiga sem curso** → migra o que ela já usava:
   - o `instructionLocale` salvo (`pt-BR` → `pt-zh`, `en` → `en-zh`);
   - senão a interface escolhida à mão;
   - senão `pt-zh`, o padrão que valia antes.
   - Nunca pelo idioma detectado do sistema. Sem modal e sem refazer o onboarding.
4. **Nada disso** → `null`: a pessoa escolhe.

Contas cloud não herdam o idioma de instrução deixado no aparelho por outra
conta. O curso delas vem do perfil (item 10).

## 10. Comportamento entre aparelhos

**Gravação**
- `chooseCourseDirection()` em conta configurada grava `store.courseDirection`.
- `syncCourseDirectionToProfile()` atualiza `profiles.instruction_locale` e `native_language`, com a política RLS existente.

**Leitura**
- No login ou troca de sessão cloud, `CourseDirectionBootstrap` lê o perfil com `fetchCourseDirectionFromProfile()`.
- Só aplica se a sessão ainda é da mesma conta (`currentAccountId === cloudAccountId(userId)`).

**Resultado:** curso `en-zh` escolhido na Web → Android em PT abre com interface PT e curso `en-zh` (gate `DEVICE_OVERRIDES_COURSE` + E2E "conta com curso salvo").

**Multi-conta / logout**
- `courseDirection` faz parte do snapshot por conta (`snapshotFromState`, `accountFields`, `blankSnapshot`).
- `makeCloudAccount` não herda o curso de outra conta (gate `ACCOUNT_COURSE_LEAK`).

## 11. Preservação do progresso

**Trocar de curso**
- Só grava `courseDirection` e o `instructionLocale` derivado. Mesmo aluno, mesmo perfil.
- Nada muda em:
  - lições concluídas, mastery e estrelas;
  - SRS e erros;
  - XP, ofensiva, fôlego e Qi;
  - hànzì e Cultura.
- Currículo único (canônico + overlays). Não existe `LESSONS_PT`/`LESSONS_EN`.

**Gates**
- `PROGRESS_TOUCHED`: `setCourseDirection` e `chooseCourseDirection` não tocam campos de progresso nem chamam XP/SRS.
- `PROFILE_SPLIT`: não cria conta nem aluno.
- `TARGET_DRIFT`: mandarim é o alvo de todo curso.

**E2E**
- `course-language-switch.spec.ts` compara o snapshot pedagógico antes e depois de ir e voltar entre os cursos.
- `locale-course-direction.spec.ts` confere que lições, XP e SRS continuam iguais depois da troca.

## 12. Screenshots

`docs/reports/rc2-2-14b-screenshots/` (360×740 e 390×844):

| Arquivo | O que mostra |
|---|---|
| `pt-landing-*` | landing em aparelho PT, sem seletor de idioma |
| `pt-course-picker-*` | picker em PT: nada selecionado, "Recomendado" em Português, "Continuar" desabilitado |
| `pt-course-picker-en-selected-*` | English → Mandarin selecionado |
| `en-course-picker-*` | aparelho EN: interface EN, "Recommended" em English |
| `en-landing-*` | landing em aparelho EN |
| `pt-onboarding-course-chip-*` | onboarding com "Curso: Inglês → Mandarim · Alterar" |
| `pt-settings-language-course-*` | Configurações › Idioma e curso |
| `pt-settings-interface-sheet-*` | folha "Idioma do aplicativo" (sistema + Detectado) |
| `pt-settings-course-change-warning-*` | folha de curso com o aviso de troca |

Para gerar de novo:

```
SHOT_PACK=1 npx playwright test e2e/rc2-2-14b-screenshots.spec.ts --project=chromium
```

## 13. Gates

`npm run gate:rc2-2-14b-locale-course-direction` está em `validate:beta`,
`android-build.yml` e `android-release.yml`.

| Par | Mutações | Códigos cobertos |
|---|---:|---|
| `validate/test:interface-locale-resolution` | 9 | PT_OPENS_EN, EN_OPENS_PT, UNSUPPORTED_LOCALE_UNSAFE, MANUAL_OVERRIDE_OVERWRITTEN, SYSTEM_LOCALE_IGNORED, SYSTEM_CHANGE_IGNORED, NAVIGATOR_LANGUAGE_SPREAD |
| `validate/test:course-direction` | 11 | COURSE_AUTO_SELECTED, FALSE_RECOMMENDATION, PICKER_EVERY_OPEN, GUIDED_WITHOUT_COURSE, SIGNUP_ASKS_TWICE, LOCALE_AND_COURSE_SAME_VARIABLE, COURSE_LIST_HARDCODED, TARGET_DRIFT, PROGRESS_TOUCHED, PROFILE_SPLIT |
| `validate/test:course-direction-migration` | 7 | LEGACY_NOT_MIGRATED, ACCOUNT_NOT_AUTHORITY, PENDING_NOT_MIGRATED, ACCOUNT_COURSE_LEAK, DEVICE_OVERRIDES_COURSE, NEW_SUPABASE_MIGRATION, CLOUD_273_TOUCHED |
| `validate/test:mobile-language-ux` | 11 | LANDING_LANGUAGE_CONTROL, SETTINGS_NOT_MINIMAL, SYSTEM_OPTION_MISSING, COURSE_CHANGE_WARNING, A11Y_CARDS, FLAG_ONLY_LABEL, HAPTIC_ON_DETECTION, STARTUP_FLICKER, QA_FIELD_MISSING, PHYSICAL_PASS_WITHOUT_EVIDENCE |
| **Total** | **38** | |

Os resolvedores são executados a partir do texto do estado (esbuild com
arquivos virtuais), então uma mutação no código muda o comportamento testado,
e não só um regex.

**As 20 mutações pedidas** (lista do spec, numerada):

1. Dropdown de idioma na landing: BL1 → `LANDING_LANGUAGE_CONTROL`
2. Sistema ignorado: BL2 → `SYSTEM_LOCALE_IGNORED`
3. PT abre EN: BL3 → `PT_OPENS_EN`
4. EN abre PT: BL4 → `EN_OPENS_PT`
5. Idioma sem suporte quebra: BL5 → `UNSUPPORTED_LOCALE_UNSAFE`
6. Escolha manual sobrescrita: BL6 → `MANUAL_OVERRIDE_OVERWRITTEN`
7. Curso escolhido sozinho: BL7 → `COURSE_AUTO_SELECTED`
8. Picker em toda abertura: BL8 → `PICKER_EVERY_OPEN`
9. Picker para conta configurada: BL9 → `ACCOUNT_NOT_AUTHORITY`
10. Trocar curso apaga progresso: BL10 → `PROGRESS_TOUCHED`
11. Perfil separado por curso: BL11 → `PROFILE_SPLIT`
12. Teste guiado sem curso: BL12 → `GUIDED_WITHOUT_COURSE`
13. Cadastro pergunta duas vezes: BL13 → `SIGNUP_ASKS_TWICE`
14. Conta vaza curso: BL14 → `ACCOUNT_COURSE_LEAK`
15. Aparelho sobrescreve cloud: BL15 → `DEVICE_OVERRIDES_COURSE`
16. Mesma variável: BL16 → `LOCALE_AND_COURSE_SAME_VARIABLE`
17. Lista hardcoded: BL17 → `COURSE_LIST_HARDCODED`
18. Hànzì/alvo muda: BL18 → `TARGET_DRIFT`
19. XP/mastery muda: BL19 → `PROGRESS_TOUCHED`
20. #273 alterada: BL20 → `CLOUD_273_TOUCHED`

Além delas, 18 extras: BL2b–d, BL6b, BL7b, BI, U, T, AK, AL, AI, AA, AY,
AZ, AX, AP, QA1 e QA2.

**Exceção de freeze:** `RC2_2_14B_LOCALE_COURSE_DIRECTION_EXCEPTION` em
`src/lib/curriculumFreeze.ts`. O gate `FREEZE_EXCEPTION_MISSING` confere que
ela existe.

**E2E**
- `e2e/locale-course-direction.spec.ts` cobre:
  - aparelho PT; aparelho EN; aparelho pt-PT, en-GB e es-ES;
  - PT + curso EN;
  - escolha manual e modo sistema, incluindo a troca de idioma com o app aberto;
  - contas antigas pt e en;
  - conta com curso salvo + aparelho EN;
  - onboarding sem pergunta repetida.
- Specs atualizados: i18n-onboarding, v494-onboarding-simplification, course-language-switch, i18n-shell, en-core-surfaces, v491, smoke, beta-smoke, cloud-first-onboarding, guided-learning-try e mobile-landing-focus.

<!-- RESULTS -->

## 14. Fingerprint

| | antes | depois |
|---|---|---|
| Fingerprint | `c48b008c9c1e` | `c48b008c9c1e` |
| Lições / tópicos / … | 134/113/30/30/20/5/12/52/31 READY, 0 PARTIAL | idem |

Nenhuma lição, tópico, CultureItem, StepKind, SRS, moeda ou recompensa nova.
O gate `FINGERPRINT_DRIFT` / `CURRICULUM_COUNT_DRIFT` faz parte de
`validate:course-direction-migration`.

---

## Definition of Done

| Item | Estado |
|---|---|
| Android detecta idioma automaticamente | ✅ no código (`navigator.languages` do WebView). **Aparelho físico: NOT_RUN** |
| Web detecta idioma automaticamente | ✅ E2E |
| Sistema PT → interface PT / sistema EN → interface EN | ✅ E2E + gate |
| Idioma sem suporte → fallback seguro (EN) | ✅ E2E + gate |
| Escolha manual preservada | ✅ E2E + gate |
| Dropdown de idioma fora da landing Android | ✅ |
| CourseDirection separado do idioma da interface | ✅ |
| Picker antes do treino | ✅ |
| pt-zh / en-zh disponíveis | ✅ |
| Recomendação pelo sistema, confirmada pelo usuário | ✅ |
| Escolha persiste; conta cloud mantém a escolha | ✅ E2E local; cloud: código + gate (sem QA cloud, #273) |
| Usuários existentes migrados sem refazer o onboarding | ✅ |
| Trocar curso mantém progresso | ✅ |
| CourseDirection data-driven, pronto para es/fr/de | ✅ |
| Teste guiado respeita o curso; cadastro não repete a pergunta | ✅ |
| Logout/multi-conta seguro | ✅ gate |
| Configurações minimalista | ✅ |
| Sem drift de currículo; #273 intocada | ✅ |

**Bloqueios honestos**
- **Aparelho físico** (idioma do Android, troca de idioma do sistema, háptico no picker): não verificado sem device. Os campos `systemLocaleDetection`, `systemLocaleChange` e `coursePicker` estão NOT_RUN em `docs/release/android-physical-qa.json`, e o gate recusa PASS sem aparelho físico.
- **Sincronização cloud entre aparelhos:** verificada por código e gate, não contra um Supabase de QA. O projeto de QA segue pausado e a #273 intocada.
