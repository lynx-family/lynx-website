import * as fs from 'node:fs';

import type { PackageConfig } from '../types/PackageConfig.js';

const GENUI_PACKAGE_ROOT = 'node_modules/@lynx-js/genui';
const GENUI_SOURCE_ROOT = `${GENUI_PACKAGE_ROOT}`;
const GENUI_DIST_ROOT = `${GENUI_PACKAGE_ROOT}`;

const GENUI_A2UI_COMPONENTS = [
  'Button',
  'Card',
  'CheckBox',
  'ChoicePicker',
  'Column',
  'DateTimeInput',
  'Divider',
  'Icon',
  'Image',
  'LineChart',
  'List',
  'Loading',
  'Modal',
  'PieChart',
  'RadioGroup',
  'Row',
  'Slider',
  'Tabs',
  'Text',
  'TextField',
];

function genuiEntryPoints(): string[] {
  const hasSourceOverlay = fs.existsSync(
    `${GENUI_SOURCE_ROOT}/a2ui/src/react/A2UI.tsx`,
  );

  if (!hasSourceOverlay) {
    return [
      `${GENUI_DIST_ROOT}/dist/index.d.ts`,
      `${GENUI_DIST_ROOT}/a2ui/dist/index.d.ts`,
      `${GENUI_DIST_ROOT}/a2ui-prompt/dist/index.d.ts`,
      `${GENUI_DIST_ROOT}/a2ui-catalog-extractor/dist/index.d.ts`,
      `${GENUI_DIST_ROOT}/openui/dist/core/index.d.ts`,
    ];
  }

  return [
    `${GENUI_SOURCE_ROOT}/index.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/react/A2UI.tsx`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/react/A2UIRenderer.tsx`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/react/useAction.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/react/useChecks.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/react/useDataBinding.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/MessageStore.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/MessageProcessor.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/Resource.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/SignalStore.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/types.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/FunctionRegistry.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/payloadNormalizer.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/resolveFunctionCall.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/resolveDynamic.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/store/utils.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui/src/catalog/defineCatalog.ts`,
    ...GENUI_A2UI_COMPONENTS.map(
      (component) =>
        `${GENUI_SOURCE_ROOT}/a2ui/src/catalog/${component}/index.tsx`,
    ),
    `${GENUI_SOURCE_ROOT}/a2ui/src/functions/index.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui-catalog-extractor/src/index.ts`,
    `${GENUI_SOURCE_ROOT}/a2ui-prompt/src/index.ts`,
    `${GENUI_SOURCE_ROOT}/server/agent/a2ui-catalog.ts`,
    `${GENUI_SOURCE_ROOT}/server/agent/a2ui-examples.ts`,
    `${GENUI_SOURCE_ROOT}/server/agent/a2ui-prompt.ts`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/createLibrary.tsx`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/library.tsx`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/context.tsx`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/renderer.tsx`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/runtime/reactive.ts`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/hooks/useFormValidation.ts`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/hooks/useOpenUIState.ts`,
    `${GENUI_SOURCE_ROOT}/openui/src/core/hooks/useStateField.ts`,
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
    shared: {
      entryPoints: genuiEntryPoints(),
      options: {
        excludeInternal: true,
        readme: 'none',
        skipErrorChecking: true,
        sort: ['source-order'],
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
