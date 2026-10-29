# E-mails de autenticação (LGY-013)

Os textos estão no repositório. Nada disso foi colado no painel, e nenhum SMTP foi ligado. `npm run configure:supabase-auth` e o workflow `configure-supabase-auth.yml` mudam o projeto remoto (a allowlist de redirect). O script, se rodar sem `SUPABASE_PROJECT_REF`, aponta para o ref de produção `drjcfalvlbbeblmmyhwj`. Só o Matty executa, e este PR não o executa. Ele não envia os templates.

O `supabase/config.toml` aponta os templates para o `supabase start` local. `supabase config push` publicaria esses caminhos no projeto linkado. Não rode esse comando contra o MandarimProject.

## O que o app envia

| Tipo no painel | Arquivo | O app usa? | O que a tela espera |
|---|---|---|---|
| Confirm signup | `supabase/templates/confirmation.html` | Sim, no cadastro | Link `{{ .ConfirmationURL }}` para `/confirmar-email` |
| Reset password | `supabase/templates/recovery.html` | Sim, em Esqueci a senha | Só o código `{{ .Token }}`, 6 dígitos. Sem link |
| Change email address | `supabase/templates/email_change.html` | Não hoje | Link, se um dia a troca existir |
| Magic link | `supabase/templates/magic_link.html` | Não | Link. O app não chama magic link |
| Invite user | `supabase/templates/invite.html` | Não | Link |
| Reauthentication | `supabase/templates/reauthentication.html` | Não | Código `{{ .Token }}` |

Assuntos, iguais aos do `config.toml`:

- Confirme seu email no Longyu
- Seu código para redefinir a senha do Longyu
- Confirme o novo email do Longyu
- Entrar no Longyu
- Convite para o Longyu
- Confirme que é você no Longyu

A UI não cita um número de minutos. O painel tem o campo de expiração do OTP de e-mail. O valor do projeto de produção não foi lido. O padrão documentado do GoTrue, quando ninguém altera o campo, é 3600 segundos. Confira o número no painel antes de escrever "vale por X minutos" na interface.

## Colar no painel

Staging ainda não existe. Em 26/10/2026 o Matty decidiu não pausar o outro projeto da org nem subir o plano. A organização Noba está no Free, com MandarimProject e outro projeto ativo fora do Longyu. Enquanto não houver staging, não cole estes textos em produção só para "ver se chega". Quando houver um projeto de staging:

1. Authentication → Emails.
2. Para cada linha da tabela, abra o tipo, cole o assunto e o HTML do arquivo (sem o comentário de instrução, se o editor reclamar).
3. Salve. Repita no projeto de produção só depois do teste da seção seguinte passar no staging.

O link antigo de recuperação continua abrindo `/redefinir-senha`. Se o hash trouxer `otp_expired` ou `access_denied`, a página mostra "Este link expirou ou já foi usado." e o botão "Enviar novo código". Não mostra o formulário de senha nova.

## SMTP próprio

O SMTP embutido do Supabase tem limite baixo e não serve para convidar testers. O registro do repositório cita Resend no plano free: 100 e-mails por dia e 3.000 por mês. O domínio de envio precisa existir. `longyu.app` e `longyu.com.br` estavam em NXDOMAIN no relatório de 26/10. Sem DNS verificado, o SMTP próprio não sai.

Quando o domínio existir:

1. No provedor (Resend ou outro), adicione o domínio e publique SPF, DKIM e DMARC.
2. Remetente `no-reply@<domínio>`. Reply-to numa caixa que alguém lê.
3. No Supabase → Authentication → SMTP: host, porta, usuário e senha. A senha fica só no painel. Nenhum desses valores entra no git, no chat ou em variável `VITE_`.
4. Faça isso primeiro no staging.

Nomes dos campos, sem valores: host, port, user, pass, sender name, sender email.

## Como testar

Staging, com uma caixa real, Gmail e Outlook:

1. Cadastro → e-mail de confirmação em pt-BR → link abre `/confirmar-email` e a conta confirma.
2. Sair → Esqueci a senha → chega código de 6 dígitos, sem link → digitar o código → senha nova → entrar.
3. Abrir um link velho de recuperação. A tela mostra o erro e o botão de novo código. O formulário de senha não aparece.
4. Pedir código de novo. A resposta é a mesma exista a conta ou não.

R-02 ponta a ponta espera esse staging. Até lá, o E2E local `@qa-r02` só simula o link expirado e o `verifyOtp`, com o Supabase interceptado. Não rode esse fluxo no navegador contra o MandarimProject.
