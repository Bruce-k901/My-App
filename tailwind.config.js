/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // App theme aliases for marketing pages
        "checkly-blue": "#2563eb",
        "checkly-magenta": "#ec4899",
        "checkly-dark": "#0b0d13",
        "checkly-light": "#e5e7eb",
        "checkly-gray": "#64748b",
        magenta: {
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
        },
        blue: {
          400: "#60a5fa",
          500: "#2563eb",
        },
        neutral: {
          900: "#171717",
          950: "#0b0d13",
        },
      },
      boxShadow: {
        glow: "0 0 16px rgba(236,72,153,0.6)",
      },
      keyframes: {
        dropdownFade: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        dropdownFade: "dropdownFade 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
