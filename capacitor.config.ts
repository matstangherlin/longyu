import type { CapacitorConfig } from "@capacitor/cli";

/**
 * RC2.2.10 — Android nativo via Capacitor.
 *
 * O Android é só mais um cliente do MESMO Longyu: empacota o `dist/` produzido
 * por `npm run build` (mesmo frontend, mesmo store, mesmo SRS, mesma conta).
 * Não existe `server.url` aqui de propósito — o app nunca vira uma WebView
 * remota apontando para o site publicado. `validate:android-native-foundation`
 * recusa qualquer `server.url`.
 */
const config: CapacitorConfig = {
  appId: "com.longyu.app",
  appName: "Longyu",
  webDir: "dist",
  android: {
    // Links http:// não carregam dentro do app.
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // Edge-to-edge (Android 15+/API 35+): o index.html declara
      // viewport-fit=cover e os tokens de index.css já usam
      // env(safe-area-inset-*). "css" também injeta --safe-area-inset-* para
      // WebViews antigas; nenhum CSS Android duplicado.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
    SplashScreen: {
      // Curta: some sozinha mesmo se o JS falhar; o app a esconde antes
      // quando o primeiro render acontece (src/lib/platform/nativeShell.ts).
      launchAutoHide: true,
      launchShowDuration: 800,
      // Mesma cor do fundo do logo (scripts/android-brand-assets.mjs).
      backgroundColor: "#FEFDFE",
      showSpinner: false,
    },
    Keyboard: {
      // Edge-to-edge: sem isto o teclado cobre o CTA. O resize da WebView
      // alimenta os hooks de visualViewport que o Lesson Player já usa.
      resizeOnFullScreen: true,
    },
  },
};

export default config;
