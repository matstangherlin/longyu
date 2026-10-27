# Longyu — QA mobile real

> A rodada de julho de 2026, mais abaixo, continua como histórico (`0.2.0-beta.1`).
> O roteiro da beta fechada de outubro de 2026 está nesta seção. Os campos de
> aparelho ficam em branco até o Matty testar um único candidato, sem recompilar
> no meio. Registro para preencher: `docs/qa-report-2026-10/QA_FISICO_REGISTRO.md`.

## Roteiro beta fechada (QA 10/2026)

Candidato: um só APK/AAB ou uma só URL, gerado **depois** do merge da pilha de QA.
A versão web desta pilha é `0.3.0-beta.1`. O APK registrado no repositório ainda é
`0.2.0-rc.5` (versionCode 651). Não use esse APK antigo como se fosse o candidato
desta beta, e não gere outro build no meio do roteiro.

Pré-condição comum: aparelho limpo ou dados do Longyu apagados; idioma do sistema
anotado (a interface segue o idioma do aparelho); conta de QA só pelo e-mail, sem
colar senha neste doc.

O que os docs de julho não cobrem e o relatório de outubro pede: isolamento entre
contas, logout no primeiro toque, reset por código, “Não posso ouvir agora”,
Cargas, Reportar problema, versão copiável e a confirmação de 18 anos.

| ID | Pré-condição | Passos | Esperado | iPhone Safari | iPhone PWA | Android Chrome | Android app | Evidência | Observações |
|---|---|---|---|---|---|---|---|---|---|
| D-01 | Aparelho sem o app | Instalar pela URL ou pela Play de teste | Abre na landing, sem crash | ____ | ____ | ____ | ____ | ____ | ____ |
| D-02 | Versão anterior com uma lição concluída | Atualizar PWA e o app Android | Progresso e nome continuam | ____ | ____ | ____ | ____ | ____ | Não recompilar depois |
| R-02 | Sem conta | Cadastro com 18+ marcado; pedir reset e usar o código | Conta cria; código de 6 dígitos; link expirado explica | ____ | ____ | ____ | ____ | ____ | Produção ainda pode mandar o e-mail antigo até o painel mudar |
| R-03 | Conta existente | Senha errada | Mensagem genérica em português e o botão volta em menos de 3 s | ____ | ____ | ____ | ____ | ____ | ____ |
| R-04 | Logado | Sair pelo Mais e, no largo, pelo topo | Confirma, encerra, aviso se a nuvem não sincronizou | ____ | ____ | ____ | ____ | ____ | No celular o Sair fica em Mais ou Conta |
| R-05 | Duas contas no mesmo aparelho | A → sair → B → sair → A | B não vê progresso de A; A volta igual | ____ | ____ | ____ | ____ | ____ | ____ |
| R-06 | Logado | Trocar o nome e recarregar | Nome permanece; o chip de sync termina | ____ | ____ | ____ | ____ | ____ | Chip “Sync problem” ainda é esperado enquanto a coluna `instruction_locale` não existir em produção |
| R-07 | Conta Free | Abrir lição, teste de módulo, sair sem responder | Anotar se cobrou e se devolveu | ____ | ____ | ____ | ____ | ____ | Não mudar a regra neste roteiro; só registrar |
| R-08 | Com missão disponível | Resgatar e recarregar na hora | O resgate não volta para “resgatar”; Qi estável | ____ | ____ | ____ | ____ | ____ | Achado de 26/10 a confirmar |
| R-09 | Com Qi visível | Concluir uma lição | Qi não diminui sem gasto | ____ | ____ | ____ | ____ | ____ | ____ |
| D-03 | Na jornada | Abrir a primeira lição, acertar, voltar | A jornada mostra a lição feita | ____ | ____ | ____ | ____ | ____ | ____ |
| D-04 | Com revisão disponível | Abrir Revisão e responder um item | A fila anda; a dica, se houver, tem texto | ____ | ____ | ____ | ____ | ____ | ____ |
| D-05 | Cultura liberada | Abrir um item de Cultura | A página abre e o áudio, se houver, toca | ____ | ____ | ____ | ____ | ____ | ____ |
| D-06 | Microfone ainda não decidido | Falar: negar; depois conceder | Negar não trava o app; conceder pede de novo ou usa o microfone | ____ | ____ | ____ | ____ | ____ | No Android o reconhecimento pode falhar no WebView |
| R-17 | Etapa só de escuta | “Não posso ouvir agora” e seguir sem avaliar | A etapa termina sem gastar Vida nem Fôlego | ____ | ____ | ____ | ____ | ____ | Nem toda etapa de escuta tem o botão |
| D-07 | No meio da lição | Modo avião, responder, religar a rede | O passo não se perde; o sync avisa se falhar | ____ | ____ | ____ | ____ | ____ | ____ |
| D-08 | No meio da lição | Matar o processo e reabrir | Volta no progresso salvo, sem recompensa duplicada | ____ | ____ | ____ | ____ | ____ | ____ |
| D-09 | Android | Voltar na lição, num modal e no paywall | Fecha o modal; não mata o app na jornada | ____ | n/a | ____ | ____ | ____ | ____ |
| D-10 | Qualquer tela longa | Girar o aparelho | Sem corte e sem perder o passo | ____ | ____ | ____ | ____ | ____ | ____ |
| D-11 | Fonte do sistema grande | Abrir jornada e uma lição | Texto cabe; botões continuam tocáveis | ____ | ____ | ____ | ____ | ____ | ____ |
| R-15 | Conta descartável | Exportar; depois excluir | O pacote baixa; a conta some e a sessão encerra | ____ | ____ | ____ | ____ | ____ | Só numa conta criada para isso |
| D-12 | Em jornada, lição, 404 e erro | Reportar problema | Abre em até dois toques; a rota é a tela real | ____ | ____ | ____ | ____ | ____ | Não enviar senha |
| D-13 | Ajustes ou Sobre | Copiar a versão | Mostra `v0.3.0-beta.1` e sete caracteres do SHA, no candidato certo | ____ | ____ | ____ | ____ | ____ | ____ |
| D-14 | Etapa de escuta | Seguir sem avaliar | Não conta como acerto de ouvido | ____ | ____ | ____ | ____ | ____ | ____ |
| D-15 | Cadastro | Enviar sem marcar 18+ | A conta não é criada; a frase pede 18 anos | ____ | ____ | ____ | ____ | ____ | ____ |

