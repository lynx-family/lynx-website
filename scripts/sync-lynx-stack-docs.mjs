// Synchronize the API reference sections that lynx-stack owns into this site.
//
// The source manifest is the authority for which generated sections exist,
// where each locale's content lives, and which package pages appear in the
// sidebar. By default the source is the installed @lynx-js/lynx-stack-docs
// package; an explicit source may point at the docs/ directory of a built
// lynx-stack checkout.
//
// The sync:
// 1. verifies that the site's top-level API sidebar declares every section;
// 2. replaces each generated section with its manifest-declared content;
// 3. rebuilds the package sidebar from manifest.shownPackages;
// 4. verifies that generated directories are ignored by Git; and
// 5. makes lynxjs.org links site-relative only when the target exists locally.
//
// Generated sections are replaced wholesale, so change their sources in
// lynx-stack rather than editing the copied pages here. Theme-owned route
// classification and site-owned API overlays are separate concerns; the
// sync:lynx-stack-docs package script applies overlays after this script.
//
// Usage: node scripts/sync-lynx-stack-docs.mjs [source]
// Finalize after overlays: node scripts/sync-lynx-stack-docs.mjs --prune [docs-root] [manifest.json]

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBSITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(WEBSITE, 'docs');
const LYNXJS_LINK = /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm;

/** Resolve the default source relative to this installed lynx-doc package. */
function packageSource() {
  const require = createRequire(import.meta.url);
  return dirname(require.resolve('@lynx-js/lynx-stack-docs/manifest.json'));
}

/**
 * Whether a lynxjs.org path resolves to a page published by this site.
 * Unprefixed links target English; /zh/ links retain their locale.
 */
function pageExists(url) {
  let path = url
    .split('#')[0]
    .replace(/\.(html|mdx?)$/, '')
    .replace(/\/$/, '');
  if (!path.startsWith('/zh/')) path = `/en${path}`;
  const base = join(DOCS, path.slice(1));
  return ['.md', '.mdx', '/index.md', '/index.mdx'].some((ext) =>
    existsSync(base + ext),
  );
}

/** List Markdown pages under one generated section. */
function markdownFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .map((name) => join(dir, name))
    .filter((file) => /\.mdx?$/.test(file) && statSync(file).isFile());
}

