// eslint.config.mjs

import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";
import jsxA11y from "eslint-plugin-jsx-a11y";

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
      "react-hooks": reactHooks,
      "react": react,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
      "@next/next/no-img-element": "off",
      // Enforce React Hooks best practices and avoid missing deps warnings
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Prevent nested interactive elements
      "react/no-unknown-property": "error",
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
