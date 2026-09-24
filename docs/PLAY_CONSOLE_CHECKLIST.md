# Play Console: checklist operacional (RC2.2.12)

> **Status:** `BLOCKED_PLAY_CONSOLE_SETUP`. O app ainda não existe no Play Console.
> Nada aqui foi enviado ou publicado. Production é **sempre** manual.

## 1. Ficha do app

| Campo | Valor |
|---|---|
| App name | **Longyu** |
| Package | `com.longyu.app` (não muda nunca; ver `docs/ANDROID_UPGRADE.md`) |
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

## 5. Pagamentos (política da Play)

Bem digital vendido **dentro** do app Android exige Google Play Billing. Até ele
existir, o app Android **não** abre checkout externo (Stripe) nem portal de
cobrança (`ANDROID_CHECKOUT_UNAVAILABLE_MESSAGE` em `subscriptionService.ts`).
Assinantes Pro continuam Pro, porque o plano é verificado no servidor. A web não muda.

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

## 7. Internal Testing: primeiro upload (AK–AM)

Pré-requisitos, todos reais e sem simulação:

- [ ] app criado no Play Console com o package `com.longyu.app` e **Play App Signing** ativado
- [ ] upload key criada e com backup (`docs/ANDROID_SIGNING.md` §9)
- [ ] secrets do GitHub: `LONGYU_ANDROID_KEYSTORE_BASE64`, `LONGYU_ANDROID_KEYSTORE_PASSWORD`, `LONGYU_ANDROID_KEY_ALIAS`, `LONGYU_ANDROID_KEY_PASSWORD`
- [ ] service account com acesso ao app e secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- [ ] **primeiro AAB enviado à mão** no Play Console (a API do Play não cria o app, e a primeira versão costuma precisar do upload manual)
- [ ] lista de testers internos (emails) cadastrada

Depois: Actions → **Android release (manual)** → `channel = internal`. O workflow:

- recusa tudo que não venha de `main` por acionamento manual;
- verifica a assinatura (`*.signature.json` = `SIGNED_WITH_UPLOAD_KEY`);
- recusa versionCode repetido;
- envia para o track **internal**;
- grava `play-upload-record.json`.

Copie esse registro para `docs/release/android-release-ledger.json`.

| Faltando | Resultado honesto |
|---|---|
| secrets de assinatura | `BLOCKED_SIGNING_SECRETS` (exit 4, nenhum AAB) |
| service account | `BLOCKED_PLAY_CREDENTIALS` (AAB assinado vira artifact; nenhum upload) |
| app no Play Console | `BLOCKED_PLAY_CONSOLE_SETUP` |

## 8. Instalar pela Play (AN/AO)

Depois do **primeiro upload real** para internal:

1. No aparelho físico, aceite o convite de tester (link do Play Console) com a conta Google do tester.
2. Instale pela **Play Store** (não por `adb`) e repita o smoke de `docs/ANDROID_PHYSICAL_QA.md` §2. Registre `playInstall`.
3. **Upgrade pela Play:** publique N+1 no internal, atualize pela Play Store e confirme que o estado de N sobreviveu (`docs/ANDROID_UPGRADE.md` §2.6). É o teste de upgrade mais importante.

## 9. Production

Nunca automática. Exige `channel=production`, `confirm_production=PUBLICAR-PRODUCAO`,
o environment protegido `android-production` com aprovador e rollout final feito à
mão no Play Console. **Fora do escopo** até a Public Beta sair de NO-GO.
