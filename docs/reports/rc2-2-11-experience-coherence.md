# RC2.2.11: Learning Coherence, Immersion, Identity & Navigation Hardening

| Campo | Valor |
|---|---|
| Branch | `claude/rc2-2-11-experience-coherence` |
| PR | **não aberto**. O owner abre depois; nada foi mergeado. |
| #273 | **intocada**: nenhum Supabase QA, nenhum candidate, nenhuma evidência cloud |
| Public Beta | **NO-GO** |

## 1–3. Base

| Item | SHA |
|---|---|
| 1. Base (main no início da remessa) | `e7fd8bf796938e062ebb078885ca6a0f030bf8b0` |
| 2. RC2.2.10 herdado (#283) | `6d0b39726f993975af6f678a6fade02775685bfa` |
| 3. RC2.2.10B herdado (#284) | `e7fd8bf796938e062ebb078885ca6a0f030bf8b0` |

A remessa começou depois do merge das #283 e #284 em `main`, como pedido.

## Regra BX: nenhum motor novo

Nenhum `AchievementEngineV2`, `MedalEngine`, `CultureGlossEngine`, `ImmersionSRS`,
`SocialAccountStore`, `NavigationEngineV2` ou `LeagueSyncV2`. Cada gate da remessa
recusa esses nomes (arquivo ou export). O que existe de novo é apresentação,
contrato ou ligação entre sistemas que já existiam:

| Novo | Reusa |
|---|---|
| `ProseGlossText` + `lib/proseGloss.ts` | `GlossText` → `MandarinInlineText` → `MandarinToken`, `getGlossaryEntry` |
| `lib/cultureDragon.ts` | `GuideDialogue`, `guideTextBlip`, passos de ensino de `cultureLessons.ts` (só leitura) |
| `lib/cultureJourneyRecall.ts` + `JourneyCultureRecallCard` | `cultureMemoryById`, `buildCultureReviewSession`, `reviewCultureMemory`, `cultureCompletedIds` |
| `data/storyCast.ts` | histórias existentes; `conversationScenes.ts` intocado |
| `syncNoticePolicy` (em `lib/syncUx.ts`) | coordenador de sync existente |
| cache persistido da Liga (em `lib/leagueLiveView.ts`) | `useLeagueData`, `fetchLiveLeagueData`, `flushPendingLeagueXpSync` |
| camada `milestone/achievement/medal` (em `data/achievements.ts`) | o mesmo engine de conquistas |
| `lib/username.ts` | `public.profiles.username` de `005_social.sql` |
| `lib/navigation/smartBack.ts` + `SmartBackButton` | react-router + `backNavigation.ts` do Android |

A exceção controlada ao `BETA_PEDAGOGY_FREEZE` está registrada em
`src/lib/curriculumFreeze.ts` (`RC2_2_11_EXPERIENCE_COHERENCE_EXCEPTION`). Ela
proíbe explicitamente lição, tópico, CultureItem, StepKind, SRS, moeda e
motores novos.

## 4. Culture gloss: cobertura

- **Onde:** a fala do dragão nas 30 aulas de Cultura (`StepIntro` → `GuideDialogue gloss`),
  os cartões de Momento Cultural da Jornada e o novo lembrete de Cultura na Jornada
  (enunciado, opções e feedback).
- **Como:** o `GlossText` de sempre. No desktop, hover e foco (o termo é `role=button`,
  focável). No mobile, toque e pressão longa. A caixa de fala do dragão só vira glossável
  com o texto completo; durante o typewriter nada muda. Nesse modo a caixa deixa de
  ser `<button>` e vira `role=group`, para não aninhar botão dentro de botão. Clicar
  fora de um termo continua avançando.
- **Só referência lexical conhecida:** das 131 falas do dragão, 51 citam Hànzì. São 74
  trechos: 61 têm entrada no glossário e viram consulta; 13 não têm e ficam texto
  simples, sem popover vazio (死, 除夕, 龙, 孙悟空, 秦, 唐, 宋, 清). Criar essas entradas
  mudaria o glossário e está fora do escopo desta remessa.
- **Prova sem gloss:** Placement, Module Challenge e Phase Challenge continuam com
  `MandarinHelpProvider disabled` e nunca importam `ProseGlossText` (gate A3, mutação 4).

## 5. Dragon lesson: cobertura

- 30/30 aulas de Cultura falam pelo `GuideDialogue`, com a voz `guideTextBlip`.
- **Contrato de função** (`CULTURE_DRAGON_ROLES_BY_POSITION`): `orient` (30 falas),
  `notice` (30), `why` (30) e `story` (41 falas de cena). Nenhum papel repete outro.
- **Estilo (BN):** até 260 caracteres por fala, no máximo 3 frases, zero exclamação.
  As 131 falas atuais passam.
- **Não repete o card:** nenhuma fala é igual ao título do card, e nenhuma fala se
  repete dentro da mesma aula (auditoria em `validate:culture-dragon-lesson`).

## 6. Auditoria de explicação duplicada

Havia 5 explicações de questão que copiavam, palavra por palavra, uma fala que o
dragão tinha acabado de dizer:

| Aula | Passo | Repete |
|---|---|---|
| culture-host-insistence | 8 | fala do passo 2 |
| culture-shared-dishes | 6 | fala do passo 0 |
| culture-bargaining-context | 6 | fala do passo 1 |
| culture-visiting-home | 9 | fala do passo 1 |
| culture-hotel-checkin-register | 8 | fala do passo 1 |

`cultureLessons.ts` é CURRICULUM_SOURCE. Por isso a correção é na exibição:
`cultureStepForDisplay` troca a explicação repetida por um lembrete curto
("É o sinal que o dragão mostrou em «…»"). Os dados não mudam e o fingerprint
fica igual. Depois dessa camada, restam **0** repetições.

## 7. Culture → Journey: mapa de reativação

- **Onde:** um único cartão "Lembra?", na fronteira do aluno, logo depois da última
  lição de mandarim concluída.
- **O quê:** a mesma pergunta da Revisão de Cultura (`buildCultureReviewSession`).
  Há 30 alvos de memória, um por CultureItem.
- **Quando:** quando o alvo está devido pelo espaçamento que já existe em
  `cultureMemoryById`. Não há agendador novo.
- **Ensinar antes de testar:** só itens em `cultureCompletedIds`.
- **Sem poluição lexical:** a pergunta é pulada se tiver Hànzì que o aluno ainda não
  viu nas aulas de mandarim concluídas nem nas aulas de Cultura concluídas. Exemplo:
  20 dos 30 alvos usam 谢谢, que vem das primeiras lições de mandarim.
- **Resposta:** `reviewCultureMemory(targetId, correct, "journey")`, com o mesmo
  espaçamento e a fonte `journey` registrada no conhecimento cultural.
- "Agora não" esconde o cartão até a próxima sessão.

## 8. Cenas de Imersão atualizadas

As 6 histórias interativas: `primeiro-encontro`, `pedindo-agua`, `sala-de-aula`,
`despedida-amigos`, `bom-dia-em-casa` e `hora-de-comer`.

- **Cartão de contexto antes da cena:** onde, com quem (elenco com Hànzì) e objetivo.
- **Bolhas:** o aluno fica sempre à direita e os outros sempre à esquerda. O lado é
  fixo por personagem em toda a cena.
- **Quem fala:** avatar (caractere do nome), nome em romanização, nome em Hànzì e papel.
- **Multi-turno:** o histórico da cena aparece acima da vez atual. Cada história tem
  de 2 a 5 falas (gate 2–6).
- **O histórico some enquanto uma pergunta está aberta.** Uma fala anterior podia
  entregar o Hànzì, o pinyin, a tradução ou o áudio pedidos agora. Com a pergunta
  respondida, o histórico volta.
- **Ouvir primeiro** continua protegido: o Hànzì do `listen_choice` só aparece depois da resposta.
- **Gloss no modo de aprendizagem:** o `GlossText` de sempre no histórico e no recap.
- **Recap no fim:** a lista de falas com quem disse o quê, mais "Rever palavras da cena" (→ `/revisao`).
- **Erros:** continuam indo para o SRS e o perfil de fraquezas existentes
  (`gradeSrs` + `recordActivityError`). Nenhum SRS novo.
- As conversas da Jornada mostram o nome canônico via `castNameForSceneCharacter`
  (`conversationScenes.ts` intocado).

## 9. Registro de personagens (`src/data/storyCast.ts`)

| id | Nome | Hànzì | Papel | Lado |
|---|---|---|---|---|
| lin | Lin | 林 | colega de estudos | esquerda |
| mei | Chen Mei | 陈美 | amiga | esquerda |
| wang | Wang Wei | 王伟 | amigo | esquerda |
| hua | Hua Laoshi | 华老师 | professora | esquerda |
| zhang-ayi | Zhang Ayi | 张阿姨 | mãe da família anfitriã | esquerda |
| learner | nome de exibição → `@username` → "Você" | — | aluno | direita |
| narrator | Narrador (cartão neutro, não bolha) | — | contexto | — |

Nas histórias, "Ana" virou Chen Mei, "Mãe" virou Zhang Ayi e "Professor" virou
Hua Laoshi. Os enunciados foram ajustados junto. `interactiveStories.ts` não é
fonte de currículo. As pessoas **não** moram em `characters.ts`, que é o registro
de Hànzì.

## 10. Falantes genéricos restantes

- **Narrador:** 1 passo (`pedindo-agua`, abertura). Aparece como cartão neutro de
  contexto, não como bolha.
- **Exercícios sem falante** (meaning/fill/listen): aparecem como cartão de "Prática".
  Um exercício não é fala de ninguém.
- **Figurantes das conversas da Jornada** (Recepcionista, Funcionário, Atendente, com
  o avatar `wang`): mantêm o papel e não pegam o nome de Wang Wei emprestado.
  Continuidade é não fingir que o recepcionista do hotel é o seu amigo.
- O slot `lin` das conversas da Jornada é o **aluno** (id legado, nome personalizado),
  não a colega Lin das histórias. Isso está documentado no registro.

## 11. Liga: comportamento do fast-path

- **Cache primeiro:** a última classificação `live` fica em `localStorage`
  (`longyu:league-cache:v1`), por conta. Uma conta nunca vê o cache de outra, e
  dados demo nunca viram cache.
- O flush de XP pendente roda **em paralelo** ao fetch
  (`const pendingFlush = flushPendingLeagueXpSync()` antes de `await fetchLiveLeagueData`).
  A classificação não espera o flush.
- **XP otimista:** só o do próprio aluno.
- **Sem faixa rotineira** "Sincronizando XP com a liga…". Com cache e recarregando,
  nenhum banner aparece; ele só aparece se a atualização falhar.
- **Tempo até o primeiro conteúdo** é medido (`data-league-first-content` /
  `data-league-first-content-ms`) e coberto pelo E2E.

## 12. Avisos de sync removidos (auditoria)

| Superfície | Antes | Agora |
|---|---|---|
| `cloudSyncCoordinator.markCloudSync` | toda falha virava `error` + faixa global na hora | passa pela `syncNoticePolicy` |
| Falha transitória (timeout, rede oscilando) | faixa "Erro ao sincronizar…" no meio da aula | silenciosa, status `pending` e nova tentativa em 5 s |
| Falha repetida no mesmo recurso | um aviso a cada ciclo | **um** aviso calmo por tipo + recurso + janela de 10 min; depois só estado discreto |
| Liga: "Sincronizando XP…" | faixa em toda visita | removida |
| Rotina (idle / pending / loading / synced) | já silenciosa desde a RC2.2.8 | continua silenciosa |

## 13. Erros legítimos que continuam visíveis

- **Falha persistente** (3 tentativas seguidas ou 2 minutos): "Seu progresso está
  salvo neste dispositivo. Tentaremos sincronizar novamente." Aparece uma vez por janela.
- **Falha que ameaça perder ou confirmar uma ação** (`threatensLoss`): aparece na hora.
- **Erros reais de economia** (Qi/Carga não confirmados, Pro pendente): continuam no
  `EconomySyncBanner`.
- **Liga:** o aviso de "mostrando a última classificação" só aparece quando a
  atualização falha.

## 14–16. Conquistas: distribuição da apresentação

É o mesmo engine (`data/achievements.ts`), com uma camada de apresentação por tier
e três exceções explícitas.

| Tipo | Quantidade | Tratamento |
|---|---|---|
| 14. **medal** | 15 | cartão dourado, modal de tela cheia, única categoria destacável |
| **achievement** | 18 | cartão padrão, modal compacto |
| 16. **milestone** | 16 | cartão discreto, modal compacto |
| **Total** | 49 | |

**15. Medalhas verdadeiras (15):** jornada-modulo-perfeito, jornada-primeira-fase,
jornada-china-survival, sequencia-30, sequencia-100, xp-5000, hanzi-100,
fala-50-frases, revisao-100, hanzi-150, atlas-25-fracos-recuperados,
cultura-todos-selos, cultura-historia, missoes-medalha-mensal (a medalha mensal é
especial) e missoes-3-medalhas.

- **Sem revogação:** o que foi desbloqueado continua desbloqueado. Um destaque legado
  de não-medalha só deixa de aparecer na vitrine.
- A página de conquistas é seccionada: medalhas, depois conquistas, depois marcos.

## 17. Testes de layout do Perfil

A geometria é verificada por bounding boxes, sem snapshot de pixel, em
**1366×768, 1440×900, 1920×1080, 390×844 e 412×915**. Cada tamanho testa:

- medalhas em destaque, passaporte cultural, conquistas recentes, histórico e amigos sem sobreposição;
- nenhum bloco estourando na horizontal;
- 3 medalhas na vitrine;
- documento sem scroll horizontal.

Há também um caso extra para o estado vazio em 1366×768. O bug original não
reproduziu com os dados atuais. As defesas aplicadas foram `min-w-0`, `isolate`,
`overflow-hidden` e o teto de densidade de 3 conquistas + 3 histórico.

## 18. Username: status do schema

**`CODE_READY_AWAITING_CLOUD_APPLY`** em `supabase/pending/rc2-2-11-username-identifier.sql`.

O arquivo fica **fora** de `supabase/migrations/` para que nada o aplique
automaticamente. Ele:

- reusa `public.profiles.username` e o índice único `lower(username)` de `005_social.sql`, sem segunda tabela de usuário;
- cria a constraint `profiles_username_format_v2` (3–20, `a-z 0-9 _ .`, sem ponto na borda nem `..`, sempre minúsculo), `NOT VALID` para não quebrar nomes antigos;
- cria `reserved_usernames` com o registro canônico, idêntico ao do cliente (verificado pelo gate);
- cria `claim_own_username`: só o próprio perfil, e nome reservado ou já usado recebem o **mesmo** código;
- cria `resolve_login_identity`: devolve **só o id**, **só** para `service_role`;
- cria `login_rate_events` + `check_and_record_login_rate`: IP 20/15 min, identificador 8/15 min, combinação 5/15 min.

## 19. Username: status do login

- **Cliente pronto:**
  - um campo "Email ou nome de usuário";
  - validação estrutural local;
  - erro genérico "Usuário/email ou senha incorretos." para usuário inexistente, email inexistente e senha errada;
  - `Invalid login credentials` do Supabase também é mapeado para a frase genérica.
- **Cadastro:** campo `@nome de usuário` com validação só de estrutura. Não há
  "disponível" falso; o nome fica "a confirmar" até o servidor.
- **Perfil:** mostra o `@username` real. O apelido derivado do nome foi removido.
- **Amigos:** a identidade social já era username (`search_public_profiles` /
  `get_public_profile_by_username`). Nenhum lugar usa email.
- **Edge Function `sign-in-identifier`:** código pronto. Nunca devolve email nem o
  objeto `user`; o email só existe dentro da função. Responde igual para "não existe"
  e "senha errada", com tempo mínimo de 700 ms e rate limit.
- **Username login na nuvem: NÃO certificado.** A flag `VITE_USERNAME_LOGIN_ENABLED`
  está desligada. Sem ela, o cliente **não chama** a Edge e orienta a entrar com email.
  O E2E prova que nenhuma chamada sai.

## 20. Status do cloud apply

**NÃO aplicado.** Nenhuma migration foi aplicada em produção nem em QA. A Edge não
está em `LONGYU_EDGE_FUNCTIONS`, então nenhum deploy a publica. Para ativar, siga
`supabase/pending/README.md`: promover a migration, aplicar no QA real (#273),
depois em produção, publicar a função, ligar a flag e verificar ao vivo.

## 21. Auditoria de voltar por rota

`src/lib/navigation/smartBack.ts` tem **71 entradas**, que cobrem **toda** rota de
`src/routes.tsx`. O gate falha se aparecer rota sem entrada.

| Classe | Rotas | Voltar |
|---|---|---|
| Raiz | 12 (jornada, treino, praticar, revisão, cultura, missões, ligas, loja, perfil, mais, imersão, landing) | nenhum |
| Página com voltar próprio | 16 (lição, cápsula, reforço, cultura/*, som, pinyin, hanzi, blitz, auth…) | o da página |
| Foco (lição/prova) | 3 | a própria saída da tela, com guarda |
| Casca (`SmartBackButton`) | 22 (conquistas → perfil, amigos → perfil, ajustes → mais, atlas → hànzì, pro → jornada…) | botão da casca |
| Público | 23 | usado pelo mapa do Android |

**Regras:**
- nunca `navigate(-1)` às cegas: o único `navigate(-1)` do app ficava no Pro e foi removido;
- o histórico só é usado quando a trilha in-app confirma a entrada anterior;
- sem histórico confiável (deep link, aba nova), a volta vai para o pai lógico, com `replace`;
- destino `//host` é recusado;
- no Android, BACK usa a **mesma** política: primeiro fecha o modal, depois a guarda,
  depois o histórico verificado, depois o pai lógico e, só na raiz, minimiza o app;
- prova em andamento pergunta antes de sair (sair conta como tentativa), e a lição
  sai pela própria saída, registrando o abandono e o destino certo.

## 22. Testes de voltar em mobile e desktop

E2E (`e2e/rc2-2-11-experience-coherence.spec.ts`):

- deep link em `/conquistas` volta para `/perfil`;
- com histórico confirmado, volta à tela anterior;
- raiz sem botão, em 1366×768 e 390×844 com o mesmo comportamento;
- `/pro` volta para `/jornada` sem histórico cego.

`test:android-platform-boundaries` continua com 22 mutações PASS.

## 23. Fingerprint

`c48b008c9c1e`, **inalterado**. Nenhuma CURRICULUM_SOURCE mudou. `cultureLessons.ts`,
`conversationScenes.ts` e `characters.ts` estão intocados.

## 24. Contagens

134 lições · 113 tópicos · 30 CultureItems · 30 aulas nativas · 20 nós culturais na
Jornada · 5 momentos · 12 tone transfers · 52 cenas · 31/31 capacidades READY ·
0 PARTIAL.

## 25. Gates

| Gate | Resultado |
|---|---|
| `gate:rc2-2-11-experience-coherence` (11 validate + 11 test) | PASS: 118 casos, **46 mutações** pegas |
| `gate:rc2-2-8-learning-gamification` | PASS |
| `gate:rc2-2-9-capability-closure` | PASS |
| `gate:android-native-foundation` (RC2.2.10) | PASS |
| `gate:main-delivery-pipeline` (RC2.2.10B) | PASS |
| `validate:beta-pedagogy-freeze` | PASS (fp c48b008c9c1e) |
| typecheck / build | PASS |
| `validate:beta` | VALIDATE_BETA_RESULT |
| `validate:frontend-secrets` | PASS |
| E2E RC2.2.11 (Chromium) | E2E_RESULT |

As 46 mutações, por área:

| Área | Mutações |
|---|---|
| gloss | 5 |
| dragão | 3 |
| reativação | 4 |
| imersão | 5 |
| identidade | 3 |
| sync | 3 |
| liga | 3 |
| raridade | 4 |
| perfil | 3 |
| username | 8 |
| SmartBack | 5 |

Os `test:*` também rodam fixtures de runtime: fala repetida, exclamação, aluno do
lado errado, personagem sem Hànzì, história sem contexto e cena de uma fala só.

Três ajustes em testes antigos, todos por mudança de contrato pedida, sem enfraquecer nada:

- `test:i18n` agora espera a frase genérica anti-enumeração em EN.
- O gate RC2.2.8 G5.4 aceita o 4º argumento opcional (`isMedal`) de `toggleFeaturedList`.
- A mutação 15 do RC2.2.8 foi re-ancorada na nova linha da vitrine; a mutação em si é a mesma.

O E2E P6 do RC2.2.8 agora prova que um marco não entra na vitrine.

## 26. Veredito Public Beta

**NO-GO.** Continuam faltando certificações externas: #273 (Supabase QA/candidate),
login por username na nuvem, dispositivo Android real e Play Console.

A remessa aproxima de `PRODUCT_READY` estas áreas:

- apresentação pedagógica;
- coerência da Cultura;
- Imersão;
- Perfil;
- identidade social (contrato pronto, cloud pendente);
- navegação;
- UX da Liga.

## Fora desta remessa

Grafo de amigos completo, chat/DM, descoberta pública avançada, OTA, Supabase QA,
Play Production, iOS nativo, análise de pitch e aulas em vídeo.
