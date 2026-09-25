# Play Console: checklist operacional (RC2.2.12 · RC2.2.16)

> **Status (RC2.2.16):** o owner informou que o app existe no Play Console com o
> package `longyu.noba.com`. Nenhum AAB foi enviado, nenhuma release interna foi
> criada e nada foi publicado. Production é **sempre** manual.
> Estado conferido pelo owner: `docs/release/play-console-status.json`.
> Estado do Internal testing: `docs/release/google-play-internal.json`.

**Estados separados (não confundir):** app criado ≠ identidade do desenvolvedor
verificada ≠ package registrado ≠ Play App Signing configurado ≠ release interna
criada ≠ AAB enviado ≠ app instalado pela Play. Cada um é conferido à parte.

## 1. Ficha do app

| Campo | Valor |
|---|---|
| App name | **Longyu** |
| Package | `longyu.noba.com` (package do app no Play; congelado em `docs/release/android-package-identity.json`) |
| Idioma padrão | Português (Brasil), pt-BR |
| App ou jogo / categoria | App · **Educação** |
| Contato do desenvolvedor | email de suporte `beta@longyu.app` (confirmar que recebe) · site: domínio de produção |
| Política de privacidade | `https://singular-meringue-7838cd.netlify.app/privacidade` (→ `https://longyu.com.br/privacidade` quando o domínio for apontado) |
| Acesso ao app | exige conta; ver §6 (conta de revisão) |
| Anúncios | **Não** contém anúncios |
| Classificação de conteúdo | questionário IARC: educação, sem violência, sem conteúdo gerado público além de @nome e nome de exibição |
| Público-alvo | **decisão do owner** (sugestão: 13+). O app **não** verifica idade hoje, e a data de nascimento é opcional. Não é "projetado para crianças": **não** entrar no programa Famílias |
| Data Safety | preencher à mão a partir de `docs/release/play-data-safety.json` |
| Exclusão de conta | no app: Conta → Excluir conta na nuvem · web: `/privacidade#excluir-conta` |
| Países | Brasil primeiro (lançamento pt-BR); expandir depois |
| Tracks | **internal** (padrão) → closed (alpha) → production (manual, com confirmação e aprovador) |

## 2. Store listing: texto inicial (não publicado)

**Nome:** Longyu

**Descrição curta (pt-BR, ≤ 80):**
> Aprenda mandarim do zero com trilha guiada, hànzì, tons e cultura chinesa.

**Descrição completa (pt-BR):**
> O Longyu é um curso de mandarim para quem fala português. Você começa pelo
> nivelamento e segue uma jornada em passos curtos. Um dragão explica cada ideia
> antes de ela aparecer num exercício.
>
> • **Jornada guiada:** lições curtas com áudio, pinyin e hànzì, na ordem certa para aprender.
> • **Tons desde o início:** treino de escuta e contraste de tons.
> • **Hànzì com calma:** toque em qualquer caractere para ver pinyin e significado; o Atlas mostra o que você já sabe e o que precisa reforçar.
> • **Revisão espaçada:** o que você erra volta na hora certa.
> • **Cultura chinesa:** aulas curtas sobre costumes, festas, história e etiqueta, contadas pelo dragão.
> • **Imersão:** pequenas cenas de conversa com personagens fixos.
> • **Ligas e conquistas:** para manter o ritmo, sem pressa.
>
> O Longyu está em beta: seu progresso fica salvo e sincroniza com a sua conta.

**Short description (en, ≤ 80), se houver listagem internacional:**
> Learn Mandarin from zero with a guided path, hanzi, tones and Chinese culture.

**Não prometer:** análise de pitch perfeita, professor humano, funcionamento
100% offline, compra dentro do app Android, nem recurso ainda não lançado.
A prática de fala **não** entra no texto enquanto `ANDROID_SPEECH_RECOGNITION_UNVERIFIED`
não for resolvido no aparelho.

## 3. Screenshots: plano (AE)

Capturar num aparelho físico (ou num build release), conta de demonstração com
dados limpos, pt-BR, tema claro. Mínimo de 2 e até 8 por tipo de aparelho.

