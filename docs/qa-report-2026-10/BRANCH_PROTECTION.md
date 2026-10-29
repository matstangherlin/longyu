# Branch protection da `main` — LGY-038

O agente não altera configuração do GitHub. Em 26/10/2026 a API `GET /repos/matstangherlin/longyu/branches/main/protection` respondeu 403 para o token deste ambiente. Isso não prova que a proteção existe nem que falta. Quem aplica é o Matty, com permissão de admin.

O `main` hoje aceita o que o relatório descreveu: push direto e checks não obrigatórios. Os nomes abaixo são o `name:` do job. No Checks da PR eles apareceram assim, sem prefixo de workflow. Se a UI mostrar `CI / Portão de qualidade (validate:beta + build)`, use o texto da UI, não este arquivo.

| Job | Workflow | Quando exigir |
|---|---|---|
| `Portão de qualidade (validate:beta + build)` | `.github/workflows/ci.yml` | agora |
| `Testes E2E (Playwright)` | `.github/workflows/ci.yml` | agora |
| `Secret scan (gitleaks)` | `.github/workflows/security.yml` | só depois que o scan ficar verde (LGY-037 ainda tem 6 JWTs anon no histórico) |

## Na UI

1. GitHub → `matstangherlin/longyu` → Settings → Rules → Rulesets (ou Branches → Branch protection rules, se a conta ainda usar a tela antiga).
2. Nova regra no branch `main`.
3. Exigir pull request antes de merge. Neste repositório de uma pessoa, não exija aprovação de outro revisor: isso trava o merge. Exigir o PR já bloqueia push direto.
4. Exigir status checks e marcar "Require branches to be up to date before merging".
5. Adicionar os dois checks da tabela de CI. Não adicionar o gitleaks enquanto o job agendado estiver vermelho.
6. Bloquear force push e bloquear deleção do branch.
7. Salvar. Fazer um push direto de teste numa branch descartável não prova a regra; a prova é a `main` recusar push direto e um PR sem os checks ficar sem o botão de merge.

## Equivalente com `gh api`

Rodar na sua máquina, logado como admin. Não colar token no comando.

```bash
gh api --method PUT repos/matstangherlin/longyu/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Portão de qualidade (validate:beta + build)",
      "Testes E2E (Playwright)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

Se a API recusar `required_approving_review_count: 0`, tire o objeto `required_pull_request_reviews` e crie a regra de PR na UI. Não baixe os checks para o comando passar.

Quando o gitleaks estiver verde, repita o PUT com `"Secret scan (gitleaks)"` no array `contexts`.
