# Upgrade do Android: contrato e runbook (RC2.2.12 · AA/AB)

## 1. O que garante que os dados sobrevivem a um update

No Android, o progresso local mora no armazenamento do WebView (`localStorage`,
chave `longyu-v1`), associado à **origem** do app. O update preserva esses
dados se, e somente se, todos os pontos abaixo continuarem verdadeiros
(`validate:android-upgrade-contract` confere cada um):

| Invariante | Onde | Por quê |
|---|---|---|
| `appId` / `applicationId` / `namespace` = `longyu.noba.com` (package do Play, congelado desde o RC2.2.16: `docs/release/android-package-identity.json`) | `capacitor.config.ts`, `android/app/build.gradle` | outro id = outro app, com dados zerados; a Play recusa outro package |
| Sem `server.hostname`, `server.androidScheme` ou `server.url` | `capacitor.config.ts` | mudar a origem (`https://localhost`) deixa o `localStorage` antigo inacessível |
| Persistência `longyu-v1` com `version` + `migrate` | `src/lib/store.ts` | a versão sobe com migração; nunca renomear a chave |
| `versionCode` estritamente crescente | `android/version.properties` + `release-identity.mjs` + ledger | a Play (e o `adb install -r`) recusam versionCode menor |
| Mesma chave de assinatura | Play App Signing / upload key | assinatura diferente = update recusado |
| Sem `android:clearTaskOnLaunch` e sem limpar dados no boot | `AndroidManifest.xml`, `nativeShell.ts` | nada apaga estado ao abrir |

> **RC2.2.16 — troca de package antes do primeiro upload.** Builds de
> desenvolvimento antigos usavam `com.longyu.app` (SUPERSEDED, nunca publicado).
> Para o Android esse é **outro aplicativo**: não existe upgrade dele para
> `longyu.noba.com`. Em aparelho de QA, desinstale o antigo e instale o novo do
> zero. A ausência desse upgrade não é bug.

## 2. Runbook físico N → N+1 (obrigatório)

> **Atenção à chave debug:** APKs debug de runs diferentes do CI têm debug keys
> diferentes, e o `adb install -r` de N+1 falha com
> `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Faça N e N+1 **na mesma máquina**
> (`npm run android:debug` duas vezes, com um commit entre elas) ou use builds
> release assinados com a upload key.

1. **Build N:** `npm run android:debug` → `npm run android:install:debug`. Anote SHA, `versionName` e `versionCode`.
2. Abra e crie estado local real:
   - progresso numa lição (algumas respostas) e uma lição concluída;
   - uma sessão de Revisão;
   - uma aula de Cultura concluída (selo);
   - Perfil (medalha destacada, @nome se houver);
   - Ajustes (tema, som, idioma).
3. Force stop e reabra: o estado continua (controle).
4. **Build N+1:** novo commit → `npm run android:debug` (o `versionCode` sobe sozinho) → `npm run android:install:debug` (`adb install -r`, **sem** desinstalar).
5. Abra N+1 e confira os cinco itens do passo 2. Registre `upgrade: PASS/FAIL` em `docs/release/android-physical-qa.json`.
6. **Play (o teste mais importante, depois do primeiro upload real):** Internal N → Internal N+1 → atualizar pela Play Store → mesmos cinco itens. Registre em `playInstall`.

Perder qualquer um desses estados é **P1** (upgrade perde estado).

## 3. Downgrade não é rollback (AB)

O Android não faz downgrade de um app instalado sem desinstalar, e desinstalar
apaga os dados locais. Por isso o Longyu **não** usa downgrade como rollback:

- Rollback Android = **nova versão corrigida com `versionCode` maior** (revert em `main` → release manual).
- Na Play: pausar/interromper o rollout do track e publicar a correção.
- Nunca reenviar um `versionCode` antigo nem instruir usuários a desinstalar para "voltar versão".
