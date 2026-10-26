# Congelamento até o fim da beta fechada

Fonte de política já no repositório: `docs/release/RC_CHANGE_POLICY.md` (feature freeze RC2.3.12, vigente desde 09/10/2026 23:19 America/Sao_Paulo) e `src/lib/curriculumFreeze.ts` (`FEATURE_FREEZE = "PUBLIC_BETA"`, `CURRICULUM_FREEZE = "RC2_CONTENT_FREEZE"`, exceções `PRE_BETA_FREEZE_EXCEPTION*`). Este arquivo não afrouxa esses gates. Ele só declara o que o relatório v1.1 (§12.7) permite até o fim da beta fechada.

## Entra

- Segurança, crash, perda de dados, autenticação.
- Bloqueio no Android.
- Bug pedagógico grave (lição impossível, progresso errado, áudio que impede concluir).
- Acessibilidade já coberta pelo PR #358.
- Correção com exceção estreita no padrão `PRE_BETA_FREEZE_EXCEPTION_*` de `src/lib/curriculumFreeze.ts`, citando o LGY e pedindo aprovação no PR.

## Não entra

- Novas lições, nova pedagogia, novos pares mínimos, vocabulário HSK novo, gramática nova (prompts 26–29).
- Gamificação nova, animações novas, remodelagem de Journey ou Culture.
- Economia, XP, Qi ou Cargas com regra nova.
- Schema novo.

## Migrations que o código já espera

Aplicar as migrations já existentes em `supabase/migrations/` e o SQL em `supabase/pending/` **não é schema novo**. É a correção do drift (LGY-001 e vizinhos): o cliente no `main` já chama colunas, RPCs e funções que a produção de 08/10/2026 não tem. Isso entra na Onda 1, com rollback e checklist humano, primeiro em staging. A branch `beta/1.0.0` ("só entra o que está na lista") fica para **depois da Onda 1**, quando esse schema esperado já estiver aplicado. Não criar essa branch neste PR.

## Branch de congelamento

Decisão assumida no prompt 01 (ainda sem confirmação do Matty em `DECISOES.md`): criar `beta/1.0.0` depois da Onda 1, não agora.