# Histórico — Longyu 0.2.0-beta.1 — QA mobile real (2026-07-19)

> **Rodada de julho (humana):** [`BETA_HUMAN_QA_RUNBOOK.md`](./BETA_HUMAN_QA_RUNBOOK.md) — fluxo 1→15. A rodada de outubro está no topo deste arquivo.  
> **Status pós-#148 (tip `main` `3622885`):** B001 **corrigido em código**, aguardando Android físico; B002 **corrigido em código**, aguardando humano; produção/transferência, PieceAssembly e guarda QA entregues.  
> **Automação não substitui QA humano.** Nenhum checkbox humano foi marcado automaticamente.  
> Este arquivo documenta a rodada de **2026-07-19** (emulação + gaps honestos).  
> Emulação Chromium **não** substitui iPhone/Android físicos.

Rodada de QA focada em **validar o app fora do desktop e do Chromium padrão do
Playwright**, antes da beta pública ampla.

- **Build:** `0.2.0-beta.1` — branch `claude/longyu-mobile-qa-real-f89lfl`.
- **Data:** 2026-07-19.
- **Automação nova:** projetos Playwright para WebKit, Firefox, Chrome/Safari
  mobile, tablet, `prefers-reduced-motion`, offline (PWA) e rede lenta
  (`e2e/mobile-device.spec.ts`, `playwright.config.ts`).

## Honestidade do ambiente (leia antes da matriz)

