import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Постепенный отказ от any: warn → видим оставшиеся места, build не ломаем.
      // Цель — со временем перевести в "error" (см. docs/REMEDIATION.md, п.7).
      "@typescript-eslint/no-explicit-any": "warn",
      // setState в useEffect — стандартный паттерн для fetch-on-mount
      "react-hooks/set-state-in-effect": "off",
      // react-hook-form watch() — известное ограничение, не ошибка
      "react-hooks/incompatible-library": "warn",
      // Неиспользуемые переменные — предупреждение, не ошибка
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      // Зависимости хуков — предупреждение
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
