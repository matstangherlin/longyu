# RC2.2.22 — Validação humana do aprendizado

Pergunta da onda: **o produto funciona de verdade para outras pessoas, em outros aparelhos, e elas aprendem sem ajuda do desenvolvedor?**

Estado honesto: **nenhuma sessão com tester humano foi feita ainda.** Este documento é o plano e o lugar onde os resultados entram, separados em OBSERVED / INFERRED / NOT_TESTED.

- Testers são identificados só por ID (T01, T02, T03…).
- Nunca entram e-mail, senha, OTP, gravação ou transcrição.

## OBSERVED

Nada observado com humanos até agora (0 sessões registradas em `docs/release/rc2-2-22-manifest.json`).

## INFERRED

Vem do código e do plano autoral (`docs/reports/rc2-2-22-first-20-lesson-audit.json`). Não é resultado com pessoas.

- **20 sessões iniciais:** 149 passos no total, cada sessão com 5 a 14 passos.
- **Repetição ruim:** nenhuma (mesma pergunta, mesma resposta e mesma forma a menos de 3 passos).
- **Complexidade de tela:** nenhum passo OVERLOADED; 3 passos HIGH, nas sessões 2, 4 e 20.
- **Sessões 17–20 (p1-primeiros-hanzi):** sem passo de transferência para a vida real (contexto, conversa ou produção). Risco de "parece quiz".
- **Sessões sem apoio visual:** 1, 2, 3, 5, 6, 7, 8 e 13–16. Contam como apoio visual: imagem, contorno de tom, montagem de hànzì ou cena.
- **Carga da primeira sessão:**
  - orçamento de no máximo 2 orientações, 1 revelação, 1 cerimônia e 1 pedido de permissão;
  - medido pelos eventos técnicos no `/qa/device` → Beta QA;
  - ainda **não medido com humanos**.
- **Duração:** a estimativa "5 min" **não vale como dado**. `observedDurationMedianMin` fica `null` até existir sessão real.

## NOT_TESTED

Tudo o que depende de uma pessoa usando o app:

- **Primeira sessão sozinho.** O tester novo passa sozinho por Landing → Curso → Teste guiado → Meta diária → Conta → Jornada → Primeira lição? Observar onde hesita, volta, abandona ou erra repetidamente.
- **O tester entende:**
  - o que é o Longyu;
  - o que está aprendendo;
  - como ouvir;
  - como responder;
  - como continuar;
  - onde está a Jornada.
- **Orientações:** explicam e desaparecem? "Você entendeu por que isso apareceu?"
- **Primeiras 5, 10 e 20 aulas:** clareza, ritmo, repetição, dificuldade, visual, áudio e contexto. "O tester sabia o que fazer sem alguém explicar?" Se não, é **UX FAIL**, mesmo que a tarefa funcione tecnicamente.
- **Revisão:** parece revisão ou repetição infinita? Tem de 5 a 8 itens, termina com "Revisão concluída." e oferece [Continuar revisando] como opção.
- **Tons:**
  - o tester entende visualmente 1º estável, 2º sobe, 3º desce/sobe, 4º cai?
  - linha, animação, mão e som ajudam ou sobrecarregam?
- **Diagramas de articulação** (j/q/x, zh/ch/sh, z/c/s, r, ü): fazem sentido para uma pessoa comum?
- **Imersão:** "pareceu uma conversa/história ou um quiz com decoração?"
- **Cultura:** Jornada → Cultura → aprender → voltar à Jornada sem se perder.
- **Descoberta progressiva:** quando o tester descobre Praticar, Cultura, Revisão, Atlas e Imersão? "Você sentiu falta de alguma área?"
- **Perfil e conta:**
  - o tester acha sozinho Perfil, medalhas, editar, aparência e sair;
  - "Excluir conta" fica separado e pede confirmação.
- **Autenticação:**
  - cadastro → confirmação → login → sair → entrar de novo → esqueci a senha;
  - falha do backend aparece com mensagem compreensível, nunca com o erro cru do Supabase.
- **Rede e segundo plano:** Wi-Fi, dados móveis, rede lenta e offline; minimizar o app, abrir outro e voltar.

## Plano de testers (não inventado)

| Categoria | Meta quando iniciar | Foco |
| --- | --- | --- |
| BEGINNER | alguns | entrar, entender, ouvir, falar, continuar |
| HAS_STUDIED_CHINESE | alguns | clareza pedagógica, tons, Revisão |
| TECHNICAL_QA | alguns | bugs Android, aparelhos diferentes |

Não usar só desenvolvedores.

**Instrução ao tester** (curta; não ensina a usar o app):

> Use o Longyu normalmente por 15–30 minutos. Se algo não funcionar ou ficar confuso, registre.

**Perguntas neutras** (no fim):

1. O que ficou confuso?
2. Algo não funcionou?
3. Alguma parte pareceu repetitiva?
4. Alguma parte pareceu muito difícil?
5. Você conseguiu ouvir os áudios?
6. Você conseguiu gravar e ouvir sua voz?
7. Você usaria novamente?

**Registro por sessão** (`validateHumanQaSession`):

- build, classe do aparelho e direção do curso;
- lições testadas;
- categorias de resultado: COMPLETED_ALONE, NEEDED_HELP, HESITATED, WENT_BACK, ABANDONED, REPEATED_ERRORS, TECH_FAILURE;
- carga da sessão e comentário opcional.

Uma sessão humana **nunca** marca PASS físico.

**Durante a Beta, o que interessa:** conclusão, tentativas, erros, abandono e uso de ajuda. Métricas de vaidade não. Sem gravação de tela, sem session replay e sem voz em analytics.
