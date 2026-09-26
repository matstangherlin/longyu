# RC2.2.18 — Progressive Discovery, Guided Coachmarks & Feature Unlocks

Status formal: **NO-GO para Public Beta** (continua dependendo de QA físico, QA humano, requisitos da Play Beta, #273 e do release drill).
Status desta onda: **código pronto e validado na Web/E2E; confirmação física pendente** (nenhum PASS físico foi marcado).

```
FIRST_RUN_COMPLEXITY        = REDUCED
FEATURE_DISCOVERY           = PROGRESSIVE
GUIDANCE_SYSTEM             = READY
CULTURE_UNLOCK              = READY
MOBILE_ONBOARDING_DISCOVERY = READY (web/E2E) · físico NOT_RUN
```

## 1. Base

| | |
|---|---|
| `RC2_2_18_BASE_SHA` | `09041950` = head do #290 (RC2.2.17), **ainda aberto** |
| main no início | `8594baa5` (#289 squash) |
| Branch | `claude/rc2-2-18-progressive-discovery` |

A spec pede executar depois do #290 mergeado **ou** com base definida pelo owner. Como o #290 ainda está aberto, a onda foi **empilhada** sobre o head dele (mesma estratégia das ondas anteriores): mergear o #290 primeiro deixa o diff desta branch só com a RC2.2.18. Nenhum PR foi aberto (o owner faz o PR).

## 2. Registro de disponibilidade (PART A–D, BY, BZ, CR)

`src/lib/progressiveDiscovery.ts` é o **único** lugar que decide quando uma área aparece:

- `FEATURE_AVAILABILITY`: `id`, `route`/`routes`, `navigationPlacement`, `lockedBehavior` (`NEVER_LOCKED` · `HARD` · `SOFT`), `unlockGuidanceId`, `firstUseGuidanceId` e `unlockEvidence` para cada uma das 12 áreas.
- `featureVisibility(id, learnerState)` → `HIDDEN` · `PREVIEW` · `AVAILABLE`. É **pura**: mesma entrada, mesma saída, sem relógio, sorteio, dia da semana ou plano Pro (o tipo `DiscoveryLearnerState` nem tem campo de plano).
- `PROGRESSIVE_DISCOVERY_RULES` centraliza os números ajustáveis pelo owner. O gate falha se aparecer limiar solto dentro da função.
- **Derivado, nunca salvo** (PART B/C): nada de `cultureUnlocked = true`. A conta só guarda a **descoberta** (`guidance`: visto / pulado / "agora não" + ligado/desligado). O gate falha se surgir flag de desbloqueio no `AccountSnapshot`.
- **Essenciais nunca trancados** (PART D): Conta, Configurações, Idioma, Aparência, Privacidade, Excluir conta, Ajuda, Acessibilidade e Sair não passam pelo registro. `routeAccess` libera `/config*`, `/conta`, `/privacidade`, `/sobre`, `/mais` sempre.
- Substitui o motor anterior `FeatureDiscoveryCard` / `useFeatureDiscovery` / `featureDiscovery.ts` (removidos: eram um segundo sistema de anúncio com `localStorage` próprio).

## 3. Matriz de desbloqueio (PART CP/CQ)

| Área | Visível no início | Evidência de desbloqueio | Orientação de 1º uso | Pode pular a orientação | Dá para furar o desbloqueio | Efeito na navegação |
|---|---|---|---|---|---|---|
| Jornada | Sim | sempre | coachmark "Tudo pronto…" no card da lição | Sim (Agora não / Pular dicas) | — | aba 1 |
| Praticar | Sim (simplificado) | sempre; anúncio após a 1ª lição | coachmark no Treino recomendado | Sim | — | aba 2; só modos com conteúdo |
| Revisão | Não | 1º item revisável no SRS | coachmark na entrada da Revisão (em Praticar) | Sim | rota abre o estado vazio (SOFT) | dentro de Praticar |
| Hànzì | Não | 3+ Hànzì aprendidos | anúncio "Treino de Hànzì liberado" | Sim | SOFT | sheet Praticar |
| Atlas | Não | 8+ Hànzì aprendidos | anúncio + coachmark no 1º caractere | Sim | SOFT | via Hànzì |
| Cultura | Não | 1º nó CORE de Cultura da Jornada (hoje depois de `l2`) ou qualquer progresso cultural | anúncio + coachmark na missão recomendada | Sim | **Não** (HARD; Pro também não) | aba 3 (entre Praticar e Missões) |
| Missões | Não | 1ª lição concluída | anúncio "As Missões ajudam você a manter uma rotina." | Sim | SOFT | aba 4 |
| Conquistas | Não | 1ª conquista real | o próprio modal da medalha | — | SOFT | Mais |
| Liga | Não | 3 lições concluídas ou já entrou na liga | anúncio (XP de estudo; Pro não muda ranking) | Sim | SOFT | Mais |
| Loja | Não | 1º Qi/Pérola recebido ou gasto | anúncio "Você recebeu Qi" (nunca abre a Loja) | Sim | SOFT | Mais; chip de Qi na TopBar |
| Imersão | Não | 1ª conversa guiada + 8 chunks (mesmo corte do nó de prontidão) | anúncio "conversa mais livre" | Sim | **Não** (HARD) | sheet Praticar |
| Desafio de fase | Não | existe próxima fase válida E já há lição concluída | — | — | a própria página do desafio valida (alvo, marco cultural, cooldown, custo; Pro não fura) — SOFT | botão só na Jornada, nunca desde o onboarding |

`PREVIEW` ("perto do desbloqueio") aparece **só** em Mais › "Depois", no máximo 2 itens, com "🔒 Continue sua Jornada para descobrir." — nada de parede de cadeados (PART AN/AO).

## 4. Navegação inicial (PART BS)

Conta nova (mobile): **Jornada · Praticar · Mais**. O chip de Qi (atalho da Loja) some até a economia ser apresentada. Mais mostra só controles do usuário (Ajustes, Ajuda, Sobre, Dados locais) e, quando existirem, até 2 "próximos".

## 5. Navegação madura (PART BT/BU)

**Jornada · Praticar · Cultura · Missões · Mais**, a mesma barra de antes. A ordem final é fixa no código (`mobileNavForStage` lista a ordem canônica e só filtra). Uma aba que aparece no meio da sessão entra com `longyu-tab-appear` (300 ms; fade simples com movimento reduzido). Sidebar desktop, flyouts e sheets usam o mesmo filtro.

## 6. Orientações automáticas na primeira sessão (PART AS)

Máximo **2**: (1) o coachmark de boas-vindas na Jornada; (2) **uma** orientação depois da primeira atividade concluída (na prática, "Novos recursos disponíveis": Praticar + Missões). Nunca 5 em sequência. Consentimento de telemetria é ESSENCIAL (não é orientação) e a orientação espera ele fechar.

## 7. Prioridade (PART P/DR)

`CRITICAL_UX` (boas-vindas) › `FEATURE_UNLOCK` › `PEDAGOGICAL_TIP` (tom) › `OPTIONAL_DISCOVERY` (1º uso, lembrete). Entre modais: conta/segurança/privacidade › bloqueio de aprendizagem › recompensa › descoberta › promoção. Promoção não solicitada do Pro **nunca** antes de 3 lições concluídas (`PROMO_MIN_COMPLETED_LESSONS`).

## 8. Orçamento de sessão (PART J/BC/BD/DQ)

- `GuidanceOrchestrator` (`src/lib/guidanceOrchestrator.ts`, puro) + `GuidanceHost` (único dono das orientações, montado só fora do modo foco).
- 1 orientação por sessão (2 na primeira, a 2ª só depois da 1ª atividade). Fila interna: o resto fica para a próxima sessão/momento.
- Vários desbloqueios juntos → **um** "Novos recursos disponíveis" listando no máximo 2.
- Medalha, selo cultural, ofensiva e orientação compartilham `celebrationLock`: nunca empilham (os watchers de ofensiva passaram a esperar a vez).
- Nunca durante lição, pergunta de revisão, fala, tom, conversa, montagem de Hànzì ou prova; nunca com teclado aberto; confere de novo no instante de mostrar.

## 9. Regra da Cultura (PART X/BW/BX)

`FIRST_CULTURE_JOURNEY_TOPIC_ID` é **derivado** de `CULTURE_JOURNEY_PLACEMENT` (primeiro nó CORE na ordem da Jornada = o nó de 你好 depois de `l2`, ~8ª lição). Cultura também libera com qualquer progresso cultural (ex.: o momento cultural opcional depois do 1º tópico). O Culture Gate de Etiqueta Social (antes de `l9`) continua funcionando: a Jornada leva ao item cultural pelo player (`/licao/culture-…/player`), que não passa pelo portão do Hub. `PREVIEW` quando o nó está entre as próximas 2 lições. Pro não antecipa. Texto: "Você já conhece o suficiente para começar a explorar a cultura por trás do idioma." — nunca "você ganhou".

## 10–16. Demais regras

| Área | Regra |
|---|---|
| Praticar (10) | sempre na barra; anúncio "Praticar foi liberado" depois da 1ª lição; a página mostra o Treino recomendado primeiro, Revisão e erros detalhados só com itens (sem teaser Pro sem o que revisar) |
| Hànzì (11) | `learnedChars ≥ 3` (dados reais); PREVIEW com 1–2 |
| Atlas (12) | `learnedChars ≥ 8` (primeiro corpus estrutural); coachmark "Toque em um caractere…" |
| Missões (13) | primeira lição concluída; texto sem urgência |
| Liga (14) | 3 lições concluídas ou já entrou; nunca "idade da conta" |
| Loja (15) | Qi/Pérola recebido ou gasto; o anúncio só fecha ("Ver depois") |
| Imersão (16) | ≥1 conversa guiada + repertório do nó de prontidão; HARD fora da Jornada (entrada com `journeyNode` segue a autoridade do `JourneyNodeGate`) |

## 17. Capturas

`e2e/rc2-2-18-screenshots.spec.ts` (`SHOT_PACK=1`) → `docs/reports/rc2-2-18-screenshots/`, 390×844 e 360×740: conta nova, depois da 1ª lição, marco de Hànzì, desbloqueio da Cultura, conta madura (Jornada + Mais), deep link trancado, 1º uso da Cultura, Ajustes › Dicas guiadas.

## 18. Dispensar (PART AZ/BA/BB)

| Botão | Efeito |
|---|---|
| Entendi / CTA | visto (`SEEN`), nunca volta |
| Agora não | `SNOOZED` por 24h e nunca na mesma sessão |
| Pular | só esta dica, para sempre (`SKIPPED`) |
| Pular dicas | desliga todas as não essenciais (`enabled=false`) |
| Escape / VOLTAR do Android | = ação secundária (Agora não / Pular) e **fecha antes** de navegar |

Sair da tela com a orientação aberta = vista (não persegue o aluno). "Rever dicas do aplicativo" zera só o visto.

## 19. Dicas desligadas (PART H/CX/DX)

Ajustes › Aprendizagem › **Dicas guiadas** (liga/desliga) + **Rever dicas do aplicativo**. Desligado: nenhuma orientação não essencial; as áreas continuam liberando (a regra nem lê a preferência) e o app inteiro segue usável (E2E CW/CX).

## 20. Acessibilidade (PART DD–DG)

`role="dialog"` não modal, rotulado e descrito; foco vai para o botão principal; botões ≥ 48px; nunca um X minúsculo como única saída; `data-native-back-dismiss` + Escape; balão calculado por `computeCoachmarkPosition` (puro): dentro da tela, fora da status bar/barra inferior/navegação e sem cobrir o alvo quando há espaço; movimento reduzido → fade; desbloqueio ≤ 500 ms com 1 haptic e um som discreto já existente; coachmark comum e dispensar sem haptic.

## 21. Teste físico

**NOT_RUN.** `android-physical-qa.json` ganhou 12 campos RC2.2.18 (`NOT_RUN`) e o risco `ANDROID_RC2_2_18_DISCOVERY_UNVERIFIED` (P1_CANDIDATE). Roteiro: cadastro → Jornada → 1ª lição → desbloqueio → dispensar → reiniciar → não repete; em 360×740: balão fora da tela / sob status bar / cobrindo CTA; VOLTAR fecha o balão antes; microfone pedido só na 1ª atividade de fala; lembrete só depois da 1ª sessão.

## 22–23. P0 / P1

| Nível | Situação |
|---|---|
| P0 | nenhum conhecido |
| P1 | confirmação física (coachmark em aparelho pequeno, VOLTAR, permissões progressivas) pendente |

## Permissões progressivas (PART BM–BQ)

O intro combinado do primeiro launch (RC2.2.13: notificações **e** microfone em sequência) **saiu**. Agora: microfone só na primeira atividade de fala, com a frase "Para praticar sua fala, o Longyu precisa usar o microfone." antes do diálogo do sistema ("Não posso falar agora" = Agora não; negado → abrir Ajustes, sem pedir de novo); notificação como oferta do orquestrador (só Android, só depois da 1ª lição, só se o SO ainda não decidiu). O gate da RC2.2.13 foi ajustado só onde esse contrato mudou (mesmos códigos de falha).

## Inventário de popups (PART DO)

`docs/release/rc2-2-18-guidance-inventory.json` classifica os 25 arquivos que renderizam dialog/modal/popover (ESSENTIAL, GUIDANCE, ERROR, CONFIRMATION, REWARD, PROMO). O gate falha se surgir um modal novo fora do inventário.

## Sincronização (PART CA–CC)

A disponibilidade funciona offline (derivada do estado local). `guidance` fica no snapshot da conta: viaja no snapshot de progresso existente, sem mudança de esquema na nuvem. #273 segue congelada e não foi tocada. Enquanto o store não hidrata, nenhuma aba some/volta (memória de sessão da última disponibilidade confirmada).

## 24–25. Fingerprint e contagens

| | |
|---|---|
| Fingerprint | `c48b008c9c1e` (**sem mudança**: onda só de apresentação/navegação) |
| Contagens | 134 lições · 113 tópicos · 30 CultureItems · 30 Culture Lessons · 20 nós · 5 Moments · 12 Tone Transfers · 31 READY · 0 PARTIAL (sem mudança) |
| Exceção de freeze | `RC2_2_18_PROGRESSIVE_DISCOVERY_EXCEPTION` |

## 26. Gates

- **`gate:rc2-2-18-progressive-discovery`**: 6 áreas (validate + test), **64 mutações**, todas mortas com o código certo. As 38 da lista DZ mais 26 extras (permissões, inventário, promoção, ordem da barra, cópia, evidência física, E2E). Os módulos puros são **empacotados a partir do texto** (esbuild): a mutação é executada, não só procurada.

  | Área | Mutações |
  |---|---:|
  | feature-registry | 17 |
  | guidance-orchestrator | 16 |
  | navigation-disclosure | 7 |
  | guidance-surfaces | 7 |
  | guidance-copy-settings | 6 |
  | discovery-release | 11 |

- Entrou em `validate:beta` e nos workflows `android-build` / `android-release`.
- Gates anteriores ajustados só onde o contrato mudou: 2.2.13 (barra filtrada pelo registro; intro de permissões substituído pelo pedido progressivo).
- **E2E:** `rc2-2-18-progressive-discovery` (CT, CU, CV, CW, CX, CY, CZ, DA, DB, DC ×3 viewports, DE, CN, BD, K, Ajustes). Resultado da suíte completa: ver "Regressão" abaixo.

## Regressão

Rodada completa local, equivalente ao CI (Chromium, mobile-chrome, tablet retrato/paisagem, movimento reduzido — 959 testes):

| Resultado | Qtde | Observação |
|---|---:|---|
| Passaram | 896 | inclui as 20 do `rc2-2-18-progressive-discovery` e as suítes antigas ajustadas às sementes de descoberta |
| Flaky | 1 | `lesson-step-progression › image_choice` (passou no retry; mesmo teste já oscilava antes desta onda) |
| Falharam | 2 | `journey-redesign` › chevron do "Rever lição" e CTAs compactos no desktop — **só neste contêiner** (métrica de fonte sem as fontes do sistema do runner do CI); verdes no CI da #290 com a mesma árvore da Jornada |
| Pulados | 60 | condicionais de projeto (ex.: `SHOT_PACK`, varreduras só no Chromium) |

WebKit e Firefox (bloqueantes no CI) não instalam neste contêiner (download do navegador bloqueado pelo proxy): rodam no CI da PR.

- `npm run validate:beta` completo: **verde** (typecheck, i18n, encoding, currículo/fingerprint, todos os gates RC2.2.x e `gate:rc2-2-18-progressive-discovery` com 64 mutações mortas).
- Ajustes feitos durante a rodada: `validate:i18n` passou a conhecer os namespaces `guidance` e `discovery`; comentários com "SESSÃO"/"NÃO" em caixa alta reescritos (o `validate:encoding` lê "Ã" maiúsculo como mojibake).

## Pendências honestas

1. QA físico (Android real, 360×740 inclusive): NOT_RUN.
2. Central "Primeiros passos" (PART DU, opcional): não feita nesta onda.
3. Cross-device de dicas vistas (PART CB): depende do sync formal (#273 congelada).
4. #290 precisa ser mergeado antes (esta branch está empilhada).
