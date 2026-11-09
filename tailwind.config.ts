import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: "#101827", 950: "#070b14", 900: "#0d1424", 800: "#141e33", 700: "#1c2944", 600: "#283a5c" },
        gold: { DEFAULT: "#D4AA5A", light: "#F0D79A", dark: "#A9843D" },
        arcane: { DEFAULT: "#46BDD6", light: "#8FE3F2", dark: "#2B8FA5" },
        forest: { DEFAULT: "#337765", light: "#4FD1A5" },
        parchment: { DEFAULT: "#E9DCC3", dark: "#CDBB98", light: "#F5EEDF" },
        ember: { DEFAULT: "#E0533D", light: "#FF7A5C" },
        mana: { DEFAULT: "#5B7CFA", light: "#8EA6FF" },
        epic: { DEFAULT: "#B07CFF", light: "#CBA6FF" },
        // Item rarity (MMO convention)
        rarity: { common: "#C9CED6", uncommon: "#4ADE80", rare: "#46BDD6", epic: "#B07CFF", legendary: "#F2A541" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        ui: ["var(--font-ui)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(70,189,214,.45), 0 0 28px -6px rgba(70,189,214,.55), inset 0 0 30px -12px rgba(70,189,214,.35)",
        gold: "0 0 0 1px rgba(212,170,90,.5), 0 10px 34px -12px rgba(212,170,90,.55)",
        epic: "0 0 0 1px rgba(176,124,255,.45), 0 0 28px -8px rgba(176,124,255,.6)",
      },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        twinkle: { "0%,100%": { opacity: ".25" }, "50%": { opacity: "1" } },
        popin: { "0%": { opacity: "0", transform: "translateY(8px) scale(.98)" }, "100%": { opacity: "1", transform: "none" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
      },
      animation: {
        "spin-slow": "spin 60s linear infinite",
        "spin-rev": "spin 90s linear infinite reverse",
        float: "float 6s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        popin: "popin .35s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
