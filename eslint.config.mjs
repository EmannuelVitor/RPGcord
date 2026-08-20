import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/** O projeto nao tinha configuracao de ESLint, entao `pnpm lint` abria um prompt e travava. */
const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // As imagens vem do proxy interno /api/drive-image ou de data URIs, entao
      // next/image nao teria o que otimizar e exigiria remotePatterns a toa.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
