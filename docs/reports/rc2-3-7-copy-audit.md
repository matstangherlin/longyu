# RC2.3.7 — Copy Audit

## Learner errors — title · explanation · action, no engine words

| Before | After | Class |
|---|---|---|
| "Cliente Supabase indisponível." | "Não foi possível conectar à sua conta agora. Tente novamente em instantes." | network |
| "O microfone só funciona em HTTPS." | "O microfone não está disponível nesta página. Você pode continuar sem falar." | permission |
| About: "Com Supabase configurado, você pode criar conta e sincronizar progresso." | "Com uma conta, seu progresso é salvo e sincronizado." | — |
| Review wrong label "Errado" | "Quase" (always shown with the right answer and explanation) | feedback |
| Stalled step "Tentar continuar" | "Tentar novamente" (canonical retry) | recoverable |

Gate SG7 scans all 2 703 PT strings (and EN) for SpeechRecognizer, Supabase, RPC, SQL, Edge Function, HTTP 4xx/5xx, ASR, Exception, null/undefined. Exempt: QA/dev keys and the privacy notice, which must name the system speech service.

Error classes in use: **recoverable** (stalled step → Tentar novamente), **blocking** (error boundary → Tentar novamente / Recarregar o app / Reportar problema), **technical** (audio failure → Tocar novamente / Eu ouvi, continuar / Continuar sem áudio), **permission** (microphone → continue without speaking), **network** (offline → Tente de novo), **content unavailable** (voice missing → configure voice / continue). Every one has an exit (gate SG14 + RC2.3.5 speech fallbacks).

## Canonical CTA vocabulary

Continuar · Começar · Ouvir · Responder · Tentar novamente · Gravar · Parar · Comparar · Ver resultado · Voltar à Jornada (+ "Voltar a Seu Domínio" for mastery practice). CTAs never carry rewards (gate SG10 — "Continuar +20 XP" is a killed mutation).

## Product terms (PT-BR)

Jornada · Praticar · Revisão · Seu Domínio · Fala · Hànzì · Cultura. "Treino" survives only as a route name (`/treino`), not as learner copy on new surfaces.

## "Por que estou vendo isto?" — concrete, evidence-based

Per competency: "Nas últimas vezes, reconhecer de ouvido não saiu como esperado." · "Você vem conseguindo usar numa resposta sem ajuda." · "Até agora você praticou isto escolhendo entre opções; usar livremente vem depois." Never algorithm, score, target id or confidence. Empty state: "Continue praticando para vermos seu progresso."

## Jev copy DEV_AUDIT (never rewrites; flags REVIEW)

26 strings (25 unique) via the Vault-held key, model `jev-1.13.0`: ambiguity (NOUL), clarity of next action (SCORE, only meaningful for instructions/errors), intent (CHOICE). Result [`rc2-3-7-jev-copy-audit.json`](rc2-3-7-jev-copy-audit.json):

| Key | Text | Jev | Human decision |
|---|---|---|---|
| guidance.masteryFirstUse.body | Seu Domínio mostra o que você já demonstrou e o que ainda está consolidando. | ambiguity 0.64 | owner-specified wording — keep, owner to confirm |
| guidance.cultureFirstUse.body | Comece por esta recomendação. | instruction, clarity 1.47 | anchored to the recommendation card — keep |
| review.feedbackWrong / player.almost | Quase | ambiguity 0.64 | never shown alone (answer + explanation follow) — keep |
| player.stepStalled | Isto demorou para avançar. Toque para tentar de novo. | ambiguity 0.62 | candidate rewrite next wave |
| why.BELOW_MIN_EVIDENCE | Ainda são poucas tentativas para dizer mais — tudo bem. | ambiguity 0.60 | candidate rewrite next wave |
| why.NEEDS_MORE_INDEPENDENT_SUCCESS | Os acertos até agora tiveram ajuda — é parte do caminho. | ambiguity 0.67 | candidate rewrite next wave |

Clear: all error messages (clarity 2.6–3.0), welcome (2.99).