Esta rodada rodou num **contêiner headless de automação**, não em aparelhos
físicos. O que isso significa, sem maquiar:

| Camada | Situação nesta rodada |
|---|---|
| **Motor Chromium (Chrome Android / Chrome desktop)** | ✅ Executado de verdade (device emulation + toque + CDP). |
| **Motor WebKit (Safari iOS / macOS)** | ⚙️ Projetos Playwright prontos, mas **o binário do WebKit é bloqueado pelo proxy** deste ambiente (`403 host not permitted`). Roda no CI/máquina com `npx playwright install webkit`. |
| **Motor Gecko (Firefox)** | ⚙️ Igual ao WebKit: projeto pronto, binário não disponível aqui. |
| **Aparelho físico (iPhone/Android reais)** | ⏳ **Não executado** — exige device real ou serviço de dispositivos. Itens marcados `⏳ device real`. |

> Regra desta rodada: nada de "✅" para o que não foi executado. Emulação de
> device no motor Chromium **não é** o Safari real; por isso os itens de iOS
> ficam divididos entre "verificado no código/engine" e "pendente em device
> real". Ver §8.

---

## 1. Matriz mínima

`E` = emulação automatizada (motor Chromium) · `W` = pronto p/ WebKit no CI ·
`F` = pronto p/ Firefox no CI · `⏳` = pendente em device real.

| Alvo | Tela/visor | PWA | Como foi coberto nesta rodada | Status |
|---|---|---|---|---|
| **iPhone — Safari iOS atual** | 390×844 | instalada | Emulação `iPhone 13` (perfil de device) no motor Chromium + projeto `mobile-safari`/`webkit` pronto p/ CI | `E` + `W`, `⏳` device real |
| **iPhone — tela pequena** | 360×640 | — | `e2e` 360×640 (player cabe, sem overflow) | `E`, `⏳` device real |
| **iPhone — PWA instalado (standalone)** | 390×844 | standalone | Manifest + SW auditados no código; offline `e2e` passou | `E` (código), `⏳` standalone real |
| **Android — Chrome atual** | 393×851 | instalada | Projeto `mobile-chrome` (`Pixel 5`, toque) — suíte de device verde | `E` ✅ |
| **Android — 360×640** | 360×640 | — | `e2e` 360×640 (smoke + device) | `E` ✅ |
| **Android — PWA instalada** | 393×851 | standalone | Manifest + SW `autoUpdate` auditados; offline `e2e` passou | `E` ✅, `⏳` instalação real |
| **Tablet — retrato** | 834×1112 | — | Projeto `tablet-portrait` (toque) | `E` ✅ |
| **Tablet — paisagem** | 1112×834 | — | Projeto `tablet-landscape` (toque) + screenshot | `E` ✅ |
| **Desktop — Chrome** | 1280×800 | — | Projeto `chromium` (suíte completa) | `E` ✅ |
| **Desktop — Edge** | 1280×800 | — | Mesmo motor Chromium do `chromium` (Edge = Chromium) | `E` (por equivalência de motor) |
| **Desktop — Firefox** | 1280×800 | — | Projeto `firefox` pronto (`npx playwright install firefox` no CI) | `F` |
| **Desktop — Safari macOS** | 1280×800 | — | Projeto `webkit` pronto (`npx playwright install webkit` no CI) | `W`, `⏳` macOS real |

Comandos:

```bash
npm run test:e2e            # chromium + mobile-chrome + tablet×2 + reduced-motion (roda em qualquer lugar)
npm run test:e2e:webkit     # webkit + mobile-safari  (exige webkit instalado)
npm run test:e2e:firefox    # firefox                 (exige firefox instalado)
npm run test:e2e:mobile     # só os projetos mobile/tablet
```

---

## 2. Fluxos críticos

Legenda resultado: ✅ ok · ⚙️ coberto por automação/código · ⏳ device real.

