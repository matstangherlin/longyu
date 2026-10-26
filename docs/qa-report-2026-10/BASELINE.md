# Linha de base — 26/10/2026 (America/Sao_Paulo)

Prompt 01. Nenhum bug foi corrigido. Produção foi lida só com GET.

## Ambiente

| Item | Valor |
|---|---|
| Data da coleta | 26/10/2026, tarde, America/Sao_Paulo |
| `main` | `98967c393de3bcf6b13611bac5ca01015fbfbee3` |
| Mensagem | Merge #356: RC2.3.13R.3.2.5 — Premium surfaces, reward ritual, resilient states & UX closure |
| Data do commit | 16/10/2026 21:01:29 -0300 |
| Conferência com o pacote | o commit citado no pacote (`98967c39`) é o HEAD do `main` |
| Node | v22.23.4 (`package.json` pede `>=22`; `netlify.toml` ainda diz `NODE_VERSION = "20"`) |
| npm | 10.9.7 |
| Working tree no início | `package-lock.json` modificado só no campo `version` (`0.2.0-rc.2` → `0.2.0-rc.5`). Restaurado. Fora deste PR. `npm ci` passou mesmo com essa diferença no lock commitado |

## SHA em produção

GET `https://singular-meringue-7838cd.netlify.app/version.json` (HTTP 200, 26/10/2026):

| Campo | Valor |
|---|---|
| `commitSha` / `sourceHeadSha` / `workflowSha` | `ec26ffcb05a4d20ec48c69be2d2d44842b6d642e` |
| `shortSha` | `ec26ffc` |
| `branch` | `main` |
| `appVersion` | `0.2.0-beta.1` |
| `environment` | `production_beta` |
| `builtAt` | 08/10/2026 02:36 America/Sao_Paulo (`2026-10-08T05:36:37.673Z`) |
| Commit | `[release] RC2.3.0–RC2.3.9 — Stack convergence… (#320)`, 08/10/2026 02:35 -0300 |
| Ancestral do `main`? | sim |
| Commits `ec26ffc..main` | 197 |
| Bundle de entrada | `assets/index-BAuS39Wg.js`, 2 824 359 bytes, 796 941 gzip |
| SHA dentro do bundle | o SHA completo aparece no JS servido |

`npm run smoke:production` (só GET): passou.

O registro do deploy no painel Netlify não foi aberto. `version.json` prova o que o site serve agora, não quem clicou em Publish.

### Por que o relatório ao vivo pode não bater com o `main`

O build publicado é de 08/10/2026. O `main` andou 197 commits desde então. Quatro deles mexem nos arquivos que o prompt pediu para destacar. `src/services/courseDirectionSync.ts` não mudou nesse intervalo.

| Commit | Quando (America/Sao_Paulo) | Arquivo |
|---|---|---|
| `ebc4ce11` | 08/10/2026 19:08 | cria `knownMissingBackend.json` e `backendCapability.ts` |
| `99e69f4c` | 08/10/2026 22:36 | atualiza `knownMissingBackend.json` |
| `efc6ab1b` | 09/10/2026 13:42 | `src/routes.tsx` |
| `02813d55` | 10/10/2026 02:46 | `src/routes.tsx` |

No `main`, `search_public_profiles`, `user_follows` e `social_activity_events` estão no domínio `social` de `knownMissingBackend.json`, e `backendCapability.ts` pula essas chamadas em `production_beta`. Esse código **não está no build publicado**. O 404 ao vivo em `/amigos` combina com produção antiga, não com uma chamada que fure o gate do `main`. A correção continua no prompt 04; aqui só fica o fato.

`src/routes.tsx` no `main` já usa `lazyNamed`. Mesmo assim o `npm run build` local deste SHA ainda emite um chunk de entrada grande (abaixo). O tamanho de ~2,8 MB em produção não é só "SHA antigo".

### Commits `ec26ffc..main` (197)

