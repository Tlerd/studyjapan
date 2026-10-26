import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        text: "var(--text)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-soft": "var(--accent-soft)",
        "green-brand": "var(--green)",
        "yellow-brand": "var(--yellow)",
        "gray-brand": "var(--gray)",
        "bar-track": "var(--bar-track)",
        "bar-fill": "var(--bar-fill)",
        "bar-log": "var(--bar-log)",
        "ok-bg": "var(--ok-bg)",
        "ok-ink": "var(--ok-ink)",
        "no-bg": "var(--no-bg)",
        "no-ink": "var(--no-ink)",
        "unk-bg": "var(--unk-bg)",
        "unk-ink": "var(--unk-ink)",
        "note-bg": "var(--note-bg)",
        "note-ink": "var(--note-ink)",
        "chip-bg": "var(--chip-bg)",
        "chip-line": "var(--chip-line)",
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "'Noto Sans JP'", "system-ui", "sans-serif"],
        ja: ["'Noto Sans JP'", "'Be Vietnam Pro'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
