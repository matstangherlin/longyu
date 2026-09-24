# Assinatura Android do Longyu (RC2.2.10)

> **Status atual:** o contrato de assinatura está pronto; **nenhuma chave real
> existe no repositório** e nenhum release assinado foi gerado.
> `npm run android:bundle:release` termina em `BLOCKED_SIGNING_SECRETS` até o
> owner preencher os quatro valores abaixo, na máquina dele ou como secrets do CI.

## 1. Conceitos

| Termo | O que é | Quem guarda |
|---|---|---|
| **Keystore** (`.jks`) | Arquivo que contém uma ou mais chaves privadas, protegido por senha. | Owner, **fora** do repositório. |
| **Upload key** | A chave dentro do keystore com a qual *você* assina o AAB antes de enviá-lo ao Play Console. | Owner. |
| **App signing key** | A chave com a qual o Google assina o app que chega aos aparelhos (**Play App Signing**). | Google. Nunca sai do Google. |
| **Key alias** | O nome da chave dentro do keystore (um keystore pode ter várias). | Não é segredo, mas fica junto com os outros três. |
| **Store password** | Senha que abre o arquivo keystore. | Owner (gerenciador de senhas). |
| **Key password** | Senha da chave específica (alias). Pode ser igual à store password. | Owner (gerenciador de senhas). |

**Arquitetura do Longyu: Google Play App Signing.** O Longyu assina localmente
só com a **upload key**. Se a upload key vazar ou for perdida, o owner pede ao
Google um reset da upload key; a chave de distribuição continua segura com o
Google. Por isso a upload key é importante, mas perdê-la não significa perder o app.

## 2. Os quatro valores (nomes canônicos)

| Variável de ambiente | Linha em `android/keystore.properties` | Conteúdo |
|---|---|---|
| `LONGYU_ANDROID_KEYSTORE_PATH` | `storeFile` | Caminho do `.jks` (absoluto; relativo é resolvido a partir de `android/`) |
| `LONGYU_ANDROID_KEYSTORE_PASSWORD` | `storePassword` | Store password |
| `LONGYU_ANDROID_KEY_ALIAS` | `keyAlias` | Alias da upload key |
| `LONGYU_ANDROID_KEY_PASSWORD` | `keyPassword` | Key password |

Variáveis de ambiente têm precedência sobre o arquivo. O Gradle
(`android/app/longyu-signing.gradle`) e o wrapper Node
(`scripts/android-cli.mjs` via `scripts/lib/android-signing.mjs`) leem
exatamente estes nomes. Quando algo falta, eles imprimem **só os nomes**
faltando — nunca um valor.

## 3. Criar a upload key (uma vez, na máquina do owner)

Use o `keytool` que vem com o JDK (o Android Studio traz um JDK). Rode **fora**
da pasta do repositório. Deixe o `keytool` **perguntar** as senhas
interativamente, em vez de passá-las com `-storepass`/`-keypass` na linha de
comando: assim elas não entram no histórico do shell.

Windows (PowerShell):

```powershell
# Exemplo: guarde em uma pasta pessoal, NUNCA dentro de longyu/
keytool -genkeypair -v `
  -keystore C:\secure\longyu\longyu-upload.jks `
  -alias longyu-upload `
  -keyalg RSA -keysize 4096 -validity 10000
```

macOS / Linux:

```bash
keytool -genkeypair -v \
  -keystore ~/secure/longyu/longyu-upload.jks \
  -alias longyu-upload \
  -keyalg RSA -keysize 4096 -validity 10000
