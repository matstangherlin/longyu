# Evidência — licença Business no deploy candidate (V4.10A.1)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. A reserva de assento e a disputa
> do último lugar foram medidas contra um PostgreSQL 16 **local**, com duas
> sessões concorrentes de verdade — o resultado está em
> `docs/reports/v410a1-commercial-closure.md`. Isso prova que o trigger e o
> advisory lock funcionam; **não** prova nada sobre o banco hospedado, onde o
> pool de conexões, o PgBouncer e a latência mudam o timing da disputa.
>
> O agente que preparou este arquivo **não tem acesso** ao projeto Supabase do
> candidate nem a uma organização Business real.

## Como preencher

Ao executar, substitua o bloco RESULTADO e atualize o check
`business_seats_live` em `docs/release/rc1-operational-checks.json`.

**Nunca versionar segredo.** E-mails de colaborador devem ser mascarados
(`a***@empresa.com`).

## Pré-requisitos

- Projeto Supabase do candidate com a migration `20260914180000` aplicada
- Uma organização com `organization_subscriptions.seat_limit` conhecido
- Contas de teste suficientes para encher a licença

## Passos

1. **Painel** — `/business/dashboard` mostra assentos e atividade. Conferir que
   o número bate com o banco.
2. **Convite reserva** — criar um convite pendente e confirmar que o painel já
   conta o lugar antes de qualquer aceite.
3. **Vencido libera** — envelhecer o `expires_at` e confirmar que o lugar volta.
4. **Estouro recusado** — com a licença cheia, tentar mais um. O erro precisa
   vir do servidor (`BUSINESS_SEATS_FULL`), não do botão.
5. **Disputa real** — duas requisições simultâneas para o último assento. Uma
   passa, uma é recusada, e o total final **não** ultrapassa a licença. Registrar
   os dois retornos.
6. **Autorização** — com uma conta `learner` da mesma organização, chamar
   `get_business_overview`. Precisa responder `FORBIDDEN`.
7. **Organização vizinha** — com um `owner`, chamar a RPC com o UUID de outra
   organização. Precisa responder `FORBIDDEN`.
8. **Privacidade** — conferir que a lista de colaboradores não traz resposta
   livre, fala transcrita nem snapshot de progresso.

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
