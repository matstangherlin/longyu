import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import { decideBackAction, dismissTopOverlay, isOverlayOpen, routerCanGoBack } from "./backNavigation";
import { previousInAppPath, runBackGuard, smartBackFallback } from "../navigation/smartBack";
import { resolveDeepLink } from "./deepLinks";
import { classifyLink } from "./externalLinks";
import { getPlatform, isNativeApp } from "./nativePlatform";

/**
 * RC2.2.10 — liga o shell nativo (Android) ao MESMO app React.
 *
 * Chamado uma vez por main.tsx. No web é no-op: nenhuma API nativa é
 * importada nem executada. Nada aqui cria store, SRS, conta ou progresso —
 * só traduz eventos do sistema (BACK, link, teclado, barras) para o router e
 * o DOM que já existem.
 */
export type NativeShellRouter = {
  navigate: (to: string | number, options?: { replace?: boolean }) => unknown;
  pathname: () => string;
};

let installed = false;

export function initNativeShell(router: NativeShellRouter): void {
  if (installed || !isNativeApp()) return;
  installed = true;
  document.documentElement.dataset.nativePlatform = getPlatform();

  void installAppListeners(router);
  installLinkInterceptor(router);
  installSystemBarsSync();
  void installKeyboard();
  void hideSplashAfterFirstPaint();
}

async function installAppListeners(router: NativeShellRouter): Promise<void> {
  try {
    const { App } = await import("@capacitor/app");

    // Registrar um listener de backButton DESLIGA o comportamento padrão do
    // Capacitor (voltar a WebView / fechar o app). A decisão fica aqui.
    // RC2.2.11 — mesma política do SmartBackButton: histórico só quando a
    // trilha in-app confirma; senão o pai lógico da rota (não "a Jornada").
    await App.addListener("backButton", () => {
      const overlayOpen = isOverlayOpen();
      // Prova/lição em andamento: a tela decide (pergunta antes de perder).
      if (!overlayOpen && runBackGuard()) return;
      const pathname = router.pathname();
      const action = decideBackAction({
        overlayOpen,
        canGoBack: routerCanGoBack() && previousInAppPath(pathname) !== null,
        pathname,
      });
      if (action === "dismiss-overlay") dismissTopOverlay();
      else if (action === "history-back") void router.navigate(-1);
      else if (action === "navigate-home") void router.navigate(smartBackFallback(pathname), { replace: true });
      else void App.minimizeApp();
    });

    await App.addListener("appUrlOpen", ({ url }) => {
      const route = resolveDeepLink(url);
      if (route) void router.navigate(route);
    });

    // Cold start via deep link: o app abriu pelo link.
    const launch = await App.getLaunchUrl();
    const route = launch?.url ? resolveDeepLink(launch.url) : null;
    if (route && route !== router.pathname()) void router.navigate(route, { replace: true });
  } catch {
    /* plugin App ausente: o app segue sem BACK/deep link nativos */
  }
}

/** Links tocados: interno → router; https externo → navegador do sistema. */
function installLinkInterceptor(router: NativeShellRouter): void {
  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
      const decision = classifyLink(anchor.getAttribute("href") ?? "", window.location.origin);
      if (decision.kind === "system") return;
      if (decision.kind === "internal") {
        // <Link> do react-router já trata o próprio clique; só links "crus"
        // (target=_blank, href absoluto do site) chegam aqui sem preventDefault.
        event.preventDefault();
        void router.navigate(decision.to);
        return;
      }
      event.preventDefault();
      if (decision.kind === "external") void openExternal(decision.url);
    },
    { capture: false }
  );
}

export async function openExternal(url: string): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch {
    /* sem plugin Browser: não abre dentro da WebView principal */
  }
}

/** Ícones da status/navigation bar acompanham o tema do app (data-theme). */
function installSystemBarsSync(): void {
  const apply = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined);
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

/**
 * Teclado: a WebView redimensiona (Keyboard.resizeOnFullScreen) e os hooks de
 * visualViewport do Lesson Player fazem o resto. Aqui só garantimos que o
 * campo focado não fique atrás do teclado e expomos o estado ao CSS.
 */
async function installKeyboard(): Promise<void> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.addListener("keyboardDidShow", () => {
      document.documentElement.dataset.nativeKeyboard = "open";
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.matches("input, textarea, [contenteditable='true']")) {
        active.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
    await Keyboard.addListener("keyboardDidHide", () => {
      delete document.documentElement.dataset.nativeKeyboard;
    });
  } catch {
    /* sem plugin Keyboard: comportamento padrão da WebView */
  }
}

/** Splash curta: some no primeiro frame pintado (autoHide cobre falha de JS). */
async function hideSplashAfterFirstPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* autoHide do capacitor.config.ts esconde de qualquer forma */
  }
}
