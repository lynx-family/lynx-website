import manifest from '@lynx-js/lynx-stack-docs/manifest.json';

const routes = manifest.sections.map((section) => section.route);

/**
 * Whether a page is one of the API reference pages generated from the TSDoc of
 * lynx-stack, by its path under the docs root: `en/api/react/index.mdx`.
 */
export function isGeneratedApiPage(relativePath: string): boolean {
  const path = relativePath.replace(/\\/g, '/');
  const pathInLocale = path.slice(path.indexOf('/') + 1);
  return routes.some((route) => pathInLocale.startsWith(`${route}/`));
}
