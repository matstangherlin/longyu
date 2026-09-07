# V4.9.5A — Identidade e Pessoas

Base: `main` em `29e2bbbb4f5b10c3ac46b6b51cc559cfc6640923` (V4.9.4C).

## Auditoria

| Conceito | Já existia? | Ensino | Uso/transferência | Exposições auditadas | Cena | Ação |
|---|---|---|---|---:|---|---|
| Estudo | Sim | `l10`, `l11-falo-pouco` | `l12`, `sala-de-aula` | 8+ | `falar-de-estudo` | RECALL |
| Trabalho | Sim | `p6-rotina-trabalho` | `p6-cidade-lugares` | 7+ | `rotina-e-trabalho` | NÃO TOCAR |
| Família / casa | Sim | `l24` | `l25`, imersão | 12+ | `identificar-pessoa` | RECALL |
| Amigos | Sim | `l13`, `l18` | `l22`, `l23`, `l24` | 28+ | `identificar-pessoa` | TRANSFERÊNCIA |
| `他` | Sim no catálogo | `l18` | `l18`, `l24` | nova rota em l18 | `identificar-pessoa` | AQUISIÇÃO + PRODUÇÃO |
| `她` | Sim no vocabulário; faltava ensino na Jornada | `l18` | `l18`, `l24` | nova rota em l18 | `identificar-pessoa` | AQUISIÇÃO + PRODUÇÃO |
| Descrição (`很好`) | Sim | corpus anterior | l18/l24 | alta frequência | `identificar-pessoa` | RECALL |
| `有/没有/的` | Sim | lições anteriores | família e amigos | alta frequência | cenas existentes | NÃO TOCAR |
| `这是...` | Sim | família | mãe e amigo | alta frequência | `identificar-pessoa` | RECALL + TRANSFERÊNCIA |

O trabalho já tinha perguntas e respostas canônicas (`你做什么工作？`, `你在哪里工作？`, `我要工作`) em `p6-rotina-trabalho`; por isso a remessa usa a combinação menor de estudo (`你是学生吗？`, `我是学生`, `我学习中文`) e não abre um catálogo de profissões.

## Implementação

- Chunks novos: **0**.
- Chars novos no catálogo: **1**, `char:ta_she` (`她`); `他` já existia e `她` já existia em `vocabulary.ts`.
- Sentence banks novos: **0**; os exercícios reutilizam os construtores existentes.
- Cenas reutilizadas/refinadas: `sala-de-aula` e `identificar-pessoa`.
- Cenas novas: **0**; `identityPeopleScenes.ts` concentra os nós autorais das cenas existentes.
- Cena órfã auditada: `conversa-em-casa` permanece fora do arco porque só pratica `你呢？`/estado geral e não acrescenta identidade, relação ou terceira pessoa.
- Lições alteradas: `l11-falo-pouco`, `l13-dialogo-nome`, `l18`, `l24`; não foram criados IDs paralelos.
- Primeiro ponto de terceira pessoa: `l18`, após ouvir/reconhecer `他` e `她`.
- Primeira produção independente do arco (estudo): `l11-falo-pouco` M3 (`我在学校学习`); primeira produção independente de terceira pessoa: `l18` (`她是学生。`, `他很好。`); `l24` amplia para `这是我朋友。他很好。`.
- O loop pós-conversa agora declara duas tarefas de modalidades diferentes nas cenas de estudo e família, com metadados `post_conversation` auditáveis.
- A entrada anterior `那是人吗？` foi preservada antes de `identificar-pessoa`.

## Dívida, contratos e gates

| Medida | Antes | Depois |
|---|---:|---:|
| `KNOWN_DEBT` | 21 | 9 |
| Entradas novas | — | 0 |

Quitadas: `l11-falo-pouco` (`na_which`, `li_inside`, `zai`), `p6-china-cidades-2` (`zai`, `li_inside`), `p6-china-ruas` (`na_which`, `li_inside`), `p6-saude` (`zai`, `li_inside`) e `p6-survival-mandarin` (`zai`, `li_inside`). Permanecem apenas dívidas históricas não ligadas ao arco.

Fingerprint da Jornada: `af8a41db54c8` → `e77045f102a3`. Os contratos backend foram regenerados depois da alteração.

`IDENTITY_PEOPLE_ARC` verifica `self_name`, `origin`, `study_or_work`, `identify_person`, `relationship`, `third_person_reference`, `simple_description` e `reciprocal_question` em produção real. As 9 mutações de regressão passam: learnedRef não ensinado, pronome sem ensino, produção convertida em escolha, relação não ensinada, terceira pessoa removida, lição duplicada, overlay EN removido, dívida nova e fingerprint desatualizado.

Gates específicos aprovados: corpus, lessons, lesson-options, teach-before-test, teach-before-test:journey, conversation-scenes, conversation-vocabulary, conversation-vocabulary-srs, conversation-loop, conversation-pedagogy, lexical-progression, lesson-novelty, exercise-depth, production-transfer, transfer-integrity, cognitive-budget, early-transfer-ladder, first-communicative-win, acquisition-momentum, i18n, test:i18n, journey-en, learner-response, player-ux, test:v478-hosted-gate, test:v489-production-preflight, test:backend-contract, validate:backend-ready e `build`.

O build oficial (`npm run build`) passa após o `vite-build.mjs` usar o carregador runner, necessário neste checkout Windows para evitar a resolução esbuild da árvore ancestral. Nenhuma etapa de V4.9.6, rotina profunda, monetização ou backend hospedado foi iniciada.