```
98967c39 Merge #356: RC2.3.13R.3.2.5 — Premium surfaces, reward ritual, resilient states & UX closure
0fc13534 test(e2e): AUTH-003 confirms the TopBar sign-out
4c770607 RC2.3.13R.3.2.5: stamp runtime 3b1bb08c
3b1bb08c fix(rc2.3.13r3.2.5): register economyPending in the freeze, bound the technical-text regex, accept the R.3.2.5 guards
cff6a3bb RC2.3.13R.3.2.5: stamp runtime 5a9a8ab1, certify, record the #355 merge
5a9a8ab1 fix(rc2.3.13r3.2.5): full-screen sheets ignore the page's stack margin
8846bef0 Merge #355: RC2.3.13R.3.2.4 — Living UI, Chinese ornamental embroidery & motion delight
6ae29736 feat(rc2.3.13r3.2.5): premium surfaces, resilient states, one chest ritual, UX closure
4ee6d1ad RC2.3.13R.3.2.4: classify the 0df0fdc WebKit failure as a pre-existing test race
a3579c2f fix(e2e): decide and click the Tone handoff Continuar in one page task
0df0fdc4 RC2.3.13R.3.2.4: stamp runtime 2618683e, re-measure, pin the scheduler
2618683e fix(rc2.3.13r3.2.4): ambient budget never waits on a suspended frame
6c0330c9 fix(rc2.2.13-gates): read the Qi pill's props in any order
3f66d8f7 fix(android-gates): judge the Capacitor boundary on the syntax tree
a3074c58 RC2.3.13R.3.2.4: emulated 30-minute session evidence
428c769e RC2.3.13R.3.2.4: Living UI gates, evidence, release truth and handoff
053983ab feat(rc2.3.13r3.2.4): Living UI motion system + Chinese ornamental embroidery
16a9184c RC2.3.13R.3.2.3 — Journey SVG Visual Storytelling & stacked waves to main (#354)
64a06df8 test(rc2.3.13r3.2.3): one Journey scene test per matrix row on WebKit
a1c5605b test(rc2.3.13r3.2.3): scope the no-fetch check to scene files
aa801dab RC2.3.13R.3.2.3: stamp runtime d1663614, re-measure layout, guard gates
d1663614 fix(rc2.3.13r3.2.3): drop regex sanitizing from scene markup preparer
810709ca RC2.3.13R.3.2.3: Journey SVG gates, evidence, release truth and handoff.
51548cd0 feat(rc2.3.13r3.2.3): Journey SVG scenes in side lanes + review medallion
05bcf51e test(e2e): LEGIT-skip WebKit clear→rebuild builder; DOM place clicks.
de047fd4 test(e2e): place Hanzi pieces via settle + keyboard fallback.
b8449d18 test(e2e): force WebKit Hanzi Builder piece clicks after clear.
afc6f5fe test(e2e): assert leave-before-evidence on the abandoned tip id
8b372cde test(e2e): Firefox guidance leave via goto; Victory Chromium-only
7b43d954 test(e2e): rapid Culture switch without per-toggle URL waits
af658d56 fix(e2e): typecheck Culture surface locator (.first on Locator)
f9aaa557 test(e2e): align Culture switch contracts with topic restore
4cfeebd8 test(e2e): harden Firefox/WebKit cross-engine contracts
53e900cc test(e2e): wait for conversation continue after GuidedDock check
faa824a2 test(e2e): assert dynamic AULA handoff instead of hidden test.skip
d11c3c21 test(e2e): split handoff vs continue assertion in tone keyboard path
9212d863 test(e2e): avoid strict-mode OR on tone AULA visual assertions
93684958 test(e2e): accept dynamic tone AULA accessible copy in keyboard path
17701f53 fix(e2e): tag standalone conversation_repair for helper recovery
36268fdf fix(e2e): finish dynamic AULA beats and recover repair steps
9a129670 test(e2e): tighten foundation capsuleRoot and shopping bridge probe
a175432a fix(e2e): unblock Chromium stalls from repair beats and dynamic AULA
a87ea035 fix(rc2.3.13r3.2.2.1): allow early TabBar ≤4 after Cultura left bar.
641cbfeb RC2.3.13R.3.2.2.1: stamp certification HEAD to tip after SHA docs.
9954da06 RC2.3.13R.3.2.2.1: advance learnerRuntimeSha after Journey/Culture harden.
01f9ff17 test(e2e): click dock Verificar when advancing conversation scenes
9e8c6078 test(e2e): disambiguate Journey bubble vs Home cognitive clicks
a5f9ce68 test(e2e): align Chromium contracts to topic-hub Culture IA
0357f824 fix(rc2.3.13r3.2.2.1): harden Journey/Culture runtime edges
e681eb7b RC2.3.13R.3.2.2.1: terminal artifact/physical gate and cert scaffolding.
abbe4a04 RC2.3.13R.3.2.2: final visual candidate gate, cert, and owner handoff.
c47bc5b0 docs(rc2.3.13r3.2.1): stamp learnerRuntimeSha for visual polish
824a55de feat(rc2.3.13r3.2.1): align progression axis and add symbolic ornaments
5808e575 fix(rc2.3.13r3.2): register Culture topic detail in smart-back inventory
ea0f95c7 fix(rc2.3.13r3.2): declare Culture topic route and refresh gate registry
87361c12 docs(rc2.3.13r3.2): record local Culture IA smoke evidence
73c0d331 docs(rc2.3.13r3.2): stamp learnerRuntimeSha and refresh Product Truth
02813d55 feat(rc2.3.13r3.2): Culture topic hierarchy hub and subtopic progression
86f9dddf docs(rc2.3.13r3.1.2.1): stamp cert with PR #348 candidate HEAD
3433a703 feat(rc2.3.13r3.1.2.1): hosted-mint gate, historical FP restore, owner handoff
86c6c77c docs(rc2.3.13r3.1.2): point candidate HEAD at typecheck-fix SHA
ad1b8000 fix(rc2.3.13r3.1.2): drop unused selectedImageConceptIds; fingerprint 29bb02ec0336
5e28b1c1 docs(rc2.3.13r3.1.2): record integrity counts and PR #347 candidate HEAD
f233ba0d docs(rc2.3.13r3.1.2): advance learnerRuntimeSha to b6fe9153
b6fe9153 fix(rc2.3.13r3.1.2): same-kind visual repeat, fingerprint advance, artifact gate
5e2519fe fix(rc2.3.13r3.1.1): avoid contiguous continue-on-error in gate source
3c847a1b feat(rc2.3.13r3.1.1): hosted-candidate-rebuild gate and release honesty
719ce024 fix(rc2.3.13r3.1.1): break audio↔store cycle; close EN overlay gaps
a40df3d1 fix(rc2.3.13r3.1): advance fingerprint + refresh product-truth for CI
c68dc428 fix(rc2.3.13r3.1): learning integrity — zero skips, personal audio, distractors, Hanzi fit
4f58397f fix(rc2.3.13r3): unblock Chromium clusters — CURRENT multiplicity, h1, contracts
5482e61e feat(rc2.3.13r3): physical/operational GO honesty scaffold (Part 114 intermediate)
8811deca chore(rc2.3.13r2.1): stamp certificationHeadSha after convergence fixture fix
8612f18d fix(rc2.3.13r2.1): clear CONVERGENCE_HIDDEN_SKIP from R.2.1 mutation fixture
be298366 chore(rc2.3.13r2.1): stamp certificationHeadSha after root-cause fix
2af4dd65 fix(rc2.3.13r2.1): clear SERVICE_ACCOUNT_COMMITTED false positive from R.2 PEM fixture
6b2a9e1f chore(rc2.3.13r2): drop local beta-gates run artifact
d619dfb0 chore(rc2.3.13r2): stamp certificationHeadSha after reconciliation
1bdc72e7 chore(rc2.3.13r2): reconcile Owner QA APK provenance and dual entry states
5c27be36 fix(rc2.3.13r1): align validate:app-environment to 0.2.0-rc.5
a3fa7524 chore(rc2.3.13r1): refresh gate registry after final-pre-beta entry gates
a9c9eedf chore(rc2.3.13r1): stamp certificationHeadSha
ada7b239 chore(rc2.3.13r1): final pre-beta RC identity, gates, owner pack
ce8b7cc8 fix(rc2.3.13r1): restore reduced-motion guidance fade; bump 0.2.0-rc.5
b8f1e8dc chore(rc2.3.13r): separate certificationHeadSha from learnerRuntimeSha
86793207 chore(rc2.3.13r): stamp freeze/cert learnerRuntimeSha
8adc2fb1 feat(rc2.3.13r): typography roles + Journey↔Culture motion closure
51f8bd51 chore(rc2.3.13h1): stamp freeze/cert to tip metadata SHA
1dd1af24 chore(rc2.3.13h1): align freeze/cert SHA to final HEAD
f6f72140 test(rc2.3.13h1): harden sticky chrome E2E against mode-switch race
0d6d4906 chore(rc2.3.13h1): align freeze/cert SHA to final HEAD
f8ad470d chore(rc2.3.13h1): realign freeze/cert SHA after sticky pad fix
56cb0d75 fix(rc2.3.13h1): cancel main top pad so sticky switch does not jump
42cb80da chore(rc2.3.13h1): align freeze/cert SHA to final HEAD
4299a6e7 chore(rc2.3.13h1): stamp UI freeze and cert with wave SHA
bc37bf4b feat(rc2.3.13h1): sticky Global TopBar + progression switch chrome
47dfea75 chore(rc2.3.13h): align freeze/cert SHA to final HEAD
8ce011df chore(rc2.3.13h): stamp UI freeze and cert with wave SHA
ee43fb95 feat(rc2.3.13h): shared ProgressionPath bubbles + dynamic AULA beats
3e175d88 fix(rc2.3.13g): inventariar MicroFeedbackSheet no guidance inventory
1731dfe2 feat(rc2.3.13g): remove Culture bottom tab; beta feedback & learner health
c4006dc2 fix(rc2.3.13f): clear longyu-only scan + culture dragon count 36
a951c45f fix(rc2.3.13f): refresh product-truth after Culture fingerprint advance
40edb946 feat(rc2.3.13f): Culture Deep Expansion — 12 paths, flagships, fingerprint
e870a542 Add RC2.3.13F CultureItem pack: 6 items, short specs, flagship deep
297bc77e fix(rc2.3.13e.1): restore JourneyHandoffBanner on Culture hub entry
e139650f fix(rc2.3.13e.1): restore Culture HubPage density + declare progression i18n
ff8ab1ca fix(rc2.3.13e.1): declare Culture Atlas surface + ProgressionShell freeze honestly
efc6ab1b feat(rc2.3.13e): ProgressionShell Journey↔Culture + Culture Journey primary
bf79f6b7 docs(rc2.3.13d.1): stamp code/emulated proofSha to db777005
db777005 feat(rc2.3.13d.1): code/emulated proof + DEVICE-QA owner pack (no physical PASS)
e86c50ec chore(rc2.3.13d): regenerate product-truth after gate-registry update
26817bc6 feat(rc2.3.13d): mobile physical UX scaffold — RC4 NOT_BUILT, gate, matrix
e8f4090b fix(rc2.3.13c): retarget AUDIO_BLOCKS_CONVERSATION mutation after docked Check
f1ed5533 fix(rc2.3.13c): resolve CheckpointPanel TS2367 after docked Check
324feb29 feat(rc2.3.13c): dock conversation answer CTAs + mid-lesson exit confirm
9b06151f fix(rc2.3.13c): retarget guided-try mutation after CTA hierarchy attrs
64ea3e29 feat(rc2.3.13c): conversation phase chrome + Hànzì hierarchy polish
1f12ad5c merge(rc2.3.13c): sync learning-flow branch with 13B sibling-product scrub
6d0c46b0 fix(rc2.3.13b): scrub sibling-product name for longyu-only-backend
f10cad7e fix(rc2.3.13): scrub sibling-product name from docs/gates for longyu-only-backend
8c513fdb feat(rc2.3.13c): learning flow cognitive polish — one primary CTA per moment
4c97387a fix(rc2.3.13b): allow home i18n namespace in validate:i18n
13178415 chore(rc2.3.13b): regenerate gate registry and product-truth
3c425fd2 test(rc2.3.13b): harden Home E2E seeding and capture viewport screenshots
97fa915a feat(rc2.3.13b): Home cognitive redesign — Continue → Today → Mandarim → Explore
ec50612e chore(rc2.3.13a): stamp product-truth after E2E/i18n align
b1e7e98c fix(e2e): align More/Logout/Conta specs with RC2.3.13A cognitive UI
787adcc5 chore(rc2.3.13a): stamp product-truth to RC2 provenance tip
db1aebda chore(rc2.3.13a): stamp RC2.3.12-RC2 Android provenance (vc 596)
529d2cd4 chore(rc2.3.13a): stamp product-truth after logout gate align
e36deb3b fix(gates): accept SignOutControl in logout discoverability checks
6a44a171 fix(ux): inventory SignOutControl confirm modal for discovery-release
31664696 chore(rc2.3.13a): stamp product-truth after sheet bifurcation
9e63e6f2 fix(ui): bifurcate practice 2-col sheet vs More Options rows
92281a27 chore(rc2.3.13a): stamp product-truth to TabSheet safe-area tip
fc6e9d3e fix(ui): TabSheet safe-area padding matches android-safe-area gate
515aa008 chore(rc2.3.13a): stamp product-truth after version align
17457c39 fix(rc2.3.13a): align VITE_APP_VERSION / app-environment to 0.2.0-rc.2
38497b00 chore(rc2.3.13a): stamp product-truth to cognitive-ui tip
abf24b6d feat(rc2.3.13a): cognitive UI foundation — hierarchy, More Options, Account
9326efbe chore(rc2.3.13): stamp product-truth to tip
e2f492d2 docs(rc2.3.13): record local release-truth and hosted-closure PASS
2d78fd0b chore(rc2.3.13): refresh product-truth after hosted-closure tip
f81125b1 fix(rc2.3.13): ledger freshness + gitleaks-safe hosted closure
23118792 fix(jev): hosted closure — classify migrations, scrub Stripe fixture
681dfffc feat(jev): Wave 3 shadow struggle lab (KEEP_SHADOW)
9fcc6a27 feat(jev): Wave 2 beta triage intelligence (feedback-v2)
5a7ba135 chore(jev): stamp production-parity repoHead at wave tip
2cb1af9f feat(jev): production-parity gate and OA deploy plan (no live mutate)
7c3ced03 feat(jev): validate System One choice/score/noul answers server-side
235cc8f0 docs(rc2.3.13): clarify E2E harness fixes do not void RC1 artifact
a1cd76f9 chore(rc2.3.13): point certification HEAD at E2E version fix
0a82e4f7 docs(rc2.3.13): dual-SHA STOP gate on owner RC1 install checklist
368327ad chore(rc2.3.13): stamp betaOps tip and keep entry honest
e70de50e fix(rc2.3.13): refresh product-truth after dual-SHA ops stamp
4e0c45e5 chore(rc2.3.13): stamp betaOpsHeadSha on dual-SHA identity
2b77ca6b feat(rc2.3.13): closed-beta ops scaffold with hard no-invite-before-GO
2a408216 fix(rc2.3.12c): bind beta-smoke E2E version to package.json
aca759cb feat(rc2.3.12c): certify debug APK/AAB and freeze RC source SHA
2d64f0d7 fix(rc2.3.12b): render structured release.rcCandidate in QA panel
1438b624 docs(rc2.3.12b): link closure to PR #328
e4454467 fix(rc2.3.12b): bind draft versionCode to candidate SHA
c283f68b chore(rc2.3.12b): lock RC candidate and Product Truth to repair SHA
f3827a32 fix(rc2.3.12b): close Android VERSION_NAME drift and certify beta-entry gates
3f38daf7 merge(rc2.3.12b): bring LON-001 probe fix from #326 parent
ca354b02 fix(rc2.3.11): obfuscate LON-001 sibling probe literals
5a402ce8 fix(rc2.3.12): lock RC SHA only after candidate leaves NOT_BUILT
628f2fb3 chore(rc2.3.12): refresh Product Truth and RC candidate to HEAD
4241b0e0 feat(rc2.3.12): declare RC2.3.12-RC1 feature freeze and beta entry gates
8c03f8bf fix(rc2.3.11): regenerate Edge contracts after Stripe live guards
c6197ede fix(rc2.3.11): regenerate gate registry after monetization scripts
d4263b8c feat(rc2.3.11): add monetization gate, blockers, and 12 handoff
440cb6b1 docs(rc2.3.11): commercial research, pricing decision, and unit economics
e0a4c56f feat(rc2.3.11): refuse Stripe live keys on checkout, portal, and webhook
99e69f4c feat(rc2.3.10d): execute independent cloud work; package Batch A apply
b954ff24 fix(rc2.3.10c): keep release-truth green with Batch A down SQL
01644741 docs(rc2.3.10c): clarify Batch A SHA retarget at merge
0f2e2c77 chore(rc2.3.10c): pin Batch A candidateSha to packaging HEAD
2fdcca91 feat(rc2.3.10c): package Batch A and wire single-file production apply
eeb0cafa fix(rc2.3.10c): refresh stripe-webhook edge contract hash
10dbd4bf feat(rc2.3.10c): fail-closed production workflows before any write
ba449b47 merge(rc2.3.10c): stack on #323 after WebKit e2e and CodeQL fixes
a80fb111 fix(rc2.3.10b): escape backslashes before pipes in forensics markdown
d03f6d25 merge(rc2.3.10): bring WebKit capture double from #322 into #323
b0713016 test(e2e): WebKit capture double never constructs MediaStream; step lab waits for the sample swap
b09003df feat(rc2.3.10b): prove production web SHA, column schema diff, privacy proofs
ddafc071 feat(rc2.3.10b): certification gate, Stripe/Edge audits, owner pack, closure
ebc4ce11 feat(rc2.3.10b): security classification, schema fingerprint, backup preflight, client capability gates
93fddf83 feat(rc2.3.10b): semantic migration reconciler, call graph, safe apply plan
0e5e528c fix(rc2.3.10): green hosted Security + beta suites for #322
2b54100a security(rc2.3.10): one bundle secret list for web and APK; Netlify build fails on a leak
81a4c58a test(e2e): contrast produce stage asserts recorder or honest exit by engine capability
c689fc11 docs(rc2.3.10): production truth reports, backup runbook, closure; evidence-file rule
b92b4e81 feat(rc2.3.10): artifact provenance, production truth ledger, cloud matrix, Product Truth v2, optional Sentry
a47a7b47 fix(speech): contrast drill never offers a record button without a capture engine; WebKit double
7d1890ad Pós-#320: main verde (gates de ancestralidade pós-squash) + E2E de fala no Firefox/WebKit (#321)
```

