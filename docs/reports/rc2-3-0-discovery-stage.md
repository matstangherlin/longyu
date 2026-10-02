# RC2.3.0 — Discovery Stage

**Status:** `ENGINE_READY` · piloto nas primeiras sessões · `OWNER_PEDAGOGICAL_ACCEPTANCE: NOT_RUN`

## Conceito

**Descoberta** = estágio pedagógico de primeira classe que garante exposição antes da avaliação.

Não se chama vídeo / video lesson / tutorial / apresentação.

Vídeo poderá ser um recurso futuro dentro de uma Descoberta.

## Sequência conceitual

Descoberta → Fixação → Uso → Domínio  
(integrada aos Mastery Passes 1–4)

## API

| Função | Papel |
|---|---|
| `hasLearnerBeenTaught(conceptId)` | EXPOSTO? (≠ DOMINADO) |
| `markConceptsTaught(...)` | marca exposição após Descoberta |
| `withDiscoveryStage(...)` | injeta passos no Pass 1 se necessário |
| `TeachingMoment` | conteúdo reutilizável de ensino |

Persistência local: `longyu:taught-concepts-v6`.

## Conteúdos com Descoberta (piloto)

| Momento | Conceitos | Lições |
|---|---|---|
| `discover:nihao:v1` | nihao, greeting | `p1-o-que-e-mandarim`, `l2` |
| `discover:pinyin:v1` | pinyin | `p1-o-que-e-pinyin` |
| `discover:tone-ma:v1` | tone 1–4 | `p1-o-que-e-tom` |
| `discover:hanzi-ni:v1` | hanzi, ni, hao | `p1-o-que-e-hanzi`, `p1-primeiros-hanzi` |
| `discover:water:v1` | shui/water | `l3`, `p1-engine-2-lab` |
| `discover:fan:v1` | fan/meal | (catálogo; sem lição piloto ainda) |

## Fluxo legado

Lições fora do early pilot set **não** recebem injeção automática nesta onda (`pilotOnly: true`).

## Replay / conta existente

- Se `hasLearnerBeenTaught` = true → Descoberta **não** é obrigatória de novo.
- `discoveryMomentId` permanece disponível para “Rever explicação” futura.
- Instalação limpa → Descoberta no primeiro Pass 1 elegível.

## Integração

Sem segundo player. Passos `intro`/`listen` com `pedagogyRole: "discovery"` no GuidedLessonShell/LessonPlayer.
