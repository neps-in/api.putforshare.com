/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--e-global-color-primary)",
        secondary: "var(--e-global-color-secondary)",
        text: "var(--e-global-color-text)",
        accent: "var(--e-global-color-accent)",
        deep: "var(--e-global-color-3fdf10c)",
        muted: "var(--e-global-color-0038742)",
        dark: "var(--e-global-color-e36957e)",
        soft: "var(--e-global-color-de602a8)",
        sun: "var(--e-global-color-1a519d7)",
        peach: "var(--e-global-color-4990f41)",
        mist: "var(--e-global-color-d9e3bd8)",
        magenta: "var(--e-global-color-d491196)",
        pink: "var(--e-global-color-898a5ca)"
      },
      keyframes: {
        "cart-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.18)" }
        }
      },
      animation: {
        "cart-pulse": "cart-pulse 0.45s ease-out"
      }
    }
  },
  plugins: []
};