## Gates no `main`

Comandos no SHA `98967c39`, sem corrigir falha nenhuma. Todos passaram.

| Comando | Resultado |
|---|---|
| `npm ci` | passou (544 pacotes, ~5 s). Aviso de `glob`/`source-map` deprecated e 6 vulnerabilidades do audit; não tratado aqui |
| `npm run typecheck` | passou (saída só o cabeçalho do npm) |
| `npm run validate:beta` | passou. 12 suítes, 3 521 396 ms, `failed: null`. JSON em `reports/beta-gates.json` (não versionado; não entra no PR) |
| `npm run build` | passou em ~9 s. Aviso do Vite: chunk > 500 kB |
| `npm run smoke:production` | passou |
| `npx playwright test --project=chromium` | passou. 1063 passed, 144 skipped, 0 failed, exit 0, 42,1 min (14:47–15:29 America/Sao_Paulo) |

Suítes de `validate:beta`:

| Suíte | Tempo |
|---|---|
| release-truth | 99 s |
| learner-systems | 150 s |
| pedagogy-v6-stack | 107 s |
| pedagogy-structure | 443 s |
| pedagogy-mastery | 494 s |
| pedagogy-progression | 812 s |
| conversation-everyday | 294 s |
| culture | 46 s |
| experience | 382 s |
| identity-commercial | 32 s |
| android-foundation | 414 s |
| android-runtime | 248 s |

