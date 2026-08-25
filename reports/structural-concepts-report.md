# Relatório: conceitos estruturais e rótulos de UI

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 8043a11ab298 |
| HEAD no instante da geração | 3d3dec570075f50599885cbf791132b80b70b40d |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-25T18:58:20.561Z |
| Lições | 127 |

## Política de rótulos

| Estágio | Quando | Exemplo |
|---------|--------|---------|
| intuitivo | antes de `introducedAt` | quem · ação · coisa · pergunta |
| pareado | intro → prática | quem (sujeito) · ação (verbo) |
| técnico | depois de `practicedAt` | sujeito · verbo · objeto |

## Catálogo

| Conceito | Intuitivo | Técnico | Intro | Prática | Frames |
|----------|-----------|---------|-------|---------|--------|
| `basic_word_order` | ordem da frase | ordem básica | p3-nomes-da-frase | l5-rev | 6 |
| `subject` | quem | sujeito | p3-nomes-da-frase | l5-rev | 10 |
| `verb` | ação | verbo | p3-nomes-da-frase | l5-rev | 10 |
| `object` | coisa | objeto | p3-nomes-da-frase | l5-rev | 9 |
| `particle` | marca | partícula | p3-nomes-da-frase | p5-kou-ma-pergunta | 4 |
| `question_ma` | pergunta | pergunta com 吗 | p3-nomes-da-frase | p5-kou-ma-pergunta | 1 |
| `negation_bu` | não | negação com 不 | p4-char-bu | l14-frase-minima | 2 |
| `aspect_zai` | agora | aspecto (em progresso) | l11-falo-pouco | l12 | 1 |
| `aspect_le` | mudança | aspecto (mudança) | l26 | p6-direcoes | 1 |
| `location` | lugar | localização | p6-cidade-lugares | p6-direcoes | 3 |
| `time` | quando | tempo | p6-clima | p6-direcoes | 3 |
| `quantity` | quanto | quantidade | l22 | l23 | 2 |
| `classifier` | medida | classificador | l22 | l23 | 1 |
| `polite` | educado | cortesia | p1-qingwen-cortesia | p6-cidade-lugares | 1 |

## Amostra de estágios no plano real

| Estágio | Contagens (conceito×passo) |
|---------|---------------------------:|
| intuitivo | 59 |
| pareado | 21 |
| técnico | 328 |
| Passos de produção com slots | 104 |

## Exemplos de rótulo por lição

- **l5**: quem · ação · coisa · marca
- **p3-ordem-das-palavras**: quem · ação · coisa · marca
- **p3-nomes-da-frase**: quem (sujeito) · ação (verbo) · coisa (objeto) · marca (partícula)
- **l5-rev**: quem (sujeito) · ação (verbo) · coisa (objeto) · marca (partícula)
- **l26b**: sujeito · verbo · objeto · partícula
- **l11-rev**: sujeito · verbo · objeto · partícula

<!-- integridade:ce9e73c5e2706650 -->
