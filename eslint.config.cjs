const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Ignore patterns
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/.env*",
    ],
  },

  // Base configuration for JavaScript files
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ...js.configs.recommended,
  },

  // Next.js specific configuration
  ...compat.extends("next/core-web-vitals"),

  // TypeScript configurations
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  ...tseslint.configs.recommendedTypeChecked.map(config => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  ...tseslint.configs.stylistic.map(config => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map(config => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),

  // Custom TypeScript rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Custom rules from your original config
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          "prefer": "type-imports",
          "fixStyle": "inline-type-imports"
        }
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          "checksVoidReturn": {
            "attributes": false
          }
        }
      ],
      // Additional rules to handle common Next.js/project patterns
      "@typescript-eslint/triple-slash-reference": "off", // Allow Next.js type references
      "@typescript-eslint/ban-tslint-comment": "off", // Allow legacy tslint comments
      "@typescript-eslint/no-require-imports": "off", // Allow require() in config files
    },
  },
];

module.exports = config;
