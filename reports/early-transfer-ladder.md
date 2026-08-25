# Early Transfer Ladder (V4.5)

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 191f4fa2345c |
| HEAD no instante da geração | 49de639eb6d5166d9695848352dc44156d072f9b |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T08:16:52.426Z |
| Lições | 127 |


## Before → After

| Métrica | Antes (V4.4.1 baseline) | Depois |
| --- | --- | --- |
| lessonToFirstTransfer | 47 | 15 |
| estimatedTimeToFirstTransfer | ~188 min | ~60 min (≈4 min/lição) |
| firstFrame | frame_woyouge | frame_qingwennijiaoshenme |
| firstTarget | 我有一个朋友 | 请问你叫什么 |
| guided / supported / question | 112/0/19 | 24 / 1 / 0 |
| totalTransfers (127) | 82 | 25 |
| transfersBy20 | — | 1 (1 lições) |
| transfersBy30 | — | 1 (1 lições) |
| transfersBy50 | — | 3 (3 lições) |
| uniqueTargetsBy50 | — | 3 |
| uniqueFramesBy50 | — | 2 |
| maxFrameShareBy50 | — | 0.67 |
| maxConsecutiveSameFrame | — | 2 |
| labTransferCount | — | 0 |
| domainMismatchCount (soft) | — | 4 |
| unknownComponentViolations | — | 0 |
| onboardingSteps (L1–20) | ~206 | 207 |

## Supported = 0 — explicação

Na tentativa 0, `maxTransferAssistForAttempt` libera só **guided**, exceto frames com
`earlyTransferOnAttemptZero` na **primeira** transferência combinacional (ex.: 请问，你叫什么？ → supported).
Degraus **question** exigem attempt ≥ 2. O contador antigo 112/0/19 misturava tentativa 0
com todo o plano; agora supported aparece quando a exceção pedagógica se aplica.

## Primeiras 15 transferências (auditoria humana)

### L15 `l2-rev`

- **Lesson:** l2-rev
- **Frame:** frame_qingwennijiaoshenme
- **Anchor:** 你叫什么？
- **Target:** 请问，你叫什么？
- **Novel:** combinational (não está no corpus)
- **Known components:** 你叫什么, 请, 问, 你, 叫, 什, 么
- **Domain:** social
- **Why selected:** primeira transferência combinacional; prefixo cortês sobre base já produzida; domínio social
- **Assist:** supported

### L47 `p3-ordem-das-palavras`

- **Lesson:** p3-ordem-das-palavras
- **Frame:** frame_woyouge
- **Anchor:** 我有三个朋友
- **Target:** 我有一个朋友。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我有三个朋友, 我, 有, 一, 个, 朋, 友
- **Domain:** study
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio study
- **Assist:** guided

### L50 `l14`

- **Lesson:** l14
- **Frame:** frame_woyouge
- **Anchor:** 我有三个朋友
- **Target:** 我有五个朋友。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我有三个朋友, 我, 有, 五, 个, 朋, 友
- **Domain:** study
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio study
- **Assist:** guided

### L92 `l19-logica-luz`

- **Lesson:** l19-logica-luz
- **Frame:** frame_woyouge
- **Anchor:** 我有三个朋友
- **Target:** 我有四个朋友。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我有三个朋友, 我, 有, 四, 个, 朋, 友
- **Domain:** study
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio study
- **Assist:** guided

### L105 `l26`

- **Lesson:** l26
- **Frame:** frame_wozai
- **Anchor:** 我在学中文
- **Target:** 我在喝水。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我在学中文, 我, 在, 喝, 水
- **Domain:** work
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio work
- **Assist:** guided

### L106 `l26b`

- **Lesson:** l26b
- **Frame:** frame_woxihuan
- **Anchor:** 我喜欢中文
- **Target:** 我喜欢中国。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我喜欢中文, 我, 喜, 欢, 中, 国
- **Domain:** restaurant
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio restaurant
- **Assist:** guided

### L107 `l27`

- **Lesson:** l27
- **Frame:** frame_wozai
- **Anchor:** 我在学中文
- **Target:** 我在吃饭。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我在学中文, 我, 在, 吃, 饭
- **Domain:** work
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio work
- **Assist:** guided

### L108 `l28`

- **Lesson:** l28
- **Frame:** frame_woxihuan
- **Anchor:** 我喜欢中文
- **Target:** 我喜欢鱼。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我喜欢中文, 我, 喜, 欢, 鱼
- **Domain:** restaurant
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio restaurant
- **Assist:** guided

### L109 `p6-rotina-trabalho`

- **Lesson:** p6-rotina-trabalho
- **Frame:** frame_wozai
- **Anchor:** 我在学中文
- **Target:** 我在睡觉。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我在学中文, 我, 在, 睡, 觉
- **Domain:** work
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio work
- **Assist:** guided

### L110 `p6-cidade-lugares`

- **Lesson:** p6-cidade-lugares
- **Frame:** frame_wo_le
- **Anchor:** 我饿了
- **Target:** 我睡觉了。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我饿了, 我, 睡, 觉, 了
- **Domain:** health
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio health
- **Assist:** guided

### L111 `p6-china-cidades`

- **Lesson:** p6-china-cidades
- **Frame:** frame_woxiangchi
- **Anchor:** 我想吃米饭
- **Target:** 我想吃鱼。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我想吃米饭, 我, 想, 吃, 鱼
- **Domain:** restaurant
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio restaurant
- **Assist:** guided

### L112 `p6-china-cidades-2`

- **Lesson:** p6-china-cidades-2
- **Frame:** frame_woqu
- **Anchor:** 我去学校
- **Target:** 我去银行。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我去学校, 我, 去, 银, 行
- **Domain:** directions
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio directions
- **Assist:** guided

### L113 `p6-china-ruas`

- **Lesson:** p6-china-ruas
- **Frame:** frame_zainali
- **Anchor:** 火车站在哪里？
- **Target:** 车站在哪里？
- **Novel:** combinational (não está no corpus)
- **Known components:** 火车站在哪里, 车, 站, 在, 哪, 里
- **Domain:** directions
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio directions
- **Assist:** guided

### L114 `p6-saude`

- **Lesson:** p6-saude
- **Frame:** frame_wo_le
- **Anchor:** 我饿了
- **Target:** 我回家了。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我饿了, 我, 回, 家, 了
- **Domain:** health
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio health
- **Assist:** guided

### L115 `p6-horarios`

- **Lesson:** p6-horarios
- **Frame:** frame_woqu
- **Anchor:** 我去学校
- **Target:** 我明天去医院。
- **Novel:** combinational (não está no corpus)
- **Known components:** 我去学校, 我, 明, 天, 去, 医, 院
- **Domain:** time
- **Why selected:** transferência posterior; 1 slot vs âncora; domínio time
- **Assist:** guided

## contextual_transfer vs combinational_transfer

- **combinational_transfer:** contado acima — alvo inédito montado de componentes já ensinados.
- **contextual_transfer:** reutilizar frase conhecida em situação nova (métrica separada; não infla novelTargets).

<!-- integridade:0780b24cebd57b06 -->
