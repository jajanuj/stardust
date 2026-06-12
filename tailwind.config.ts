import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 星際深色主題
        space: {
          900: "#0a0e27",
          800: "#111634",
          700: "#1a2150",
          600: "#252e6b",
        },
        stardust: {
          DEFAULT: "#ffd54a", // 星塵金
          glow: "#ffe9a3",
        },
        nebula: {
          purple: "#7c5cff",
          pink: "#ff6ad5",
          cyan: "#4ad9ff",
        },
      },
      fontFamily: {
        sans: ["system-ui", "Noto Sans TC", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(255, 213, 74, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
