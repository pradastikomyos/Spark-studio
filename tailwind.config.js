/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#D32F2F",
        "primary-dark": "#B71C1C",
        "background-light": "#FFFFFF",
        "background-dark": "#0A0A0A",
        "surface-light": "#F8F8F8",
        "surface-dark": "#121212",
        "surface-darker": "#0f0f12",
        "text-light": "#171717",
        "text-dark": "#EDEDED",
        "subtext-light": "#525252",
        "subtext-dark": "#A3A3A3",
        "accent-purple": "#8b5cf6",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      letterSpacing: {
        widest: '0.15em',
      },
    },
  },
  plugins: [],
}
