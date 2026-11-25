import path from 'node:path';

import { createProcessor } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkCjkStrikethrough from 'remark-cjk-friendly-gfm-strikethrough';
import remarkGfm from 'remark-gfm';

function captureEstree() {
  return (tree, file) => {
    file.data.estree = tree;
  };
}

function processor(format, remarkPlugins = []) {
  // Keep package syntax dependencies aligned with the audited Rspress parser.
  return createProcessor({
    format,
    remarkPlugins: [
      remarkGfm,
      remarkCjkFriendly,
      remarkCjkStrikethrough,
      ...remarkPlugins,
    ],
    recmaPlugins: [captureEstree],
  });
}

const processors = new Map(
  ['md', 'mdx'].map((format) => [format, processor(format)]),
);

function documentInput(file, content) {
  const normalizedFile = file.split(path.sep).join('/');
  const format = path.posix.extname(normalizedFile).slice(1);
  if (!processors.has(format)) {
    throw new Error(`Unsupported documentation format: ${file}`);
  }
  return { format, input: { path: normalizedFile, value: content } };
}

/**
 * Match Rspress's metadata removal and heading-ID escaping. Synthetic line
 * breaks preserve the CI line contract but are never editable. Each segment
 * maps an unchanged UTF-16 slice of prepared text to the original source.
 */
export function prepareDocumentation(content) {
  // Inspect boundaries only; never run JavaScript frontmatter.
  const body = matter(content, { engines: { javascript: () => ({}) } }).content;
  if (!content.endsWith(body)) {
    throw new Error('Frontmatter preparation changed the document body');
  }
  const bodyStart = content.length - body.length;
  const removedLines = content.split('\n').length - body.split('\n').length;
  let value = '\n'.repeat(removedLines);
  const segments = [];
  let cursor = 0;
  function append(end) {
    if (end > cursor) {
      segments.push({
        start: value.length,
        end: value.length + end - cursor,
        originalStart: bodyStart + cursor,
      });
      value += body.slice(cursor, end);
    }
    cursor = end;
  }
  for (const heading of body.matchAll(/(?:^|\n)#{1,6}(?!#).*/g)) {
    const relative = heading[0].indexOf('{#');
    // For an escaped first ID, Rspress's insertion and removal cancel.
    // Otherwise its second non-global replace may remove a backslash before
    // a later ID in the same heading.
    if (relative >= 0 && heading[0][relative - 1] !== '\\') {
      append(heading.index + relative);
      value += '\\';
      const redundantEscape = heading[0].indexOf('\\\\{#', relative + 2);
      if (redundantEscape >= 0) {
        append(heading.index + redundantEscape);
        // The removed source character has no prepared-text segment.
        cursor += 1;
      }
    }
  }
  append(body.length);
  return { value, segments };
}

/** Parse only; no imports, expressions, or document modules are evaluated. */
export function parseDocumentation(file, content) {
  const { format, input } = documentInput(
    file,
    prepareDocumentation(content).value,
  );
  return processors.get(format).parse(input);
}

/** Compile an ESTree for CI scope analysis without evaluating JavaScript. */
export function compileDocumentation(file, content) {
  const { format, input } = documentInput(
    file,
    prepareDocumentation(content).value,
  );
  return processors.get(format).processSync(input).data.estree;
}

/**
 * Return original-source ranges for code contents, excluding fence metadata,
 * Markdown container prefixes, JSX, ESM, and preprocessing insertions.
 */
export function parseDocumentationCode(file, content) {
  const prepared = prepareDocumentation(content);
  const { format, input } = documentInput(file, prepared.value);
  const tokens = [];
  function collectCode() {
    const extensions = this.data('fromMarkdownExtensions') ?? [];
    extensions.push({
      // Observe the public mdast compiler hook; do not replace its handlers.
      beforeEnter(token) {
        if (token.type !== 'codeFlowValue' && token.type !== 'codeTextData')
          return;
        const node = this.stack.findLast(
          (entry) => entry.type === 'code' || entry.type === 'inlineCode',
        );
        if (node)
          tokens.push({
            node,
            start: token.start.offset,
            end: token.end.offset,
          });
      },
    });
    this.data('fromMarkdownExtensions', extensions);
  }
  // The collector belongs to this parse. Reusing it would retain other files.
  const tree = processor(format, [collectCode]).parse(input);
  const ranges = [];
  let segmentIndex = 0;
  for (const token of tokens) {
    while (prepared.segments[segmentIndex]?.end <= token.start) segmentIndex++;
    for (let i = segmentIndex; i < prepared.segments.length; i++) {
      const segment = prepared.segments[i];
      if (segment.start >= token.end) break;
      const start = Math.max(token.start, segment.start);
      const end = Math.min(token.end, segment.end);
      if (start < end) {
        ranges.push({
          start: segment.originalStart + start - segment.start,
          end: segment.originalStart + end - segment.start,
          type: token.node.type,
        });
      }
    }
  }
  return { tree, ranges };
}
