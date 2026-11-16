import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const COMPONENT_TYPE_MESSAGE =
  'Define props with an explicit type or interface and annotate the function parameters directly.';

// React source lint for site-owned UI sources. Type correctness is enforced by
// `pnpm run typecheck`; this config only covers Hooks correctness and the
// component authoring rules documented in `src/README.md` and `AGENTS.md`.
export default defineConfig({
  files: ['src/**/*.{ts,tsx}', 'theme/**/*.{ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser,
  },
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    'react-hooks': reactHooks,
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    // `no-restricted-types` matches the written type name, so the unqualified
    // names cover direct imports such as `import type { FC } from 'react'`.
    // A renamed import, e.g. `FC as C`, stays undetected; banning the import
    // itself would also reject the legitimate `import * as React` namespace
    // form used by the vendored `src/components/ui` primitives.
    '@typescript-eslint/no-restricted-types': [
      'error',
      {
        types: {
          'React.FC': { message: COMPONENT_TYPE_MESSAGE },
          'React.FunctionComponent': { message: COMPONENT_TYPE_MESSAGE },
          FC: { message: COMPONENT_TYPE_MESSAGE },
          FunctionComponent: { message: COMPONENT_TYPE_MESSAGE },
        },
      },
    ],
  },
});
