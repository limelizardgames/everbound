import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: "#101827", 950: "#0a0f1a", 900: "#101827", 800: "#172238", 700: "#1f2d48", 600: "#2a3b5c" },
        gold: { DEFAULT: "#D4AA5A", light: "#E6C887", dark: "#A9843D" },
        arcane: { DEFAULT: "#46BDD6", light: "#7ED3E4", dark: "#2B8FA5" },
        forest: { DEFAULT: "#337765", light: "#4E9C86" },
        parchment: { DEFAULT: "#E9DCC3", dark: "#CDBB98", light: "#F5EEDF" },
        ember: { DEFAULT: "#C8553D" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(70,189,214,.35), 0 0 24px -4px rgba(70,189,214,.35)",
        gold: "0 0 0 1px rgba(212,170,90,.45), 0 8px 30px -12px rgba(212,170,90,.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
