import * as fs from 'node:fs';

import { customize as genuiCustomize } from '../themes/genui.js';
import type { PackageConfig } from '../types/PackageConfig.js';

const GENUI_PACKAGE_ROOT = 'node_modules/@lynx-js/genui';

// One entry point per public subpath of @lynx-js/genui. Each becomes its own
// TypeDoc module ("@lynx-js/genui/a2ui", ".../openui", ...), so the index
// page surfaces the four public subpackages instead of a wall of internals.
// When the lynx-stack source overlay is in place we prefer .ts (richer TSDoc);
// otherwise we fall back to the published .d.ts ship.
function genuiEntryPoints(): string[] {
  const hasSourceOverlay = fs.existsSync(
    `${GENUI_PACKAGE_ROOT}/a2ui/src/index.ts`,
  );

  if (!hasSourceOverlay) {
    return [
      `${GENUI_PACKAGE_ROOT}/a2ui/dist/index.d.ts`,
      `${GENUI_PACKAGE_ROOT}/openui/dist/core/index.d.ts`,
      `${GENUI_PACKAGE_ROOT}/a2ui-prompt/dist/index.d.ts`,
      `${GENUI_PACKAGE_ROOT}/a2ui-catalog-extractor/dist/index.d.ts`,
    ];
  }

  return [
    `${GENUI_PACKAGE_ROOT}/a2ui/src/index.ts`,
    `${GENUI_PACKAGE_ROOT}/openui/src/core/index.ts`,
    `${GENUI_PACKAGE_ROOT}/a2ui-prompt/src/index.ts`,
    `${GENUI_PACKAGE_ROOT}/a2ui-catalog-extractor/src/index.ts`,
  ];
}

/**
 * Configuration for packages whose TypeScript declarations should be processed by TypeDoc
 *
 * The keys are the package keys which will be used as:
 * - The directory name for the generated docs, e.g. `docs/en/api/<package-key>`,
 * - The name passed to typedoc as `--name` option.
 */
export const PACKAGES: Record<string, PackageConfig> = {
  genui: {
    out: 'api/genui',
    tsconfig: 'scripts/typedoc/tsconfigs/genui.json',
    customize: genuiCustomize,
    shared: {
      entryPoints: genuiEntryPoints(),
      options: {
        excludeInternal: true,
        readme: 'none',
        skipErrorChecking: true,
        // Nest output by module/kind. Each public subpackage gets its
        // own folder under docs/{en,zh}/api/genui/<module>/, with members
        // grouped under Function/, Interface/, Class/, TypeAlias/,
        // Variable/. Easier to skim than a flat 100-file directory.
        flattenOutputFiles: false,
      },
    },
  },
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
