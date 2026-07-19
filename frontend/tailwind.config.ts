import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#0B0F14",
        surface: "#141A21",
        elevated: "#1B222C",
        pitch: "#00C853",
        primary: "#F5F7FA",
        secondary: "#A7B0BA",
        muted: "#7A8594",
        border: "#2B3440",
        danger: "#FF5252",
        warning: "#FFC107",
        info: "#42A5F5",
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", ...fontFamily.sans],
        body: ["var(--font-inter)", ...fontFamily.sans],
      },
      spacing: {
        "18": "4.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
