import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated files:
    "coverage/**",
  ]),
  {
    plugins: { sonarjs },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react/no-unescaped-entities": "error",
      "no-duplicate-imports": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",

      // DRY (Don't Repeat Yourself) Rules
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-identical-expressions": "warn",
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
      "sonarjs/no-duplicated-branches": "warn",

      // SRP (Single Responsibility Principle) Rules
      "max-params": ["warn", 4],
      complexity: ["warn", 10],
      "max-depth": ["warn", 4],
      "max-statements": ["warn", 20],

      "max-lines": [
        "error",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      // "max-lines-per-function": ["error", { max: 75, skipBlankLines: true, skipComments: true }],
    },
  },
]);

export default eslintConfig;
