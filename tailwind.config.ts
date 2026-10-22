import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-muted": "var(--bg-muted)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          contrast: "var(--accent-contrast)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        asu: {
          maroon: "#8C1D40",
          gold: "#FFC627",
        },
        // legacy aliases used during migration
        rumi: {
          cream: "var(--bg)",
          ink: "var(--ink)",
          muted: "var(--ink-muted)",
          sand: "var(--bg-muted)",
        },
      },
      fontFamily: {
        // Inter — headings, nav, buttons, UI chrome, wordmark
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        brand: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        ui: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        // DM Sans — body paragraphs / reading text
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
        body: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        brand: "var(--brand-tracking)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        elevation1: "var(--elevation-1)",
        elevation2: "var(--elevation-2)",
        elevation3: "var(--elevation-3)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      maxWidth: {
        content: "1120px",
      },
      spacing: {
        sidebar: "240px",
        "bottom-nav": "64px",
      },
      backgroundImage: {
        "hero-atmosphere":
          "radial-gradient(ellipse 90% 70% at 10% 0%, rgba(140,29,64,0.08), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 20%, rgba(237,230,220,0.9), transparent), linear-gradient(180deg, var(--bg) 0%, var(--bg-muted) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
