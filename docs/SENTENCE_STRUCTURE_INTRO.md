# Introdução gradual à estrutura de frase

Objetivo: o aluno entende a **lógica** da frase antes de ver rótulos como sujeito, verbo, objeto e partícula.

Não é aula tradicional de gramática. Chinês primeiro, explicação curta, visual, baseada em padrões (“mandarim pela lógica”).

## Por que não começar com 我要茶?

Em `p3-ordem-das-palavras` o aluno já conhece **我是巴西人**, **我叫…** e **你好吗？** — ainda não **要 + 茶**.  
A intro usa o que já foi ensinado; o exemplo 我要茶 volta como reforço em `l26b`, quando o padrão 我要 + coisa existe.

## Progressão → lições

| Etapa | O que acontece | Lição |
|------|----------------|--------|
| 1 | Ver a frase + Quem? / O que faz? / O quê? | `p3-ordem-das-palavras` |
| 2 | Lógica: quem + ação + coisa | `p3-ordem-das-palavras` |
| 3 | + pergunta: quem + ação + coisa + pergunta (吗) | `p3-ordem-das-palavras` |
| 4 | Nomes: quem=sujeito · ação=verbo · coisa=objeto · 吗=partícula | `p3-nomes-da-frase` |
| 5 | Termos técnicos nas atividades | a partir de `l5-rev` |

Reforço com 我要饭 / 我要茶: `l26b`.

Fonte canônica: `src/data/sentenceStructureIntro.ts`.

## Prerequisites de UI (rótulos)

Catálogo: `src/data/structuralConcepts.ts`

| Estágio UI | Quando | Exemplo |
|------------|--------|---------|
| intuitivo | antes de `p3-nomes-da-frase` | quem · ação · coisa |
| pareado | intro → prática | quem (sujeito) · ação (verbo) |
| técnico | depois de `l5-rev` (sujeito/verbo/objeto) | sujeito · verbo · objeto |

`introducedAt` dos conceitos básicos aponta para **`p3-nomes-da-frase`** (etapa 4), não para a lição só de lógica.

Validação: `npm run validate:structural-concepts`.
