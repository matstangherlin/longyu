# Evidência — Family de ponta a ponta no deploy candidate (V4.10A.1)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. O fluxo Family foi verificado
> contra um PostgreSQL 16 **local**, com as migrations aplicadas de verdade e o
> resultado registrado em `docs/reports/v410a1-commercial-closure.md`. Isso
> prova a lógica; **não** prova o deploy. Banco hospedado tem RLS real,
> `auth.uid()` real, latência real e uma extensão a menos do que se imagina.
>
> O agente que preparou este arquivo **não tem acesso** ao projeto Supabase do
> candidate, então marcar `pass: true` aqui seria inventar evidência.

## Como preencher

Ao executar, substitua o bloco RESULTADO e atualize o check `family_plan_live`
em `docs/release/rc1-operational-checks.json` com `pass`, `testedAt`,
`environment` e `commitSha`.

**Nunca versionar segredo nem token de convite real.** O token do convite é o
segredo do link: mascarar sempre (`a1b2***`).

## Pré-requisitos

- Projeto Supabase do candidate com as migrations `20260914120000`,
  `20260914200000` e `20260914210000` aplicadas
- Uma conta com assinatura Family ativa (Stripe Test Mode)
- Duas contas de teste além da do dono

## Passos

1. **Dono sem família** — `/familia` mostra o estado vazio e leva a `/pro`.
2. **Criar convite** — o link aparece **uma única vez**. Recarregar a página não
   mostra o token de novo.
3. **Token só em hash** — consultar `family_invites` no banco e confirmar que o
   valor do link não aparece em nenhuma coluna.
4. **Convite ocupa lugar** — a contagem sobe antes de alguém aceitar.
5. **Aceitar** — a conta convidada abre o link, entra e recebe Pro. Conferir a
   origem: `get_server_entitlement()` precisa dizer `family_membership`.
6. **Uso único** — reabrir o mesmo link depois do aceite é recusado.
7. **Sétimo lugar** — com seis ocupados, criar convite é recusado pelo servidor
   (não só pelo botão desabilitado).
8. **Revogar** — o lugar volta na hora.
9. **Remover membro** — o acesso Pro cai na próxima chamada, e o progresso da
   pessoa continua intacto.
10. **Dono para de pagar** — cancelar a assinatura no Stripe Test Mode e
    confirmar que os membros caem para Free sem nenhum job manual.
11. **Privacidade** — com a conta do dono, tentar ler progresso de um membro
    pela API. Precisa falhar.

## RESULTADO

| Campo | Valor |
| --- | --- |
| date | _(não executado)_ |
| environment | _(não executado)_ |
| result | **NOT_RUN** |
| commitSha | _(não executado)_ |
| tester | _(não executado)_ |

### Observações

_(preencher ao executar — incluir o que falhou, não só o que passou)_
