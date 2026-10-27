# Inventário LGPD — rascunho técnico (LGY-040)

Não é parecer jurídico. Bases legais são sugestões para o advogado. O controlador está em `[PREENCHER]` na política.

| Dado | Onde é coletado | Onde fica | Finalidade | Base sugerida | Fornecedor | Retenção | Exportar / apagar |
|---|---|---|---|---|---|---|---|
| E-mail e senha | `src/features/onboarding/ComecarPage.tsx`, `src/features/account/AccountPage.tsx` | Supabase Auth | Login | Contrato | Supabase (EUA, salvo região do projeto) | Enquanto a conta existir | Excluir conta (`delete-account`); a senha não é exportada |
| Nome | Mesmos formulários, `profiles.name` | `profiles` e `localStorage` `longyu-v1` | Perfil | Contrato | Supabase / aparelho | Enquanto a conta ou o aparelho guardar | Exportação em Ajustes; exclusão da conta |
| Confirmação de 18+ | Checkbox no cadastro. A data de nascimento não é mais pedida | Não é gravada. `birth_date` segue nulo no payload | Idade mínima da beta fechada | Contrato / legítimo interesse de não cadastrar criança | — | Não há dado de data | — |
| País, origem do cadastro, opt-in de e-mail | `ProfileDetailsFields.tsx` | `profiles` | Idioma de mercado e comunicação | Consentimento para o opt-in; contrato para o país | Supabase | Enquanto a conta existir | Exclusão da conta |
| @apelido | Ajustes | `profiles.username` | Identidade social | Contrato | Supabase | Enquanto a conta existir | Exclusão da conta |
| Progresso, SRS, estrelas, sequência | Lições e revisão | `localStorage` `longyu-v1` e, com conta, tabelas de progresso | Ensinar | Contrato | Aparelho / Supabase | Até limpar o aparelho ou excluir a conta | Exportar em Ajustes → Privacidade e dados |
| Telemetria pedagógica | `src/services/pedagogyEvents.ts` | Fila local e tabela de eventos, só com opt-in | Melhorar o curso | Consentimento | Supabase | Até revogar ou excluir | Revogar em Ajustes limpa a fila; exclusão da conta |
| Feedback | Modal de reporte | `beta_feedback` e fila `longyu:beta-feedback-queue` | Corrigir o app | Consentimento (envio explícito) | Supabase | Até exclusão | Exclusão da conta |
| Diagnóstico técnico | `src/lib/clientDiagnostics.ts` | `sessionStorage` neste aparelho | Apoiar um relato | Consentimento, se o aluno incluir no relato | Aparelho | A sessão | Não sobe sozinho |
| Sentry | `src/lib/observability/errorReporting.ts` | Só se houver DSN. O scrub está em `errorScrub.ts` | Erros | Legítimo interesse, com scrub | Sentry | Política do Sentry, se ligado | DSN de produção ausente hoje |
| Microfone | Botão Falar | Não gravamos o arquivo. O aparelho ou o navegador pode processar a fala | Praticar pronúncia | Consentimento do sistema | Serviço de voz do aparelho | Não fica no Longyu | Recusar a permissão |
| Notificação local | App Android | Agenda no aparelho | Lembrete | Consentimento | Aparelho | Até desligar | Ajustes do Android |
| Turnstile | Cadastro | Token de desafio | Anti-abuso | Legítimo interesse | Cloudflare | Curto | — |
| Stripe | Só quando a cobrança existir | Cliente e pagamento | Cobrar | Contrato e obrigação legal | Stripe | Prazo fiscal | Portal de cobrança, quando existir |
| Site e CDN | Toda visita | Logs de hospedagem | Entregar o app | Legítimo interesse | Netlify | Política da Netlify | — |

A exportação baixa o pacote do aparelho (`src/services/privacyService.ts`). A exclusão de nuvem é a função `delete-account`, já existente. Este prompt não muda essa função.