Efeito colateral: `validate:beta` regravou relatórios já versionados (fingerprint, HEAD, data). Exemplo: `docs/reports/topic-mastery-path.md` saiu de fingerprint `5a64821d0b7d` / HEAD `3c3aa812` para `29bb02ec0336` / `98967c39`. Essas mudanças foram descartadas. O diff deste PR fica só em `docs/qa-report-2026-10/`.

### Build local do `main`

`npm run build` sem `VITE_APP_ENV=production_beta`. O `dist/version.json` saiu `environment: preview`, `testFixtures: true`, `appVersion: 0.2.0-rc.5`, fingerprint `29bb02ec0336`, SHA `98967c39`. Não é o build que o Netlify de produção faria.

O `dist/index.html` aponta para `assets/index-BcjtNKNk.js`: 2 897 372 bytes, 821 836 gzip. O Vite também listou um chunk de entrada de 2 897,61 kB (gzip 822,84 kB). Os dois números são o mesmo tamanho de ordem. R-20 pede JS inicial < 300 KB gzip. Este entry está em ~822 KB gzip. Correção é o prompt 17.

### O que o E2E não cobriu

Chromium: **1207 testes em 125 arquivos**. Resultado: **1063 passed, 144 skipped, 0 failed**, exit 0, 42,1 min. Os skips já estavam na suíte (pacotes de screenshot e pelo menos um caso com título de WebKit). Este PR não alterou `e2e/`.

