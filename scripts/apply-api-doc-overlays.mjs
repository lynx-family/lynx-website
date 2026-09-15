#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const localeConfig = {
  en: { heading: 'Example' },
  zh: { heading: '示例' },
};

// Add one entry here to inject a Lynx Go example under an API on the
// ReactLynx reference pages synced from lynx-stack. `anchor` is the id of the
// API's heading on that page; the example goes at the end of its section.
const apiReferenceExamples = [
  {
    id: 'react-clone-element-example',
    apiReference: 'api/react/functions.mdx',
    anchor: 'cloneelement',
    locales: ['en', 'zh'],
    goProps: {
      example: 'react-apis',
      defaultFile: 'src/clone-element/index.tsx',
      defaultEntryFile: 'dist/clone-element.lynx.bundle',
      entry: 'src/clone-element',
      defaultTab: 'web',
    },
  },
  {
    id: 'react-create-element-example',
    apiReference: 'api/react/functions.mdx',
    anchor: 'createelement',
    locales: ['en', 'zh'],
    goProps: {
      example: 'react-apis',
      defaultFile: 'src/create-element/index.tsx',
      defaultEntryFile: 'dist/create-element.lynx.bundle',
      entry: 'src/create-element',
      defaultTab: 'web',
    },
  },
  {
    id: 'react-create-portal-example',
    apiReference: 'api/react/functions.mdx',
    anchor: 'createportal',
    locales: ['en', 'zh'],
    goProps: {
      example: 'react-apis',
      defaultFile: 'src/create-portal/index.tsx',
      defaultEntryFile: 'dist/create-portal.lynx.bundle',
      entry: 'src/create-portal',
      defaultTab: 'web',
    },
  },
];

function renderGoProp(name, value, id) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
    throw new Error(`Invalid Lynx Go prop name "${name}" in "${id}".`);
  }

  if (typeof value === 'string') {
    const escapedValue = value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return `  ${name}="${escapedValue}"`;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(`Invalid Lynx Go prop "${name}" in "${id}".`);
    }
    return `  ${name}={${value}}`;
  }

  if (Array.isArray(value) || (value && typeof value === 'object')) {
    let serializedValue;
    try {
      serializedValue = JSON.stringify(value);
    } catch {
      throw new Error(
        `Lynx Go prop "${name}" in "${id}" must be JSON-serializable.`,
      );
    }
    if (!serializedValue) {
      throw new Error(
        `Lynx Go prop "${name}" in "${id}" must be JSON-serializable.`,
      );
    }
    return `  ${name}={${serializedValue}}`;
  }

  throw new Error(
    `Unsupported Lynx Go prop "${name}" in "${id}": ${typeof value}.`,
  );
}

function renderLynxGo({ id, goProps }) {
  if (
    !goProps ||
    typeof goProps !== 'object' ||
    Array.isArray(goProps) ||
    typeof goProps.example !== 'string' ||
    !goProps.example.trim()
  ) {
    throw new Error(`Lynx Go example "${id}" requires an example prop.`);
  }

  const props = Object.entries(goProps).map(([name, value]) =>
    renderGoProp(name, value, id),
  );
  return `<Lynx.Go\n${props.join('\n')}\n/>`;
}

function createOverlays(examples) {
  const ids = new Set();
  const sections = new Set();
  const overlays = [];

  for (const example of examples) {
    const { id, apiReference, anchor, locales } = example;

    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error(`Invalid API doc overlay id: ${String(id)}`);
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate API doc overlay id: ${id}`);
    }
    ids.add(id);

    if (
      typeof apiReference !== 'string' ||
      !apiReference.endsWith('.mdx') ||
      apiReference.includes('\\') ||
      apiReference.includes('\0') ||
      path.posix.normalize(apiReference) !== apiReference ||
      path.posix.isAbsolute(apiReference) ||
      apiReference.startsWith('../')
    ) {
      throw new Error(`Invalid API reference path in "${id}".`);
    }
    if (typeof anchor !== 'string' || !/^[a-z0-9-]+$/.test(anchor)) {
      throw new Error(`Invalid anchor in "${id}".`);
    }
    if (sections.has(`${apiReference}#${anchor}`)) {
      throw new Error(
        `Duplicate API reference example: ${apiReference}#${anchor}`,
      );
    }
    sections.add(`${apiReference}#${anchor}`);

    if (!Array.isArray(locales) || locales.length === 0) {
      throw new Error(`API reference example "${id}" requires locales.`);
    }
    if (new Set(locales).size !== locales.length) {
      throw new Error(`Duplicate locale in API reference example "${id}".`);
    }

    const go = renderLynxGo(example);
    for (const locale of locales) {
      if (!Object.hasOwn(localeConfig, locale)) {
        throw new Error(`Unsupported locale "${locale}" in "${id}".`);
      }
      const { heading } = localeConfig[locale];
      overlays.push({
        id,
        anchor,
        target: `docs/${locale}/${apiReference}`,
        content: `#### ${heading}\n\n${go}`,
      });
    }
  }

  return overlays;
}

