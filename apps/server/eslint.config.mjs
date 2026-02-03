import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "coverage/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-restricted-imports": ["warn", {
        "patterns": [{
          "group": ["**/db/client"],
          "message": "Use dependency-injected prisma client instead of global db"
        }]
      }],
    },
  }
);
