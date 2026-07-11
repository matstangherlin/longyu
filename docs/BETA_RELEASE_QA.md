# Longyu Beta — Auditoria final de QA

Auditoria mobile-first, PWA e acessibilidade antes da divulgação pública.

- **Build auditado:** `main` @ commit da auditoria (ver `git log`).
- **Método:** Playwright/Chromium headless (emulando os device sizes), inspeção
  de código, suíte `e2e` (21 testes) e `validate:beta` (16 validadores).
- **Ambiente:** Chromium 119 (motor do Chrome Android / desktop). iOS Safari e
  Chrome Android reais recomendados como verificação manual complementar antes
  do anúncio (ver "Pendências").

## Veredito

**GO** para o beta público. **Nenhum bug bloqueador** e **nenhum problema de
severidade alta em aberto**. Três correções de acessibilidade/feedback foram
aplicadas nesta rodada (aria-live, ESC nos modais, feedback na tela de erro).
Restam apenas itens de severidade média/baixa como _fast-follow_ (ver tabela).

---

## 1. Resoluções

Auditoria automatizada: **7 resoluções × 6 rotas de hub = 42 checagens**, mais o
player em 360×640. Checado: overflow horizontal e "botão atrás da barra inferior".

| Resolução | Overflow horizontal | Botão atrás da barra | Resultado |
|---|---|---|---|
| 360×640 | 0 px | não | ✅ |
| 360×800 | 0 px | não | ✅ |
| 390×844 | 0 px | não | ✅ |
| 414×896 | 0 px | não | ✅ |
| 768×1024 | 0 px | não | ✅ |
| 1366×768 | 0 px | não | ✅ |
| 1920×1080 | 0 px | não | ✅ |

- **42/42** sem overflow e sem sobreposição da barra inferior.
- A barra inferior é `position: fixed`; o conteúdo recebe
  `padding-bottom: calc(env(safe-area-inset-bottom) + 5.5rem)` (AppShell), então
  CTAs nunca ficam atrás da barra.
- Player em 360×640: overflow 0; modo foco esconde a barra inferior durante o
  exercício (sem risco de sobreposição).

## 2. Fluxos

| Fluxo | Como foi checado | Resultado |
|---|---|---|
| Landing | audit + e2e (`/` público, CTAs) | ✅ |
| Onboarding | e2e (`Começar agora → /conta`) | ✅ |
| Login | e2e (`Já tenho conta → /login`), rota `/conta` | ✅ |
| Jornada | audit 7 res + e2e (360px) | ✅ |
| Pré-aula | audit (detalhe da lição) | ✅ |
| Player | e2e (passo introdutório, 360px cabe) | ✅ |
| Hànzì Builder | teste dedicado (guia, feedback, progresso) | ✅ |
| Pares | `validate:lesson-options` (104 planos) + browser | ✅ |
| Resultado (fim de lição) | screenshot + e2e | ✅ |
| Perfil | audit 7 res | ✅ |
| Imersão | audit + teste de energia por história | ✅ |
| Ligas | audit 7 res + e2e (360px, XP semanal) | ✅ |
| Feedback | ver seção 5 | ✅ |
| Pro | audit 7 res + e2e (360px, sem Pro Preview) | ✅ |

## 3. PWA

| Item | Estado | Nota |
|---|---|---|
| Instalação | ✅ | Manifest válido (`vite-plugin-pwa`), `display: standalone`. |
| Ícone | ✅ | `logo.png` (`purpose: any`) + `maskable-512.png` (`purpose: maskable`). |
| Splash | ✅ | `theme_color #B42318`, `background_color #F7F6F3`. |
| Abertura standalone | ✅ | `display: standalone`, `orientation: portrait`, `start_url: /`. |
| Safe-area | ✅ | `viewport-fit=cover` + `env(safe-area-inset-*)` em nav, ações e modais. |
| Update | ✅ | `registerType: "autoUpdate"` (Workbox) — nova versão aplica sozinha. |
| Offline | ✅ | Precache do app shell (~1.6 MB, 10 entradas); progresso em localStorage. |
| Recuperação online | ✅ | Estado persistido (Zustand `persist`); sincroniza ao reabrir. |

**"Não permitir" — verificado:**

| Regra | Estado | Evidência |
|---|---|---|
| Versão antiga presa no cache | ✅ evitado | SW `autoUpdate` + precache versionado. |
| Reload durante exercício | ✅ sem perda | Recuperação de tentativa pendente no `LessonPlayer`; progresso comprometido persistido. |
| Progresso perdido | ✅ evitado | Persistência local + snapshot de conta/nuvem. |
| Botão atrás da barra inferior | ✅ evitado | 42/42 checagens; conteúdo com padding de safe-area. |

