import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

/**
 * Evaluate one real TSX module with explicitly supplied dependency exports.
 * Each call owns a fresh VM context and mock cache; imports never traverse the
 * source tree. Tests must declare every direct dependency of their target.
 * Requires Node's --experimental-vm-modules flag.
 *
 * @param {URL} file URL of the production module to transpile and evaluate.
 * @param {Record<string, object>} imports Import specifiers and mock exports.
 * @returns {Promise<object>} Evaluated exports of the production module.
 */
export async function loadTsxModule(file, imports) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const context = vm.createContext({});
  const mocks = new Map();
  const entry = new vm.SourceTextModule(outputText, {
    context,
    identifier: fileURLToPath(file),
  });

  // Reuse each synthetic module so all bindings share the declared exports.
  await entry.link((name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    if (!mocks.has(name)) {
      const values = imports[name];
      mocks.set(
        name,
        new vm.SyntheticModule(
          Object.keys(values),
          function () {
            for (const [key, value] of Object.entries(values)) {
              this.setExport(key, value);
            }
          },
          { context, identifier: name },
        ),
      );
    }
    return mocks.get(name);
  });
  await entry.evaluate();
  return entry.namespace;
}
