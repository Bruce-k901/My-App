// eslint.config.mjs

import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  // Main app code
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "*.d.ts", "next-env.d.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        React: true,
        JSX: true,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@next/next": nextPlugin,
    },
    rules: {
      "no-unused-vars": "warn",
      "@next/next/no-img-element": "off",
    },
  },

  // Config files (ignored)
  {
    ignores: [
      "eslint.config.mjs",
      "postcss.config.mjs",
      "tailwind.config.{js,cjs,mjs}",
      "husky/**",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      "*.config.ts",
    ],
  },

  // Tests
  {
    files: ["**/__tests__/**/*.{ts,tsx,js,jsx}", "**/*.{test,spec}.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "no-unused-expressions": "off",
    },
  },

  // Scripts
  {
    files: ["scripts/**/*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // Prettier LAST (disables conflicting formatting rules)
  eslintConfigPrettier,
];
