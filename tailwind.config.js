import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens lidos das CSS variables (trocam com o tema em runtime).
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        ink: "rgb(var(--text) / <alpha-value>)",
        "ink-soft": "rgb(var(--text-soft) / <alpha-value>)",
        "ink-faint": "rgb(var(--text-faint) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        wrong: "rgb(var(--wrong) / <alpha-value>)",
        "wrong-soft": "rgb(var(--wrong-soft) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["'Noto Serif SC'", "Georgia", "serif"],
        hanzi: ["'Noto Serif SC'", "'Songti SC'", "serif"],
      },
      borderRadius: {
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.03), 0 2px 8px rgb(0 0 0 / 0.04)",
        lift: "0 4px 16px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.04)",
        glow: "0 0 0 3px rgb(var(--accent) / 0.18)",
      },
      maxWidth: {
        content: "1180px",
      },
    },
  },
  plugins: [
    /**
     * `roomy:` — "tem folga vertical": largura de `sm` E altura sobrando.
     *
     * `sm:` sozinho é largura. Um celular deitado (667x360) satisfaz `sm` com
     * 360px de altura, e regras escritas pensando em "desktop" caem nele: um
     * card que deixa de ocupar a tela para acompanhar o conteúdo fica mais alto
     * que a viewport e empurra o CTA para fora do alcance. Quem depende de folga
     * vertical pede as duas condições.
     *
     * É um plugin, e NÃO uma entrada em `theme.extend.screens`, de propósito:
     * um `screens` contendo objetos (`{ raw: … }`) desliga os variants `min-*` e
     * `max-*` no projeto inteiro — o Tailwind avisa e simplesmente para de gerar
     * as regras. Aqui isso apagaria os `min-[390px]:` e `min-[480px]:` que
     * seguram as grades da Home, de Conquistas, do Pinyin Lab e do passo de
     * comparação. `addVariant` não toca em `screens` e não tem esse efeito.
     */
    plugin(({ addVariant }) => {
      addVariant("roomy", "@media (min-width: 640px) and (min-height: 640px)");
    }),
  ],
};
