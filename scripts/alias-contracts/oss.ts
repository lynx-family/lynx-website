/** OSS integration only: installed producer packages and their source origins. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { manifestSourceAreas } from './oss-manifest-source-areas.js';
import {
  aliases,
  owners,
  ossSourceAreas,
  ossResolverOverrides,
} from './registry.js';
import { runCli } from './check-registry.js';
import { runResolutionCli } from './check-resolution.js';
import { runImportPolicyCli } from './check-import-policy.js';
import { canonical, classifySource } from './corpus.js';
import {
  snapshotDocumentation,
  validateDocumentationCorpus,
} from './documentation-corpus.js';
import type { DocumentationScope, OwnerId } from './types.js';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const producers: readonly {
  packageName: string;
  owner: OwnerId;
  repository: string;
  sourceRoot: string;
}[] = [
  {
    packageName: '@lynx-js/lynx-stack-docs',
    owner: 'lynx-stack',
    repository: 'lynx-family/lynx-stack',
    sourceRoot: '',
  },
  {
    packageName: '@lynx-js/skills-docs',
    owner: 'skills',
    repository: 'lynx-community/skills',
    sourceRoot: 'packages/skills-docs',
  },
];

const sourceAreas = [
  ...ossSourceAreas,
  ...producers.flatMap(({ packageName, ...binding }) =>
    manifestSourceAreas(
      JSON.parse(
        readFileSync(require.resolve(`${packageName}/manifest.json`), 'utf8'),
      ),
      { ...binding, outputRoot: 'docs' },
    ),
  ),
];
const documentationScope: DocumentationScope = {
  roots: ['docs', 'sharedDocs'],
  trackedSource: { id: 'website-tracked-docs', owner: 'lynx-website' },
};
const defaults = {
  owners,
  aliases,
  sourceAreas,
  resolverOverrides: ossResolverOverrides,
  documentationScope,
};
const [gate, ...args] = process.argv.slice(2);
const entries: Record<string, typeof runCli> = {
  registry: runCli,
  resolution: runResolutionCli,
  imports: runImportPolicyCli,
};
const run = entries[gate ?? ''];
if (gate === 'corpus') {
  try {
    if (args.length) throw new Error('corpus accepts no options');
    const cwd = process.cwd();
    const tracked = new Set(
      execFileSync('git', ['ls-files', '-z'], {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      }).split('\0'),
    );
    const data = snapshotDocumentation(
      cwd,
      documentationScope.roots,
      (file) => {
        const area = classifySource(file, cwd, sourceAreas);
        if (area)
          return {
            owner: area.owner,
            ...(area.origins ? { origins: area.origins } : {}),
          };
        if (tracked.has(file))
          return { owner: documentationScope.trackedSource!.owner };
        throw new Error(
          `${file}: executable documentation has no source ownership`,
        );
      },
      canonical,
    );
    validateDocumentationCorpus(data, owners);
    writeFileSync(
      path.join(cwd, 'scripts/alias-contracts/documentation-corpus.json'),
      `${JSON.stringify(data, null, 2)}\n`,
    );
    console.log(
      `Documentation ownership published (${data.files.length} files).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} else if (!run) {
  console.error(
    'Usage: node --import tsx scripts/alias-contracts/oss.ts <registry|resolution|imports|corpus>',
  );
  process.exitCode = 1;
} else {
  process.exitCode = await run(args, process.cwd(), defaults);
}
