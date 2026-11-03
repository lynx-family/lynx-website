/**
 * Check English/Chinese heading correspondence for Writing Style CI.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

import { parseDocumentation } from './documentation-parser.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);

export const headingExceptions = JSON.parse(
  readFileSync(
    new URL('./doc-heading-allowlist.json', import.meta.url),
    'utf8',
  ),
);
export const headingParityAllowlist = new Set(
  Object.keys(headingExceptions.parity),
);

/**
 * Pair locale-relative routes, including .md/.mdx translations and shared
 * fragments named Example.mdx / Example.zh.mdx. Unpaired documents are outside
 * this heading contract; translation completeness is a separate concern.
 */
export function pairDocuments(files) {
  const routes = new Map();
  for (const file of [...files].sort()) {
    // The optional x accepts both .md and .mdx; skip other tracked file types.
    if (!/\.mdx?$/.test(file)) {
      continue;
    }
    let key;
    let locale;
    if (/^docs\/(en|zh)\//.test(file)) {
      locale = file.split('/')[1];
      key = file.replace(/^docs\/(en|zh)\//, 'docs/');
    } else if (file.startsWith('sharedDocs/')) {
      // Shared fragments mark Chinese with .zh before the .md/.mdx extension.
      locale = /\.zh\.mdx?$/.test(file) ? 'zh' : 'en';
      key = file.replace(/\.zh(\.mdx?)$/, '$1');
    } else {
      continue;
    }
    // Pair by extensionless route so locales may use different document formats.
    key = key.replace(/\.mdx?$/, '');
    const route = routes.get(key) ?? { key };
    if (route[locale]) {
      throw new Error(
        `Ambiguous ${locale} document pair: ${route[locale]} and ${file}`,
      );
    }
    route[locale] = file;
    routes.set(key, route);
  }
  return [...routes.values()].filter(({ en, zh }) => en && zh);
}

/**
 * Extract Markdown and literal MDX h1-h6 headings without executing components.
 * Ignore module declarations, code and comments. Apply Rspress's
 * frontmatter-title fallback in document layouts when no Markdown H1 exists.
 *
 * @param {string} file Document path; its extension selects the parser.
 * @param {string} content Document source.
 * @returns {Array<{depth: number, line: number}>} Headings in source order.
 * @throws {Error} If the document or frontmatter cannot be parsed.
 */
export function extractHeadings(file, content) {
  const tree = parseDocumentation(file, content);
  const headings = [];
  let hasMarkdownTitle = false;
  function visit(node) {
    if (node.type === 'mdxjsEsm') {
      // JSX in module declarations is not body content; exports may be unused.
      return;
    }
    if (node.type === 'heading') {
      hasMarkdownTitle ||= node.depth === 1;
      headings.push({
        depth: node.depth,
        line: node.position.start.line,
        offset: node.position.start.offset,
      });
    } else if (
      (node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement') &&
      /^h[1-6]$/.test(node.name)
    ) {
      headings.push({
        depth: Number(node.name[1]),
        line: node.position.start.line,
        offset: node.position.start.offset,
      });
    } else if (
      node.type === 'JSXOpeningElement' &&
      node.name.type === 'JSXIdentifier' &&
      /^h[1-6]$/.test(node.name.name)
    ) {
      headings.push({
        depth: Number(node.name.name[1]),
        line: node.loc.start.line,
        offset: node.start,
      });
    }
    if (node.data?.estree) {
      // Body expressions store JSX here, e.g. {condition && <h2>Title</h2>}.
      visit(node.data.estree);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'data') {
        // Its ESTree was already visited; do not count those headings twice.
        continue;
      }
      for (const child of Array.isArray(value) ? value : [value]) {
        if (
          child &&
          typeof child === 'object' &&
          typeof child.type === 'string'
        ) {
          visit(child);
        }
      }
    }
  }
  visit(tree);
  // Source offsets restore document order across Markdown/MDX and ESTree nodes.
  headings.sort((left, right) => left.offset - right.offset);
  const { title, pageType } = matter(content, {
    engines: { javascript: () => ({}) },
  }).data;
  // Rspress's default layout is DocLayout, including an unspecified pageType.
  const isDocumentLayout = !['home', '404', 'custom', 'blank'].includes(
    pageType,
  );
  // Rspress discovers headingTitle from Markdown H1 only; JSX H1 does not
  // suppress the frontmatter fallback rendered before the document.
  if (
    isDocumentLayout &&
    typeof title === 'string' &&
    title.trim() &&
    !hasMarkdownTitle
  ) {
    headings.unshift({ depth: 1, line: 1, offset: 0 });
  }
  return headings.map(({ depth, line }) => ({ depth, line }));
}

/**
 * Compare ordered heading levels, allowing translated text and matching skips.
 * Exceptions suppress only mismatches; read/parse errors and stale entries fail.
 *
 * @param {ReturnType<typeof pairDocuments>} pairs Complete locale pairs.
 * @param {(file: string) => string} readContent Reads source for each path.
 * @param {Set<string>} [allowlist=headingParityAllowlist] Known mismatched keys.
 * @returns {{violations: object[], allowed: string[]}} Diagnostics and used keys.
 */
export function checkHeadingParity(
  pairs,
  readContent,
  allowlist = headingParityAllowlist,
) {
  const violations = [];
  const allowed = [];
  const seen = new Set();
  for (const pair of pairs) {
    seen.add(pair.key);
    const outlines = {};
    for (const locale of ['en', 'zh']) {
      try {
        outlines[locale] = extractHeadings(
          pair[locale],
          readContent(pair[locale]),
        );
      } catch (error) {
        violations.push({
          file: pair[locale],
          line: error.line ?? error.place?.start?.line ?? 1,
          reason: `could not read or parse document: ${error.message}`,
        });
      }
    }
    if (!outlines.en || !outlines.zh) {
      continue;
    }
    // Compare ordered levels, ignoring translated text. The longer length also
    // exposes missing headings as undefined on the shorter side.
    const index = Array.from(
      { length: Math.max(outlines.en.length, outlines.zh.length) },
      (_, i) => i,
    ).find((i) => outlines.en[i]?.depth !== outlines.zh[i]?.depth);
    if (index === undefined) {
      if (allowlist.has(pair.key)) {
        violations.push({
          file: pair.en,
          line: 1,
          reason: `heading structures now match; remove stale allowlist entry "${pair.key}"`,
        });
      }
    } else if (allowlist.has(pair.key)) {
      allowed.push(pair.key);
    } else {
      violations.push({
        ...pair,
        enHeadings: outlines.en,
        zhHeadings: outlines.zh,
        index,
        file: pair.en,
        line: outlines.en[index]?.line ?? 1,
        reason:
          outlines.en.length === outlines.zh.length
            ? 'heading hierarchy differs'
            : 'heading count differs',
      });
    }
  }
  // Deleted or unpaired routes must not leave silently unused exceptions.
  for (const key of allowlist) {
    if (!seen.has(key)) {
      violations.push({
        file: 'scripts/ci/doc-heading-allowlist.json',
        line: 1,
        reason: `document pair no longer exists; remove stale allowlist entry "${key}"`,
      });
    }
  }
  return { violations, allowed };
}

/**
 * Scan tracked docs and sharedDocs without prepare, and print CI diagnostics.
 * Read current file contents; ignore untracked generated output.
 *
 * @returns {void} Sets process.exitCode to 1 when violations are found.
 * @throws {Error} On CLI arguments, Git errors, or ambiguous document pairs.
 */
function run() {
  if (process.argv.length > 2) {
    throw new Error(
      'check-doc-heading-parity requires a full scan without file arguments',
    );
  }
  const files = execFileSync(
    'git',
    ['ls-files', '-z', 'docs/en', 'docs/zh', 'sharedDocs'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).split('\0');
  const pairs = pairDocuments(files);
  const { violations, allowed } = checkHeadingParity(pairs, (file) =>
    readFileSync(path.join(repoRoot, file), 'utf8'),
  );
  console.log(
    `Checked ${pairs.length} English/Chinese document pairs; ${allowed.length} known exceptions.`,
  );
  for (const key of allowed) {
    console.log(`  allowlisted: ${key}: ${headingExceptions.parity[key]}`);
  }
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.reason}`);
    if (violation.enHeadings) {
      const { enHeadings, zhHeadings, index } = violation;
      for (const [file, headings] of [
        [violation.en, enHeadings],
        [violation.zh, zhHeadings],
      ]) {
        const heading = headings[index];
        console.error(
          `  ${file}:${heading?.line ?? 1}: ${headings.length} headings; heading #${index + 1}: ${heading ? `H${heading.depth}` : 'missing'}`,
        );
      }
    }
  }
  if (violations.length > 0) {
    console.error(`${violations.length} heading parity violation(s).`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