1. Jornada (trilha com a lição atual)
2. Lição (exercício com hànzì + pinyin)
3. Cultura + dragão (aula de Cultura com a fala do dragão)
4. Imersão (cena em bolhas, com nomes)
5. Revisão
6. Atlas de Hànzì
7. Perfil / medalhas
8. Phase Challenge (prévia) ou Liga

**Não usar:** modo dev, rotas `/qa`, faixa de QA, dados falsos ofensivos,
placeholders, "Pro" que não dá para comprar no Android.

## 4. Feature graphic (AF)

1024 × 500 PNG/JPEG, obrigatório para a listagem. **Status:
`PLAY_STORE_FEATURE_GRAPHIC_REQUIRED`**: não existe arte final e não será
inventada. O ícone monocromático segue `ANDROID_BRAND_ASSET_REQUIRED`.

## 5. Pagamentos (política da Play): `ANDROID_IN_APP_PURCHASE = DISABLED_FOR_BETA`

Bem digital vendido **dentro** do app Android exige Google Play Billing. Até ele
existir, o app Android **não** abre checkout externo (Stripe) nem portal de
cobrança (`ANDROID_CHECKOUT_UNAVAILABLE_MESSAGE` em `subscriptionService.ts`).
Assinantes Pro continuam Pro, porque o plano é verificado no servidor. A web não muda.

RC2.2.16: no Android, a página de planos não mostra preço, botão de assinar nem
portal de cobrança; mostra "Nesta Beta, o app Android não vende assinaturas nem
itens pagos". Qi, Pérolas, passes e cosméticos só se ganham no app (nenhuma
moeda é vendida por dinheiro). Catálogo completo das superfícies:
`docs/release/android-billing-audit.json`.

## 6. Acesso para revisores da Play (AJ)

O Longyu exige conta. A Play precisa de uma conta de teste que funcione.

1. Crie uma conta **dedicada** (`play-review+<data>@…`), que não seja pessoal, pelo fluxo normal de cadastro.
2. Confirme o email e conclua o nivelamento, para o revisor cair direto na Jornada.
3. Preencha **só** no Play Console (App content → App access) o email e a senha
   dessa conta, com instruções curtas: "Entrar → Email ou nome de usuário → senha".
4. **Nunca** coloque essa credencial no Git, em issue, PR ou chat. Guarde-a no gerenciador de senhas.
5. Troque a senha depois de cada ciclo de revisão, e apague a conta quando não precisar mais.

Login por **nome de usuário** está desligado (`VITE_USERNAME_LOGIN_ENABLED=false`,
`CLOUD_APPLIED_FLAG_OFF`: backend aplicado, flag desligada). O revisor entra com **email**.

## 7. Internal Testing: primeiro upload (RC2.2.16)

**HARD STOP antes de qualquer upload:**

- [ ] package confirmado **visualmente** no Play Console = `longyu.noba.com`
      (se aparecer outro: não enviar, não criar segundo app)
- [ ] upload key criada pelo owner (`npm run android:keystore:init -- --path <fora do repo>/longyu-upload.jks --alias longyu-upload --confirm CRIAR-UPLOAD-KEY`)
- [ ] backup checklist completo (`docs/ANDROID_SIGNING.md` §9 e `google-play-internal.json` → `backupChecklist`):
      keystore local, backup seguro 1, backup seguro 2, alias, senha do store, senha da chave, Git ignore, `git status` limpo
- [ ] AAB release assinado e verificado: `SIGNED_WITH_UPLOAD_KEY`, package `longyu.noba.com` lido do bundle
- [ ] SHA + versionName + versionCode + package registrados em `google-play-internal.json` → `releaseIdentity` **antes** do upload

Se qualquer item faltar: **STOP FIRST PLAY UPLOAD**.

**Play App Signing (primeiro release):** escolha a chave de assinatura do app
**gerada e gerenciada pelo Google**. O owner guarda só a **upload key**.
Depois, registre os dois fingerprints públicos (Play Console → Integridade do
app → Assinatura do app):

