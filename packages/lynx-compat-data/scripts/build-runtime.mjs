import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(packageRoot, 'dist');

// Rebuild the published runtime and declarations from the same helper source.
fs.rmSync(outDir, { recursive: true, force: true });
const program = ts.createProgram([path.join(packageRoot, 'index.ts')], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  types: [],
  resolveJsonModule: true,
  declaration: true,
  noEmitOnError: true,
  rootDir: packageRoot,
  outDir,
});

const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => packageRoot,
      getNewLine: () => '\n',
    }),
  );
}
if (program.emit().emitSkipped) {
  throw new Error('Failed to emit the LCD helper runtime and declarations.');
}

// TypeScript does not copy existing declaration files referenced by the entry.
fs.mkdirSync(path.join(outDir, 'types'), { recursive: true });
fs.copyFileSync(
  path.join(packageRoot, 'types/types.d.ts'),
  path.join(outDir, 'types/types.d.ts'),
);
