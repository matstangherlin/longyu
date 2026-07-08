import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "logo.png"],
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
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    emptyOutDir: true,
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
