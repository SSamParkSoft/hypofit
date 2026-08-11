import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const browserGlobals = {
  ...globals.browser,
  ...globals.es2024,
};

const nodeGlobals = {
  ...globals.node,
  ...globals.es2024,
};

export default [
  {
    ignores: ["coverage/**", "dist/**", "node_modules/**", "public/**"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: browserGlobals,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ["eslint.config.mjs", "vite.config.ts"],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
];
