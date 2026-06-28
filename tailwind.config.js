/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: McLaren Papaya Orange (#FF8000)
        brand: {
          50: "#fff3e6",
          100: "#ffe2c2",
          200: "#ffcb8f",
          300: "#ffb35c",
          400: "#ff9c2e",
          500: "#ff8000",
          600: "#e67200",
          700: "#bf5e00",
          800: "#994b00",
          900: "#7a3d00",
        },
        // Acento: ámbar cálido (para diferenciar series/datos)
        accent: {
          DEFAULT: "#ffb020",
          400: "#ffb020",
          500: "#f59e0b",
          600: "#d97706",
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
        card: "0 1px 3px rgba(10,10,12,0.08), 0 1px 2px rgba(10,10,12,0.05)",
        glow: "0 0 0 1px rgba(255,128,0,0.25), 0 8px 30px -8px rgba(255,128,0,0.5)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #FF8000 0%, #FFAE36 100%)",
      },
    },
  },
  plugins: [],
};
