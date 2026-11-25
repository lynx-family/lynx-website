import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  createVersionContext,
  transformVersionBindings,
} from './version-bindings.mjs';

/**
 * Resolve code bindings before every Rspress compiler, including node_md.
 * Paths are supplied by the consuming site, never inferred from this module.
 * @param {import('./rsbuild.mjs').VersionBindingsOptions} options
 * @returns {import('@rsbuild/core').RsbuildPlugin}
 */
export function pluginVersionBindings({ versionFile, literalDocuments = [] }) {
  for (const file of [versionFile, ...literalDocuments]) {
    if (typeof file !== 'string' || !path.isAbsolute(file)) {
      throw new Error('Version binding paths must be absolute');
    }
  }
  const metadataFile = path.normalize(versionFile);
  const literals = new Set(
    literalDocuments.map((file) => path.normalize(file)),
  );
  return {
    name: 'lynx-version-bindings',
    setup(api) {
      let snapshot;
      let metadataError;
      async function refresh({ isWatch }) {
        // Do not yield between clearing and replacing the snapshot: another
        // watch compiler may already be running. A failed read leaves the
        // snapshot unset instead of retaining stale metadata.
        snapshot = undefined;
        metadataError = undefined;
        try {
          snapshot = createVersionContext(
            JSON.parse(readFileSync(metadataFile, 'utf8')),
          );
        } catch (error) {
          metadataError = new Error(
            `Cannot load version metadata ${metadataFile}: ${error.message}`,
            { cause: error },
          );
          // Rejecting watchRun prevents Rspack from resuming its file watches.
          // Watch errors instead fail dependent modules, after they register
          // the metadata dependency needed to recover on the next file edit.
          if (!isWatch) throw metadataError;
        }
      }
      // Refresh before build/dev compilation, including watch rebuilds.
      // Environments share a replaceable reference to a frozen snapshot.
      // Overlapping watch cycles are not isolated: a later transform in an
      // earlier cycle may read a snapshot published by a newer refresh.
      api.onBeforeBuild(refresh);
      api.onBeforeDevCompile(refresh);
      api.transform(
        { test: /\.mdx?$/, order: 'pre' },
        ({
          code,
          resourcePath,
          resourceQuery,
          addDependency,
          addMissingDependency,
        }) => {
          if (
            new URLSearchParams(resourceQuery).has('raw') ||
            literals.has(path.normalize(resourcePath)) ||
            !code.includes('{versionJson.')
          )
            return code;
          if (metadataError?.cause?.code === 'ENOENT')
            addMissingDependency(metadataFile);
          else addDependency(metadataFile);
          if (metadataError) throw metadataError;
          if (!snapshot)
            throw new Error(
              'Version bindings require a build metadata snapshot',
            );
          const result = transformVersionBindings(resourcePath, code, snapshot);
          return result.map
            ? { code: result.code, map: result.map.toString() }
            : result.code;
        },
      );
    },
  };
}
