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
    if (!/\.mdx?$/.test(file)) {
      continue;
    }
    let key;
    let locale;
    if (/^docs\/(en|zh)\//.test(file)) {
      locale = file.split('/')[1];
      key = file.replace(/^docs\/(en|zh)\//, 'docs/');
    } else if (file.startsWith('sharedDocs/')) {
      locale = /\.zh\.mdx?$/.test(file) ? 'zh' : 'en';
      key = file.replace(/\.zh(\.mdx?)$/, '$1');
    } else {
      continue;
    }
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
 * Collect source headings in order without evaluating document code or
 * expanding imported components. Markdown syntax (including Setext headings)
 * and literal MDX h1-h6 tags participate; code examples and comments do not.
 * Match the site's enabled Rspress fallback: a frontmatter title contributes
 * one H1 only when there is no Markdown H1 (Rspress's headingTitle).
 */
export function extractHeadings(file, content) {
  const tree = parseDocumentation(file, content);
  const headings = [];
  let hasMarkdownTitle = false;
  function visit(node) {
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
      visit(node.data.estree);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'data') {
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
  headings.sort((left, right) => left.offset - right.offset);
  const { title } = matter(content, {
    engines: { javascript: () => ({}) },
  }).data;
  if (typeof title === 'string' && title.trim() && !hasMarkdownTitle) {
    headings.unshift({ depth: 1, line: 1, offset: 0 });
  }
  return headings.map(({ depth, line }) => ({ depth, line }));
}

/**
 * Compare the complete ordered H1-H6 sequence, not just per-level totals.
 * Equal counts with different nesting or sibling order must still fail.
 * Exceptions never suppress read/parse failures, and aligned or missing
 * exceptions fail so the allowlist shrinks when the upstream work lands.
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
  for (const key of allowlist) {
    if (!seen.has(key)) {
      violations.push({
        file: 'scripts/ci/check-doc-heading-parity.mjs',
        line: 1,
        reason: `document pair no longer exists; remove stale allowlist entry "${key}"`,
      });
    }
  }
  return { violations, allowed };
}

function run() {
  if (process.argv.length > 2) {
    throw new Error(
      'check-doc-heading-parity requires a full scan without file arguments',
    );
  }
  // Inspect the committed document set; ignore generated install/prepare output.
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
