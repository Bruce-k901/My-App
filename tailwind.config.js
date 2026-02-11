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
        // Brand accent colours
        "brand-primary": "#544349",   // Cocoa Dust
        "brand-cta": "#D37E91",       // Blush
        "opsly-dark": "#0b0d13",
        "opsly-light": "#e5e7eb",
        "opsly-gray": "#64748b",
        // Legacy aliases (mapped to new brand)
        magenta: {
          400: "#D37E91",
          500: "#D37E91",
          600: "#b0607a",
        },
        blue: {
          400: "#60a5fa",
          500: "#2563eb",
        },
        neutral: {
          900: "#171717",
          950: "#0b0d13",
        },
        // Active module colours (set by .module-* class on layout wrapper)
        'module-fg': 'rgb(var(--module-fg) / <alpha-value>)',
        'module-bg-tint': 'rgb(var(--module-bg-tint) / <alpha-value>)',
        // Module colors (driven by CSS variables in globals.css)
        checkly: 'rgb(var(--module-checkly) / <alpha-value>)',
        stockly: 'rgb(var(--module-stockly) / <alpha-value>)',
        teamly: 'rgb(var(--module-teamly) / <alpha-value>)',
        planly: 'rgb(var(--module-planly) / <alpha-value>)',
        assetly: 'rgb(var(--module-assetly) / <alpha-value>)',
        msgly: 'rgb(var(--module-msgly) / <alpha-value>)',
        forecastly: 'rgb(var(--module-forecastly) / <alpha-value>)',
        // Module dark variants (for text on light backgrounds)
        'checkly-dark': 'rgb(var(--module-checkly-dark) / <alpha-value>)',
        'stockly-dark': 'rgb(var(--module-stockly-dark) / <alpha-value>)',
        'teamly-dark': 'rgb(var(--module-teamly-dark) / <alpha-value>)',
        'planly-dark': 'rgb(var(--module-planly-dark) / <alpha-value>)',
        'assetly-dark': 'rgb(var(--module-assetly-dark) / <alpha-value>)',
        'msgly-dark': 'rgb(var(--module-msgly-dark) / <alpha-value>)',
        // Sidebar tints (dark theme)
        'sidebar-checkly': 'rgb(var(--sidebar-checkly) / <alpha-value>)',
        'sidebar-stockly': 'rgb(var(--sidebar-stockly) / <alpha-value>)',
        'sidebar-teamly': 'rgb(var(--sidebar-teamly) / <alpha-value>)',
        'sidebar-planly': 'rgb(var(--sidebar-planly) / <alpha-value>)',
        'sidebar-assetly': 'rgb(var(--sidebar-assetly) / <alpha-value>)',
        'sidebar-msgly': 'rgb(var(--sidebar-msgly) / <alpha-value>)',
        // Sidebar tints (light theme)
        'sidebar-checkly-light': 'rgb(var(--sidebar-checkly-light) / <alpha-value>)',
        'sidebar-stockly-light': 'rgb(var(--sidebar-stockly-light) / <alpha-value>)',
        'sidebar-teamly-light': 'rgb(var(--sidebar-teamly-light) / <alpha-value>)',
        'sidebar-planly-light': 'rgb(var(--sidebar-planly-light) / <alpha-value>)',
        'sidebar-assetly-light': 'rgb(var(--sidebar-assetly-light) / <alpha-value>)',
        'sidebar-msgly-light': 'rgb(var(--sidebar-msgly-light) / <alpha-value>)',
        // Mobile-specific colors
        'mobile-primary': '#D37E91',
        'mobile-bg': '#0D0D0F',
        'mobile-bg-secondary': '#1A1A1F',
        'mobile-bg-elevated': '#252530',
        // Consistent card styling tokens
        background: "#111827",
        border: "#1F2937",
        accent: "#D37E91",
      },
      boxShadow: {
        glow: "0 0 16px rgba(211,126,145,0.6)",
        // Brand glow shadows
        magenta: "0 0 0 1px rgba(211,126,145,0.55), 0 0 12px rgba(211,126,145,0.35)",
        magentaSm: "0 0 8px #D37E91",
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
        // Mobile animations
        mobileSlideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        mobilePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        mobileScale: {
          "0%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        mobileShake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        dropdownFade: "dropdownFade 0.3s ease-out forwards",
        "fade-in": "fadeIn 0.6s ease-in-out",
        "fade-in-up": "fadeInUp 0.6s ease-in-out",
        // Mobile animations
        "mobile-slide-up": "mobileSlideUp 0.3s ease-out forwards",
        "mobile-pulse": "mobilePulse 2s ease-in-out infinite",
        "mobile-scale": "mobileScale 0.2s ease-out forwards",
        "mobile-shake": "mobileShake 0.3s ease-in-out",
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
};
