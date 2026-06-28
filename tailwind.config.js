/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: violeta eléctrico (#7C5CFC)
        brand: {
          50: "#f2eeff",
          100: "#e6deff",
          200: "#cdbdfe",
          300: "#b39bfd",
          400: "#997afb",
          500: "#7c5cfc",
          600: "#6a45f0",
          700: "#5733d6",
          800: "#4527ac",
          900: "#351f83",
        },
        // Acento: cian (#22D3EE)
        accent: {
          DEFAULT: "#22d3ee",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        // Tokens semánticos (cambian según modo claro/oscuro vía variables CSS)
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        surface2: "rgb(var(--c-surface-2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        fg: "rgb(var(--c-fg) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,17,23,0.06), 0 1px 2px rgba(15,17,23,0.04)",
        glow: "0 0 0 1px rgba(124,92,252,0.25), 0 8px 30px -8px rgba(124,92,252,0.5)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #7c5cfc 0%, #22d3ee 100%)",
      },
    },
  },
  plugins: [],
};
