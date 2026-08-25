# V4.4 — Longyu for Business / Enterprise foundation

Base: `main` `96f44ec` (V4.3 já na main). Superfície nova: `/business`. `/pro` continua B2C.

Esta PR **não** altera pedagogia, Journey, Atlas nem Mastery. **Não** cria checkout Stripe Business. **Não** finge que SSO, SCIM ou o painel `/business/admin` já estão no ar.

QA físico em Android + desktop da V4.3 permanece pendente e fora desta remessa.

---

## O que entra

| ID | Entrega |
| --- | --- |
| BUS-001 | `AccessTier` + `premiumAccessFromTier` em `src/lib/accessTier.ts`. `PlanTier` da matriz Grátis/Pro permanece `free \| pro`. |
| BUS-002 | `/pro` separa **Para você** (Grátis/Pro) de **Para empresas**. Cards Business + Enterprise com listas de oferta comercial, **Conhecer Business**, **Falar com vendas** e **Falar com nosso time** — sem preço e sem Stripe. |
| BUS-003 | Página pública `/business` (fora do AppShell): hero, benefícios, casos de uso, como funciona, Business, Enterprise, FAQ, formulário. |
| BUS-004 | Copy Business sem preço público. Gestão/relatórios/trilhas como **oferta comercial**. |
| BUS-005 | Enterprise como oferta/roadmap (SSO, provisionamento, departamentos, integrações). CTA **Falar com nosso time**. |
| BUS-006 | Tabela `business_leads` + status `new…lost`. |
| BUS-007 | Edge `submit-business-lead`: e-mail, enums, tamanho, honeypot, rate limit Postgres. Sem insert anon. |
| BUS-008 | `organizations`, `organization_members`, `organization_invites` + roles `owner/admin/manager/learner`. Sem UI admin. |
| BUS-009 | `organization_subscriptions` isolada. `public.subscriptions` continua pessoa física. |
| BUS-010 | `get_server_entitlement` passa a devolver `is_pro`, `tier`, `source`, `organization_id`, `organization_role`. Membership ativa → `premiumAccess`. `serverIsPro` segue o boolean. |
| BUS-011 | Empresas não usam o checkout Pro. Sem price ID Business. |
| BUS-012 | E2E 320 / 390 / 768 / 1024 / 1440 / 1920 (matriz completa no Chromium). |
| BUS-013 | Eventos `business_page_view`, `business_cta_clicked`, `business_lead_started`, `business_lead_submitted` sem PII. |
| BUS-014 | SEO: *Treinamento de Mandarim para Empresas \| Longyu*. |
| BUS-015 | Portão `test:business-foundation` + spec `e2e/business.spec.ts`. |

---

## O que fica de propósito para depois

| Próximo passo | Por quê |
| --- | --- |
| V4.5 Early Transfer | Gap pedagógico (produção independente ~L12 vs transferência ~L47) — prioridade da Jornada. |
| Business Admin MVP (`/business/admin` ou `/empresa`) | Licenças, convites, métricas de adoção. A fundação de tabelas já existe. |
| Stripe Business / seats | Só depois de seat management. |
| SSO / SCIM / APIs | Roadmap Enterprise, não produto desta PR. |
| Trilhas Mandarim para Indústria / Automotivo / … | Conteúdo pedagógico futuro. |
| QA físico Android + desktop | Continuação da V4.3; esta PR não declara isso encerrado. |

---

## Entitlement

```text
organization (business|enterprise, member active)
  → individual_subscription (Stripe Pro)
    → internal (grant)
      → pearl
        → none
```

`economy_user_is_pro` também considera membership org, mas permanece **sem EXECUTE** para `authenticated` (helper interno).

Aliases da RPC antiga (`stripe`, `grant`, `pearl_pass`) ainda são lidos no cliente.

---

## Segurança do lead

- RLS em `business_leads` **sem policies** + `REVOKE` de `anon`/`authenticated`.
- Insert só com service role na Edge Function.
- Honeypot `website`: responde 200 e **não grava**.
- Rate limit: IP 3/15 min e 8/24 h; e-mail 2/24 h; combo 1/15 min.

---

## Copy / ICP

Nenhum nome ou logotipo de empresa como cliente. Setores (indústria, automotivo, logística, comércio exterior, etc.) aparecem como **perfil de uso**, não como case.

---

## Testes

```bash
npm run test:business-foundation
npm run validate:plans
npx playwright test e2e/business.spec.ts --project=chromium
```

A migration precisa ser aplicada no projeto Supabase para leads reais em produção (`submit-business-lead` + tabelas). Esta PR adiciona o arquivo; o deploy da função e o `supabase db push` são passo operacional.