export function syncLynxStackDocs(input = packageSource()) {
  const source = resolve(input);

  const manifestFile = join(source, 'manifest.json');
  if (!existsSync(manifestFile)) {
    throw new Error(
      `${manifestFile} does not exist. Pass the docs/ directory of a built lynx-stack checkout, or install @lynx-js/lynx-stack-docs.`,
    );
  }
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

  // Top-level API navigation is site-owned. Require it to acknowledge every
  // generated section before copying, so an upstream addition or rename cannot
  // silently produce pages with no sidebar entry.
  const LOCALES = [
    ...new Set(manifest.sections.flatMap((s) => Object.keys(s.content))),
  ];
  for (const locale of LOCALES) {
    const meta = JSON.parse(
      readFileSync(join(DOCS, locale, 'api/_meta.json'), 'utf8'),
    );
    const listed = new Set(meta.map((item) => item.name));
    for (const { route } of manifest.sections) {
      const name = route.replace(/^api\//, '');
      if (!listed.has(name)) {
        throw new Error(
          `docs/${locale}/api/_meta.json does not list ${name}; the pages would sync without a sidebar entry.`,
        );
      }
    }
  }

  // Section directories are generated output. Replace them instead of merging so
  // pages removed upstream do not survive locally as stale routes.
  const synced = [];
  for (const section of manifest.sections) {
    for (const [locale, content] of Object.entries(section.content)) {
      const to = join(DOCS, locale, section.route);
      rmSync(to, { recursive: true, force: true });
      cpSync(join(source, content), to, { recursive: true });
      synced.push(to);
      console.log(`synced ${locale}/${section.route}`);
    }
  }

  // Copy every page here so consumers can apply their overlays before pruning.
  // The sidebar lists only manifest.shownPackages, preserving its order and groups.
  // A single group needs no header because the enclosing section already names it.
  const metaFile = (locale) => join(DOCS, locale, 'api/packages/_meta.json');
  for (const locale of LOCALES) {
    const items = new Map(
      JSON.parse(readFileSync(metaFile(locale), 'utf8'))
        .filter((item) => item.label)
        .map((item) => [item.label, item]),
    );
    const meta = [];
    for (const { group, packages } of manifest.shownPackages) {
      if (manifest.shownPackages.length > 1) {
        meta.push({ type: 'section-header', label: group });
      }
      for (const name of packages) {
        if (!items.has(name)) {
          throw new Error(`${name} of the manifest has no page`);
        }
        meta.push(items.get(name));
      }
    }
    writeFileSync(metaFile(locale), `${JSON.stringify(meta, null, 2)}\n`);
  }

  // Generated sections must stay out of version control. Within those sections,
  // localize only lynxjs.org links whose target is actually present in this site;
  // leave all other absolute links intact instead of creating broken local URLs.
  for (const dir of synced) {
    try {
      execFileSync('git', ['check-ignore', '--quiet', dir], { cwd: WEBSITE });
    } catch {
      throw new Error(
        `${dir} is not ignored by git; generated pages must not be committed.`,
      );
    }
    for (const file of markdownFiles(dir)) {
      const text = readFileSync(file, 'utf8');
      const localized = text.replace(LYNXJS_LINK, (match, prefix, path) =>
        pageExists(path) ? prefix + path : match,
      );
      if (localized !== text) writeFileSync(file, localized);
    }
  }
}

function pagesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

// Include definitions, JSX links, and literal MDX expressions/imports. Code
// examples are not links. Unknown computed expressions are never executed.
let parseDocumentation;
export async function pageReferences(file, text) {
  parseDocumentation ??= (await import('./ci/documentation-parser.mjs'))
    .parseDocumentation;
  const references = new Set();
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.url === 'string') references.add(node.url);
    if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
      references.add(node.quasis[0].value.cooked);
    }
    if (node.type === 'Literal' && typeof node.value === 'string') {
      references.add(node.value);
    }
    if (node.type === 'mdxJsxAttribute' && typeof node.value === 'string') {
      references.add(node.value);
    }
    if (node.type === 'html') {
      for (const match of node.value.matchAll(
        /(?:href|src)\s*=\s*["']([^"']+)["']/g,
      )) {
        references.add(match[1]);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (['position', 'loc'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  walk(parseDocumentation(file, text));
  return [...references];
}

export async function prunePackagePages({ docs, manifest, sharedDocs }) {
  docs = resolve(docs);
  const pages = new Set(pagesUnder(docs));
  const shownNames = new Set(
    manifest.shownPackages.flatMap((group) => group.packages),
  );
  const shownRoutes = manifest.packages
    .filter((pkg) => shownNames.has(pkg.name))
    .map((pkg) => pkg.route);
  const key = (file) => relative(docs, file).split(sep).join('/');
  const isPackage = (file) => /^[^/]+\/api\/packages\//.test(key(file));
  const isShown = (file) => {
    const route = key(file)
      .replace(/^[^/]+\//, '')
      .replace(/\.mdx?$/, '');
    return shownRoutes.some(
      (shown) => route === shown || route.startsWith(`${shown}/`),
    );
  };
  const kept = new Set(
    [...pages].filter((file) => !isPackage(file) || isShown(file)),
  );
  const queue = [
    ...kept,
    ...pagesUnder(sharedDocs ?? join(dirname(docs), 'sharedDocs')),
  ];
  const edges = [];
  function target(file, reference) {
    let path = reference.split(/[?#]/)[0];
    if (!path) return;
    try {
      path = decodeURIComponent(path);
    } catch {
      return;
    }
    if (/^https?:\/\//.test(path)) path = new URL(path).pathname;
    else if (/^[a-z][\w+.-]*:|^\/\//i.test(path)) return;
    let bases;
    if (path.startsWith('/')) {
      path = path.replace(/^\/next(?=\/)/, '');
      // Rspress localizes root-relative links to the current language. Shared
      // documents can be rendered in either language, so retain both targets.
      bases = /^\/(?:en|zh)\//.test(path)
        ? [resolve(docs, `.${path}`)]
        : ['en', 'zh'].map((locale) => resolve(docs, `${locale}${path}`));
    } else bases = [resolve(dirname(file), path)];
    return bases.flatMap((base) => {
      base = base.replace(/\.(?:html|mdx?)$/, '').replace(/\/$/, '');
      return [
        base + '.md',
        base + '.mdx',
        join(base, 'index.md'),
        join(base, 'index.mdx'),
      ].filter((candidate) => pages.has(candidate));
    });
  }
  for (let index = 0; index < queue.length; index++) {
    const file = queue[index];
    for (const reference of await pageReferences(
      file,
      readFileSync(file, 'utf8'),
    )) {
      for (const to of target(file, reference) ?? []) {
        edges.push([file, to]);
        // The language switcher links to the same route in the other locale.
        // Keep and traverse those pages too, even without a source-text link.
        const route = key(to).replace(/^[^/]+\//, '');
        for (const locale of ['en', 'zh']) {
          const localized = resolve(docs, locale, route);
          if (pages.has(localized) && !kept.has(localized)) {
            kept.add(localized);
            queue.push(localized);
          }
        }
      }
    }
  }
  const removed = [...pages].filter(
    (file) => isPackage(file) && !kept.has(file),
  );
  // Validate before deleting anything. Navigation and search are generated later
  // from the remaining pages; they must not be roots of the reference graph.
  const removedSet = new Set(removed);
  for (const [from, to] of edges) {
    if (removedSet.has(to))
      throw new Error(`Pruning would break ${from} -> ${to}`);
  }
  // Filter generated metadata as well, including member lists of hidden
  // packages whose referenced pages survive without their sibling pages.
  for (const entry of readdirSync(docs, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || entry.name !== '_meta.json') continue;
    const file = join(entry.parentPath, entry.name);
    if (!isPackage(file)) continue;
    const items = JSON.parse(readFileSync(file, 'utf8'));
    const filtered = items.filter((item) => {
      if (!item.name) return true;
      const base = resolve(dirname(file), item.name);
      return [...kept].some(
        (page) =>
          page === `${base}.md` ||
          page === `${base}.mdx` ||
          page.startsWith(`${base}${sep}`),
      );
    });
    writeFileSync(file, `${JSON.stringify(filtered, null, 2)}\n`);
  }
  for (const file of removed) rmSync(file);
  const result = {
    before: [...pages].filter(isPackage).length,
    kept: [...kept].filter(isPackage).length,
    removed: removed.length,
    references: edges.length,
  };
  console.log(`Lynx Stack package pages: ${JSON.stringify(result)}`);
  return result;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] === '--prune') {
    const require = createRequire(import.meta.url);
    const manifestFile =
      process.argv[4] ??
      require.resolve('@lynx-js/lynx-stack-docs/manifest.json');
    await prunePackagePages({
      docs: process.argv[3] ?? DOCS,
      manifest: JSON.parse(readFileSync(manifestFile, 'utf8')),
    });
  } else {
    syncLynxStackDocs(process.argv[2]);
  }
}
