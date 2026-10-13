import path from 'node:path';

import { createProcessor } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkCjkStrikethrough from 'remark-cjk-friendly-gfm-strikethrough';
import remarkGfm from 'remark-gfm';

// Match Rspress's syntax plugins and extension-based format selection without
// loading site config, rendering plugins, or executable document modules.
// Keep these direct dependency versions aligned with @rspress/core.
const processors = new Map(
  ['md', 'mdx'].map((format) => [
    format,
    createProcessor({
      format,
      remarkPlugins: [remarkGfm, remarkCjkFriendly, remarkCjkStrikethrough],
    }),
  ]),
);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

/**
 * Match Rspress's frontmatter removal and heading-ID escaping before parsing.
 * Removed line breaks are restored so AST locations still refer to source.
 * The version-placeholder plugin runs after parsing and rewrites only code
 * nodes, so it does not participate in this shared syntax contract.
 */
function prepareSource(content) {
  // Only metadata boundaries matter here. Never evaluate gray-matter's
  // JavaScript frontmatter engine while inspecting a document.
  const body = matter(content, { engines: { javascript: () => ({}) } }).content;
  const removedLines = content.split('\n').length - body.split('\n').length;
  return `${'\n'.repeat(removedLines)}${body}`.replace(
    /(?:^|\n)#{1,6}(?!#).*/g,
    (heading) => heading.replace('{#', '\\{#').replace('\\\\{#', '\\{#'),
  );
}

/**
 * Parse Markdown or MDX with the syntax contract shared by documentation CI.
 * The file extension selects Markdown semantics, so executable-looking text in
 * a `.md` file remains plain Markdown rather than MDX.
 */
export function parseDocumentation(file, content) {
  const normalizedFile = toPosix(file);
  const format = path.posix.extname(normalizedFile).slice(1);
  return processors.get(format).parse({
    path: normalizedFile,
    value: prepareSource(content),
  });
}
