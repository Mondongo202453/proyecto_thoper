/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF9F1C",
          foreground: "#FFFFFF",
        },
        background: "#0A0A0A",
        surface: "#1E1E1E",
        accent: "#F97316",
      },
      fontFamily: {
        sans: ["Satoshi", "sans-serif"],
        display: ["Clash Display", "sans-serif"],
      },
    },
  },
  plugins: [],
}
