import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/coverage/**", "node_modules/**", "apps/admin-site/**"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  },
  {
    files: ["apps/admin-site/**/*.js"],
    languageOptions: {
      globals: {
        AbortController: "readonly",
        DOMException: "readonly",
        URL: "readonly",
        document: "readonly",
        fetch: "readonly",
        window: "readonly"
      }
    }
  },
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
);
