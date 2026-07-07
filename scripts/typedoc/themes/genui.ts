/**
 * Customization for the @lynx-js/genui docs.
 *
 * Wraps the default customize() and:
 *
 *   - Renames each entry-point module from its source path (a2ui/src,
 *     openui/src/core, ...) to its public subpath under @lynx-js/genui
 *     (a2ui, openui, ...). The /src segment is an accident of pointing
 *     TypeDoc at source for the JSDoc; it's noise to readers.
 *
 *   - Drops reflections whose declarations are public TS exports but don't
 *     belong on this page:
 *       - the 20 A2UI catalog component primitives (Button, Card, ...,
 *         TextField) re-exported from @lynx-js/genui/a2ui; their
 *         per-component prop reference lives elsewhere.
 *       - the TypeDoc* interface mirrors re-exported from
 *         @lynx-js/genui/a2ui-catalog-extractor; consumers wiring up
 *         `extractCatalog*FromTypeDocJson` may type their input with them,
 *         but surfacing them as Interfaces dominates the index for no
 *         reader benefit.
 */

import { Converter, ReflectionKind } from 'typedoc';
import type { MarkdownApplication } from 'typedoc-plugin-markdown';

import { customize as defaultCustomize } from './default.js';

const HIDDEN_A2UI_CATALOG_COMPONENTS = new Set([
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
]);

const HIDDEN_CATALOG_EXTRACTOR_TYPEDOC_MIRRORS = new Set([
  'TypeDocComment',
  'TypeDocCommentDisplayPart',
  'TypeDocCommentTag',
  'TypeDocProject',
  'TypeDocReflection',
  'TypeDocSignature',
  'TypeDocSource',
  'TypeDocType',
]);

const MODULE_RENAMES: Record<string, string> = {
  'a2ui/src': 'a2ui',
  'openui/src/core': 'openui',
  'a2ui-prompt/src': 'a2ui-prompt',
  'a2ui-catalog-extractor/src': 'a2ui-catalog-extractor',
};

export function customize(app: MarkdownApplication, outputDir: string) {
  defaultCustomize(app, outputDir);

  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    // Rename module reflections first so the hide filter below can match
    // on the new names.
    for (const refl of context.project.children ?? []) {
      const renamed = MODULE_RENAMES[refl.name];
      if (renamed) refl.name = renamed;
    }

    const all = context.project.getReflectionsByKind(ReflectionKind.All);
    for (const refl of [...all]) {
      const parentName = refl.parent?.name ?? '';
      if (
        parentName === 'a2ui' &&
        HIDDEN_A2UI_CATALOG_COMPONENTS.has(refl.name)
      ) {
        context.project.removeReflection(refl);
        continue;
      }
      if (
        parentName === 'a2ui-catalog-extractor' &&
        HIDDEN_CATALOG_EXTRACTOR_TYPEDOC_MIRRORS.has(refl.name)
      ) {
        context.project.removeReflection(refl);
      }
    }
  });
}