## 4. Acessibilidade

| Item | Estado | Nota |
|---|---|---|
| Navegação por teclado | ✅ | Atalhos 1–9 e Enter (`useExerciseHotkeys`); tab pela UI. |
| Foco visível | ✅ | `focus-visible:ring` em botões, links e opções. |
| ESC fecha modal | ✅ **corrigido** | Adicionado ao `ModalOverlay` (medalha etc.); Paywall/glossário/sidebar já tinham. |
| Enter confirma | ✅ | `onSubmit`/`onContinue` nos exercícios e no short-answer. |
| Labels em inputs | ✅ | `<label htmlFor>` (resposta de história); feedback é link `mailto`. |
| aria-live acerto/erro | ✅ **corrigido** | `role="status" aria-live="polite"` nos painéis de feedback (exercícios + HanziBuilder); história já anunciava. |
| Contraste | ✅ revisado | Paleta clay em fundo claro; verde/vermelho de acerto/erro com ícone+texto. Auditoria WCAG formal recomendada (baixa). |
| Reduzir animações | ✅ | `@media (prefers-reduced-motion: reduce)` desliga transições e animações custom. Sem toggle in-app (baixa). |
| TTS não dispara sozinho | ✅ | Áudio automático só com `autoPlayAudio` ligado nas configurações (padrão **desligado**). |
| Hànzì não depende só de cor | ✅ | Acerto/erro usam ícone (✓/✕) + texto ("Certo"/"Quase"), não só cor. |

## 5. Feedback no mobile

Acesso a Feedback (abre app de e-mail; nada é enviado automaticamente):

| Ponto | Estado |
|---|---|
| Mais | ✅ `FeedbackPrompt` |
| Ajuda / Sobre | ✅ `FeedbackPrompt` em `/sobre` (Mais → Ajuda leva a `/sobre#feedback`) |
| Ajustes | ✅ `FeedbackPrompt` |
| Fim da lição | ✅ card "Deixar feedback" na tela de resultado |
| Tela de erro | ✅ **adicionado** — "Reportar este exercício" no fallback de exercício pulado |

## 6. Registro de bugs

| # | Dispositivo/viewport | Navegador | Fluxo | Resultado | Bug | Severidade | Status |
|---|---|---|---|---|---|---|---|
| 1 | Todos (360–1920) | Chromium | Exercícios | Feedback de acerto/erro sem `aria-live` (leitor de tela não anunciava) | A11y | Média | ✅ Corrigido |
| 2 | Todos | Chromium | Modais (medalha) | ESC não fechava modais do `ModalOverlay` | A11y | Média | ✅ Corrigido |
| 3 | Mobile | Chromium | Player (exercício pulado) | Sem acesso a Feedback na tela de erro | UX | Baixa | ✅ Corrigido |
| 4 | iOS/Android | — | Global | `user-scalable=no` desativa pinch-zoom (WCAG 1.4.4) | A11y | Média | ⏳ Aberto (fast-follow) |
| 5 | Todos | — | Global | Sem toggle in-app de "reduzir animações" (preferência do SO é respeitada) | A11y | Baixa | ⏳ Aberto |
| 6 | Android | — | Instalação | Manifest sem ícone dedicado 192×192 (`logo.png any` cobre por escala) | PWA | Baixa | ⏳ Aberto |
| 7 | iOS | — | Standalone | Sem `apple-mobile-web-app-capable`/status-bar meta | PWA | Baixa | ⏳ Aberto |

**Legenda severidade:** Bloqueador > Alta > Média > Baixa.
**Legenda status:** ✅ Corrigido · ⏳ Aberto · ⛔ Bloqueia release.

## Critério de release

> Nenhum bug bloqueador e nenhum problema alto aberto antes da divulgação.

**Atendido.** 0 bloqueadores, 0 altos abertos. Itens 4–7 são média/baixa e ficam
como _fast-follow_ pós-lançamento.

### Recomendação de verificação manual (antes do anúncio)
1. Instalar o PWA em um Android real (Chrome) e um iPhone real (Safari):
   confirmar ícone, splash e abertura standalone.
2. VoiceOver (iOS) / TalkBack (Android): navegar um exercício e confirmar o
   anúncio de acerto/erro (aria-live) e o fechamento de modal.
3. Ativar "Reduzir movimento" no SO e confirmar animações desligadas.
