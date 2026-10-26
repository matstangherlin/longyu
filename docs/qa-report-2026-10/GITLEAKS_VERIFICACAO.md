# Verificação do gitleaks — LGY-037

Data: 26/10/2026 (America/São Paulo). SHA analisado: histórico completo até `cursor/qa-02-higiene-seguranca-b56e` (base da linha de base `98967c39` mais o prompt 01). Ferramenta local: gitleaks 8.28.0, `gitleaks detect --source .` com o `.gitleaks.toml` do repositório. 1627 commits.

O workflow agendado também falhou no mesmo SHA de `main` (`98967c39`):

- 19/10/2026: [run 39254198908](https://github.com/matstangherlin/longyu/actions/runs/39254198908) — job `Secret scan (gitleaks)` vermelho; npm audit e CodeQL verdes.
- 26/10/2026: [run 40323824209](https://github.com/matstangherlin/longyu/actions/runs/40323824209) — o mesmo job, 8 leaks. Os outros jobs do Security passaram.

Nenhum token completo entra neste arquivo. O identificador de cada segredo é o prefixo SHA-256 de 12 caracteres, calculado em memória.

## Achados (8 no scan anterior ao allowlist novo)

| # | Regra | Onde entrou | Commit | Classe | O que é |
|---|---|---|---|---|---|
| 1–2 | `stripe-access-token` | `scripts/test-rc2-candidate-infra.mjs:78` | `4d48e2cf` (17/09/2026 14:48) e ainda em `e7baf0f3` (18/09/2026 17:00) | fixture sintética | Prefixo `sk_liv`, 28 caracteres, só letras depois do prefixo, terminando no alfabeto. A linha é uma mutação `SECRET_IN_FRONTEND` (`killEnv`). SHA-256/12 `5e346453c279`. Não é chave Stripe. |
| 3–5 | `jwt` | `.env.production:5`, `netlify.toml:19`, `netlify.toml:24` | `025bdc3d` (08/07/2026 03:16) | JWT anon em uso | Payload `role=anon`, `ref=drjcfalvlbbeblmmyhwj`, `iss=supabase`. SHA-256/12 `209cd4eae7b9`. É a anon key que ainda está nesses dois arquivos. `GET /auth/v1/settings` com ela responde 200. |
| 6–8 | `jwt` | os mesmos três lugares | `89031d9ca` (08/07/2026 02:58) | JWT anon antigo | Mesmo `role`, `ref`, `iss`, `iat` e `exp`. SHA-256/12 `7d6cdcc186c5`. Assinatura diferente. `GET /auth/v1/settings` responde 401. |

Não apareceu JWT com `role: service_role`, nem `sk_live_` / `rk_live_` que não fosse a fixture acima, nem token de Sentry ou Netlify.

## Allowlist acrescentada

Só a fixture 1–2, regex ancorada, com uma classe de um caractere para o arquivo não conter o literal contíguo:

`^sk_live_abcdefghijklmnopqrs[t]$`

Nenhuma regex de JWT real. Nenhum `paths`. Nenhum `sk_live_.*`.

Depois dessa entrada, o mesmo comando local deixa **6 achados**, todos os JWTs da tabela. Eles ficam como ação humana, não como allowlist.

## Conclusão

- Todo JWT que o gitleaks ainda aponta no histórico é `role: anon` do projeto `drjcfalvlbbeblmmyhwj`. Nenhum é `service_role`.
- Nenhuma chave Stripe real vazou. O único `stripe-access-token` é a fixture de alfabeto, agora no allowlist exato.
- A anon key antiga (`7d6cdcc186c5`) não autentica mais (401). Não há rotação a fazer por causa dela.
- A anon key atual (`209cd4eae7b9`) é a chave pública em uso. Não rotacionar só porque está no git: `VITE_*` já vai para o bundle. Rotacionar só se o Matty quiser invalidar a cópia histórica; isso exige trocar a chave no painel e em `.env.production` / `netlify.toml` no mesmo passo, senão a produção quebra.

O scan agendado continua vermelho enquanto esses JWTs públicos estiverem no histórico sem allowlist exato. Allowlist da chave real não foi feito aqui de propósito.

## Valores públicos versionados (LGY-045)

`.env.production` tem só três variáveis, todas públicas: `VITE_BACKEND_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Nada foi alterado.

O `netlify.toml` repete essa URL e essa anon key no contexto de produção e também publica a site key do Turnstile (`VITE_TURNSTILE_SITE_KEY`). Isso é aceito: site key e anon key são públicas; a RLS e o segredo do Turnstile ficam fora do repositório. Segredos de runtime moram no Netlify e no Supabase Vault.

## Como reexecutar

```bash
gitleaks detect --redact --source .
```

Exit 0 só quando não houver achado. Hoje o exit é de falha, com os 6 JWTs acima. Não usar `gitleaks || true`.