| Fluxo | Rota | Como foi validado | Resultado | Evidência |
|---|---|---|---|---|
| Landing | `/` | `beta-smoke` + `mobile-device` (toque nos CTAs) + 360px sem overflow | ✅ | `01-landing-phone` |
| Cadastro | `/conta` | `beta-smoke` (onboarding inicia) + screenshot | ✅ | `02-cadastro-phone` |
| Login | `/login` | `beta-smoke` (form + atalhos), cloud ativo no build | ✅ | `03-login-phone` |
| Recuperação de senha | `/esqueci-senha` | `beta-smoke` (form + envio) | ✅ | `04-recuperacao-senha-phone` |
| Teste de nível | `/conta` | `beta-smoke` (onboarding/teste inicia) | ✅ | `02-cadastro-phone` |
| Jornada | `/jornada` | `smoke`/`beta-smoke` 360px + `mobile-device` (safe-area) + screenshot | ✅ | `05-jornada-phone` |
| Início da lição | `/licao/:id/player` | `mobile-device` (toque: Entendi→opção) | ✅ | `11-licao-intro-360` |
| Exercício com imagem | `/licao/p4-char-ren/player` | `beta-smoke` + `visual` (asset real no build) | ✅ | `13-exercicio-imagem-phone` |
| Áudio | player | Código: `soundFx` retoma `AudioContext` suspenso; TTS via `speechSynthesis`; autoplay **off** por padrão (§4) | ⚙️ | — |
| Hànzì Builder | `/licao/p1-primeiros-hanzi/player` | `beta-smoke` (montagem carrega) + screenshot | ✅ | `14-hanzi-builder-phone` |
| Pares | player | `validate:lesson-options`; hotkeys 1-5/6-0 (`useExerciseHotkeys`) | ⚙️ | — |
| conversation_scene V2 | `/licao/l1/player` | `beta-smoke` (cena na trilha) | ✅ | — |
| Teclado numérico (desktop) | player | `mobile-device` (tecla `1` seleciona opção) | ✅ | `12-licao-exercicio-360` |
| Enter para avançar | player | `mobile-device` (Enter aciona botão em foco) | ✅ | — |
| Conclusão | player | `beta-smoke` (acerto→feedback→progresso, sem crash) | ✅ | — |
| Revisão | `/revisao` | `beta-smoke` (hub + pendências Pro) + screenshot | ✅ | `06-revisao-phone` |
| Perfil | `/perfil` | Auditoria de resoluções + screenshot | ✅ | `07-perfil-phone` |
| Feedback | Mais/Sobre/Ajustes/fim-de-lição | `beta-smoke` (modal do FAB no desktop). **No mobile o FAB é desktop-only** (§7) | ✅ | `10-mais-feedback-phone` |
| Paywall | `/pro` | `smoke`/`beta-smoke` 360px (sem Pro Preview) + screenshot | ✅ | `08-paywall-phone` |
| Logout/login | `/conta`, `/login` | `beta-smoke` (sync/nuvem menciona progresso) | ⚙️ | — |
| Progresso na nuvem | conta/sync | Código: `persistSession`+`autoRefreshToken`; `validate:sync-merge`/`progress-snapshot` | ⚙️ | — |

---

## 3. Problemas específicos de iOS

Motor WebKit real pendente (proxy). Abaixo: o que foi verificado no código/engine
e o que precisa de iPhone real.

