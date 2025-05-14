import type { PackageConfig } from '../types/PackageConfig.js';

/**
 * Configuration for packages whose TypeScript declarations should be processed by TypeDoc
 *
 * The keys are the package keys which will be used as:
 * - The directory name for the generated docs, e.g. `docs/en/api/<package-key>`,
 * - The name passed to typedoc as `--name` option.
 */
export const PACKAGES: Record<string, PackageConfig> = {
  'reactlynx-testing-library': {
    out: 'api/reactlynx-testing-library',
    tsconfig: 'scripts/typedoc/tsconfigs/reactlynx-testing-library.json',
    en: {
      entryPoints: [
        'node_modules/@lynx-js/react/testing-library/types/index.d.ts',
      ],
    },
    zh: {
      entryPoints: [
        'node_modules/@lynx-js/react/testing-library/types/index.d.ts',
      ],
    },
  },
  'lynx-testing-environment': {
    out: 'api/lynx-testing-environment',
    tsconfig: 'scripts/typedoc/tsconfigs/lynx-testing-environment.json',
    en: {
      entryPoints: [
        'node_modules/@lynx-js/testing-environment/dist/index.d.ts',
      ],
    },
    zh: {
      entryPoints: [
        'node_modules/@lynx-js/testing-environment/dist/index.d.ts',
      ],
    },
  },
};
