# Progressão de scaffold em `transfer_task`

## Problema (antes)

A primeira transferência podia exigir várias transformações novas de uma vez.

Exemplo real (anti-padrão):

| Peça | Antes |
|------|--------|
| Âncora aprendida | 我要这个 / wǒ yào zhège / “Eu quero este.” |
| Situação | “Você recebe uma visita em casa. Ofereça chá, perguntando se a pessoa quer.” |
| Alvo | 你要茶吗？ |
| Transformações simultâneas | 我→你 · 这个→茶 · afirmação→pergunta · +吗 · vocabulário · produção do zero |

No código antigo, `frame_niyaoma` estava em `FRAME_INTRO_EASE: 3` (cedo) e `transferTasksFor` não filtrava por degrau de assist — a pergunta com 吗 competia com frames de 1 slot na primeira ocorrência.

## Princípio

Uma transformação nova por vez nas primeiras ocorrências. Produção real permanece; produção aberta continua mais tarde.

## Escada (depois)

| Level | Assist | O que muda | Exemplo |
|------:|--------|------------|---------|
| 1 | `guided` | Um slot da estrutura já conhecida | 我要这个 → 我要茶 (`我要 ___`) |
| 2 | `supported` | Transformação já ensinada + dica visual | 我要茶 → 你要茶 (`我 → 你`) |
| 3 | `question` | Só +吗 depois do padrão interrogativo | 你要茶 → 你要茶吗？ |
| 4 | `open` | Situação nova sem estrutura exposta | `produce_open` / `productionAssist: "open"` |

### Metadados reutilizados

- `ProductionAssist`: `guided` \| `supported` \| `question` \| `open`
- Frames: `transferAssist`, `transferRequiresFrameIds`, `transferRequiresMa`, `transferTransformHint`
- Novo frame intermediário: `frame_niyao` (你要 ___, supported)
- `frame_niyaoma` agora é `question` e exige `frame_woyao` + `frame_niyao` + glifo 吗
- Tentativa 0: `maxTransferAssistForAttempt(0) === "guided"` e `preferLowestRung`
- Tentativa 1: sobe até `supported`
- Tentativa 2+: até `question`
- UI (`StepFreeProduction`): rótulo do degrau, dica 我→你, hint de 吗, scaffold de slots (sem virar múltipla escolha)

## Exemplos reais — primeiras `transfer_task` (attempt 0)

Gerado por `npm run validate:production-transfer` (ver `reports/production-transfer-report.md`).

### Antes (comportamento indesejado)

- Âncora `我要这个` + alvo com 吗 na mesma batida (sujeito + objeto + partícula juntos).
- `frame_niyaoma` elegível cedo demais na ordem de introdução.

### Depois (attempt 0 — só guided)

No plano real, a 1ª tentativa só emite `productionAssist: "guided"` (1 mudança).
Como `我要茶` / `我要水` já são frases do corpus, elas vão para **produção livre**;
a transferência early usa combinações inéditas no mesmo moldura de 1 slot — p.ex.:

- `frame_wobuhe` · guided · âncora 我不喝茶 → `我不喝水。` (só o objeto)
- depois, com vocabulário maior: `frame_woyao` · guided · âncora 我要这个 → `我要苹果。` / `我要热水。`

Nenhuma transferência na tentativa 0 usa `productionAssist: "question"` nem `frame_niyaoma`.

O anti-padrão `我要这个` → `你要茶吗？` deixa de aparecer na 1ª ocorrência.

### Depois (tentativas seguintes)

- Attempt 1: `frame_niyao` / `frame_qingwenzainali` (supported, com `transferTransformHint`)
- Attempt 2+: `frame_niyaoma` → `你要茶吗？` só depois de 你要 + 吗 já terem degraus próprios

Produção aberta (`productionAssist: "open"`) permanece em passos `free_production` abertos — não foi convertida em MCQ.

## Critérios

1. Primeira ocorrência de uma estrutura não exige 3–4 transformações novas → **ok** (attempt 0 = guided).
2. Interrogativa só depois de apresentada/praticada → **ok** (`transferRequiresMa` + frame `question` + ranking por attempt).
3. Sujeito + objeto + partícula não simultâneos na 1ª transferência → **ok**.
4. Produção aberta mais tarde → **ok**.
5. Não reduzir transferência a múltipla escolha → **ok** (ainda digitação livre + scaffold).
6. Mandarim pela lógica → **ok** (estrutura + uma mudança).
7. Não inflar depth/transfer → **ok** (mesmos motores; só filtra degrau).
8. Testes/validator atualizados → `scripts/validate-production-transfer.mjs` + este relatório.
