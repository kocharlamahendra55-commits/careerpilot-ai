import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Fira Code", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Custom brand colors
        brand: {
          purple: "#7C3AED",
          "purple-light": "#A78BFA",
          "purple-dark": "#5B21B6",
          cyan: "#06B6D4",
          "cyan-light": "#67E8F9",
          teal: "#14B8A6",
          pink: "#EC4899",
          indigo: "#6366F1",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "aurora": "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #6B8DD6 50%, #8E37D7 75%, #2575fc 100%)",
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.3), transparent)",
        "card-glow": "radial-gradient(circle at top right, rgba(124,58,237,0.15), transparent 70%)",
      },
      boxShadow: {
        "glow-purple": "0 0 40px rgba(124,58,237,0.4)",
        "glow-cyan": "0 0 40px rgba(6,182,212,0.4)",
        "glow-sm": "0 0 15px rgba(124,58,237,0.25)",
        "glass": "0 8px 32px rgba(0,0,0,0.37)",
        "card": "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        "button": "0 0 0 1px rgba(124,58,237,0.5), 0 4px 16px rgba(124,58,237,0.3)",
      },
      animation: {
        "aurora": "aurora 8s ease infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "spin-slow": "spin 8s linear infinite",
        "counter": "counter 2s ease-out forwards",
        "shimmer": "shimmer 2s linear infinite",
        "gradient-x": "gradient-x 3s ease infinite",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(124,58,237,0.4)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 40px rgba(124,58,237,0.7)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
