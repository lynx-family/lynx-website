import MagicString from 'magic-string';

import { parseDocumentationCode } from './parser.mjs';

const keys = new Set(['LYNX_VERSION', 'PRIMJS_VERSION']);
const bindingPattern = /\{versionJson\.([A-Z][A-Z0-9_]*)\}/g;

/** Copy only the supported build inputs; never retain a mutable JSON object. */
export function createVersionContext(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Version metadata must be a JSON object');
  }
  return Object.freeze(
    Object.fromEntries([...keys].map((key) => [key, metadata[key]])),
  );
}

function fail(file, source, offset, message) {
  const lines = source.slice(0, offset).split(/\r\n|\r|\n/);
  throw new Error(
    `${file}:${lines.length}:${lines.at(-1).length + 1}: ${message}`,
  );
}

/**
 * Discover exact bindings only within AST-approved code content. Discontiguous
 * tokens stay separate: a binding cannot span a line or a container prefix.
 */
export function resolveVersionBindings(file, source, context) {
  if (!source.includes('{versionJson.')) return [];
  const { ranges } = parseDocumentationCode(file, source);
  const edits = [];
  for (const range of ranges) {
    for (const match of source
      .slice(range.start, range.end)
      .matchAll(bindingPattern)) {
      const start = range.start + match.index;
      const key = match[1];
      if (!keys.has(key))
        fail(file, source, start, `Unknown version binding: ${key}`);
      const value = context?.[key];
      // Version strings are inserted verbatim into Markdown code. Reject
      // delimiters and whitespace that could change the document's syntax.
      if (
        typeof value !== 'string' ||
        !/^[0-9A-Za-z][0-9A-Za-z.+-]*$/.test(value)
      ) {
        fail(file, source, start, `Missing or invalid version value: ${key}`);
      }
      edits.push({
        start,
        end: start + match[0].length,
        expected: match[0],
        value,
      });
    }
  }
  return edits;
}

/** Edit original source only, with explicit range and preimage validation. */
export function applyVersionEdits(file, source, edits) {
  if (!edits.length) return { code: source };
  const output = new MagicString(source);
  let previousEnd = 0;
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    if (
      !Number.isInteger(edit.start) ||
      !Number.isInteger(edit.end) ||
      edit.start < previousEnd ||
      edit.end <= edit.start ||
      edit.end > source.length ||
      source.slice(edit.start, edit.end) !== edit.expected
    ) {
      throw new Error(
        `${file}: Invalid or overlapping version edit at ${edit.start}`,
      );
    }
    output.overwrite(edit.start, edit.end, edit.value);
    previousEnd = edit.end;
  }
  return {
    code: output.toString(),
    map: output.generateMap({
      source: file,
      includeContent: true,
      hires: true,
    }),
  };
}

export function transformVersionBindings(file, source, context) {
  return applyVersionEdits(
    file,
    source,
    resolveVersionBindings(file, source, context),
  );
}
