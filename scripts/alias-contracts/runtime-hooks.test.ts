/** Shared hooks retain OSS identity when src and theme mount separately. */
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import ts from 'typescript';
import { loadContracts, type ActiveContracts } from './check-registry.js';
import { checkResolution } from './check-resolution.js';
import { checkImportPolicy } from './check-import-policy.js';
import { parseImports, type ImportRecord } from './corpus.js';
import { createExportReader } from './exports.js';
import { createRuntime } from './runtime.js';

test('shared hook imports retain OSS identity across runtime mounts', async (t) => {
  const repository = process.cwd();
  // Stay outside the package tree: the full suite also runs pnpm pack.
  const cwd = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'website-runtime-hooks-')),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };

  // Keep the fixture cache physically separate from the repository cache.
  mkdirSync(path.join(cwd, 'node_modules/.cache'), { recursive: true });
  for (const entry of readdirSync(path.join(repository, 'node_modules'))) {
    if (entry === '.cache') continue;
    symlinkSync(
      path.join(repository, 'node_modules', entry),
      path.join(cwd, 'node_modules', entry),
    );
  }
  write('package.json', '{"type":"module"}');
  mkdirSync(path.join(cwd, 'docs'));
  write('host/theme/index.ts', 'export const Layout = () => null;');
  write(
    'host/routes.ts',
    "export const BLOG_BASE = '/next'; export const BLOG_IS_CROSS_VERSION = false;",
  );
  write(
    'host/source/hooks/index.ts',
    "export * from '../../../oss-source/hooks';",
  );
  const paths = {
    '@/*': ['./host/source/*', './oss-source/*'],
    '@route-config': ['./host/routes.ts'],
    '@theme': ['./host/theme/index.ts'],
    '@theme/*': ['./host/theme/*', './node_modules/@rspress/core/dist/theme/*'],
  };
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        paths,
      },
      include: ['oss-source/hooks/*.ts', 'theme-source/theme/hooks/*.ts'],
    }),
  );
  cpSync(
    path.join(repository, 'src/hooks'),
    path.join(cwd, 'oss-source/hooks'),
    {
      recursive: true,
    },
  );
  // The consuming site owns translation content at its repository root.
  cpSync(path.join(repository, 'i18n.json'), path.join(cwd, 'i18n.json'));
  mkdirSync(path.join(cwd, 'oss-source/lib'));
  cpSync(
    path.join(repository, 'src/lib/utils.ts'),
    path.join(cwd, 'oss-source/lib/utils.ts'),
  );
  cpSync(
    path.join(repository, 'theme/hooks'),
    path.join(cwd, 'theme-source/theme/hooks'),
    {
      recursive: true,
    },
  );

  const shared = await loadContracts();
  const mounts: Record<string, string> = {
    'oss-components': 'oss-source/components',
    'oss-hooks': 'oss-source/hooks',
    'oss-lib': 'oss-source/lib',
    'oss-theme': 'theme-source/theme',
    'site-route-config': 'host/routes.ts',
  };
  const contracts: ActiveContracts = {
    ...shared,
    aliases: shared.aliases.filter((alias) =>
      ['oss-private-source', 'route-config', 'rspress-theme'].includes(
        alias.id,
      ),
    ),
    sourceAreas: [
      ...shared.sourceAreas.map((area) => ({
        ...area,
        root: mounts[area.id] ?? area.root,
      })),
      ...['host/source', 'host/theme'].map((root) => ({
        id: root,
        root,
        owner: 'consumer' as const,
        role: 'authoritative' as const,
        boundary: 'runtime' as const,
      })),
    ],
  };

  // Keep src intact while relocating it independently of theme. Read actual
  // component requests so changes to their import spelling are exercised.
  const records: ImportRecord[] = [];
  for (const [root, mount, sourceArea] of [
    ['src/components', 'oss-source/components', 'oss-components'],
    ['theme', 'theme-source/theme', 'oss-theme'],
  ] as const) {
    for (const entry of readdirSync(path.join(repository, root), {
      recursive: true,
      encoding: 'utf8',
    })) {
      if (!/\.[jt]sx?$/.test(entry)) continue;
      // The complete theme hooks tree is collected below.
      if (root === 'theme' && entry.startsWith('hooks/')) continue;
      const content = readFileSync(path.join(repository, root, entry), 'utf8');
      const imports = parseImports(entry, content).filter(
        (record) =>
          /(?:^|\/)use-(?:if-mobile|fix-dark)$/.test(record.specifier) ||
          record.bindings.some(({ name }) =>
            ['useIfMobile', 'useFixDark'].includes(name),
          ),
      );
      if (!imports.length) continue;
      const importer = `${mount}/${entry}`;
      write(importer, content);
      records.push(
        ...imports.map((record) => ({
          ...record,
          importer,
          sourceArea,
          owner: 'lynx-website' as const,
          role: 'authoritative' as const,
          boundary: 'runtime' as const,
        })),
      );
    }
  }
  assert.ok(records.length > 0);
  for (const entry of readdirSync(path.join(cwd, 'theme-source/theme/hooks'))) {
    const importer = `theme-source/theme/hooks/${entry}`;
    records.push(
      ...parseImports(importer, readFileSync(path.join(cwd, importer), 'utf8'))
        .filter(
          (record) =>
            !['react', '@rspress/core/runtime'].includes(record.specifier),
        )
        .map((record) => ({
          ...record,
          importer,
          sourceArea: 'oss-theme',
          owner: 'lynx-website' as const,
          role: 'authoritative' as const,
          boundary: 'runtime' as const,
        })),
    );
  }
  const themeImporter = records.find(
    (record) => record.sourceArea === 'oss-theme',
  )?.importer;
  assert.ok(themeImporter);

  const config = ts.readConfigFile(
    path.join(cwd, 'tsconfig.json'),
    ts.sys.readFile,
  );
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, cwd);
  const runtimeFor = (ossFirst = false) =>
    createRuntime(cwd, {
      root: path.join(cwd, 'docs'),
      themeDir: path.join(cwd, 'host/theme'),
      mediumZoom: false,
      ssg: true,
      llms: true,
      builderConfig: {
        resolve: {
          alias: {
            '@': (ossFirst
              ? ['oss-source', 'host/source']
              : ['host/source', 'oss-source']
            ).map((root) => path.join(cwd, root)),
            '@route-config$': path.join(cwd, 'host/routes.ts'),
          },
          aliasStrategy: 'prefer-alias',
        },
        performance: { buildCache: false },
      },
    });

  for (const customHooks of [false, true]) {
    await t.test(
      `active theme ${customHooks ? 'provides' : 'omits'} same-name hooks`,
      async () => {
        if (customHooks) {
          write(
            'host/theme/hooks/use-if-mobile.ts',
            'export const useIfMobile = () => true;',
          );
          write(
            'host/theme/hooks/use-fix-dark.ts',
            'export const useFixDark = () => true;',
          );
        }
        const runtime = await runtimeFor();
        try {
          assert.deepEqual(
            (await checkResolution(cwd, contracts, records, runtime)).errors,
            [],
          );
          assert.deepEqual(
            await checkImportPolicy(cwd, contracts, records, runtime),
            [],
          );
          for (const environment of runtime.environments) {
            const read = createExportReader(environment, parsed.options);
            for (const record of records) {
              const target = await environment.resolve(
                record.importer,
                record.specifier,
              );
              assert.ok(
                target,
                `${environment.name}: ${record.importer} -> ${record.specifier}`,
              );
              if (record.specifier !== '@route-config')
                assert.ok(
                  target.startsWith(path.join(cwd, 'oss-source/hooks/')),
                  target,
                );
              const surface = await read(target);
              assert.deepEqual(surface.errors, []);
              for (const { name } of record.bindings) {
                assert.ok(surface.names.has(name), `${target}: ${name}`);
              }
            }
            const barrel = await read(
              path.join(cwd, 'oss-source/hooks/index.ts'),
            );
            assert.deepEqual(barrel.errors, []);
            for (const [file, binding] of [
              ['use-if-mobile', 'useIfMobile'],
              ['use-fix-dark', 'useFixDark'],
            ] as const) {
              const implementation = path.join(
                cwd,
                `oss-source/hooks/${file}.ts`,
              );
              const original = await read(implementation);
              assert.deepEqual(original.errors, []);
              assert.ok(original.names.has(binding));
              assert.deepEqual(
                barrel.names.get(binding),
                original.names.get(binding),
              );
              assert.equal(
                await environment.resolve(
                  themeImporter,
                  `@theme/hooks/${file}`,
                ),
                customHooks
                  ? path.join(cwd, `host/theme/hooks/${file}.ts`)
                  : undefined,
              );
            }
          }
          const program = ts.createProgram(parsed.fileNames, parsed.options);
          assert.deepEqual(
            ts
              .getPreEmitDiagnostics(program)
              .map((diagnostic) =>
                ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
              ),
            [],
          );
        } finally {
          await runtime.close();
        }
      },
    );
  }

  await t.test(
    'shared i18n keys remain typed when OSS source mounts at src/oss',
    () => {
      mkdirSync(path.join(cwd, 'src'));
      symlinkSync(path.join(cwd, 'oss-source'), path.join(cwd, 'src/oss'));
      const probe = 'src/i18n-probe.ts';
      const validCalls = [
        "import { useI18n } from './oss/hooks/use-i18n';",
        "import type { SiteI18nText } from './oss/hooks/site-i18n';",
        "import translations from '../i18n.json';",
        'translations satisfies SiteI18nText;',
        'const t = useI18n();',
        "const siteLabel: string = t('api.reference');",
        "const builtInLabel: string = t('editLinkText');",
      ].join('\n');
      const diagnostics = (content: string) => {
        write(probe, content);
        return ts.getPreEmitDiagnostics(
          ts.createProgram([path.join(cwd, probe)], parsed.options),
        );
      };
      assert.deepEqual(
        diagnostics(validCalls).map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ),
        [],
      );
      const invalid = diagnostics(
        `${validCalls}\nt('api.reference.misspelled');`,
      );
      assert.deepEqual(
        invalid.map(({ code }) => code),
        [2345],
      );
      assert.equal(invalid[0]?.file?.fileName, path.join(cwd, probe));
    },
  );

  await t.test(
    'a consumer forwarding barrel cannot implement an OSS-private request',
    async () => {
      const runtime = await runtimeFor();
      try {
        const record = records.find(
          (record) => record.specifier === '@/hooks/use-canonical-latest-blog',
        )!;
        const violations = await checkImportPolicy(
          cwd,
          contracts,
          [{ ...record, specifier: '@/hooks' }],
          runtime,
        );
        assert.ok(
          violations.some(
            (violation) =>
              violation.rule === 'target-policy' &&
              violation.targetOwner === 'consumer',
          ),
        );
      } finally {
        await runtime.close();
      }
    },
  );

  await t.test(
    'a consumer hook cannot shadow the shared implementation',
    async () => {
      write(
        'host/source/hooks/use-if-mobile.ts',
        'export const useIfMobile = () => true;',
      );
      const runtime = await runtimeFor();
      try {
        const violations = await checkImportPolicy(
          cwd,
          contracts,
          records,
          runtime,
        );
        assert.ok(
          violations.some(
            (violation) =>
              violation.rule === 'target-policy' &&
              violation.targetOwner === 'consumer',
          ),
        );
        for (const environment of runtime.environments) {
          for (const record of records.filter(
            (record) => record.sourceArea === 'oss-components',
          )) {
            const target = await environment.resolve(
              record.importer,
              record.specifier,
            );
            assert.ok(
              target?.startsWith(path.join(cwd, 'oss-source/hooks/')),
              `${record.importer}: ${target}`,
            );
          }
        }
      } finally {
        await runtime.close();
      }
    },
  );

  await t.test(
    'TypeScript cannot shadow the shared hook while runtime resolves OSS',
    async () => {
      const runtime = await runtimeFor(true);
      try {
        const { errors } = await checkResolution(
          cwd,
          contracts,
          records,
          runtime,
        );
        assert.ok(
          errors.some(
            (error) =>
              error.includes('[typescript]') && error.includes('consumer'),
          ),
          errors.join('\n'),
        );
      } finally {
        await runtime.close();
      }
    },
  );
});
