# RC2.2.8 — Learning Experience & Gamification Core

| Campo | Valor |
| --- | --- |
| BASE_MAIN_SHA | `a941d86ac8602c2cb7d378df7d8f8dfd45274840` (#280 MERGED — RC2.2.7 Tone Transfer Closure) |
| Branch | `claude/admiring-cray-4fx10i` (branch designada desta sessão; o briefing sugeria `cursor/rc2-2-8-learning-gamification-`) |
| Fingerprint antes | `327de1df0f33` |
| Fingerprint depois | **`327de1df0f33`** — inalterado |
| Lições / tópicos / CultureItems | 134 / 113 / 30 — **inalterados** |
| Culture Native Lessons / Journey Culture nodes / Culture Moments | 30 / 20 / 5 — inalterados |
| Tone Transfer | 12 tarefas jogáveis (tone tasks total 202) — inalterado |
| Currículo | **nenhuma** lesson, topic, CultureItem, vocabulário ou StepKind novo |
| Verdict Public Beta | **NO-GO** (inalterado — #273 pendente) |

## O que esta remessa muda

O Longyu já ensina muito. Esta remessa não acrescenta conteúdo — ela faz o
produto **parecer vivo e útil**: a revisão ajuda a aprender, o Atlas alimenta
a revisão, a cultura gera selos e medalhas, as medalhas aparecem no perfil, as
Pérolas servem para algo real, o dragão fala na aba Cultura, o sync para de
atrapalhar, a ofensiva para de spammar — e quem já sabe pode provar isso num
desafio sério, caro em Fôlego e com 48h entre tentativas.

O fingerprint não mexeu porque nenhum arquivo de `CURRICULUM_SOURCES` foi
tocado. Isso foi verificado, não presumido (`validate:public-beta-feature-freeze`
e `validate:rc2-content-freeze` compararam contra `327de1df0f33`).

---

## A — Culture Dragon Voice

**Antes:** a aba Cultura não tinha o professor-dragão; `newSeals` era calculado
desde a RC2.2.6 e **ninguém mostrava**.

**Depois:**

- `CultureHubPage` ganhou o `CultureHubGuide`, que usa o **`GuideDialogue`
  canônico** — portanto a voz é o `guideTextBlip` do #279/#280, sem motor novo,
  sem `CultureDialogue`/`GuideV2`.
- **Não fala toda vez (A2).** `src/lib/cultureGuide.ts` decide a fala uma vez,
  ao montar, por prioridade: coleção concluída → primeira visita → missão
  recomendada do próximo marco cultural trancado. Cada fala tem chave; chave
  ouvida não volta. Sem novidade, o dragão fica quieto. Filtro e cards não
  entram na decisão (A2.1/A2.2).
- **Som (A3).** Herdado do GuideDialogue: blips enquanto o texto aparece;
  antecipar completa o texto e `stopGuideTextVoice()` corta na hora; efeitos
  desligados = silêncio; movimento reduzido = texto instantâneo, sem sequência.
- **CultureSealReveal (A4).** Dragão + selo + fala curta + som canônico
  (`missionComplete`). Um reveal por selo, persistido em
  `cultureSealsRevealed` (sincronizado por união). Reload e troca de aparelho
  não repetem. Conta antiga (campo ausente) tem os selos já ganhos contados
  como vistos — a primeira abertura não vira enxurrada de reveals. Suspenso no
  modo foco (lição/teste) e nunca empilhado com o modal de medalha
  (`celebrationLock`: o selo tem a vez; a medalha espera).

## B — Streak Recovery Anti-Spam

**Causa real do spam:** o modal dependia só de `pendingStreakRecovery`. "Agora
não" limpava o pendente, mas `reconcileStreak` o **reconstrói** enquanto a
janela de recuperação está aberta — e qualquer remontagem/pull trazia o modal
de volta.

**Correção:** `src/lib/streakRecoveryPrompt.ts`.

- `streakRecoveryEventKey = conta : dia da quebra : ofensiva recuperável` (B2).
- O prompt mostrado é gravado em **`sessionStorage`** antes de aparecer
  (B2.1), com memória em página como rede de segurança se o storage estiver
  bloqueado. Journey/Cultura/Revisão/Atlas/Loja/Perfil não reapresentam (B2.2).
- **"Agora não" fecha só o prompt (B3).** `clearStreakRecovery` continua
  apagando o pendente e **nunca** a janela `streakRecovery` — o aluno recupera
  estudando depois, e o Perfil segue oferecendo "Recuperar" (verificado no E2E).
- Sessão nova do navegador pode lembrar de novo se a recuperação ainda valer
  (B4); perda nova tem chave nova (B5). `StreakRecoveredBanner` inalterado (B6).

## C — Quiet Sync UX

O mecanismo técnico foi preservado (push por alteração + debounce, flush a cada
30 s, flush ao esconder a aba). O que mudou é **o que aparece na tela**
(`src/lib/syncUx.ts`):

- `pending`/`loading`/`synced` são **silenciosos** no fluxo normal (C1/C2).
- `economyServerBridge.setSyncing` ("Sincronizando Qi…", "Ativando Pro…",
  "Migrando economia…") deixou de virar toast global (C6.1).
- UI global só para **erro** (C3): `markCloudSync("error")` publica uma
  notificação acionável; o mesmo erro é **deduplicado por mensagem numa janela
  de 10 min** (C5) — o flush de 30 s não gera 20 avisos.
- `EconomySyncBanner` continua para erro real de economia (Qi/Carga não
  confirmados, Pro pendente) (C6).
- Estado discreto `✓ Sincronizado · • Salvando… · ! Problema de
  sincronização` (`SyncStatusChip`) em Conta, Perfil e Ajustes (C4) — um
  rótulo que troca no lugar, nunca toast.
- `/conta` e `AccountPage` só mostram faixa em erro; na rotina, o estado é o
  chip.

## D — Review = learning, não exam

**Antes:** `TypedValue` usava `examMode={!revealed}` — a consulta ficava
bloqueada justamente antes da resposta.

**Depois:**

- Aba Revisão e remediação da Jornada permitem consulta (D1/D8). Desktop:
  hover (D2). Mobile: toque no alvo principal; nas opções/peças/pares, segurar
  (D3) — o toque que segurou para consultar não seleciona a opção.
- O gloss mostra Hànzì, pinyin, significado, áudio e **"Ver no Atlas"**
  (`/hanzi/atlas?char=…`, rota canônica) (D4/F4).
- **`reviewAssistanceUsed = true`** quando o aluno consulta antes de responder
  (D6). Não é erro (D6.1), mas não é recordação independente (D6.2): a
  sugestão automática nunca é Easy (preferência Hard) e a nota efetiva fica no
  teto de Hard — Easy/Good ficam desabilitados no "Ajustar dificuldade" (D7).
- Remediação da Jornada (`ErrorReviewQuestion`): mesma consulta; acerto
  assistido corrige o erro (é aprendizagem) mas grava **Hard** no SRS, não
  Good. A regra P5 de escuta/tom foi preservada: nesses tipos o alvo escrito
  não ganha consulta antes da resposta (entregaria o áudio). REVIEW_HELP_PARITY
  intacto (`validate:review-help-parity` verde).
- **Prova continua prova (D5/K12):** nivelamento (sem gloss nenhum), teste de
  módulo (`examMode`), Phase Challenge (`MandarinHelpProvider disabled`).
  `EXAM_SURFACES` declara as quatro superfícies.

Nota de escopo: nas **lições de revisão** da Jornada (`isReview`), os passos já
tinham gloss no enunciado antes desta remessa; o registro de assistência foi
ligado na remediação (`ErrorReviewQuestion`), que é onde o aluno responde a um
erro. Os passos `isNoHint` (ditado etc.) continuam sem dica — por design.

## E — Tamanho visual da revisão

| elemento | antes | depois |
| --- | --- | --- |
| Hànzì principal | `text-3xl` | `text-5xl` mobile · `text-6xl` desktop |
| Hànzì nas opções | `text-2xl` | `text-3xl` · `sm:text-4xl` |
| opção (toque) | `min-h-12` (48px) | `min-h-14` (**56px**) |
| peças de montagem | `text-xl`, `min-h-11` | `text-2xl/3xl`, `min-h-14` |
| pares (Hànzì) | `26px/30px` | `text-3xl` · `sm:text-4xl`; coluna direita `min-h-14` |
| remediação da Jornada | `text-4xl` | `text-5xl` · `sm:text-6xl` |

Scroll vertical é aceito (E6). Sem scroll horizontal em 390×844, 375×667 e
360×640 (E5.1 — E2E percorre Revisão, Perfil, Loja, Atlas, Cultura e Phase
Challenge nos três tamanhos). O E2E mede o Hànzì principal com ≥ 48px no mobile.

## F — Atlas de Hànzì com utilidade

Nada foi reconstruído. Acrescentado:

- **"Treinar este conjunto" (F1)** a partir do filtro atual →
  `/revisao?conjunto=atlas&chars=…`. **Sem SRS paralelo (F1.2):** a lista vive
  na URL e cada item é o `SRSItem` do `srs` existente, avaliado pelo mesmo
  `gradeSrs`. Só entra caractere **aprendido** (`canPromoteAtlasItemToReview`);
  a Revisão revalida — URL editada não fura a elegibilidade. Teto de 20.
- **Smart sets (F2):** Meus fracos · Favoritos · Aprendidos recentemente ·
  Não revisados · Top 50 disponíveis.
- **Adicionar à revisão (F3):** agora diz "Adicionado ao treino · próxima
  revisão: …".
- **Caracteres relacionados (F5):** mesmo radical, mesma peça de som, peça de
  sentido em comum — só relações que o dataset já registra (F5.1).
- **Metas do Atlas (F6):** Conhecidos · Dominados · Fracos · Em revisão ·
  Favoritos · Disponíveis. Os números são atalhos (tocar filtra), não coleção
  vazia de números (F6.1).

O Atlas segue PT-BR como antes (a página inteira já era PT-only; não foi
internacionalizada nesta remessa).

## G / L / M — Medalhas

`ACHIEVEMENTS` estendido — nenhum `MedalEngineV2`, nenhum segundo store (M1).

**Categorias novas (G1):** `cultura`, `atlas`.

**Cultura (G2)** — derivadas de `cultureSeals`, `cultureCompletedIds` e
`cultureKnowledgeById` (G2.1), que entraram no snapshot (M):

| id | regra |
| --- | --- |
| `cultura-primeiro-selo` | 1 Selo Cultural |
| `cultura-3-selos` | 3 Selos |
| `cultura-todos-selos` | todos os `CULTURE_SEALS` |
| `cultura-historia` | coleção História da China inteira |
| `cultura-na-jornada` | 3 conceitos culturais vistos **na Jornada** |

Selo desconhecido não conta.

**Hànzì/Atlas (G3/L2):** `hanzi-150` · `atlas-10-revisados` ·
`atlas-50-revisados` · `atlas-10-fracos-recuperados` ·
`atlas-25-fracos-recuperados` (item com lapso que voltou a acertar 2× seguidas).

- **"250 Hànzì" não foi criada:** o dataset tem **175** caracteres. Seria uma
  medalha impossível. O teto real ficou em 150.
- **Tom/fala (G4):** nenhuma medalha nova. Não há métrica de pitch; nada de
  "Pronúncia perfeita" (G4.1).
- **Pérolas (L5/L5.1):** nenhuma medalha paga Pérola — Pérola continua vindo só
  dos milestones canônicos. Recompensas novas são Qi.

**Vitrine do Perfil (G5):** "Medalhas em destaque", até 3, escolhidas pelo
aluno, em `featuredAchievementIds`. Medalha bloqueada nem aparece no seletor e
a store recusa destacá-la por chamada direta (G5.4). Link "Ver todas as
medalhas" (G6).

**Passaporte Cultural (G7):** bloco próprio no Perfil. **Selo ≠ medalha (G7.1):**
selo é progresso cultural funcional (abre marcos); medalha é reconhecimento. Id
de selo nunca vira destaque (testado).

## H — Pérolas de Jade com utilidade real

- `shop-pearl-cosmetic` deixou de ser placeholder: **é a Moldura de Jade** (o
  id foi mantido — quem comprou o placeholder passa a ter a moldura de
  verdade) (H2).
- Cosméticos reais (H3), só CSS/tokens existentes (H3.1): **Moldura de Jade**
  (4 Pérolas), **Moldura Dourada** (6), **Título "Aprendiz do Dragão · 龙徒"** (3).
- `ownedCosmetics` + `profileFrameId` + `profileTitleId` (H4). Comprar equipa
  só se o slot estiver vazio (H4.2). "Personalizar perfil" equipa/remove (H5).
- Loja mostra, por item, efeito e **consumível / temporário (duração) /
  permanente** (H6).
- Pérola gasta em cosmético passa pelo **`pearlLedger` idempotente** com chave
  `cosmetic:<id>` — o mesmo cosmético nunca debita duas vezes (H7).
- Os cosméticos de **Qi** "Tema visual" e "Avatar do dragão" (500 Qi, "em
  breve") **saíram da vitrine**: cobravam por nada. Quem já tinha fica com o id
  em `ownedCosmetics`, sem efeito — nada é tirado da conta.
- **Sem pay-to-win (H1/H8):** o caminho de compra não toca
  `completedLessons`, estrelas, selos, medalhas, domínio, validação de módulo
  ou nivelamento (gate + mutações 16/17). Nenhum cosmético é requisito.

## I — Loop

estudar → marco (selo, milestone) → medalha (Qi) / Pérola (só milestone
canônico) → cosmético / conveniência → Perfil mostra (vitrine + passaporte +
moldura/título). Sem cassino, sem lootbox paga; contratos dos baús intactos.

## J — Email-only public accounts

O grosso já existia (MandatoryAccount, `createAccount`/`finishLocalOnboarding`
recusando local em produção). Fechado nesta remessa:

- `AccountPage` mostrava **"Criar perfil local"** sem gate de UI (o clique
  lançaria erro em produção). Agora o bloco só existe em DEV/E2E (J3.1).
- `handleSkipAccount` ("continuar sem conta") recusa fora de DEV/E2E (J3.2).
- `validate:email-only-public-account` + `test:email-only-public-account`:
  `production_beta` e `qa_candidate` não permitem local; a flag de bypass num
  build production-like é **erro duro**; DEV/preview com a flag preservam o
  bypass (J4). `LegacyLocalMigrationPage` preservada (J5). O nivelamento
  pré-cadastro (`ComecarPage`) não usa a store — não vira aluno persistente
  sem email (J6).

## K — Phase Challenge

`src/lib/phaseChallenge.ts` + `PhaseChallengePage` (`/teste/fase/:phaseId`).

- **Não é o nivelamento (K1).** Reusa `buildModuleSkipTest` +
  `gradeModuleSkipTest` (K2): a prova da fase é a união dos bancos das
  unidades do escopo — **toda** unidade precisa de banco próprio (K4.1).
- **Semântica:** "Testar a fase P" = provar o conteúdo que falta para
  **entrar** em P (as unidades entre a fronteira do aluno e o início de P).
- **Alvos (K3/K4):** só a **próxima** fase e **uma além**. Botão "Testar esta
  fase" no cabeçalho dessas fases na Jornada. Saltar ao fim → `too_far`.
- **Fôlego, não Carga (K5):** próxima = **3**, avançada = **4**. Débito **uma
  vez por `attemptId`** (duplo toque = mesmo id, sem segundo débito) (K5.3).
- **Prévia (K6):** "Este teste custa N Fôlegos" + saldo + regras, antes de
  cobrar.
- **Reprovar = 48h (K7)** em `phaseChallengeCooldowns[targetPhaseId]`, com
  "Você poderá tentar novamente em Xh Ymin". **Sair no meio conta como
  reprovação** — senão recarregar seria um jeito de ver perguntas novas sem
  pagar nem esperar.
- **Sem bypass pago (K8):** `phaseChallengeCooldown` e `canStartPhaseChallenge`
  não recebem plano, moeda nem inventário; o E2E semeia Pro + 99 Pérolas +
  9999 Qi com 1 minuto faltando e o botão continua bloqueado.
- `shop-module-retry` **não** é usado (K9); o item legado segue no teste de
  módulo.
- **Passar (K10)** marca só as lições provadas, pela via existente
  `completeLessonViaTest` (1 estrela, sem XP de lição). Não concede Selo,
  medalha artificial, 3ª estrela, nem XP de lição pulada (K10.1). Lições
  culturais nunca entram.
- **Marco cultural (K10.2):** um marco trancado no caminho **bloqueia** o alvo
  (com CTA para o CultureItem que falta). Motivo: o grandfather dos marcos
  (`hasLegacyProgressPastGate`) destrancaria o marco se lições além dele fossem
  marcadas — então o Phase Challenge nunca marca além de um marco trancado.
- **Fundamentos (K11):** `FOUNDATION_LESSON_IDS` nunca são pulados.
- **Prova (K12):** consulta de Hànzì desligada. **Resultado (K13):** pass/fail,
  áreas fortes e fracas, fase liberada — sem gabarito (as opções não revelam a
  resposta certa depois de responder) (K13.1).
- Erros entram na revisão (mesmo SRS); acertos não viram "dominado".
- Sync: o cooldown **mais longo vence** entre aparelhos; tentativas se unem.

## N — Migração

Campos novos, todos opcionais com default seguro: `featuredAchievementIds`,
`profileFrameId`, `profileTitleId`, `cultureSealsRevealed`,
`phaseChallengeCooldowns`, `phaseChallengeAttempts`. Normalizados em
`accountFields` (vitrine só com desbloqueadas, cosmético equipado só se
possuído, selos antigos = revelados). Nenhum campo existente foi reescrito:
XP, Qi, Pérolas, medalhas, achievements, Cultura, Hànzì e progresso ficam como
estavam. A versão do persist **não** subiu (não houve transformação de dado
existente).

---

## Gates novos

| gate | casos | o que recusa |
| --- | ---: | --- |
| `validate:culture-guide-voice` / `test:culture-guide-voice` | 13 | motor de som próprio na Cultura; Guide sem blip; skip que não corta; fala a cada visita; reveal não idempotente |
| `test:streak-recovery-prompt` | 11 | modal voltando ao navegar; "Agora não" apagando a janela; localStorage permanente |
| `validate:sync-ux` / `test:sync-ux` | 11 | toast de rotina; "sincronizado" a cada 30 s; erro sem dedupe |
| `validate:review-learning-ux` / `test:review-gloss-learning` | 13 | consulta bloqueada na revisão; consulta contando como independente; Easy com consulta; Hànzì pequeno; consulta no nivelamento/Phase Challenge |
| `validate:achievement-culture` / `test:profile-medal-showcase` | 17 | contador cultural falso; medalha bloqueada em destaque; selo = medalha; medalha pagando Pérola |
| `validate:pearl-shop-utility` / `test:pearl-cosmetics` | 15 | Pérola comprando progresso/selo; "em breve"; cosmético sem efeito; débito fora do ledger |
| `validate:hanzi-atlas-study-sets` / `test:hanzi-atlas-study-sets` | 9 | segundo SRS; futuro/não aprendido no treino |
| `validate:phase-challenge-economy` / `test:phase-challenge` | 27 | custos ≠ 3/4; cooldown < 48h; Pro/Pérola/Qi furando; Selo/XP falso; Carga; shop-module-retry |
| `validate:email-only-public-account` / `test:email-only-public-account` | 9 | local em production_beta/qa_candidate; bypass DEV/E2E removido |
| `validate:hanzi-atlas` | — | alias: `validate-hanzi-atlas.mjs` + study sets |

Todos encadeados em `gate:rc2-2-8-learning-gamification`, que entrou no fim do
`validate:beta` — o CI os executa de fato. As 32 mutações da seção Q estão
cobertas: 1–31 como mutações de código nos `test:*` (cada uma aplicada ao
código real e exigida como FAIL do gate); a 32 (fingerprint) é o
`validate:public-beta-feature-freeze`.

## E2E — `e2e/rc2-2-8-learning-gamification.spec.ts`

**Chromium: 22/22 PASS.**

| cenário | o que prova |
| --- | --- |
| P1 | hover no Hànzì antes de responder → gloss (pinyin, significado, "Ver no Atlas" → `/hanzi/atlas?char=`); `data-review-assistance-used=true`; responder certo → Easy e Good desabilitados, Hard habilitado |
| D3 | mobile (touch, 390×844): toque abre o sheet "Ajuda de leitura" com Atlas; assistência registrada; Hànzì principal ≥ 48px |
| P3 | Phase Challenge: `data-gloss-lookup=disabled`, zero termo consultável, hover não abre tooltip |
| P4 | Agora não → Journey/Cultura/Loja/Revisão/Atlas/Perfil: o modal não volta; o Perfil ainda oferece "Recuperar" |
| P4.1 | contexto novo do navegador com recuperação válida: aparece uma vez |
| P5 | 9 mensagens de rotina = 0 banner; erro = 1 banner; mesmo erro de novo = suprimido |
| P6 | medalha desbloqueada destacada e persistida no reload; bloqueada fora do seletor; passaporte com 1 selo, separado |
| P7 | Moldura de Jade: 10 → 6 Pérolas (uma vez), equipa, remove, reequipa, persiste no reload |
| P8 | Atlas "Meus fracos" → Treinar → `/revisao?conjunto=atlas&chars=ni`, sessão com 1 item |
| P9 | próxima = 3, avançada = 4, saldo na prévia; cooldown com 1 min faltando + Pro + 99 Pérolas + 9999 Qi = bloqueado; vencido = liberado; duplo clique em Começar debita 3 uma vez (5 → 2); Jornada mostra o CTA só em p2 (next) e p3 (advanced) |
| A | selo novo → reveal uma vez, sem repetir no reload; Hub fala na primeira visita, trocar filtro não fala de novo, reload sem intro |
| E5.1 | 390×844, 375×667, 360×640 sem scroll horizontal em Revisão, Perfil, Loja, Atlas, Cultura, Phase Challenge |
| EN | Phase Challenge ("This test costs 3 Breaths"), Perfil e Loja em inglês |

**Suíte Chromium completa (648 testes):** 631 passaram, 6 skipped, 11
falharam com 6 workers. Rodados de novo com 2 workers: **9 dos 11 passam** —
eram timeouts por carga (compare-with-image, rc1-4, topic-pass-return,
lesson-player-mobile #7). Os **2 restantes**
(`journey-redesign` › "Rever lição mantém chevron" e "CTAs compactos no
desktop") medem o botão "Praticar novamente" do detalhe da lição (64.125px de
altura, 322px de largura) — tela que esta remessa **não toca**. Foram rodados
num worktree limpo de `main` (`a941d86`) e **falham igual, com os mesmos
números**: é fonte/renderização deste container, não regressão.

**WebKit:** não instalado neste ambiente — evidência fica com o job
cross-engine do CI.

## PT / EN

Toda copy nova está no catálogo (`src/locales/pt-BR.ts` e `en.ts`, mesmas
chaves): `phaseChallenge.*`, `culture.guide*`/`sealReveal*`, `hub.featured*`,
`hub.culturePassport*`, `hub.customize*`, `hub.shopLifetime*`,
`shell.syncStatus*`, `review.assistedNote`, `review.atlasStudySet`,
`achievements.category.{cultura,atlas}` e os títulos/descrições das 10
medalhas novas. O E2E EN confere Phase Challenge, Perfil e Loja em inglês.
Exceções herdadas, não ampliadas: Atlas e nomes/descrições de itens da Loja
seguem PT-first como antes (a Loja usa o overlay `displayInstruction`).

## Validação

| comando | resultado |
| --- | --- |
| `typecheck` / `build` | PASS |
| `validate:beta` (cadeia inteira, agora terminando em `gate:rc2-2-8-learning-gamification`) | **PASS** |
| `validate:tone-transfer-coverage` / `validate:tone-transfer-honesty` | PASS — 12 jogáveis, honestidade intacta |
| `validate:culture-progression-gates` / `test:culture-progression-gates` | PASS |
| `validate:guide-text-voice` / `test:guide-text-voice` | PASS |
| `validate:review-help-parity` | PASS |
| `validate:review-learning-ux` · `validate:hanzi-atlas` · `validate:achievement-culture` · `validate:pearl-shop-utility` · `validate:email-only-public-account` · `validate:phase-challenge-economy` · `test:streak-recovery-prompt` · `validate:sync-ux` | PASS |
| `gate:mobile-pwa-preflight` · `gate:human-qa-prebeta` · `gate:public-beta-operations` | PASS |
| `validate:public-beta-feature-freeze` · `validate:rc2-content-freeze` | PASS — fp `327de1df0f33`, 134 / 113 / 30 / 30 / 20 |
| Security (`validate:security-boundaries`, `validate:frontend-secrets`, `validate:social-profile-security` dentro do `validate:beta`) | PASS |

Duas correções saíram da própria cadeia, antes do commit final:
`validate:i18n` recusou o namespace novo `phaseChallenge` (registrado na lista
do gate — a paridade PT/EN continua exigida) e `validate:encoding` leu
"NÃO" maiúsculo em dois comentários como possível mojibake (reescritos).

A churn de artefatos regenerados (`docs/release/device-preflight.json`,
relatórios `reports/*`, screenshots de specs antigas) foi **descartada**: é
subproduto de rodar os geradores e specs de screenshot aqui, não evidência
desta remessa.

## Não verificado — declarado, não presumido

- **QA humano (Parte O) não foi feito.** Leveza do som na Cultura, se a
  consulta ajuda sem bagunçar a revisão, se o cosmético é "perceptível" e se o
  Phase Challenge é justo são julgamentos humanos. O que está provado é
  contrato + E2E.
- **WebKit não roda neste ambiente** (só Chromium instalado); a evidência
  WebKit é o job cross-engine do CI.
- **Nenhum PASS operacional novo.** `cloud_auth=false`, `cloud_sync=false`,
  `feedback_backend=false`, `android_real_device=false`,
  `ios_real_device=false`, `pwa_upgrade=false`, `rollback_drill=false`.
- **Sync real contra Supabase não foi exercitado** (E2E usa fixtures): o
  silêncio da rotina e o dedupe do erro foram provados por unidade e pelo hook
  de fixture do banner.

## Blockers remanescentes

- **#273** continua pendente → **Public Beta NO-GO**.
- Próxima wave pedagógica: **RC2.2.9 — 11 Partial Capabilities Closure**
  (`talk_family`, `order_food`, `order_drink`, `negotiate_basic`, `pay`,
  `use_metro`, `use_train`, `ask_for_help`, `ask_repeat`,
  `express_preference`, `make_simple_plan`).