| Item | Verificação | Situação |
|---|---|---|
| Safe-area inferior | `viewport-fit=cover` no HTML; `TabBar` usa `env(safe-area-inset-bottom)`; `<main>` reserva `calc(env(safe-area-inset-bottom)+5.5rem)`. Teste `mobile-device` confirma padding e ausência de overflow | ⚙️ engine ✅ · `⏳` notch real |
| Teclado cobrindo botão | Inputs de auth com `text-base`; player esconde chrome (modo foco). Sobreposição do teclado **precisa de device real** | `⏳` device real |
| Áudio após interação | `soundFx.playSoundFx` chama `context.resume()` quando `suspended` — destrava após o 1º toque | ⚙️ código ✅ · `⏳` device real |
| Bloqueio de autoplay | `autoPlayAudio` **desligado por padrão**; TTS só dispara em ação do usuário | ⚙️ código ✅ |
| Altura com barra do Safari | Landing usa `min-h-dvh` (dynamic viewport); AppShell `min-h-screen`. `dvh` acompanha a barra do Safari | ⚙️ código ✅ · `⏳` confirmar `100vh` residual em device |
| Scroll elástico | `overscroll` padrão; conteúdo em containers com `overflow` próprio nos exercícios | `⏳` device real |
| Input aumentando zoom | Inputs de auth/onboarding com `text-base` (16px) → iOS **não** dá zoom no foco | ⚙️ código ✅ |
| PWA standalone | Manifest `display: standalone`, `orientation: portrait`, ícone maskable; `index.html` com `apple-mobile-web-app-capable` / status-bar / title (RC2.2.3 **PASS_CODE**) | ⚙️ código ✅ · `⏳` "Add to Home Screen" real — formal `pwa_upgrade` continua `false` |
| Atualização do service worker | `registerType: "autoUpdate"` (Workbox `skipWaiting`+`clientsClaim`) → nova versão aplica sem prompt | ⚙️ código ✅ |
| Volta do background | Estado em `localStorage` (Zustand persist); `AuthBootstrap`/`CloudSyncBootstrap` reidratam ao focar | ⚙️ código ✅ · `⏳` device real |
| Sessão Supabase após fechar/abrir | `persistSession: true` + `autoRefreshToken: true` + `detectSessionInUrl: true` | ⚙️ código ✅ · `⏳` device real |

## 4. Problemas específicos de Android

| Item | Verificação | Situação |
|---|---|---|
| Botão voltar | SPA com `react-router`; histórico por rota. Fecho de modal via ESC/back precisa de device | ⚙️ parcial · `⏳` back físico |
| Instalação PWA | Manifest válido, `beforeinstallprompt` suportado no Chromium | ⚙️ código ✅ · `⏳` instalação real |
| Teclado numérico | Atalhos 1-9 (`useExerciseHotkeys`) no desktop; no mobile as opções são botões grandes de toque | ⚙️ código ✅ (`mobile-device` valida seleção por número) |
| Mudança de orientação | Projetos `tablet-portrait`/`tablet-landscape` verdes; sem overflow nas duas | ⚙️ ✅ · `⏳` rotação em device |
| Áudio Bluetooth | Web Audio roteia pelo device de saída do SO | `⏳` device real (fone BT) |
| Cache | SW precache (10 entradas, ~1.9 MB) + `autoUpdate` | ⚙️ código ✅ (offline `e2e` passou) |
| Retomada após perda de rede | Teste `mobile-device` de rede lenta (Slow 3G via CDP) passou; offline serve o shell | ⚙️ ✅ · `⏳` toggle de rede em device |
| Modal atrás da barra inferior | `TabBar` `z-30`, FAB `z-40`, overlays de modal acima; `<main>` com padding de safe-area | ⚙️ código ✅ · `⏳` device real |

---

## 5. Registro de evidências e severidade

Colunas conforme solicitado. Severidade: Bloqueador > Alta > Média > Baixa.

