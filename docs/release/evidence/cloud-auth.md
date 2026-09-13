# Evidência — Cloud Auth real (P4)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a um projeto Supabase de QA com credenciais reais, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/cloud-auth.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Projeto Supabase de QA (NÃO produção)
- Três contas de teste: A, B, C
- Candidate publicado com `VITE_USE_TEST_FIXTURES=false`

## Passos

1. **Signup** — criar a conta A pelo fluxo real. Confirmar e-mail se o projeto exigir.
2. **Login** — sair e entrar de novo com A.
3. **Session restore** — fechar o browser, reabrir, confirmar que a sessão volta.
4. **Refresh token** — deixar a sessão passar da validade do access token e confirmar renovação silenciosa.
5. **Password reset** — disparar o reset de A e concluir com a nova senha.
6. **Logout** — sair.
7. **P4.1 Isolamento** — entrar com B. Confirmar que B **não** recebe XP, Journey, Culture, Hànzì, estrelas, Reforço + nem entitlement de A.
8. Repetir o passo 7 em um navegador limpo, para separar isolamento de conta de cache local.

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
