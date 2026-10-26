# QA report 2026-10 — controle da beta fechada

Esta pasta é o controle do **Relatório de QA e Análise Pedagógica do Longyu v1.1 (25/10/2026)**. O PDF/markdown do relatório fica com o Matty, fora do repositório. Aqui entram só o que o código e os PRs precisam para executar o plano: linha de base, decisões, congelamento e o rastreador dos 47 itens (LGY-001…LGY-047) e dos 20 casos de regressão (R-01…R-20).

Veredito do relatório, ainda não revisto: **NO-GO para a beta fechada** até zerar os P0 (drift do banco, Edge Functions, CORS, vazamento de progresso entre contas) e os P1 de login/perfil. O Plano Consolidado de 24/10/2026 dizia "zero issues abertas". Esta pasta existe para não perder essa contradição.

## Como usar

O pacote de prompts (31 arquivos, outubro/2026) não está versionado. Um prompt = um chat = uma branch = um PR, na ordem Fase 0 → Onda 1 → Fase 1 → Onda 2 → Depois → Testes → Reauditoria.

1. Confirme que o PR anterior já entrou no `main` quando o prompt novo depende dele.
2. Se o prompt tiver "Decisão necessária", registre a escolha em `DECISOES.md` antes de implementar.
3. Ao fechar o PR, atualize a linha do ID em `TRACKER.md` (status, branch/PR, evidência).
4. Produção (`drjcfalvlbbeblmmyhwj`, site Netlify publicado) é somente leitura para o agente. Migration, Edge Function, SMTP, tag e release param num checklist humano.

| Arquivo | Função |
|---|---|
| `BASELINE.md` | SHA de produção × `main` e resultado dos gates no dia da linha de base (prompt 01) |
| `TRACKER.md` | Status de LGY-001…047 e R-01…R-20 |
| `DECISOES.md` | D1–D3 e as decisões de produto que os prompts seguintes pedem |
| `CONGELAMENTO.md` | O que entra e o que não entra até o fim da beta fechada |

Caminho crítico: 01 → 02 → 03 (aplicação humana) → 04 → 05 (deploy humano) → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 30 → 31. O prompt 31 é o GO/NO-GO. Os prompts 26–29 são pedagogia nova e ficam para depois da beta fechada, salvo exceção explícita.