| # | Aparelho | Sistema | Navegador | Rota | Fluxo | Resultado | Screenshot | Severidade | Issue | Correção |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pixel 5 (emul.) | Android | Chrome (Chromium) | `/` | Landing por toque | ✅ passou | `01-landing-phone` | — | — | — |
| 2 | Pixel 5 (emul.) | Android | Chrome | `/licao/.../player` | Avançar por toque | ✅ passou | `11`/`12` | — | — | — |
| 3 | Desktop | — | Chrome | `/licao/.../player` | Nº seleciona / Enter avança | ✅ passou | `12-licao-exercicio-360` | — | — | — |
| 4 | 390×844 | iOS-like | Chromium | `/jornada` | Safe-area / barra inferior | ✅ passou | `05-jornada-phone` | — | — | — |
| 5 | Pixel 5 (emul.) | Android | Chrome | `/jornada` | prefers-reduced-motion | ✅ passou | — | — | — | — |
| 6 | 390×844 | — | Chromium | `/` | Offline (PWA precache) | ✅ passou | — | — | SW assumiu controle e serviu o shell offline | — |
| 7 | Desktop | — | Chrome | `/` | Rede lenta (Slow 3G) | ✅ passou | `16-landing-desktop` | — | — | — |
| 8 | Tablet (emul.) | — | Chromium | `/jornada` | Retrato + paisagem | ✅ passou | `15-jornada-tablet-landscape` | — | — | — |
| 9 | Global | iOS/Android | — | Global | Pinch-zoom | ✅ PASS_CODE (RC2.2.3) | — | — | `index.html` viewport = `width=device-width, initial-scale=1.0, viewport-fit=cover` — **sem** `user-scalable=no` / `maximum-scale=1` | Confirmado em código; revalidar pinch em device físico (não fecha `android_real_device`/`ios_real_device`) |
| 10 | iPhone | iOS | Safari | Global (standalone) | Meta iOS legada | ✅ PASS_CODE (RC2.2.3) | — | — | Presentes: `apple-mobile-web-app-capable`, `status-bar-style`, `title` | Confirmado em código; install real ainda formal `pwa_upgrade=false` |
| 11 | Android | Android | Chrome | Instalação | Ícone 192 dedicado | ⚠️ por escala | — | Baixa | Manifest sem ícone 192×192 dedicado (`logo.png any` cobre) | Adicionar ícone 192 (fast-follow) |
| 12 | Global | — | — | Global | Toggle in-app "reduzir movimento" | ⚠️ ausente | — | Baixa | Só respeita a preferência do SO | Adicionar toggle nas configurações (fast-follow) |
| 13 | iPhone/Android | iOS/Android | Safari/Chrome reais | Todos | **Verificação em device físico** | ⏳ pendente | — | — | Emulação não substitui device real (ver §8) | Rodar a matriz em iPhone + Android reais e WebKit/Firefox no CI |

**Nenhum bloqueador e nenhum item de severidade Alta em aberto** na automação
desta rodada. Itens **9–10** reauditados em RC2.2.3 (**PASS_CODE** — pinch zoom
desbloqueado; metas iOS presentes). Itens 11–12 permanecem fast-follow (Baixa);
item 13 é a verificação manual em device físico pendente.

### Screenshots (docs/screenshots/)

`01-landing-phone` · `02-cadastro-phone` · `03-login-phone` ·
`04-recuperacao-senha-phone` · `05-jornada-phone` · `06-revisao-phone` ·
`07-perfil-phone` · `08-paywall-phone` · `09-ligas-phone` ·
`10-mais-feedback-phone` · `11-licao-intro-360` · `12-licao-exercicio-360` ·
`13-exercicio-imagem-phone` · `14-hanzi-builder-phone` ·
`15-jornada-tablet-landscape` · `16-landing-desktop`.

Regenerar: `npx playwright test --project=screenshots`.

---

## 6. Automação adicional (Playwright)

`playwright.config.ts` passou de 1 para 8 projetos:

| Projeto | Motor | Uso |
|---|---|---|
| `chromium` | Chromium | Suíte completa (portão padrão) |
| `firefox` | Gecko | Suíte completa (cross-engine) |
| `webkit` | WebKit | Suíte completa ≈ Safari |
| `mobile-chrome` | Chromium | `Pixel 5`, toque — spec de device |
| `mobile-safari` | WebKit | `iPhone 13`, toque — spec de device |
| `tablet-portrait` | Chromium | 834×1112, toque |
| `tablet-landscape` | Chromium | 1112×834, toque |
| `reduced-motion` | Chromium | `prefers-reduced-motion: reduce` |
| `screenshots` | Chromium | Evidências (sob demanda) |

