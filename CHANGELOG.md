# Changelog

Todas as mudanças notáveis do Longyu são documentadas aqui.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [SemVer](https://semver.org/lang/pt-BR/) com sufixo pré-release (`-beta.N`).

## [Não lançado]

### Lesson Player Viewport & Scroll Hardening — avançar sem procurar a atividade

Duas regras de UX passam a valer no player: **avançar nunca pode exigir que o
aluno procure a próxima atividade** e **scroll deve existir por conteúdo, não
por acidente de layout**.

- **A atividade nova nasce enquadrada.** Ao trocar de etapa (e a cada nova
  tentativa), o player volta a região da atividade ao topo e leva o foco para
  lá — sem roubar campo de digitação em andamento. O topo fica seguro por uma
  janela curta (`ACTIVITY_SCROLL_PIN_MS`), porque logo depois do commit o
  navegador ainda revela o elemento clicado na etapa anterior; qualquer gesto
  do aluno encerra a janela na hora.
- **A rolagem mudou de lugar.** O exercício vive num frame do tamanho da
  viewport visível, com a atividade numa região de rolagem própria
  (`overscroll-behavior: contain`). Enquanto o exercício está na tela, a página
  inteira não rola (`html[data-lesson-frame="locked"]`) — nada de página longa
  por acidente, e a rolagem herdada da atividade anterior deixa de existir.
- **`dvh` real, não `100vh`.** `useLessonViewportFrame` mede `visualViewport` e
  recalcula quando a barra do navegador aparece/some, quando a tela gira e
  quando o teclado chinês abre; com o teclado aberto a atividade se reorganiza
  dentro do que sobrou em vez de empurrar o CTA para fora.
- **CTA acessível.** Feedback e “Continuar” recém-montados são trazidos para a
  tela sozinhos — exceto no primeiro quadro de uma atividade nova, onde a regra
  de começar pelo enunciado vence. Na lição, o CTA do montador de hanzi deixa de
  reservar o vão da tab bar (que não existe no modo foco).
- Cobertura: `npm run validate:lesson-viewport` (invariantes de código) e
  `e2e/lesson-viewport.spec.ts` (mede, dentro da página, a posição de cada
  atividade nova).

### Beta Experience Hardening — estabilizar, polir, observar

Sem motores pedagógicos novos. Foco em sensação humana, mobile, falhas e
telemetria para o beta.

- **Feedback curto no erro.** A causa linguística (`ERROR_CAUSE_FEEDBACK`) passa
  a aparecer no modal de retry e no painel de produção — frases como “As
  palavras estavam certas. A ordem mudou.” em vez da explicação longa do
  exercício.
- **Mobile:** IME chinês não submete no meio da composição; `lang="zh-CN"` no
  campo livre; teclado virtual empurra a área de digitação; conversa faz
  `scrollIntoView` na fala ativa.
- **Estados de falha:** banner offline na lição; botão de áudio desabilitado com
  aviso quando TTS falta; sync com CTA “tentar de novo” na tela de vitória;
  microinteração leve (tap + bloom) em forma não reconhecida.
- **Telemetria beta:** `wallClockMs` (relógio de parede) + `activeMs` (pausa com
  aba em background), `toneHintUses`, `audioManualPlays`, `diagnosis` no erro,
  evento `unrecognized_answer` com **SHA-256** da forma (sem texto cru; ainda
  vulnerável a dicionário em frases curtas — HMAC de backend fica para depois),
  pós-conversa finalmente aceita no RPC. Admin mostra diagnósticos, formas não
  reconhecidas (nuvem + conta local), funil das 20 primeiras e atividade diária.
- **Offline honesto:** conta cloud promete sync depois; conta local só afirma
  salvamento neste dispositivo.
- Migration `20260810170000_beta_experience_telemetry.sql` amplia a whitelist
  de metadados e tipos de evento.

### Ritmo — a entrada do curso deixa de abrir no volume máximo

- **A lição 1 pedia produção livre e transferência.** A auditoria do plano real
  de um aluno **novo** encontrou "O que é mandarim?" cobrando `我想喝水` (produção
  livre, sem apoio) e `我不喝水` (transferência, com a âncora `我不会说中文`) de
  quem tinha acabado de encontrar `你好`. Nenhum validador via isso: todos mediam
  o curso inteiro ou a média, e um começo brutal fica escondido atrás de 122
  lições saudáveis.
- **Causa raiz**: `CORE_REVIEW_REFS` — lista fixa de frases-âncora — entra no
  foco de revisão de toda lição, e o mesmo foco de revisão vira `seenGlyphs`, a
  porta que libera produção livre, transferência e pares mínimos. Frases de
  lições distantes passavam a contar como "o aluno já viu isto" desde a lição 1.
- **A separação é entre ver e ter de produzir.** Uma cena de conversa
  *apresenta* vocabulário — conhecer `你好` basta para jogá-la —, então a lição
  continua enxergando o núcleo inteiro para cenas, revisão e imagens. Só a porta
  da produção passou a contar apenas o que o currículo já apresentou até ali.
  Restringir o foco de revisão inteiro (primeira tentativa desta correção)
  esvaziava o pool de conversa e deixava lições legítimas sem cena nenhuma.
- **Vale na primeira fase**, de propósito: depois dela a mesma lista também
  funciona como canal de introdução de vocabulário (`我想喝茶` só aparece em
  passo autoral muito adiante), e restringir o curso inteiro esvaziaria a
  produção aberta em vez de consertar o começo.
- **Cena repetida em lições seguidas dá lugar a nenhuma cena.** A pontuação já
  penalizava a cena da lição anterior, mas penalidade não resolve pool de um
  candidato só. Também corrigido um `??` que nunca caía no fallback porque
  `lastLessonSceneIds` vem sempre preenchido (vazio, não ausente).
- Resultado na entrada: produção livre e transferência passam da lição 1 para a
  **20**; a digitação nas 20 primeiras lições cai de **26 para 10** passos. No
  curso inteiro a cobertura fica preservada — produção aberta segue em 41/122,
  conversa sem apoio em 106/122, reparo em 22/122; produção livre (71→64) e
  transferência (110→98) perdem exatamente as lições da abertura que as
  cobravam cedo demais.
- A simulação de `validate:conversation-pedagogy` passou a registrar a recência
  de **toda** cena jogada, autoral ou gerada — é o que `recordConversationScene`
  faz no app. Contando só as geradas, a simulação "esquecia" a cena autoral
  recém-jogada e acusava repetições que o runtime não teria.
- **Portão `validate:onboarding-pace`** na cadeia `validate:beta`, com
  `reports/onboarding-pace-report.md`. Mede o plano de um aluno novo nas 20
  primeiras lições: motor exigente não abre curso, carga de digitação sobe aos
  poucos, nenhuma lição é longa demais, o salto entre lições consecutivas é
  suave, há variedade mínima de motores e a entrada não fica muda.

### Correção pedagógica — o limite do corpus não é culpa do aluno

- **Produção válida que o motor não conhece deixa de ser erro.** Produção livre
  e aberta cobram uma frase inteira, e o corpus nunca vai enumerar todas as
  frases certas do mandarim. Até aqui, qualquer resposta fora de `accepts`
  levava "Quase" com um X, custava estrela, entrava no SRS e — desde o
  diagnóstico de erro — ainda envenenava o perfil de fraqueza, desviando as
  próximas lições por causa de mandarim possivelmente correto. Agora, quando a
  resposta é uma tentativa bem formada (só hànzì, ou pinyin plausível) e o
  diagnóstico sai com confiança baixa — ou seja, o próprio motor não achou
  padrão que a explique —, o aluno vê **"Não reconheci essa forma"** em tom
  neutro, sem X e sem cor de erro, com a resposta esperada logo abaixo.
- A tentativa não resolve o passo: o aluno vê o modelo e responde de novo. Não
  conceder crédito é deliberado — dar acerto a uma resposta que o app não sabe
  julgar transformaria "não reconheci" em atalho.
- **Dizer mais do que se pediu deixa de ser "peça sobrando".** Numa tarefa com
  objetivo comunicativo, uma resposta que contém tudo o que foi pedido e ainda
  acrescenta conteúdo (`我明天想去一个银行` para "diga que vai ao banco") é uma
  frase mais rica, não um erro de forma. Passa a ter confiança baixa e entra no
  caminho neutro. Fora de tarefas com objetivo, onde o alvo é exato, continua
  sendo intrusão.
- **As respostas não reconhecidas ficam registradas** (`unrecognizedProductions`,
  com contador por forma repetida). É o material para auditar o diagnóstico com
  respostas humanas reais e para decidir que formas o curso ainda precisa
  aceitar. Não toca em estrela, SRS nem perfil.
- **A confiança do diagnóstico passa a pesar no perfil de fraqueza.**
  `diagnosisConfidence` era gravado e nunca lido: um palpite que o próprio motor
  marcou como fraco roteava o currículo com a mesma força de um padrão
  inequívoco. Agora `high`/`medium`/`low` valem 1 / 0,6 / 0,25, então quatro
  palpites fracos não alcançam sozinhos o limiar de dominância, e um empate por
  contagem entre padrão claro e palpite é resolvido pelo padrão claro.

### Expansão pedagógica — diagnóstico de erro e rota pela fraqueza

- **O app passa a saber por que o aluno errou, não só que errou.** O motivo do
  erro era derivado do FORMATO do exercício: quem escrevia 我茶要 (ordem
  trocada) e quem escrevia 我要水 (item errado) recebiam o mesmo motivo e a
  mesma correção, porque erraram na mesma tela. Agora `diagnoseError` compara a
  resposta DADA com a esperada e devolve uma causa linguística — tom, homófono,
  grafia do pinyin, escuta, hànzì parecido, ordem, peça faltando, peça sobrando,
  partícula, classificador, escolha da palavra, significado, objetivo da fala.
- **A correção imediata passa a ser escolhida pela causa.** Errar por tom dentro
  de uma montagem de frase devolvia outra montagem de frase — o formato que
  justamente não treina tom. Cada causa aponta a modalidade que a ataca (tom →
  contraste sonoro; ordem → montagem por slots; homófono → par mínimo; grafema →
  forma do hànzì). Quando o formato indicado não tem dado para existir, vale o
  formato antigo: correção genérica é ruim, correção quebrada é pior.
- **A rotação A/B/C deixa de ser cega.** Girava por contagem de tentativa. Agora
  um perfil de fraqueza — derivado dos erros já persistidos, com decaimento por
  recência — roteia a variante para a causa em que o aluno erra de verdade. Sem
  causa dominante (aluno novo, erros espalhados, empate técnico) o rodízio de
  sempre é preservado: fingir diagnóstico é pior que rodízio cego. A primeira
  tentativa continua sendo o percurso autoral. 109 das 122 lições mudam de plano
  conforme a fraqueza.
- O perfil é **derivado, não persistido**: lê `recentActivityErrors` e se corrige
  sozinho. Perfil salvo à parte congelaria um diagnóstico velho. Erros anteriores
  a esta onda não têm causa e são ignorados, em vez de contarem como ruído.
- **Novidade desacoplada da variante.** As sementes de geração saíam da letra da
  variante, então repetir a variante repetia a frase de transferência — e frase
  inédita repetida vira frase decorada. A novidade agora vem da contagem de
  tentativas: 107 das 122 lições renovam o conteúdo mesmo na mesma variante.
- **Portão `validate:error-diagnosis`** na cadeia `validate:beta`, com
  `reports/error-diagnosis-report.md`. Cobre a totalidade da taxonomia, 19 casos
  curados (incluindo o mesmo exercício com erros diferentes rendendo causas
  diferentes), os limiares que impedem rota sem evidência, a preservação do
  rodízio original e o acoplamento com o roteamento da revisão por
  palavra-chave.

### Expansão pedagógica — padrões gerativos (slots, cadeia, aspecto, tempo)

- **Scaffold STPVO-light**: cada frame declara `slots` nomeados (sujeito · tempo ·
  lugar · verbo · objeto…). A produção e a transferência mostram a ordem na UI
  — o aluno monta por padrão, não por tradução. Portão exige buraco no scaffold.
- **Cadeia de ações**: `我回家 ___` (回家睡觉 / 回家吃饭) e `我坐飞机去 ___` —
  empilhar verbos na ordem real, sem "para/de/com" do português.
- **Filtros de aspecto**: `我在 ___` (em progresso; âncora 我在学中文 entra na
  lição "Falo um pouco") e `我 ___ 了` (mudança de estado: 饿了 / 回家了 / 睡觉了).
- **Tempo como slot opcional**: em `我去 ___` e `我回家 ___`, 今天/明天 entram
  entre sujeito e verbo (`我明天去银行`), com template de situação próprio.

### Expansão pedagógica — objetivo comunicativo, produção aberta e conversa sem apoio

- **O que conta como certo passa a ser o objetivo, não a frase esperada.** Cada
  estrutura declara o que faz (`request_item`, `ask_location`, `buy_item`…), e
  duas realizações do mesmo objetivo com o mesmo conteúdo valem as duas: pedimos
  "diga que quer beber chá" e tanto 我想喝茶 quanto 我要茶 são aceitas. Antes a
  segunda levava errado — punir uma frase correta é o oposto de treinar produção.
  Substitui a lista manual de pares, que precisava ser lembrada a cada estrutura
  nova. A quantidade entra na chave junto com a peça, então "diga que tem 3
  amigos" continua não aceitando 我有五个朋友.
- Três estruturas novas dão ao objetivo mais de uma realização: 请问，X在哪里？,
  我想买X e 我想吃X. Hoje 34 das 72 tarefas aceitam ao menos uma frase irmã, e a
  correção mostra as outras ("isto também valia").
- **Produção aberta (`productionOpen`)**: o enunciado dá a situação e o objetivo,
  e o conteúdo é escolha do aluno — "no restaurante, peça alguma coisa para comer
  ou beber" tem 17 respostas certas. Continua verificável: o conjunto de
  respostas sai inteiro dos frames. Oito objetivos têm situação aberta; contar
  ficou de fora porque o enunciado precisaria dizer o número e o alvo voltaria a
  ser único. Em 41 das 122 lições.
- Uma produção aberta só é oferecida com **3+ respostas possíveis** no
  vocabulário que o aluno já viu — com uma ou duas, "diga o que quiser" é alvo
  único disfarçado.
- **Conversa sem apoio (`produce_reply`)**: a escada de variantes
  (`guided → assisted → independent → audio_first`) existia, mas no topo dela a
  cena continuava entregando alternativas — o aluno "avançava" e continuava
  reconhecendo. Nos dois níveis mais altos a interação perde as opções e o aluno
  escreve a própria fala dentro da conversa, com as realizações irmãs do mesmo
  objetivo aceitas. A conversão só acontece quando é justo cobrar: resposta
  curta, em hànzì, e com ramo de erro — sem ele uma produção falha travaria a
  cena, e com ele o personagem reage e a conversa continua. Para o aluno
  veterano: 153 falas sem apoio em 106 lições, sem nenhuma cena nova.
- **Quebra de comunicação dentro da cena.** O reparo existia como exercício
  isolado e a conversa sobrevivia a um erro; faltava juntar os dois. Agora a
  cena tem dois estágios de falha: o primeiro erro o personagem absorve (ramo de
  erro autoral, como antes), e a partir do segundo a comunicação quebra — ele
  para, diz que não entendeu, e o aluno precisa escolher o movimento de reparo e
  produzi-lo antes de a conversa retomar. Uma vez por cena: o objetivo é ensinar
  a recuperar, não punir quem está com dificuldade. Só é montada quando o aluno
  já conhece 请再说一遍 / 我听不懂 — 74 das 126 cenas do plano.
- `validate:production-transfer` ganhou quatro regras: objetivo com mais de uma
  estrutura precisa aceitar as duas frases; produção aberta precisa de 3+
  respostas certas (com o gate de glifos aplicado a todas elas, não só à do
  modelo); e a conversa sem apoio precisa existir de verdade no plano de um
  aluno com histórico — auditado com histórico simulado, porque o topo da
  escada não aparece para quem abriu o app hoje; e a batida de reparo precisa
  ser jogável — estratégias distintas, movimento certo entre elas e fala de
  recuperação que a jornada já apresentou.

### Expansão pedagógica — produção sem apoio, transferência e reparo

- Três motores novos, todos definidos pelo que **não** oferecem: nenhum banco de
  peças, nenhuma alternativa, nenhum hànzì no enunciado.
  **Produção livre** (`free_production`): uma situação em português e um campo
  vazio — o aluno escreve ou fala a frase inteira.
  **Transferência** (`transfer_task`): a estrutura já ensinada aparece como
  âncora e o app pede uma combinação que o currículo **nunca** mostrou.
  **Reparo conversacional** (`conversation_repair`): a comunicação falha e o
  aluno precisa continuar — repetir, simplificar, pedir para a pessoa repetir
  ou assumir que não entendeu, em duas fases (escolher o movimento e dizê-lo).
- Conteúdo em `src/data/productionTasks.ts`. Onze estruturas curadas, cada uma
  ancorada numa frase real do currículo; as peças saem de `vocabulary.ts` pelo
  id. A divisão entre produção e transferência é automática: se a frase montada
  já existe em `chunks.ts`, `vocabulary.ts` ou em qualquer passo autoral, é
  produção; se não existe, é transferência.
- Respostas alternativas gramaticalmente válidas contam como certas — 我想喝茶 e
  我要茶 pedem a mesma coisa, e o app não pune quem produziu a outra.
- **Loop pós-conversa**: a seleção passa a dar a primeira tarefa a cada item
  ainda descoberto antes de dar a segunda a qualquer um, e resposta principal da
  cena, palavra nova e item errado ganham um passe dedicado de fechamento. A
  cobertura sai de 67,6 % para 78,3 % (bruta) e o reúso médio de 1,91 para 2,19.
- **Novo indicador de cobertura relevante** em `validate:conversation-loop`:
  o portão mede os itens que ainda precisam voltar (novo, resposta da cena,
  pouco exposto) e deixa fora o núcleo saturado — repetir `谢谢` pela 105ª vez
  não consolida nada. Hoje em 80,2 %, com portão em 76 %.
- **Cobertura garantida agora é protegida no plano.** `ensureCoverage` colocava
  o exercício e a chamada seguinte o derrubava: o único visual da lição, o
  segundo HanziBuilder ou a cena de conversa podiam sumir para caber um passo de
  score maior.
- **Cota rotativa dos motores de percepção e dos jogos semânticos**, para que
  par mínimo, ditado, intruso e estrutura não percam todas as vagas para a
  produção, que pontua mais alto.
- A guarda de repetição do gerador passa a varrer **todos** os trios de uma
  chave semântica, como `validate:lesson-novelty` já fazia — antes olhava só as
  duas últimas ocorrências e deixava passar quatro escolhas de significado.
- Portão novo: `npm run validate:production-transfer` (dentro de
  `validate:beta`), com relatório em `reports/production-transfer-report.md`.
  Ele confere, entre outras coisas, que **todo alvo de transferência é inédito**
  no currículo e que nenhum motor cobra glifo que a jornada ainda não apresentou.

### Expansão pedagógica — motores de percepção e sentido

- Quatro motores novos entram no plano real de todas as lições, sem currículo
  novo escrito: **par mínimo** (`audio_discrimination`, "iguais ou diferentes?"),
  **ditado** (`dictation`, em blocos / pinyin / hànzì e um nível de imersão com
  uma reprodução só), **qual não pertence** (`odd_one_out`) e **qual frase
  funciona** (`spot_error`).
- Conteúdo em `src/data/perceptionDrills.ts`. Pares mínimos e grupos semânticos
  são **derivados do corpus** (69 pares de tom, inicial e final; grupos por
  domínio de vocabulário); só o banco de frases erradas é curado — cada uma é um
  erro real de quem fala português (`我是水`, `我有二十岁`, `我不有钱`,
  `我们去明天`, classificador ausente, `吗` fora do fim).
- Os motores estão ligados ao SRS por domínio (par mínimo alimenta só *som*;
  ditado alimenta som/forma/pinyin), à remediação imediata (erro de ouvido volta
  por áudio, nunca por leitura), ao perfil cognitivo de novidade e à fase
  pós-conversa, com três tipos novos: `sound_contrast`, `write_heard` e
  `group_meaning`.
- A fase pós-conversa deixa de poder empilhar a mesma modalidade para atingir o
  mínimo de tarefas — três múltiplas escolhas seguidas eram possíveis antes.
- A **resposta principal de uma cena volta obrigatoriamente numa tarefa em que o
  aluno produz ou aplica** (montar, responder à situação, completar, escrever o
  que ouviu); antes isso dependia da ordenação por score.
- Portão novo `validate:perception-drills` (dentro de `validate:beta`): confere
  contraste real de cada par mínimo, integridade dos grupos e frases, validação
  de renderização de todo passo gerado e cobertura mínima por lição.
- Resultado: 114 de 122 lições passam a ter pelo menos uma modalidade nova;
  profundidade média 91 → 92, sem nenhuma lição abaixo do score recomendado.
- Direção completa das ondas seguintes em `docs/PEDAGOGIA_EXPANSAO.md`.

### Controles de abuso (2ª passagem)

- Helpers de IP nas Edge Functions deixam de confiar em headers forjáveis em
  chamada direta a `*.supabase.co`; usam o hop direito de `X-Forwarded-For`.
- Turnstile em `create-account` falha fechado sem secret (exceto
  `TURNSTILE_ALLOW_SKIP=1` em dev local).
- Hash de e-mail de referral canoniciza plus-address e pontos do Gmail.
- Self-update de perfil limita `league_tier` (allowlist), tamanho do nome e
  snapshot do cliente (≤256KB); revoke residual de `is_beta_admin` para `anon`.
- CI `npm audit` passa a `--audit-level=moderate`; `react-router-dom` ≥ 7.18.2.

### Segurança de banco e automações de produção

- RPCs `SECURITY DEFINER` agora seguem bloqueio por padrão: somente os endpoints
  públicos necessários recebem `EXECUTE` para `anon` ou `authenticated`.
- Helpers internos de Vault, limpeza, rate limit, webhooks, ledger e referrals
  ficam restritos ao backend; RPCs de liga validam o usuário autenticado.
- A conta QA deixa de ser administradora e suas credenciais passam a existir
  somente em variáveis locais ou secrets protegidos do GitHub Actions.
- Admin do painel beta passa a depender só de `beta_admins(user_id)`; e-mails
  hard-coded saem do servidor e o atalho da UI usa apenas `VITE_ADMIN_EMAILS`.
- Pro da conta QA deixa de ter short-circuit por e-mail nas RPCs e continua via
  assinatura interna `internal_test_longyu_pro` seedada por `user_id`.
- Workflows que alteram produção são manuais, usam o environment `production` e
  aplicam somente migrations pendentes, sem reaplicar SQL histórico inseguro.
- Perfis sociais deixam de abrir a tabela de conta para outros usuários: busca,
  lookup e listas retornam somente campos públicos por RPC, respeitam a opção de
  aparecer na busca e mantêm telefone, nascimento e consentimentos privados.
- Exclusão de conta passa a exigir a frase explícita `EXCLUIR CONTA`, usa um
  contrato único entre app e Edge Function e exibe o erro real de reautenticação.
- O hard delete agora apaga feedback, telemetria e hashes de referral na mesma
  transação; lançamentos financeiros restantes são anonimizados e os webhooks
  deixam de persistir objetos Stripe completos com dados pessoais.
- Exportações CSV do painel neutralizam prefixos de fórmula, inclusive com
  espaços e caracteres de controle, antes que o arquivo seja aberto em planilhas.
- Feedback e telemetria anônimos passam a exigir uma capacidade efêmera emitida
  pela Edge Function; as quotas usam HMAC de rede calculado no servidor, contadores
  atômicos e tetos globais, sem armazenar IP bruto nem confiar no ID do navegador.
- Tabelas de economia/inventário deixam de aceitar INSERT/UPDATE direto do
  cliente; `migrate_local_economy` é one-shot com tetos; missões, energia de
  história, recompensas de lição e XP de liga validam janelas/prefixos e tetos
  diários no servidor.
- Recompensa de lição passa a ser **uma por lição** (não por `attempt_id`);
  resgate de missão **ignora** a métrica enviada pelo app e só paga Qi com
  evidência no ledger/liga. Missões sem evidência server-side não pagam Qi na
  nuvem.
- Webhook Stripe ordena por `event.created` + `event.id` e trata `canceled` no
  mesmo segundo como terminal, evitando ressuscitar Pro com evento atrasado.

### Ofensiva zera após 24h e recuperação em 24h

- **Zera de verdade**: passar **24h (um dia inteiro) sem estudar** zera a
  ofensiva ao abrir o app — não fica mais congelada no valor antigo até o
  próximo estudo. O escudo continua protegendo uma folga de 1 dia.
- **Aviso ao abrir a tela**: se a ofensiva quebrou por perder exatamente 1 dia,
  um modal aparece assim que a tela abre avisando que ela zerou e que há **até o
  fim do dia (24h)** para recuperá-la.
- **Recuperar fazendo um exercício**: o botão "Recuperar ofensiva" leva direto à
  revisão; concluir um exercício no dia da quebra **restaura a sequência
  anterior** (e conta o dia de hoje). Passado esse dia, a janela expira.
- **Atalho no Perfil**: enquanto a janela está aberta, o card de Ofensiva mostra
  o mesmo aviso e o botão de recuperar.

### Atalhos, Fôlego e energia por erros

- **Números 1–9**: badges de atalho ficam ao lado do texto (não cobrem mais a
  primeira letra das opções).
- **Fôlego mais escasso**: começa em 3 (teto 5); rodada perfeita tem ~40% de
  chance de +1 Fôlego, no máximo 2 ganhos/dia — dá para acumular skips, mas
  nem sempre.
- **Cargas (5/dia)**: mantidas. Errar **4 vezes seguidas** na lição gasta
  **1 Carga** extra (Pro isento).

### Sidebar, ofensiva e cura de 2★

- **Netlify / progresso**: aulas com 1–2★ que ficaram "QUASE" sem concluir
  passam a contar como concluídas (cura de contas antigas) e liberam a próxima
  aula na mesma fase.
- **Sidebar completa**: a barra esquerda (e a inferior no mobile) mostra a
  navegação normal desde o início — não espera mais “passar de etapa”.
- **Ofensiva com sentido**: só sobe ao fazer tarefa (lição/revisão), não ao
  entrar no site. Dia vira à meia-noite do **horário local**. Modal de celebração
  (estilo medalha) ao completar o dia; calendário de XP/tarefas/minutos no Perfil.

### Ajustes de diálogo, medalhas, Enter e estrelas

- **Nome no diálogo**: prompts de conversa que ainda diziam "Lin" passam a usar
  o nome do aluno (modelo "Matheus", personalizado em runtime) — simulação de
  diálogo com o próprio usuário.
- **Medalha no fim da tarefa**: o modal "Nova medalha!" não interrompe mais o
  meio do exercício; o desbloqueio fica em fila e só aparece ao concluir a
  lição (ou ao sair do player).
- **Enter para avançar**: Continuar / Responder / Verificar (incluindo montagem
  de ordem) aceitam Enter nas cenas de conversa e nos passos de introdução.
- **Estrelas: aula vs fase**: concluir a aula com 1–2★ já libera a **próxima
  aula**. Exigir **3★ em todas as aulas da fase** só para avançar de **fase**.

### Fôlego do Dragão — pular vira mecânica com sentido

- **Fôlego** deixa de ser só as vidas da lição e vira uma **reserva persistente
  da conta** (começa em 5, teto 5 no grátis; Pro = ilimitado). As vidas da lição
  (gastas em erros) passam a se chamar **Vidas do Dragão** — recursos separados.
- **Pular gasta 1 Fôlego** (não tira Vida nem conta como erro). A tarefa pulada
  vai para a **revisão adaptativa** (reaparece em outros formatos até ser
  dominada) e a lição **conclui na hora, destravando a próxima**, com a 3ª
  estrela **pendente**.
- **Estrela retroativa**: ao dominar o item pulado na revisão (2 acertos), a
  lição sobe de 2★ para 3★ sozinha — "pegar as 3 estrelas sem revisar na aula
  específica".
- **Ganhar Fôlego**: concluir uma rodada perfeita (3★, sem erro e sem pular)
  recarrega +1 Fôlego (até o teto).
- **Fôlego esgotado** ao tentar pular abre um convite ao **Longyu Pro** (skips
  ilimitados), lembrando que dá para recarregar jogando bem.
- Medidor de Fôlego no cabeçalho da lição; estado persistido e mesclado entre
  dispositivos (estrelas pendentes e Fôlego).

### Compatibilidade de áudio e ajustes pedagógicos

- **Áudio repete em qualquer navegador**: o TTS não enfileira mais o `speak()`
  na mesma tick do `cancel()` (o que fazia Firefox/Safari descartarem a fala e o
  áudio "só repetir no Chrome"); quando há fala em curso, o reinício é adiado um
  tick. O estado "tocando" também encerra no evento `error`, então o botão nunca
  fica preso e sempre repete.
- **Aluno é personagem da conversa**: o avatar à esquerda das cenas é o próprio
  aluno — antes rotulado "Lin" (que já é personagem das histórias), ele dizia
  "meu nome é Matheus". Agora leva o nome do usuário (padrão "Matheus"),
  personalizado em runtime nas falas, prompts e no rótulo do personagem.
- **Nome do usuário em todas as superfícies**: a troca do nome-modelo virou um
  utilitário compartilhado (`lib/personalize`) e passou a valer também nas
  histórias interativas (Imersão) e na Revisão — antes elas mostravam "我叫马修 /
  meu nome é Matheus" mesmo com o nome do aluno definido.
- **Primeira frase de sobrevivência mais suave**: `我不会说中文` deixa de abrir
  com quiz frio e comparação com frases ainda não ensinadas (`听不懂`,
  `请再说一遍`); ganha introdução, reconhecimento com apoio e distratores
  conhecidos antes de cobrar.
- **3 estrelas = desempenho perfeito**: revisões não fecham mais em 3 estrelas
  com 90% — a 3ª estrela exige 100% sem erros, igual às lições normais.

### Revisão — rodadas de pontos fracos

- **Corrigir pontos fracos** abre sessão focada em rodadas (5 tarefas) com
  formatos variados sobre erros/itens fracos.
- Se o aluno falhar de novo, o item volta para a fila (e erros da Jornada
  continuam alimentando esta ala).
- UI da `/revisao` mais limpa: CTA forte, métricas claras, histórico recolhido.

### CTAs com ícone alinhado

- Corrige o chevron empilhado sob o rótulo em botões (`Continuar`, `Rever lição`,
  `Entendi`): o Preflight do Tailwind marca `svg` como `block`, e o `Button`
  agora mantém rótulo+ícone em linha.
- No desktop, `Continuar` / `Rever lição` / `Revisar N itens` ficam **compactos**
  (não esticam em faixa vermelha vazia); no mobile permanecem full-width.

### Sidebar compacta estilo Duolingo

- Barra lateral com abas principais; **Loja** na barra no estágio recorrente.
- Hover em **Praticar** → Hànzì, Pinyin Lab, Fala, Leitura, Biblioteca, Imersão.
- Hover em **Perfil** → Amigos, Conta, Plano Pro.
- **Perfil** fica no rodapé da rail, imediatamente acima de **Mais**.
- Mais permanece curto (sistema) + “Ver menu completo”.
- Mobile estágio 5: Jornada · Praticar · Missões · Perfil · Mais.
- Mobile: toque em **Praticar / Perfil / Mais** abre sheet inferior com os mesmos
  atalhos (sem hover), para o aluno acessar Hànzì, Loja, Amigos etc.

### Reformulação da Jornada (2026-07-23)

- Cabeçalho funcional (`JourneyHeader`): Fase · Unidade, objetivo curto, anel de
  progresso acessível, ação principal `Continuar`/`Começar` e ação recomendada
  secundária `Revisar N itens` (só com SRS pendente), além de indicador offline
  e estado de Jornada concluída (com mascote).
- Unidades concluídas e futuras ficam **compactas** e expansíveis; só a unidade
  atual abre o caminho de nós — de 110+ nós para ~10 no desktop de um aluno
  avançado, melhorando densidade e performance. O checkpoint temático foi
  incorporado ao card da unidade (um separador a menos).
- Continuidade robusta: rola até a lição atual só quando ela não está visível
  (sem saltos de layout); a lição atual expõe `aria-current="step"`.
- Revisão de SRS (recomendada, positiva) separada visualmente da revisão
  curricular (nó dourado no caminho). Painel lateral desktop enxuto (Revisão,
  Missão, Progresso geral), sem duplicar o cabeçalho.
- Acessibilidade e movimento: nós são botões reais, barras/anel com rótulo, e o
  pulso da lição atual respeita `prefers-reduced-motion`. Novo hook `useOnline`.
- Testes: `e2e/journey-redesign.spec.ts` (novo, progresso, revisão, concluída,
  unidades compactas, expandir, offline, reduced motion, painel, teclado).

### Navegação progressiva e descoberta de recursos (2026-07-22)

- Estágio do aluno **derivado** de dados que já existem (lições, SRS, medalhas,
  liga, sequência) — sem nova fonte de verdade. `src/lib/learnerStage.ts`
  reaproveita as regras de desbloqueio de `journeyUnlocks`/`proAccess`.
- Navegação principal adaptativa: barra inferior mobile com no máximo 5 destinos,
  variando por estágio (novo: Jornada · Perfil · Mais; recorrente: + Missões);
  sidebar desktop cresce conforme o progresso. Todas as rotas continuam
  acessíveis por URL direta e pelo menu "Mais".
- Menu "Mais" reorganizado em **Aprender · Motivação · Conta**, com estados
  derivados por área (recomendada, nova, bloqueada com explicação do quê/quando,
  Pro) — áreas bloqueadas explicam em vez de mostrar só um cadeado.
- Descoberta de recursos: card discreto no hub da Jornada (com o mascote) anuncia
  uma área recém-liberada por vez, dispensável e persistido. Nunca modal, nunca
  em sequência, nunca durante uma lição.
- Migração segura de usuários antigos: a memória de "já apresentado" vive em
  `localStorage` (fora do store, sem tocar sync/merge) e é semeada com o que já
  é relevante — sem enxurrada de anúncios ao atualizar.
- Testes: `e2e/progressive-nav.spec.ts` (novo/treino/recorrente/rota direta/
  descoberta/migração/desktop). Asserções de CTA da landing atualizadas para
  `role: "link"` (os CTAs viraram links na entrega anterior).

### Padronização de CTAs e densidade de missões (2026-07-22)

- Novos primitivos `ButtonLink` e `AnchorButton` (mesmo visual de `Button`) e
  helper `buttonClasses`, eliminando o antipadrão `<Link><Button/></Link>` — um
  `<button>` aninhado em `<a>`, que é HTML inválido e prejudica teclado e
  leitores de tela. Migrados ~39 CTAs em 14 telas (Jornada, Missões, Revisão,
  Liga, Hànzì, Imersão, Landing, Ajustes, player de lição, paywall Pro e mais).
- `ActionButton` (sistema `page.tsx`) passou a renderizar um link real quando
  recebe `to`, corrigindo o mesmo aninhamento nas telas de Conta, Perfil, Plano
  e Dados locais de uma só vez; `ContaPage` deixou de embrulhar o botão em `Link`.
- Cards de missão mais leves: removido o badge de estado redundante (já indicado
  por ícone, borda, barra de progresso e rótulo do botão) e as três pílulas de
  recompensa consolidadas em um único selo — de até 5 badges para no máximo 2.
- Novo teste E2E garante ausência de elementos interativos aninhados
  (`a button` / `button a`) nas rotas principais, incluindo os dois sistemas de
  componentes.

### Padronização visual e acessibilidade (2026-07-22)

- Design system incremental com variantes semânticas de Card, Button e Pill,
  cabeçalhos compartilhados e estados Empty/Loading/Error.
- Shell desktop/mobile com alvos de toque de 44 px, foco visível e proteção
  contra overflow horizontal; safe areas e modo foco do player preservados.
- Biblioteca e Conquistas com filtros horizontais contidos e semântica de
  seleção; hubs mais legíveis em telas de 320–360 px.
- Onboarding com navegação acessível, progresso semântico e CTA protegido da
  safe area; Login e Ajustes com hierarquia e controles consistentes.
- Modais com foco inicial, contenção de Tab, Escape e restauração de foco.
- Auditoria documentada em `docs/UI_UX_AUDIT.md` e nova suíte E2E de
  responsividade, tema, reduced motion e teclado.

### Auditoria de prontidão beta (2026-07-21)

- Instalação limpa + `validate:beta` + build + E2E Chromium/Firefox; WebKit falhou no offline PWA.
- Correção de corpus: caracteres `多`/`少`/`饿` no catálogo; distractores sem antecipar preço; exit duro em `validate-corpus`.
- Relatórios/checklist/release atualizados; classificação de PRs abertas sem fechamento automático.
- Veredito: **NO-GO** (78%) — ver `docs/BETA_READINESS_AUDIT.md`.

### Conversation Vocabulary Loop → SRS

- Ao concluir (ou abandonar) uma conversa, o manifesto de vocabulário entra na
  fila de revisão espaçada com **prioridade pelo desempenho**: erro, abandono,
  várias tentativas, novidade e resposta da intenção (alta); acerto com
  assistência / pouco praticada (média); acerto imediato / consolidada (baixa).
- Deduplicação pedagógica: preferir **chunk** a cada hànzì isolado; preservar
  itens SRS já existentes; alternar domínios (som, significado, forma, uso,
  fala, leitura) nas revisões futuras.
- Histórico enriquecido (`assistanceLevel`, `mainAnswer`, `errorRefs`, `setting`)
  sincroniza no snapshot/merge; a mesma cena com erro não volta só por isso —
  a intenção reabre noutro cenário depois de revisar o conteúdo.
- Testes: `validate:conversation-vocabulary-srs` (no `validate:beta`).

### Fase Pós-Conversa (plano pedagógico)

- Após cada `conversation_scene`, o plano injeta **2–4 tarefas adaptativas**
  (revisão/imersão: **3–8**) com estágio `post_conversation` e metadados
  `postConversationPhase` / `postConversationTaskType`.
- Seleção adaptativa por desempenho (erros recentes), `conversationVariantLevel`,
  repetição de cena e papel do vocabulário (novo vs antigo): significado, áudio,
  produção, cenário alternativo, reparo, imagem e Hànzì Builder quando adequado.
- Player: faixa compacta **Pós-Conversa** na primeira tarefa; rótulo na barra de
  progresso; telemetria `post_conversation_shown`.
- `ProOfferEngine`: momento protegido `post_conversation` (sem ofertas Pro na
  sequência imediata após a conversa).
- Validadores, testes de loop/migração, relatório do loop e E2E atualizados.

### Migração completa V1→V2 (conversas)

- **33/33 cenas** do catálogo usam **nós + ramificação** como fonte principal;
  nenhuma cena autoral V1 (`lines` + `checkpoint` manual) restante.
- `sceneV2` continua derivando `lines` + `checkpoint` dos nós para fallback do
  player V1 (`VITE_ENABLE_CONVERSATION_V2=false`), feature flag e relatórios
  antigos — sem duplicação manual no catálogo.
- Validador exige nós em todas as cenas, confere derivação lines/checkpoint e
  remove tratamento especial de papel `legacy`.
- Novo `validate:conversation-migration`: flag V2 on/off, histórico antigo,
  currículo, resposta correta/errada, repetição, abandono, fim, variantes
  guided/independent/audio_first e Conversation Vocabulary Loop.
- Build: limite do Workbox PWA ajustado para precache do bundle principal (~3 MB).

### Conversa: áudio automático ao avançar

- Nas cenas de conversa, cada fala toca sozinha ao aparecer (Continuar /
  Responder / abertura da cena). O botão de áudio permanece para ouvir de novo.

### Catálogo de conversas V2 expandido

- **Todas as 33 cenas** do catálogo passam a ser V2 (nós + ramificação), com
  `sceneId` preservado para não quebrar histórico/`conversationHistory`.
- Novos mínimos pedagógicos: comum **6–10 falas / 2–3 intervenções**; revisão de
  módulo **10–14 / 3–5**; imersão **14–24 / 5–8**, com ≥2 caminhos e ≥2 finais.
- Diálogos com início contextual, desenvolvimento, objetivo comunicativo, reação
  e encerramento; ramos de erro com pista + reformulação (erro não encerra a
  cena). Situações de reparo (não entendi / repita / confirme) entram no fluxo.
- Compatibilidade: `sceneV2` deriva `lines` + `checkpoint` de fallback para o
  player V1 (`VITE_ENABLE_CONVERSATION_V2=false`); o histórico continua chaveado
  por `sceneId`.
- `revisao-numeros` inserida à mão em `l9-rev` para manter 33/33 no destravamento.
- Limites em `validate:conversation-scenes`, testes de vocabulário/loop, relatórios
  de cobertura e destravamento atualizados.
- Dificuldade derivada do **papel V2** (comum leve → 1; comum densa/revisão → 2;
  imersão → 3), para as fases iniciais continuarem a preferir cenas adequadas.
- `pedir-cha` inserida como aquecimento em `p7-imersao-casa-amigo` (33/33 no
  destravamento após o reajuste de dificuldade).

### Correção — microfone no celular (reconhece de verdade)

- O botão **Falar** falhava em Chrome/Edge Android: sem liberar o mic antes do
  SpeechRecognition e com escuta curta demais (`continuous: false`), o app
  caía em "não ouvi" / falha como se o microfone não funcionasse.
- Agora: `getUserMedia` só para pedir permissão e **libera o stream**; em
  seguida o reconhecimento roda sozinho com `continuous` + interim, timeout
  maior e botão **Parar**. Erros viram mensagens claras (permissão, rede, etc.).
- Gravação para playback continua só no desktop (no mobile gravar junto disputa
  o mic).

### Natureza em SVG flat (padrão visual único)

- Conceitos de natureza (`mountain`, `tree`, `sun`, `moon`, `water`, `fire`,
  `sky`, `woods`, `forest`) passaram de foto/WebP para **SVG chapado** na mesma
  linguagem visual do restante do catálogo (fundo pale mint, formas geométricas
  suaves, sem textura fotográfica).
- Metadados atualizados para `flat_illustration` / `neutral`; a categoria
  `nature` fica unificada na família flat.
- Guia (`docs/VISUAL_ASSET_GUIDE.md`) aceita SVG como formato preferido para
  ilustração chapada.

### Catálogo visual 100% SVG flat

- Os **37** conceitos de exercício com imagem agora usam SVG na mesma estética
  (pessoas, objetos, comida, ações, quantidade, animais). Fotos e renders 3D
  (`person`, `mouth`, `big`, `small`) foram substituídos.
- Gerador: `scripts/generate-flat-svgs.py`. Validações
  `validate:visual-consistency` / `validate:image-exercises` atualizadas.

### Correções — robustez da lição e microfone no celular

- **Fim da tela branca ao errar tudo**: um `ErrorBoundary`
  (`src/components/system/ErrorBoundary.tsx`) agora envolve o conteúdo das
  páginas (dentro do shell) e a raiz do app. Uma exceção de render — como a que
  aparecia ao errar todas as tarefas e cair no fluxo de fim de lição — deixa de
  desmontar a árvore inteira; em vez da tela branca o aluno vê uma recuperação
  no estilo do site (Tentar novamente / Voltar para a Jornada / Recarregar),
  com o progresso preservado. O boundary se reseta ao trocar de rota, então dá
  para sair de uma tela quebrada pela navegação sem recarregar.
- **Revisão de erros à prova de travamento**: se um erro gerar um exercício de
  correção sem opções nem peças jogáveis, a resposta é revelada e o avanço é
  liberado, em vez de prender o aluno numa tela sem botão utilizável.
- **Microfone volta a funcionar no celular**: em `PronunciationPractice`, a
  gravação de playback (`MediaRecorder`/`getUserMedia`) não roda mais em
  dispositivos de toque — ela disputava o microfone com o reconhecimento de
  fala e o quebrava no mobile. Agora o reconhecimento fica com o microfone
  sozinho no celular; o playback segue disponível no desktop. A mensagem para
  navegadores sem reconhecimento (Safari do iPhone) explica a alternativa de
  ouvir e repetir em voz alta.

### Conversation Vocabulary Loop — reúso no plano real da lição

- **A ligação altera o plano REAL** entregue ao player: `buildLessonPracticePlan`
  agora injeta, DEPOIS de cada conversa, tarefas que praticam o vocabulário
  exibido (`applyConversationVocabularyLoop` em `lessonTasks.ts`). Cada item
  relevante mostrado numa conversa aparece em ≥1 atividade posterior; itens
  novos/errados ganham ≥2 modalidades cognitivamente diferentes, com ≥1
  recuperação ativa; a resposta principal é reaplicada em contexto.
- **Créditos primeiro** (não incha a lição): tarefas já existentes que reusam o
  vocabulário contam; só o que falta é adicionado, respeitando tetos de
  repetição semântica, o limite de "mesma resposta correta" (≤2, alinhado ao
  `validate:exercise-depth`), transformação cognitiva, limites de Hànzì Builder e
  a progressão de estágios. O acumulador de tetos é compartilhado entre as
  conversas da lição (duas conversas não repetem a mesma resposta além do teto).
- **Metadados na tarefa derivada** (consumidos pelo player): `conversationDerived`,
  `conversationSourceSceneId`, `conversationCoveredRef`, `conversationModality`,
  `conversationExposureNumber` e `conversationDerivedReason` (erro vs regra).
- **Validador** `validate:conversation-loop` (no `validate:beta`): falha quando
  vocabulário de conversa fica sem tarefa posterior, palavra nova tem uma só
  exposição/modalidade, tarefa derivada vem antes da conversa, todas as derivadas
  são da mesma modalidade, a resposta principal nunca é recuperada ou um item de
  ramo de erro nunca é revisto. Relatório `reports/conversation-loop-report.md`
  (conversas analisadas, vocabulário exibido/coberto, reúso médio, itens sem
  cobertura, modalidades).
- **Testes** `test:conversation-loop`: lição comum, revisão de módulo, imersão,
  conversa sem/com novidade, com erro, V1/V2, variante beginner, plano no limite,
  substituição de exercício superficial e preservação da ordem pedagógica.

### Conversation Vocabulary Loop — caminho inverso do vocabulário

- **Núcleo** `src/data/conversationVocabulary.ts`: dado a variante EFETIVAMENTE
  exibida de uma conversa (V1 ou V2, incluindo variantes beginner/intermediate/
  advanced), extrai de forma determinística todo o vocabulário mostrado — chunks,
  hànzì, palavras, intenção, respostas esperadas — a partir do caminho principal,
  ramos de erro, interações e explicações, para reúso nas atividades da mesma
  lição e nas revisões.
- **Função central** `buildManifestForResolvedVariant(scene, resolved)`: recebe a
  variante JÁ RESOLVIDA (a mesma que o player exibe), garantindo que o manifesto
  represente exatamente o que foi mostrado; `buildConversationVocabularyManifest(scene, context)`
  é o atalho que resolve e delega.
- **`expectedAnswers`** no manifesto: respostas esperadas do aluno (texto cru),
  além dos seletores `itemsByRole`/`itemsBySource` e `reusableRefsFromManifest`.
- **Referências canônicas** (`chunk:<id>` / `char:<id>`) via segmentação por
  correspondência mais longa: um chunk cadastrado nunca é quebrado em partículas
  soltas; os hànzì que o compõem ficam em `charRefs` (reúso granular em SRS).
- **Papéis** por item: obrigatório, auxiliar, novo, antigo (reutilizado), apenas
  exposto e "exige resposta" (aparece numa resposta esperada) — acumuláveis.
- **Não resolvido nunca é ignorado**: texto exibido sem referência no catálogo é
  registrado em `coverage.unresolvedTexts` + `warnings` (aviso de desenvolvimento
  via `warnUnresolvedConversationVocabulary`), sem inventar IDs.
- **Cobertura reversa** integrada ao `validate:conversation-scenes` (relatório
  `conversation-coverage-report.md`): sinaliza refs declarados que nunca aparecem
  no texto (over-declaração) e glifos sem `char:` standalone (ex.: 那/里, hoje só
  dentro de chunks) — como avisos, sem quebrar o portão.
- **Testes** `validate:conversation-vocabulary` (14 casos: V1, V2, ramificada,
  variantes, ramo de erro, opcional ausente, item novo/antigo, texto sem
  referência, deduplicação, chunk com vários hànzì, palavra repetida) + verificação
  de determinismo em todas as cenas reais. Comportamento das conversas inalterado.

### Privacidade — consentimento pedagógico opt-in

- `getTelemetryConsent()` passa a retornar **false** sem escolha explícita; nenhum evento pedagógico é enviado antes da decisão.
- Modal compacto “Ajude a melhorar o Longyu” após cadastro/primeiro acesso ao painel (Permitir / Agora não / Ver detalhes).
- Ajustes → **Privacidade e dados**: toggle, detalhes do que é coletado, limpar fila, exportação, exclusão de conta e política.
- Revogar limpa a fila local imediatamente, preserva progresso e feedback manual.
- Perfil Supabase: `pedagogy_analytics_consent`, `consented_at`, `revoked_at` (migration `011`).
- Servidor: `submit_beta_pedagogy_event` exige consentimento no perfil autenticado; allowlist `conversation_*` alinhada ao app (migration `012`).
- Hardening pedagógico (migration `013`): rate limit (auth/anon + por tipo), whitelist de metadata, limites de tamanho, digest UA com rotação diária (sem IP), sessão anônima opcional, retenção 90 dias com agregados diários.
- Validador `validate:privacy-consent` no portão `validate:beta`.
- Validador `validate:pedagogy-rpc-hardening` no portão `validate:beta`.

### Identidade visual consistente dos exercícios com imagem

- **Guia oficial** (`docs/VISUAL_ASSET_GUIDE.md`): dois estilos — Conceito isolado
  e Cena contextual — e a regra de ouro de não misturar famílias de estilo numa
  mesma pergunta.
- **Metadados** em `VisualConcept`/`VisualScene`: `visualStyle`
  (photo/realistic_illustration/flat_illustration), `backgroundStyle`
  (neutral/contextual/transparent) e `subjectCount`, auditados contra o arquivo real.
- **Grades sempre consistentes**: `defaultVisualDistractors` só escolhe
  distractores da mesma família de estilo (realistic vs flat) — nenhuma pergunta
  mistura foto com desenho chapado, sem remover cobertura visual.
- **Renderer**: `object-contain` para fundo neutro (sem cortar o sujeito),
  `object-cover` para cena contextual; skeleton e quadro de altura fixa evitam
  layout shift; fallback de ícone/emoji quando a imagem falha.
- **Auditoria automática** (`validate:visual-consistency` →
  `reports/visual-consistency-report.md`): dimensão, proporção, tamanho,
  transparência, metadados, ausência de URL externa, alt e consistência de
  distractores; lista candidatos a substituição por prioridade.
- **Testes visuais** (`e2e/visual.spec.ts`): imagem principal, grade de opções,
  mobile 360px, modo escuro e fallback de erro de carregamento.

### Diversidade de conversas pelo histórico real do aluno

- **`conversationHistory`** no progresso do aluno (cena, intenção, lição,
  resultado, tentativas; máx. 100, mais recente primeiro). Viaja no snapshot da
  conta e é mesclado no sync (união deduplicada por cena+lição+timestamp).
- **Rotação personalizada**: a pontuação de seleção usa o histórico real —
  penaliza a cena da última lição, das últimas conversas, a intenção e o cenário
  repetidos; e favorece cenas nunca realizadas, intenção/cenário pouco
  praticados e cenas que trabalham um erro recente.
- **`conversationVariantLevel`** (guided → assisted → independent → audio_first):
  uma cena que reaparece volta num nível acima (sem tradução, depois só áudio),
  nunca na mesma versão. Aluno novo recebe a versão guiada; aluno avançado, a
  independente.
- **Retorno pedagógico após erro**: a mesma cena não reaparece na lição seguinte;
  primeiro o vocabulário/intenção é revisto e, mais tarde, a intenção volta em
  outro cenário.
- **Métricas** de conversa (sem respostas livres): `conversation_shown`,
  `conversation_completed`, `conversation_repeated`, `conversation_error`, com
  intenção e nível da variante.

### Integração das cenas de conversa com o currículo

- **Cobertura**: todas as 33 cenas do catálogo agora aparecem em algum plano real
  (antes ~18); nenhuma cena passa de 15% das lições e nenhuma intenção passa de
  20% das conversas geradas.
- **`optionalRefs`**: novo campo separa o vocabulário essencial (requiredRefs) do
  auxiliar; a elegibilidade só exige o essencial, o auxiliar apenas enriquece.
- **Variantes por estágio** (`variants`): uma cena pode ter versões iniciante /
  intermediária / avançada; a avançada nunca aparece antes do currículo
  correspondente (ex.: pedir água começa em 你好 + 水).
- **Rotação justa**: penalidade de recência graduada (janela de 10) impede que
  uma única cena domine; a cobertura é medida com rotação encadeada, como um
  aluno real percorre a jornada.
- **Inserções autorais**: cenas de água, identificar pessoa, onde está, sala de
  aula, pedir ajuda, o que é isto, loja, revisões e uma unidade dedicada de
  **Imersão** (mercado, estação, casa de amigo).
- **`validate:conversation-scenes`** reforçado: falha se uma cena comum elegível
  nunca é usada, se uma cena/intenção domina, se requiredRefs têm frases
  desnecessárias, se optionalRefs são tratados como obrigatórios, ou se uma cena
  de imersão entra em lição comum. Novo relatório `conversation-unlock-report.md`.

## [0.2.0-beta.1] — 2026-07-18

Primeira beta pública do Longyu.

### Adicionado

- Versionamento `0.2.0-beta.1` visível de forma discreta em Sobre, rodapé da landing, modal de feedback e painel admin.
- Ambientes explícitos: **Development**, **Preview**, **Production Beta**.
- Feature flags de rollback: `VITE_ENABLE_CONVERSATION_V2`, `VITE_ENABLE_TELEMETRY`, `VITE_ENABLE_BETA_FEEDBACK`.
- Aviso discreto de beta na landing e em Sobre (não em todas as telas).
- Checklist de release (`docs/BETA_RELEASE_CHECKLIST.md`) com critérios de publicação e rollback.
- Smoke tests E2E ampliados para os fluxos críticos da beta.
- Guardrails de deploy: bloqueio de Pro Preview e fixtures de teste no ambiente principal.

### Segurança / entitlements

- Pro Preview nunca libera no ambiente principal (`production_beta`), mesmo com flag vazada.
- Conta QA (`teste@longyu.app`) não propaga Pro para outros usuários no mesmo dispositivo (logout / troca de conta).
- Variáveis de Preview isoladas do contexto Netlify `production`.
- `EntitlementBootstrap` só sobrescreve Pro com resposta do servidor quando há sessão cloud.

### Corrigido

- Revisão Pro: hooks de atalho após early return causavam React #300 na reidratação.

### Mantido

- Todas as funcionalidades pedagógicas atuais (lições, Hànzì Builder, imagens reais, conversation_scene V2, revisão, feedback, sync).
- Feedback beta com Supabase e painel admin.

## [0.1.0] — anterior

Beta privada / desenvolvimento interno.
