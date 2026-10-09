# RC2.3.10 — Privacidade dos dados de produção

**Gate `DATA_PRIVACY_PASS` = `OWNER_ACTION_REQUIRED`.** Todas as garantias obrigatórias se confirmam em produção, exceto uma duplicação de PII que precisa de decisão (`OA-PRIVACY-SNAPSHOT-EMAIL`).

Leitura de 2026-10-08, só agregados e nomes de chave; nenhum conteúdo de linha.

| Garantia | Evidência | Resultado |
|---|---|---|
| Gravação de voz não persistida | Gravação do "Ouça você" é `URL.createObjectURL` local (`SelfComparePractice.tsx`); evidência de fala em `localStorage` (`longyu:speech-evidence-v1::<conta>`), sem áudio nem transcrição (a spec RC2.3.5 verifica isso); em produção, **0** linhas de `user_progress` com chaves `recording`/`audioBlob`/`transcript` | ok |
| Coordenadas de traço de Hànzì não persistidas | `src/lib/hanziWriting/*` não grava em storage; 0 linhas com `strokes`/`strokePoints` | ok |
| Tokens fora da telemetria | `beta_pedagogy_events.metadata` passa pela allowlist `sanitize_pedagogy_metadata`; as 23 chaves presentes são contadores/ids técnicos (`activeMs`, `attempts`, `correct`, `mistakes`, `sceneId`, `stars`, `stepIndex`, `variantLevel`, …) | ok |
| Segredos fora de analytics/bundle | Gate `validate:apk-provenance` (JWT service_role, `sb_secret_`, conexão Postgres, Stripe, Resend, token Sentry, host do Jev, nomes de env secretos) | ok |
| Jev sem dado desnecessário | A triagem envia categoria, rota, lição, tipo de exercício e mensagem (até 4 000 caracteres). Não envia `user_id`, e-mail nem perfil. | ok |
| Evidência do aluno sem PII | Learner Evidence Record, mastery e speech evidence ficam em `localStorage` com namespace por conta; não sobem para a nuvem | ok |
| Logs sem e-mail/token | `logOpsEdge` só registra ids de correlação/fase/código; o Sentry (quando ligado) passa por `scrubEvent`/`scrubBreadcrumb` | ok |
| **E-mail duplicado no snapshot** | **12 de 14** `user_progress.client_snapshot` contêm `account.email`, gravado de propósito por `supabaseLearningRepository.ts:92`. Só o dono lê (RLS), mas o e-mail já está em `auth.users`. | **decisão** → `OA-PRIVACY-SNAPSHOT-EMAIL` |
| Feedback | `beta_feedback.message` é texto livre do aluno (pode conter PII digitada por ele); RLS: só o autor e admins leem | registrado |

Recomendação para a decisão do e-mail: **drop**. O snapshot não precisa do e-mail (o restore usa `user.email` do Auth em `cloudSyncCoordinator.ts:283/303`). A mudança de código fica para depois desta wave, porque altera o contrato de sync e reescreve linhas na próxima sincronização.
