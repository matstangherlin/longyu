# v0.3.0-beta.1

Pré-release da beta fechada. O agente não cria tag, não publica release e não dispara build.

A versão no código é `0.3.0-beta.1` em `package.json`, nos quatro `VITE_APP_VERSION` do `netlify.toml` e em `docs/release/android-native-foundation.json` (`versionName`). O `versionCode` não mudou. O APK já certificado continua registrado como `0.2.0-rc.5` até um build novo. `docs/release/rc-candidate.json` continua no artefato `0.2.0-rc.2` daquele SHA. Não rode `supabase config push` nem publique esta versão em produção só por causa deste arquivo.

## O que a pilha #359–#371 já cobre no código

Login e logout com prazo, isolamento de contas, nome do perfil, primeiras lições sem pontuação dobrada e sem Matheus, lint de conteúdo, escuta sem gastar Fôlego, runbook de staging, e-mail de recuperação só com código e link expirado visível.

Nada disso está em produção. O site vivo ainda serve o bundle anterior.

## Aberto

- SQL do #361 não aplicado. `profiles.instruction_locale` não existe em produção.
- Funções CORS do #363 não publicadas. O CI `test:backend-contract` segue vermelho até regenerar os hashes.
- Staging não existe. Plano Free, MandarimProject e atomurus ativos. O Matty não pausou nada em 26/10/2026.
- Templates de e-mail e SMTP continuam no painel.
- DSN do Sentry ausente no bundle.
- Canal de WhatsApp ou Telegram não entra no repositório. O repo é público. O convite fica só com o Matty.

## Comandos do Matty, depois do merge

Substitua `<sha>` pelo commit que entrou em `main`.

```bash
git tag -a v0.3.0-beta.1 <sha> -m "v0.3.0-beta.1 beta fechada"
git push origin v0.3.0-beta.1
gh release create v0.3.0-beta.1 --prerelease --notes-file docs/qa-report-2026-10/RELEASE_0.3.0-beta.1.md
```

Não rode estes comandos a partir deste PR.