function countOccurrences(content, value) {
  return content.split(value).length - 1;
}

function removeExistingOverlay(content, id) {
  const startMarker = `{/* api-doc-overlay:${id}:start */}`;
  const endMarker = `{/* api-doc-overlay:${id}:end */}`;
  const startCount = countOccurrences(content, startMarker);
  const endCount = countOccurrences(content, endMarker);

  if (startCount !== endCount || startCount > 1) {
    throw new Error(
      `Expected at most one complete overlay block for "${id}", found ${startCount} start marker(s) and ${endCount} end marker(s).`,
    );
  }

  if (startCount === 0) {
    return content;
  }

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (endIndex < startIndex) {
    throw new Error(
      `Overlay end marker appears before its start marker for "${id}".`,
    );
  }
  const before = content.slice(0, startIndex).replace(/\n+$/, '');
  const after = content.slice(endIndex + endMarker.length).replace(/^\n+/, '');

  return `${before}\n\n${after}`;
}

const LYNX_IMPORT = "import * as Lynx from '@lynx';";

function ensureLynxImport(content) {
  if (content.includes(LYNX_IMPORT)) {
    return content;
  }
  const frontmatter = content.match(/^---\n[\s\S]*?\n---\n/);
  const at = frontmatter ? frontmatter[0].length : 0;
  return `${content.slice(0, at)}\n${LYNX_IMPORT}\n${content.slice(at)}`;
}

function insertAtEndOfSection(content, anchor, block) {
  const lines = content.split('\n');
  const headingIndex = lines.findIndex(
    (line) => /^#{2,6} /.test(line) && line.includes(`\\{#${anchor}\\}`),
  );
  if (headingIndex === -1) {
    throw new Error(`No heading with anchor "${anchor}" found.`);
  }
  const level = lines[headingIndex].match(/^#+/)[0].length;
  let end = lines.length;
  let inFence = false;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inFence = !inFence;
    }
    if (inFence) {
      continue;
    }
    const heading = lines[i].match(/^(#{1,6}) /);
    if (
      (heading && heading[1].length <= level) ||
      lines[i].startsWith('{/* @api-end */}')
    ) {
      end = i;
      break;
    }
  }
  while (end > headingIndex + 1 && lines[end - 1] === '') {
    end--;
  }
  lines.splice(end, 0, '', block, '');
  return lines.join('\n');
}

const overlays = createOverlays(apiReferenceExamples);
const byTarget = new Map();
for (const overlay of overlays) {
  byTarget.set(overlay.target, [
    ...(byTarget.get(overlay.target) ?? []),
    overlay,
  ]);
}

for (const [target, pageOverlays] of byTarget) {
  const targetPath = path.join(repoRoot, target);
  const original = await readFile(targetPath, 'utf8');
  if (!original.includes('{/* @api ')) {
    throw new Error(
      `Refusing to overlay a page that is not synced from lynx-stack: ${target}`,
    );
  }

  let updated = ensureLynxImport(original);
  for (const { id, anchor, content } of pageOverlays) {
    updated = removeExistingOverlay(updated, id);
    const startMarker = `{/* api-doc-overlay:${id}:start */}`;
    const endMarker = `{/* api-doc-overlay:${id}:end */}`;
    updated = insertAtEndOfSection(
      updated,
      anchor,
      `${startMarker}\n\n${content.trim()}\n\n${endMarker}`,
    );
  }

  if (updated === original) {
    console.log(`API doc overlays are already up to date in ${target}`);
    continue;
  }
  await writeFile(targetPath, updated);
  console.log(`Applied ${pageOverlays.length} API doc overlay(s) to ${target}`);
}
