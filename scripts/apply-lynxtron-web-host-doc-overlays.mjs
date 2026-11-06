import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lynxtronWebHostDocOverlays } from './lynxtron-web-host-doc-overlays.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

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

async function prepareOverlay({ id, target, content, tableDescriptions }) {
  const targetPath = path.join(repoRoot, target);
  const original = await readFile(targetPath, 'utf8');

  if (!original.includes('@generated')) {
    throw new Error(`Refusing to overlay non-generated API doc: ${target}`);
  }
  if (!original.includes("import * as Lynx from '@lynx';")) {
    throw new Error(`Missing Lynx component import in API doc: ${target}`);
  }

  let contentWithoutOverlay = removeExistingOverlay(original, id);
  if (tableDescriptions) {
    for (const [name, description] of Object.entries(tableDescriptions)) {
      const lines = contentWithoutOverlay.split('\n');
      const matching = lines.filter((line) => line.startsWith(`| [${name}](`));
      if (matching.length !== 1) {
        throw new Error(
          `Expected one interface summary for ${name} in ${target}`,
        );
      }
      contentWithoutOverlay = lines
        .map((line) =>
          line.startsWith(`| [${name}](`)
            ? line.replace(
                /(\|)([^|]*)(\|\s*)$/,
                (_, left, cell, right) =>
                  `${left}${` ${description} `.padEnd(cell.length)}${right}`,
              )
            : line,
        )
        .join('\n');
    }
  }
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

export async function applyLynxtronWebHostDocOverlays() {
  const prepared = await Promise.all(
    lynxtronWebHostDocOverlays.map(prepareOverlay),
  );
  for (const { id, target, targetPath, original, updated } of prepared) {
    if (updated === original) continue;
    await writeFile(targetPath, updated);
    console.log(`Applied API doc overlay "${id}" to ${target}`);
  }
}

export async function assertLynxtronWebHostDocOverlaysCurrent() {
  const prepared = await Promise.all(
    lynxtronWebHostDocOverlays.map(prepareOverlay),
  );
  const stale = prepared.filter(
    ({ original, updated }) => original !== updated,
  );
  if (stale.length) {
    throw new Error(
      `Web Host API overlays are stale: ${stale.map(({ target }) => target).join(', ')}. Run pnpm sync:lynx-stack-docs and commit the generated output.`,
    );
  }
}
