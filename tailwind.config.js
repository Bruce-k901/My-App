/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "Century Gothic", "system-ui", "sans-serif"],
      },
      colors: {
        // Opsly brand colors
        opsly: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Primary Opsly brand color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // App theme aliases for marketing pages (keeping for backward compatibility)
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
        // Module colors
        checkly: '#ec4899',    // Rose (muted)
        stockly: '#10b981',     // Emerald
        teamly: '#3b82f6',      // Blue
        planly: '#8b5cf6',      // Purple
        assetly: '#f59e0b',     // Amber
        msgly: '#06b6d4',       // Cyan
        // Consistent card styling tokens
        background: "#111827",
        border: "#1F2937",
        accent: "#EC4899",
      },
      boxShadow: {
        glow: "0 0 16px rgba(236,72,153,0.6)",
        // Consistent magenta glow shadows
        magenta: "0 0 0 1px rgba(236,72,153,0.55), 0 0 12px rgba(236,72,153,0.35)",
        magentaSm: "0 0 8px #ec4899",
      },
      keyframes: {
        dropdownFade: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        dropdownFade: "dropdownFade 0.3s ease-out forwards",
        "fade-in": "fadeIn 0.6s ease-in-out",
        "fade-in-up": "fadeInUp 0.6s ease-in-out",
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
};
