# RC2.3.10 — E-mail de Auth em produção

| Gate | Status |
|---|---|
| `RESEND_DOMAIN_PASS` | **OWNER_ACTION_REQUIRED** (`OA-RESEND-DOMAIN`) |
| `SUPABASE_SMTP_PASS` | **CONFIG_REQUIRED** (`OA-SUPABASE-SMTP`, `OA-AUTH-RECOVERY-TEMPLATE`) |
| `CUSTOM AUTH EMAIL READY` | não alcançado |

## O que dá para afirmar

- Daqui não consigo ler a configuração de SMTP, os templates nem os provedores do Supabase Auth (não há ferramenta MCP para isso; ficam como `NOT_READABLE_FROM_AGENT` no snapshot).
- Sem SMTP próprio, o Supabase usa o servidor padrão, que tem limite de envio baixo e não serve para produção.
- `create-account` (produção v9) envia confirmação via `admin.auth.resend` com `emailRedirectTo` numa allowlist (`/confirmar-email` em `longyu.com.br`, `longyu.netlify.app`, `singular-meringue-7838cd.netlify.app` e localhost). Fora da allowlist, o redirect cai para o canônico. A resposta é sempre genérica (anti-enumeração).
- Resend: free 100 e-mails/dia, 3.000/mês (`platform-budget-registry.json`).
- Nenhuma credencial SMTP no repo ou no frontend. O gate de bundle procura `SMTP_PASS(WORD)` e chaves `re_…`.

## Fluxo para certificar (owner)

1. Resend → Domains: adicionar o domínio de envio e publicar SPF/DKIM (e DMARC recomendado) no DNS → status Verified.
2. Supabase → Authentication → SMTP Settings: host/porta/usuário do Resend; a senha (API key do Resend) só no painel. Remetente `no-reply@<domínio>`; reply-to para uma caixa monitorada.
3. Supabase → Email Templates: confirmação e recovery (código), conforme `OA-AUTH-RECOVERY-TEMPLATE`.
4. Testes com conta sintética (nunca real): signup + confirmação, reenvio, recovery, link inválido/expirado, deep link no Android.
5. Evidência: horários e resultado de cada teste (sem o conteúdo do e-mail).
