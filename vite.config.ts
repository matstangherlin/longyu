import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { LONGYU_I18N_VERSION } from "./src/i18n/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // E2E preview builds set VITE_USE_TEST_FIXTURES. A live SW + autoUpdate
      // aborts Firefox navigations (NS_BINDING_ABORTED) mid-suite.
      disable: process.env.VITE_USE_TEST_FIXTURES === "true",
      // Docs (BETA_RELEASE_QA / REAL_DEVICE_QA) require autoUpdate so a new
      // Netlify publish is not left serving deleted hashed lazy chunks.
      registerType: "autoUpdate",
      includeAssets: ["favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "logo.png"],
      workbox: {
        // Bust i18n JS/catalog caches when the interface wave changes so an
        // old PT bundle cannot mix with a new EN catalog (or the reverse).
        cacheId: `longyu-i18n-${LONGYU_I18N_VERSION}`,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: "Longyu",
        short_name: "Longyu",
        description:
          "Aprenda mandarim pela lógica: som primeiro, fala em blocos, caracteres em camadas.",
        lang: "pt-BR",
        theme_color: "#B42318",
        background_color: "#F7F6F3",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "logo.png", sizes: "1254x1254", type: "image/png", purpose: "any" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Code-splitting: núcleo React num chunk cacheável, páginas em chunks
        // próprios (ver routes.tsx — carregamento lazy por rota).
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom", "zustand"],
        },
      },
    },
  },
  server: {
    // Respeita a porta atribuída pelo ambiente (ex.: preview do Claude Code).
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    watch: {
      ignored: [
        "**/*.zip",
        "**/dist/**",
        "**/.git/**",
        "**/.git */**",
        "**/node_modules/**",
        "**/*.backup.*",
        "**/*.bak",
        "**/*.old",
        "**/__rzi_*.rartemp",
        "**/*.rartemp",
      ],
    },
  },
});
