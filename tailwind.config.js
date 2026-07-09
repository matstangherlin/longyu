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
  plugins: [],
};
