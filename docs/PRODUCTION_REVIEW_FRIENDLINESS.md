# Produção, transferência e revisão mais amigáveis

Ajuste pedagógico/UX para atividades que pediam esforço demais da interface e pareciam “difíceis demais” no primeiro contato — sem esvaziar a profundidade.

## O que mudou e por quê

### 1. Primeiras ocorrências mais naturais
- **Problema:** a ordenação alfabética dos frames fazia a primeira transferência cair em `我不喝 ___` com âncora `我不会说中文` (estrutura diferente) dentro de lições de tom.
- **Ajuste:**
  - âncoras de recusa passam a ser `我不喝茶` / `我不吃肉` (mesma estrutura);
  - frames introdutórios (`我要 ___`, `我想喝 ___`) vêm **antes** de recusa/negação na seleção;
  - situações e notas gramaticais mais curtas.

### 2. Tela de produção/transferência mais clara
- **Ordem:** situação → apoio (âncora/scaffold) → input (o pedido vem primeiro).
- **Menos texto:** o card “O que fazer” virou uma linha sob a situação.
- **Scaffold:** uma linha de chips + modelo `我想喝 ___` (sem legenda duplicada `→`).
- **Títulos** mais leves: “Sua vez de produzir”, “Use o que já sabe”, “Diga do seu jeito”.
- **Placeholders** usam o padrão da frase quando existe.

### 3. Produção aberta menos verbosa
- Situações longas de restaurante/cidade viraram uma frase.
- Hints mais curtos — mantêm a escolha do aluno, sem parágrafo.

### 4. Revisão / recuperação = apoio, não punição
- Oferta: título + **uma** linha de suporte (sem 3 cards repetindo a mesma ideia).
- Modos: “Apoio” / “Quase lá” no lugar de “Recuperação” / “Última chance”.
- Copy deixa explícito: a revisão tem **mais apoio** que a atividade original (ex.: montar com peças).
- Microajuda no build: “é mais fácil que digitar do zero”.
- Medalhas continuam seguras durante a oferta/revisão (não cobrem o CTA).

## O que **não** foi simplificado demais
- Transferência continua sem alternativas e sem banco.
- Produção livre continua sem eliminação.
- A 3ª estrela ainda exige acertar os itens da revisão.
- Combinações novas na transferência seguem fora do currículo memorizável.

## Como validar
```bash
npm run test:review-ux
npm run test:qa-regression-guard
npm run validate:production-transfer
npx playwright test e2e/qa-regression-guard.spec.ts --project=chromium
```
