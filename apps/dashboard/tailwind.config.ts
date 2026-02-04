import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-page": "#FFFFFF",
        "bg-sidebar": "#000000",
        "bg-surface": "#F5F5F5",
        "black-primary": "#000000",
        "border-light": "#EEEEEE",
        "gray-300": "#DDDDDD",
        "gray-500": "#999999",
        "gray-600": "#666666",
        "gray-dark": "#222222",
        "gray-mid": "#444444",
        "red-primary": "#E53935",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
