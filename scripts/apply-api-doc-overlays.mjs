#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const localeConfig = {
  en: { heading: 'Example' },
  zh: { heading: '示例' },
};

// Add one entry here to inject a Lynx Go example into the corresponding
// English and Chinese API reference pages.
const apiReferenceExamples = [
  {
    id: 'react-clone-element-example',
    apiReference: 'react/Function.cloneElement.mdx',
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
    apiReference: 'react/Function.createElement.mdx',
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
    apiReference: 'react/Function.createPortal.mdx',
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
  const apiReferences = new Set();
  const targets = new Set();
  const overlays = [];

  for (const example of examples) {
    const { id, apiReference, locales } = example;

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
      apiReference.includes('\0')
    ) {
      throw new Error(`Invalid API reference path in "${id}".`);
    }
    const normalizedReference = path.posix.normalize(apiReference);
    if (
      normalizedReference !== apiReference ||
      path.posix.isAbsolute(apiReference) ||
      apiReference.startsWith('../')
    ) {
      throw new Error(
        `API reference path must stay under docs/*/api: ${apiReference}`,
      );
    }
    if (apiReferences.has(apiReference)) {
      throw new Error(`Duplicate API reference example: ${apiReference}`);
    }
    apiReferences.add(apiReference);

    if (!Array.isArray(locales) || locales.length === 0) {
      throw new Error(`API reference example "${id}" requires locales.`);
    }
    const uniqueLocales = new Set(locales);
    if (uniqueLocales.size !== locales.length) {
      throw new Error(`Duplicate locale in API reference example "${id}".`);
    }

    const go = renderLynxGo(example);
    for (const locale of locales) {
      if (!Object.hasOwn(localeConfig, locale)) {
        throw new Error(`Unsupported locale "${locale}" in "${id}".`);
      }
      const { heading } = localeConfig[locale];
      const target = `docs/${locale}/api/${apiReference}`;
      if (targets.has(target)) {
        throw new Error(`Duplicate API doc overlay target: ${target}`);
      }
      targets.add(target);
      overlays.push({
        id,
        target,
        content: `## ${heading}\n\n${go}`,
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

async function prepareOverlay({ id, target, content }) {
  const targetPath = path.join(repoRoot, target);
  const original = await readFile(targetPath, 'utf8');

  if (!original.includes('@generated')) {
    throw new Error(`Refusing to overlay non-generated API doc: ${target}`);
  }
  if (!original.includes("import * as Lynx from '@lynx';")) {
    throw new Error(`Missing Lynx component import in API doc: ${target}`);
  }

  const contentWithoutOverlay = removeExistingOverlay(original, id);
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error(`Overlay content is empty: ${id}`);
  }

  const startMarker = `{/* api-doc-overlay:${id}:start */}`;
  const endMarker = `{/* api-doc-overlay:${id}:end */}`;
  const block = `${startMarker}\n\n${trimmedContent}\n\n${endMarker}`;
  const updated = `${contentWithoutOverlay.trimEnd()}\n\n${block}\n`;

  return { id, target, targetPath, original, updated };
}

const overlays = createOverlays(apiReferenceExamples);
const preparedOverlays = await Promise.all(overlays.map(prepareOverlay));

for (const { id, target, targetPath, original, updated } of preparedOverlays) {
  if (updated === original) {
    console.log(`API doc overlay "${id}" is already up to date in ${target}`);
    continue;
  }

  await writeFile(targetPath, updated);
  console.log(`Applied API doc overlay "${id}" to ${target}`);
}
