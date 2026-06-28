/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdcff",
          300: "#8ec6ff",
          400: "#59a5ff",
          500: "#3380fc",
          600: "#1f60f1",
          700: "#194ade",
          800: "#1b3eb4",
          900: "#1c388e",
        },
        ink: {
          900: "#0b1220",
          800: "#111a2e",
          700: "#1a2540",
          600: "#26324f",
          500: "#3a496b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
