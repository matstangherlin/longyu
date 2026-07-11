import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function resolveBuildMeta(mode: string) {
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8"));
  let sha = process.env.VITE_COMMIT_SHA?.trim();
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    } catch {
      sha = "dev";
    }
  }
  const channel =
    process.env.VITE_RELEASE_CHANNEL?.trim() ??
    (mode === "development" ? "development" : process.env.NETLIFY === "true" ? "beta" : "beta");

  return {
    VITE_APP_VERSION: pkg.version ?? "0.0.0",
    VITE_COMMIT_SHA: sha,
    VITE_BUILD_TIME: process.env.VITE_BUILD_TIME ?? new Date().toISOString(),
    VITE_RELEASE_CHANNEL: channel,
  };
}

export default defineConfig(({ mode }) => {
  const meta = resolveBuildMeta(mode);

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
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
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(meta.VITE_APP_VERSION),
      "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(meta.VITE_COMMIT_SHA),
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(meta.VITE_BUILD_TIME),
      "import.meta.env.VITE_RELEASE_CHANNEL": JSON.stringify(meta.VITE_RELEASE_CHANNEL),
    },
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
  };
});