```

O `keytool` pede a store password, os dados do certificado e a key password.
`longyu-upload` é só uma sugestão de alias; use o nome que quiser e registre-o
como `LONGYU_ANDROID_KEY_ALIAS`.

## 4. Onde guardar e como fazer backup

- O `.jks` fica **fora do repositório** (ex.: `C:\secure\longyu\` ou `~/secure/longyu/`).
- **Faça backup** do `.jks` em pelo menos dois lugares seguros e separados
  (ex.: gerenciador de senhas com anexo + pendrive criptografado guardado offline).
- As duas senhas e o alias ficam no gerenciador de senhas, junto com o backup.
- **Nunca commitar**: `*.jks`, `*.keystore`, `*.p12`, `keystore.properties`,
  `key.properties` e `local.properties` estão no `.gitignore`. O
  `validate:android-signing-contract` falha se algum deles for rastreado ou se
  uma senha literal aparecer em Gradle/config/workflow.
- Nunca mande o `.jks` ou as senhas por chat, e-mail ou issue.

## 5. Preencher os valores localmente

**Opção A — variáveis de ambiente (preferida).** PowerShell, só na sessão atual:

```powershell
$env:LONGYU_ANDROID_KEYSTORE_PATH = "C:\secure\longyu\longyu-upload.jks"
$env:LONGYU_ANDROID_KEY_ALIAS = "longyu-upload"
# Senhas: digite sem deixar no histórico
$env:LONGYU_ANDROID_KEYSTORE_PASSWORD = Read-Host "Store password" -MaskInput
$env:LONGYU_ANDROID_KEY_PASSWORD = Read-Host "Key password" -MaskInput
```

bash/zsh:

```bash
export LONGYU_ANDROID_KEYSTORE_PATH="$HOME/secure/longyu/longyu-upload.jks"
export LONGYU_ANDROID_KEY_ALIAS="longyu-upload"
read -rs -p "Store password: " LONGYU_ANDROID_KEYSTORE_PASSWORD; export LONGYU_ANDROID_KEYSTORE_PASSWORD; echo
read -rs -p "Key password: " LONGYU_ANDROID_KEY_PASSWORD; export LONGYU_ANDROID_KEY_PASSWORD; echo
```

**Opção B — arquivo local `android/keystore.properties` (gitignored).**
Copie `android/keystore.properties.example` para `android/keystore.properties`
e troque os placeholders. Confira antes de qualquer commit:

```bash
git check-ignore -v android/keystore.properties   # precisa responder com a regra do .gitignore
git status --short                                  # o arquivo NÃO pode aparecer
```

## 6. Gerar o AAB assinado (depois)

```bash
npm run android:bundle:release
```

O script checa os quatro valores e a existência do keystore **antes** do build,
roda `npm run build` + `cap sync android` e depois `gradlew.bat bundleRelease`
(Windows) ou `./gradlew bundleRelease`. Saída:
`android/app/build/outputs/bundle/release/app-release.aab` → enviar ao Play
Console (Internal testing primeiro).

Sem os valores: `BLOCKED_SIGNING_SECRETS` com a lista de nomes faltando
(exit 4). O Gradle tem a mesma trava: qualquer tarefa `*Release*` sem assinatura
completa falha, e o release **nunca** cai na debug key. Debug
(`npm run android:debug`, `npm run android:bundle:debug`) continua funcionando
sem nenhum segredo.

## 7. CI (RC2.2.10B)

O CI não tem acesso ao caminho local do keystore. No GitHub, os quatro valores
viram *repository/environment secrets*, e o arquivo vai como base64:

| Secret do GitHub | Equivale a |
| --- | --- |
| `LONGYU_ANDROID_KEYSTORE_BASE64` | conteúdo do `.jks` em base64 (o workflow decodifica para `$RUNNER_TEMP` e define `LONGYU_ANDROID_KEYSTORE_PATH`) |
| `LONGYU_ANDROID_KEYSTORE_PASSWORD` | `LONGYU_ANDROID_KEYSTORE_PASSWORD` |
| `LONGYU_ANDROID_KEY_ALIAS` | `LONGYU_ANDROID_KEY_ALIAS` |
| `LONGYU_ANDROID_KEY_PASSWORD` | `LONGYU_ANDROID_KEY_PASSWORD` |

Só `.github/workflows/android-release.yml` (manual) usa esses secrets. O
keystore temporário é apagado ao fim (`if: always()`) e nunca entra em
artefato. PR e `main` não assinam nada. Pipeline completa, canais e Play
Console: [`docs/RELEASE_PIPELINE.md`](RELEASE_PIPELINE.md).

## 8. Play Console

Na criação do app no Play Console, mantenha **Play App Signing** ativado (padrão)
e envie o primeiro AAB assinado com a upload key. Nada disso foi feito nesta
remessa (`playConsoleConfigured: false` em
`docs/release/android-native-foundation.json`).