`e2e/mobile-device.spec.ts` cobre os itens pedidos:

- **toque** — tap nos CTAs da landing e no player (Entendi→opção);
- **viewport com safe-area** — `viewport-fit=cover`, barra fixa com
  `env(safe-area-inset-bottom)`, padding do `<main>` e ausência de overflow;
- **prefers-reduced-motion** — `transition: none` sob `reduce`;
- **conexão offline** — recarrega offline e o shell precacheado abre;
- **rede lenta** — Slow 3G via CDP; a landing continua utilizável;
- **teclado** — número seleciona opção, Enter avança.

Testes que dependem de recurso do motor (toque, CDP, service worker) **se
auto-pulam com mensagem clara** quando o recurso não existe, em vez de falhar.

---

## 7. Observações de projeto (não são bugs)

- **FAB de feedback é desktop-only** (`DesktopFeedbackFab`, `lg:inline-flex`).
  No mobile o feedback é acessado por **Mais / Sobre / Ajustes / fim de lição**.
  Comportamento intencional — registrado para não ser confundido com regressão.
- **`test:e2e` roda só o subconjunto Chromium** por padrão (roda em qualquer
  ambiente e no CI atual). WebKit/Firefox entram por `test:e2e:webkit` /
  `test:e2e:firefox` onde os binários estão instalados.

---

## 8. Por que ainda é preciso device real

A emulação do Playwright roda **no motor Chromium** com um *perfil* de iPhone
(user-agent, viewport, DPR, toque). Ela **não** usa o motor WebKit do Safari.
Diferenças que só aparecem em Safari/iOS reais:

- comportamento de `100vh`/`dvh` com a barra do Safari recolhendo;
- gestão de áudio/autoplay do WebKit (política por gesto);
- ciclo de vida do service worker no iOS (atualização/limpeza de cache);
- scroll elástico (`rubber banding`) e `position: fixed` sob teclado;
- rendering de fontes CJK e safe-area com notch/Dynamic Island reais.

Por isso os itens iOS ficam `⚙️`/`⏳`, nunca `✅` cego. Recomendação: rodar a
matriz da §1 em **um iPhone real (Safari) e um Android real (Chrome)** e habilitar
`test:e2e:webkit`/`test:e2e:firefox` no CI (browsers instalados) antes do anúncio.

---

## 9. Critérios de beta pública ampla

> Liberar **somente quando**: sem bloqueador · sem botão inacessível · player sem
> scroll excessivo · teclado não cobre a ação · áudio funciona após toque ·
> progresso não se perde · feedback é enviado · PWA atualiza sem interromper.

| Critério | Estado nesta rodada | Base |
|---|---|---|
| Nenhum bloqueador | ✅ | Automação sem bloqueadores; §5 |
| Nenhum botão inacessível | ✅ (emul.) · ⏳ device | Safe-area + padding de barra; sem overflow |
| Player sem scroll excessivo | ✅ (360–1112px) | `e2e` player cabe em 360×640 |
| Teclado não cobre a ação | ⏳ **device real** | Inputs 16px + modo foco; sobreposição só confirma em device |
| Áudio após toque | ✅ (código) · ⏳ device | `AudioContext.resume()`; autoplay off |
| Progresso não se perde | ✅ | persist local + snapshot nuvem; offline `e2e` |
| Feedback é enviado | ✅ | `FeedbackModal`/`mailto`; `verify:beta-feedback` |
| PWA atualiza sem interromper | ✅ (código) · ⏳ device | `autoUpdate` (skipWaiting+clientsClaim) |

**Veredito automatizado: GO condicional.** A automação (motor Chromium, PWA real,
throttling real) não achou bloqueador nem botão inacessível. **Antes da beta
pública ampla**, fechar a verificação em **device físico** dos dois itens `⏳`
(teclado cobrindo ação; áudio/standalone no Safari iOS real) e rodar WebKit +
Firefox no CI. Fast-follows 9–12 não bloqueiam.
