import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import "./index.css";
import { routes } from "./routes";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { PwaUpdateBanner } from "./components/system/PwaUpdateBanner";
import { FeedbackProvider } from "./components/feedback/FeedbackContext";
import { SeoHead } from "./components/seo/SeoHead";
import { PageFallback } from "./components/system/PageFallback";

import { I18nProvider } from "./i18n/provider";
import { NativeExperienceBootstrap } from "./components/native/NativeExperienceBootstrap";
import { initNativeShell } from "./lib/platform/nativeShell";
import { bootstrapInterfaceLocale } from "./i18n/locale";

bootstrapInterfaceLocale();

/**
 * RC1.2 P1 — promove a folha de fontes DEPOIS do boot.
 *
 * O `index.html` carrega as fontes do Google como `rel="preload"`, que nao
 * bloqueia. Antes era um `rel="stylesheet"` comum, e uma folha externa
 * bloqueante segura a execucao dos scripts seguintes e o evento `load`: numa
 * navegacao back/forward a request pendurava, o modulo do app nao rodava e
 * `#root` ficava vazio. Atras de uma rede que engole `fonts.googleapis.com`
 * — a China continental, para onde este curso prepara o aluno — o app nao abria.
 *
 * A promocao vive aqui, e nao num `onload=` inline no HTML, porque a CSP do
 * site declara `script-src-attr 'none'`: o handler inline seria ignorado em
 * producao e as fontes nunca apareceriam. Este arquivo e script de 'self', que
 * a CSP permite.
 *
 * Se algo der errado, o pior caso e o app rodar nos fallbacks declarados em
 * tailwind.config.js / index.css. Nenhuma tela depende da webfont para montar.
 */
function promoteWebFonts(): void {
  const link = document.getElementById("longyu-fonts");
  if (!(link instanceof HTMLLinkElement) || link.rel === "stylesheet") return;
  link.rel = "stylesheet";
}

/**
 * A promocao espera o `load`, e nao roda na hora.
 *
 * Promover de forma sincrona recria o problema: a folha volta a ficar pendente
 * e segura o proprio evento `load` da pagina. Depois do `load` ja disparado,
 * uma folha que chega tarde apenas se aplica — nao adia mais nada.
 */
if (document.readyState === "complete") {
  promoteWebFonts();
} else {
  window.addEventListener("load", promoteWebFonts, { once: true });
}

const router = createBrowserRouter([
  {
    element: (
      <>
        <SeoHead />
        {/* RC2.2.13 — Android: lembretes, toque em notificação, intro de permissões. Web: nada. */}
        <NativeExperienceBootstrap />
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </>
    ),
    children: routes,
  },
]);

// RC2.2.10 — Android (Capacitor): BACK, deep links, links externos, teclado,
// barras e splash entram pelo MESMO router. No web é no-op.
initNativeShell({
  navigate: (to, options) => (typeof to === "number" ? router.navigate(to) : router.navigate(to, options)),
  pathname: () => router.state.location.pathname,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <FeedbackProvider>
        <ErrorBoundary fullScreen area="root">
          <RouterProvider router={router} />
        </ErrorBoundary>
        <PwaUpdateBanner />
      </FeedbackProvider>
    </I18nProvider>
  </React.StrictMode>
);
