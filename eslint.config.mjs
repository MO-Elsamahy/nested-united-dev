import nextConfig from "eslint-config-next";
import nextTypescriptConfig from "eslint-config-next/typescript";

// eslint-config-next v16+ exports native flat config arrays.
// Find the @typescript-eslint plugin instance from the typescript config
// so we can reuse it in our custom rules block.
const tsConfigWithPlugin = nextTypescriptConfig.find(
  (c) => c.plugins && "@typescript-eslint" in c.plugins
);
const tsPlugin = tsConfigWithPlugin?.plugins?.["@typescript-eslint"];

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "out/**", "build/**", "scratch/**", "electron/dist/**", "dist-electron/**", "tmp/**", "db_check_v2.js", "check_user.ts", "proxy.ts"],
  },
  ...nextConfig,
  ...nextTypescriptConfig,
  {
    ...(tsPlugin ? { plugins: { "@typescript-eslint": tsPlugin } } : {}),
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["tools/**/*.js", "tools/**/*.mjs", "electron/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
