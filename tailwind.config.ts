import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        asu: {
          maroon: "#8C1D40",
          "maroon-dark": "#6B1530",
          gold: "#FFC627",
          "gold-light": "#FFD966",
        },
        rumi: {
          cream: "#FFF8F0",
          ink: "#1A1215",
          muted: "#6B5B60",
          sand: "#F5E6D3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(255,198,39,0.25), transparent), radial-gradient(ellipse 70% 50% at 90% 10%, rgba(140,29,64,0.15), transparent), linear-gradient(165deg, #FFF8F0 0%, #F5E6D3 45%, #FFE8C8 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