`npm run test:e2e` também inclui `mobile-chrome`, `tablet-portrait`, `tablet-landscape` e `reduced-motion`. O `playwright.config.ts` ainda tem `firefox`, `webkit` e `mobile-safari`. Esses projetos ficaram de fora. WebKit (LGY-047) não rodou.

## Checklist humano da Fase 0

O agente não executa isto. Ordem:

1. No painel Supabase de produção (`drjcfalvlbbeblmmyhwj`), excluir a conta `longyuqa@mail.grokbot.com` e os dados dela.
2. Redefinir `qa.free@longyu.app` (ficou com 0/5 Cargas e 7 lições) e `qa.pro@longyu.app` (pode ter herdado estado local da Free — LGY-005). Senhas só no gerenciador.
3. No painel do Stripe, confirmar qual modo está ativo. A política do repo diz modo teste; falta a confirmação visual.
4. No Netlify, confirmar qual deploy está publicado. O site servia `ec26ffc` nesta leitura.
5. Ativar branch protection no `main` (prompt 02). O token deste agente recebeu 403 na API de protection: isso não prova que a proteção existe nem que falta.
6. D1–D3 em `DECISOES.md` ainda estão em branco. Confirmar ou trocar o padrão antes do prompt 02.

## Repo

`matstangherlin/longyu` está **público** (`gh repo view`). D2 recomenda privado até a beta pública. Este PR não muda visibilidade.