| Certificado | Quem guarda | Onde registrar |
|---|---|---|
| Upload certificate SHA-256 | owner (upload key) | `google-play-internal.json` → `uploadCertificateSha256` |
| App signing certificate SHA-256 | Google | `google-play-internal.json` → `appSigningCertificateSha256` |

São **diferentes**, e isso é o esperado. App Links HTTPS futuros
(`assetlinks.json`) usam o fingerprint da **app signing key do Play**, não só o
da upload key. Depois de registrado, `android:bundle:release` só aceita AAB
assinado com aquele upload certificate (`UPLOAD_CERT_MISMATCH`).

**Caminho A: primeiro upload MANUAL (permitido).** Se a Play API ainda não
estiver pronta, o owner envia o `.aab` pelo Play Console (Testes → Teste
interno → Criar versão). Registre no ledger (`docs/release/android-release-ledger.json`)
**só depois** do upload real:

```json
{ "packageName": "longyu.noba.com", "versionCode": 0, "versionName": "0.2.0-beta.1",
  "sha": "<SHA completo>", "track": "internal", "uploadedAt": "<ISO 8601>",
  "source": "MANUAL_INTERNAL_UPLOAD" }
```

**Caminho B: workflow.** Com `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` válido no
environment `android-internal`: Actions → **Android release (manual)** →
`channel = internal`. O workflow recusa tudo que não venha de `main` por
acionamento manual, confere o package do AAB, verifica a assinatura, recusa
versionCode repetido, envia ao track **internal** e grava
`play-upload-record.json` (copie para o ledger com `source: "PLAY_API_UPLOAD"`).
Sem a service account o status é `PLAY_API_AUTOMATION_BLOCKED`, **não**
`APP_RELEASE_BLOCKED`: o caminho A continua valendo.

**GitHub Environments** (Settings → Environments; hoje não existem):

- `android-internal`: `LONGYU_ANDROID_KEYSTORE_BASE64`, `LONGYU_ANDROID_KEYSTORE_PASSWORD`,
  `LONGYU_ANDROID_KEY_ALIAS`, `LONGYU_ANDROID_KEY_PASSWORD` e, opcional,
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. O base64 do keystore é **só secret**, nunca artifact.
- `android-production`: criado agora, **não usado nesta onda**, com required reviewer.

**Testers internos:** owner + contas de QA confiáveis (emails só no Play Console).
Internal testing é smoke antes do teste fechado, não o substitui.

**Notas da versão (curtas, sem segredo, sem SHA completo, sem infra):**

> Primeira versão de teste interno do Longyu para Android.

| Faltando | Resultado honesto |
|---|---|
| secrets de assinatura | `BLOCKED_SIGNING_SECRETS` (exit 4, nenhum AAB) |
| service account | `PLAY_API_AUTOMATION_BLOCKED` (upload manual continua possível) |
| package não confirmado no Console | STOP (nenhum upload) |

## 8. Instalar pela Play (RC2.2.16)

Depois do **primeiro upload real** para internal:

1. No aparelho físico, desinstale qualquer Longyu de desenvolvimento antigo (outro package).
2. Aceite o convite de tester com a conta Google do tester e instale pela **Play Store** (não por `adb`).
3. `npm run android:play-install:verify`: precisa dar `INSTALLED_FROM_PLAY` (package, versão, installer
   `com.android.vending`, certificado = app signing key da Play).
4. Repita o QA essencial no build da Play: `docs/ANDROID_PHYSICAL_QA.md` §6.
5. **Upgrade pela Play:** publique N+1 no internal, atualize pela Play Store e confirme que o estado de N
   sobreviveu (`docs/ANDROID_UPGRADE.md`). Rollback = correção + versionCode maior, nunca downgrade.

## 9. Production

Nunca automática. Exige `channel=production`, `confirm_production=PUBLICAR-PRODUCAO`,
o environment protegido `android-production` com aprovador e rollout final feito à
mão no Play Console. **Fora do escopo** até a Public Beta sair de NO-GO.
