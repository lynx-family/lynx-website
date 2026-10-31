/**
 * Synthetic downstream layouts use the real Rspress compiler and shared policy.
 * Filenames are fixture data, never an allowlist of published source targets.
 */
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  loadContracts,
  validateAliasContracts,
  type ActiveContracts,
} from './check-registry.js';
import { checkResolution } from './check-resolution.js';
import { parseImports, type ImportRecord } from './corpus.js';
import { createExportReader } from './exports.js';
import { createRuntime, type RuntimeAliases } from './runtime.js';
import type { ConsumerAliasExtension } from './types.js';

const repository = process.cwd();
mkdirSync(path.join(repository, 'node_modules/.cache'), { recursive: true });
function fixture() {
  const cwd = mkdtempSync(
    path.join(repository, 'node_modules/.cache/resolution-'),
  );
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  symlinkSync(
    path.join(repository, 'node_modules'),
    path.join(cwd, 'node_modules'),
  );
  write('package.json', '{"type":"module"}');
  mkdirSync(path.join(cwd, 'docs'));
  return { cwd, write };
}

test(
  'synthetic downstream resolution, ownership, wrappers, themes and extensions',
  { timeout: 180000 },
  async (t) => {
    const { cwd, write } = fixture();
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    const shared = await loadContracts();
    const contracts: ActiveContracts = {
      ...shared,
      sourceAreas: shared.sourceAreas.map((area) => ({
        ...area,
        root: `oss/${area.id}`,
        role: 'mounted',
        origins: [{ repository: 'fixture/oss', root: area.root }],
      })),
    };
    const areaRoot = (id: string) =>
      contracts.sourceAreas.find((area) => area.id === id)!.root;
    const addArea = (id: string, root: string) => {
      contracts.sourceAreas = [
        ...contracts.sourceAreas,
        { id, root, owner: 'consumer', role: 'authoritative' },
      ];
    };
    for (const area of contracts.sourceAreas) {
      write(`${area.root}/entry.ts`, 'export const Value = 1;');
    }
    write(
      `${areaRoot('oss-components')}/index.ts`,
      `export { Value } from './entry'; export interface Shape { value: number }`,
    );
    write(
      `${areaRoot('oss-lynx-ui-components')}/index.ts`,
      `export { Value } from './entry';`,
    );
    write(`${areaRoot('oss-luna')}/index.ts`, `export const Value = 1;`);
    write(
      `${areaRoot('oss-open-graph-config')}/index.ts`,
      `export const Value = 1;`,
    );
    write(`${areaRoot('oss-theme')}/index.ts`, `export const Value = 1;`);
    write(
      `${areaRoot('rspress-default-theme')}/fallback.ts`,
      `export const Value = 'framework';`,
    );
    write(
      `${areaRoot('rspress-default-theme')}/custom.ts`,
      `export const Value = 'framework';`,
    );
    write(
      `${areaRoot('oss-theme')}/custom.ts`,
      `export const Value = 'website';`,
    );
    write(
      `${areaRoot('oss-hooks')}/private-first.ts`,
      `export const Value = 'first';`,
    );
    write(
      `${areaRoot('oss-lib')}/private-fallback.ts`,
      `export const Value = 'fallback';`,
    );
    addArea('consumer-wrappers', 'consumer/wrappers');
    addArea('consumer-theme', 'consumer/theme');
    addArea('consumer-local', 'consumer/local');
    addArea('consumer-other', 'consumer/other');
    write(
      'consumer/wrappers/components.ts',
      `export * from '../../${areaRoot('oss-components')}'; export const Unique = 2;`,
    );
    write(
      'consumer/wrappers/ui.ts',
      `export * from '../../${areaRoot('oss-lynx-ui-components')}'; export const Unique = 2;`,
    );
    write('consumer/theme/index.ts', `export const Value = 1;`);
    write('consumer/theme/custom.ts', `export const Value = 'consumer';`);
    write('consumer/local/index.ts', `export const Value = 1;`);
    write('consumer/local/child.ts', `export const Value = 1;`);
    write('consumer/local/global.ts', 'const initialized = true;');
    write('consumer/local/child.css', `.example { color: red; }`);
    write(
      `${areaRoot('site-public-assets')}/icon.svg`,
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
    );
    write('consumer/other/child.ts', `export const Value = 1;`);
    const lifecycle = {
      state: 'stable',
      changePolicy: 'owner-controlled',
    } as const;
    const extensions: ConsumerAliasExtension[] = [
      'exact',
      'bare-and-subpaths',
      'subpaths-only',
    ].map(
      (kind, index) =>
        ({
          id: `fixture-local-${index}`,
          specifier: `@fixture${index}`,
          kind,
          owner: 'consumer',
          visibility: 'owner-private',
          allowedImporters: ['consumer'],
          ...(kind !== 'subpaths-only'
            ? { bareTargetOwners: ['consumer'] as const }
            : {}),
          ...(kind !== 'exact'
            ? { subpaths: { targetOwners: ['consumer'] as const, lifecycle } }
            : {}),
          canonical: { omitIndex: false, omitSourceExtensions: false },
          allowMultipleResolverRoots: false,
          implementationSources: {
            requiredAreas: ['consumer-local'],
            additionalOwners: [],
          },
          downstream: {
            implementation: 'required',
            ...(kind !== 'subpaths-only' ? { mayExtendBare: false } : {}),
          },
          lifecycle,
        }) as ConsumerAliasExtension,
    );
    const nested = '@luna/__alias_descendant__';
    extensions.push({
      ...extensions[0]!,
      id: 'fixture-nested',
      specifier: nested,
    });
    contracts.aliases = [...contracts.aliases, ...extensions];
    const bindings: RuntimeAliases = {
      '@lynx$': path.join(cwd, 'consumer/wrappers/components.ts'),
      '@lynx': path.join(cwd, areaRoot('oss-components')),
      '@lynx-ui$': path.join(cwd, 'consumer/wrappers/ui.ts'),
      '@lynx-ui': path.join(cwd, areaRoot('oss-lynx-ui-components')),
      '@luna$': path.join(cwd, areaRoot('oss-luna'), 'index.ts'),
      '@og-config$': path.join(
        cwd,
        areaRoot('oss-open-graph-config'),
        'index.ts',
      ),
      '@docs': path.join(cwd, areaRoot('lynx-ui-package-docs')),
      '@assets': path.join(cwd, areaRoot('site-public-assets')),
      '@theme': [
        path.join(cwd, 'consumer/theme'),
        path.join(cwd, areaRoot('rspress-default-theme')),
      ],
      '@site': cwd,
      '@': [
        path.join(cwd, areaRoot('oss-hooks')),
        path.join(cwd, areaRoot('oss-lib')),
      ],
      '@fixture0$': path.join(cwd, 'consumer/local/index.ts'),
      '@fixture1': path.join(cwd, 'consumer/local'),
      '@fixture2': path.join(cwd, 'consumer/local'),
      [`${nested}$`]: path.join(cwd, 'consumer/local/index.ts'),
    };
    const configureTs = (
      overrides: Record<string, string[]> = {},
      compilerOptions: Record<string, unknown> = {},
    ) => {
      const paths: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(bindings)) {
        const specifier = key.replace(/\$$/, '');
        const alias = contracts.aliases.find(
          (alias) => alias.specifier === specifier,
        )!;
        if (!alias) continue;
        const roots = (Array.isArray(value) ? value : [value]).map((root) =>
          path.relative(cwd, root as string),
        );
        if (key.endsWith('$') || alias.kind === 'bare-and-subpaths')
          paths[specifier] ??= roots.map((root) =>
            root.endsWith('.ts') ? root : `${root}/index.ts`,
          );
        if (!key.endsWith('$') && alias.kind !== 'exact')
          paths[`${specifier}/*`] = roots.map((root) => `${root}/*`);
      }
      // Separate TS declarations may describe an implemented runtime namespace.
      delete paths['@theme'];
      write(
        'global.d.ts',
        `declare module '@theme' { export const Value: number; }
declare module '*.css';
declare module '*.svg';`,
      );
      write(
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            module: 'ESNext',
            moduleResolution: 'bundler',
            target: 'ES2022',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            paths: { ...paths, ...overrides },
            ...compilerOptions,
          },
          include: ['global.d.ts'],
        }),
      );
    };
    const record = (
      specifier: string,
      source = 'oss-components',
      typeOnly = false,
    ): ImportRecord => {
      const root = areaRoot(source);
      return {
        importer: `${root}/entry.ts`,
        owner: contracts.sourceAreas.find((area) => area.id === source)!.owner,
        sourceArea: source,
        specifier,
        kind: 'import',
        line: 1,
        bindings: [{ name: typeOnly ? 'Shape' : 'Value', typeOnly }],
      };
    };
    const consumerRecord = (specifier: string) => ({
      ...record(specifier),
      importer: 'consumer/local/entry.ts',
      owner: 'consumer' as const,
      sourceArea: 'consumer-local',
    });
    const records = [
      record('@lynx'),
      record('@lynx/entry'),
      record('@lynx-ui'),
      record('@lynx-ui/entry'),
      record('@luna'),
      record('@og-config'),
      record('@theme'),
      record('@theme/custom'),
      record('@theme/fallback'),
      record('@/private-first'),
      record('@/private-fallback'),
      record('@lynx', 'oss-components', true),
      consumerRecord('@fixture0'),
      consumerRecord('@fixture1'),
      consumerRecord('@fixture1/child'),
      consumerRecord('@fixture2/child'),
      consumerRecord(nested),
      { ...consumerRecord('@fixture1/global'), bindings: [] },
      { ...consumerRecord('@fixture1/child.css'), bindings: [] },
      { ...consumerRecord('@assets/icon.svg'), bindings: [] },
    ];
    const run = async (
      corpus = records,
      overrides: Record<string, string[]> = {},
      compilerOptions: Record<string, unknown> = {},
    ) => {
      configureTs(overrides, compilerOptions);
      const runtime = await createRuntime(cwd, {
        root: path.join(cwd, 'docs'),
        themeDir: Array.isArray(bindings['@theme'])
          ? bindings['@theme'][0]
          : bindings['@theme'],
        mediumZoom: false,
        ssg: true,
        llms: true,
        builderConfig: {
          resolve: { alias: bindings, aliasStrategy: 'prefer-alias' },
          performance: { buildCache: false },
        },
      });
      try {
        return {
          result: await checkResolution(cwd, contracts, corpus, runtime),
          runtime,
        };
      } finally {
        await runtime.close();
      }
    };
    await t.test(
      'accepted layout preserves OSS identities and split bare/prefix bindings',
      async () => {
        assert.deepEqual(
          validateAliasContracts({
            ...contracts,
            aliases: shared.aliases,
            aliasExtensions: extensions,
            sourceAreaPolicy: shared.sourceAreas,
          }),
          [],
        );
        // subpaths-only fixture must not have an index capable of bare resolution.
        bindings['@fixture2'] = path.join(cwd, 'consumer/local/subpaths');
        write('consumer/local/subpaths/child.ts', 'export const Value = 1;');
        const { result } = await run();
        assert.deepEqual(result.errors, []);
      },
    );
    await t.test(
      'synthetic probes do not inherit unused-binding lint diagnostics',
      async () => {
        assert.deepEqual(
          (await run(records, {}, { noUnusedLocals: true })).result.errors,
          [],
        );
      },
    );
    await t.test(
      'TypeScript bare entries preserve the complete OSS surface independently of imports',
      async () => {
        write(
          'consumer/local/incomplete.ts',
          `export { Value } from '../../${areaRoot('oss-components')}';`,
        );
        for (const corpus of [[], [record('@lynx/entry')]]) {
          assert.ok(
            (
              await run(corpus, { '@lynx': ['consumer/local/incomplete.ts'] })
            ).result.errors.some((error) =>
              error.includes(
                "TypeScript bare entry must preserve OSS export 'Shape'",
              ),
            ),
          );
        }
        write(
          'consumer/local/complete.d.ts',
          'export declare const Value: number; export interface Shape { value: number }',
        );
        assert.deepEqual(
          (await run([], { '@lynx': ['consumer/local/complete.d.ts'] })).result
            .errors,
          [],
        );
      },
    );
    await t.test(
      'bare TypeScript entries retain value, type and namespace capabilities',
      async () => {
        const original = `${areaRoot('oss-components')}/index.ts`;
        const saved = readFileSync(path.join(cwd, original), 'utf8');
        write(
          original,
          `${saved}
export class Model {}
export namespace Group { export interface Item {} }`,
        );
        write(
          'consumer/local/capabilities.d.ts',
          `export interface Value {}
export declare const Shape: number;
export interface Model {}
export declare const Group: number;`,
        );
        try {
          const { result } = await run([], {
            '@lynx': ['consumer/local/capabilities.d.ts'],
          });
          for (const name of ['Value', 'Shape', 'Model', 'Group'])
            assert.ok(
              result.errors.some((error) =>
                error.includes(`must preserve OSS export '${name}'`),
              ),
              `${name}: ${result.errors.join('\n')}`,
            );
          write(
            'consumer/local/capabilities.d.ts',
            `export declare const Value: number;
export interface Shape { value: number }
export declare class Model {}
export declare namespace Group { export interface Item {} }`,
          );
          assert.deepEqual(
            (await run([], { '@lynx': ['consumer/local/capabilities.d.ts'] }))
              .result.errors,
            [],
          );
        } finally {
          write(original, saved);
        }
      },
    );
    await t.test(
      'bare TypeScript entries preserve values through type-only forwarding chains',
      async (t) => {
        const original = `${areaRoot('oss-components')}/index.ts`;
        const saved = readFileSync(path.join(cwd, original), 'utf8');
        const source = `../../${areaRoot('oss-components')}`;
        write(original, `${saved}\nexport class Model {}`);
        write('consumer/local/type-hop.ts', `export type * from '${source}';`);
        const cases = [
          `export type { Value, Shape, Model } from '${source}';`,
          `export { type Value, type Shape, type Model } from '${source}';`,
          `import type { Value, Shape, Model } from '${source}'; export { Value, Shape, Model };`,
          `import { type Value, type Shape, type Model } from '${source}'; export { Value, Shape, Model };`,
          `export { Value, Shape, Model } from './type-hop';`,
          `export * from './type-hop';`,
        ];
        try {
          for (const content of cases) {
            await t.test(content, async () => {
              write('consumer/local/forwarded.ts', content);
              const { result } = await run([], {
                '@lynx': ['consumer/local/forwarded.ts'],
              });
              assert.deepEqual(result.errors, [
                "@lynx: TypeScript bare entry must preserve OSS export 'Model'",
                "@lynx: TypeScript bare entry must preserve OSS export 'Value'",
              ]);
            });
          }
          write('consumer/local/type-hop.ts', `export * from '${source}';`);
          assert.deepEqual(
            (await run([], { '@lynx': ['consumer/local/forwarded.ts'] })).result
              .errors,
            [],
          );
          write(
            original,
            `export type { Value } from './entry'; export interface Shape { value: number }`,
          );
          write(
            'consumer/local/forwarded.ts',
            `export type * from '${source}';`,
          );
          assert.deepEqual(
            (await run([], { '@lynx': ['consumer/local/forwarded.ts'] })).result
              .errors,
            [],
          );
        } finally {
          write(original, saved);
        }
      },
    );
    await t.test(
      'wrappers may forward erased namespaces as types but must retain instantiated namespaces',
      async (t) => {
        const original = `${areaRoot('oss-components')}/index.ts`;
        const wrapper = 'consumer/wrappers/components.ts';
        const saved = readFileSync(path.join(cwd, original), 'utf8');
        const savedWrapper = readFileSync(path.join(cwd, wrapper), 'utf8');
        const source = `../../${areaRoot('oss-components')}`;
        try {
          for (const [body, value] of [
            ['{ export interface Item {} }', false],
            ['{ export type Item = string }', false],
            ['{ export namespace Child { export interface Item {} } }', false],
            ['.Child { export interface Item {} }', false],
            ['{ export const item = 1 }', true],
            ['{ export namespace Child { export const item = 1 } }', true],
          ] as const) {
            await t.test(body, async () => {
              write(original, `${saved}\nexport namespace Group ${body}`);
              write(
                wrapper,
                `export { Value, type Shape, type Group } from '${source}';`,
              );
              const { result } = await run([]);
              assert.deepEqual(
                result.errors,
                value
                  ? [
                      "@lynx: TypeScript bare entry must preserve OSS export 'Group'",
                      "@lynx: wrapper must preserve OSS export 'Group'",
                    ]
                  : [],
              );
              if (value) {
                write(wrapper, `export * from '${source}';`);
                assert.deepEqual((await run([])).result.errors, []);
              }
            });
          }
        } finally {
          write(original, saved);
          write(wrapper, savedWrapper);
        }
      },
    );
    await t.test(
      'consumer theme custom subpath wins and framework-only subpath falls through',
      async () => {
        configureTs();
        const runtime = await createRuntime(cwd, {
          root: path.join(cwd, 'docs'),
          themeDir: path.join(cwd, 'consumer/theme'),
          ssg: false,
          mediumZoom: false,
          builderConfig: { resolve: { alias: bindings } },
        });
        try {
          const environment = runtime.environments[0]!;
          assert.equal(
            await environment.resolve(records[0]!.importer, '@theme/custom'),
            path.join(cwd, 'consumer/theme/custom.ts'),
          );
          assert.equal(
            await environment.resolve(records[0]!.importer, '@theme/fallback'),
            path.join(cwd, areaRoot('rspress-default-theme'), 'fallback.ts'),
          );
          assert.equal(
            await environment.resolve(records[0]!.importer, '@/private-first'),
            path.join(cwd, areaRoot('oss-hooks'), 'private-first.ts'),
          );
          assert.equal(
            await environment.resolve(
              records[0]!.importer,
              '@/private-fallback',
            ),
            path.join(cwd, areaRoot('oss-lib'), 'private-fallback.ts'),
          );
        } finally {
          await runtime.close();
        }
      },
    );
    await t.test(
      'website custom theme is also an accepted implementation',
      async () => {
        const saved = bindings['@theme'];
        bindings['@theme'] = [
          path.join(cwd, areaRoot('oss-theme')),
          path.join(cwd, areaRoot('rspress-default-theme')),
        ];
        try {
          assert.deepEqual((await run()).result.errors, []);
        } finally {
          bindings['@theme'] = saved!;
        }
      },
    );
    await t.test(
      'wrappers cannot omit OSS type exports or replace existing values',
      async () => {
        write(
          'consumer/wrappers/components.ts',
          `export { Value } from '../../${areaRoot('oss-components')}';`,
        );
        assert.ok(
          (await run()).result.errors.some((error) =>
            error.includes("preserve OSS export 'Shape'"),
          ),
        );
        write(
          'consumer/wrappers/components.ts',
          `export * from '../../${areaRoot('oss-components')}'; export const Value = 2;`,
        );
        assert.ok(
          (await run()).result.errors.some((error) =>
            error.includes("preserve OSS export 'Value'"),
          ),
        );
        write(
          'consumer/wrappers/components.ts',
          `export * from '../../${areaRoot('oss-components')}'; export * from '../other/child';`,
        );
        assert.ok(
          (await run()).result.errors.some((error) =>
            error.includes("export collision 'Value'"),
          ),
        );
        write(
          'consumer/wrappers/components.ts',
          `export * from '../../${areaRoot('oss-components')}'; export const Unique = 2;`,
        );
      },
    );
    await t.test(
      'consumer wrapper direct subpaths and private consumer shadowing are ownership violations',
      async () => {
        const saved = bindings['@lynx'];
        bindings['@lynx'] = path.join(cwd, 'consumer/local');
        const first = await run([record('@lynx/child')]);
        assert.ok(
          first.result.errors.some((error) =>
            error.includes(
              "target owner 'consumer' is not allowed for subpath",
            ),
          ),
        );
        bindings['@lynx'] = saved!;
        const privateRoots = bindings['@'];
        bindings['@'] = [
          path.join(cwd, 'consumer/local'),
          path.join(cwd, areaRoot('oss-lib')),
        ];
        const shadow = await run([
          record('@/child'),
          consumerRecord('@/private-fallback'),
        ]);
        assert.ok(
          shadow.result.errors.some((error) =>
            error.includes('private target'),
          ),
        );
        assert.ok(
          shadow.result.errors.some((error) =>
            error.includes("importer owner 'consumer'"),
          ),
        );
        assert.ok(
          !shadow.result.errors.some((error) =>
            error.includes('multiple resolver roots'),
          ),
        );
        bindings['@'] = privateRoots!;
      },
    );
    await t.test(
      'extension targets are bounded by declared areas, including symlink escapes',
      async () => {
        const saved = bindings['@fixture2'];
        bindings['@fixture2'] = path.join(cwd, 'consumer/other');
        assert.ok(
          (await run([consumerRecord('@fixture2/child')])).result.errors.some(
            (error) =>
              error.includes("source area 'consumer-other' is not permitted"),
          ),
        );
        symlinkSync(
          path.join(cwd, areaRoot('oss-components')),
          path.join(cwd, 'consumer/local/escape'),
        );
        bindings['@fixture2'] = path.join(cwd, 'consumer/local/escape');
        assert.ok(
          (await run([consumerRecord('@fixture2/entry')])).result.errors.some(
            (error) =>
              error.includes("private target must belong to 'consumer'"),
          ),
        );
        bindings['@fixture2'] = saved!;
      },
    );
    await t.test(
      'shape and spelling negatives fail, independently of observed filenames',
      async () => {
        const saved = bindings['@luna$'];
        delete bindings['@luna$'];
        bindings['@luna'] = path.join(cwd, areaRoot('oss-luna'));
        write(
          `${areaRoot('oss-luna')}/__alias_descendant___.ts`,
          'export const Value = 1;',
        );
        const descendants = (await run()).result.errors;
        assert.ok(
          descendants.some((error) =>
            error.includes('must use exact matching'),
          ),
        );
        assert.ok(
          descendants.some((error) =>
            error.includes(
              '@luna/__alias_descendant___ [web]: unsupported shape resolves',
            ),
          ),
        );
        delete bindings['@luna'];
        bindings['@luna$'] = saved!;
        bindings['@unregistered'] = path.join(cwd, 'consumer/local');
        assert.ok(
          (await run()).result.errors.some((error) =>
            error.includes('unaccounted runtime resolver key'),
          ),
        );
        delete bindings['@unregistered'];
        bindings['@luna$$'] = saved!;
        assert.ok(
          (await run()).result.errors.some((error) =>
            error.includes("resolver key '@luna$$'"),
          ),
        );
        delete bindings['@luna$$'];
        const sibling = '@fixture0__alias_sibling__$';
        bindings[sibling] = bindings['@fixture0$']!;
        assert.ok(
          (await run([])).result.errors.some((error) =>
            error.includes(
              '@fixture0__alias_sibling__ [web]: unsupported shape resolves',
            ),
          ),
        );
        delete bindings[sibling];
        const subpathRoot = bindings['@fixture2'];
        bindings['@fixture2'] = path.join(cwd, 'consumer/local');
        assert.ok(
          (await run([])).result.errors.some((error) =>
            error.includes('@fixture2 [web]: unsupported shape resolves'),
          ),
        );
        bindings['@fixture2'] = subpathRoot!;
        const broken = await run([
          record('@luna/child'),
          consumerRecord('@fixture2'),
        ]);
        assert.ok(
          broken.result.errors.some((error) =>
            error.includes('runtime resolution failed'),
          ),
        );
      },
    );
    await t.test(
      'ambient declarations require compatible runtime implementations',
      async () => {
        write('consumer/theme/index.ts', 'export const Value = "wrong type";');
        assert.ok(
          (await run([record('@theme')])).result.errors.some((error) =>
            error.includes('incompatible with its TypeScript declaration'),
          ),
        );
        write('consumer/theme/index.ts', 'export const Different = 1;');
        assert.ok(
          (await run([record('@theme')])).result.errors.some((error) =>
            error.includes("missing runtime value 'Value'"),
          ),
        );
        const namespace = {
          ...record('@theme'),
          bindings: [{ name: '*', typeOnly: false }],
        };
        assert.ok(
          (await run([namespace])).result.errors.some((error) =>
            error.includes("missing runtime value 'Value'"),
          ),
        );
        write('consumer/theme/index.ts', 'export const Value = 1;');
        const saved = bindings['@fixture0$'];
        write(
          'consumer/local/types.d.ts',
          'export declare const Value: number;',
        );
        bindings['@fixture0$'] = path.join(cwd, 'consumer/local/types.d.ts');
        try {
          for (const corpus of [[], [consumerRecord('@fixture0')]])
            assert.ok(
              (await run(corpus)).result.errors.some((error) =>
                error.includes('runtime target is a declaration file'),
              ),
            );
        } finally {
          bindings['@fixture0$'] = saved!;
        }
        write('types/local.d.mts', 'export declare const Value: number;');
        assert.deepEqual(
          (
            await run([consumerRecord('@fixture0')], {
              '@fixture0': ['types/local.d.mts'],
            })
          ).result.errors,
          [],
        );
      },
    );
    await t.test(
      'ordinary star re-exports exclude defaults while namespaces retain them',
      async () => {
        write(
          'consumer/local/star-types.d.ts',
          'export declare const Value: number; export default Value;',
        );
        for (const file of ['entry.ts', 'entry.mdx']) {
          const parsed = (source: string) =>
            parseImports(file, source).map((entry) => ({
              ...consumerRecord('@fixture0'),
              ...entry,
            }));
          const overrides = { '@fixture0': ['consumer/local/star-types.d.ts'] };
          assert.deepEqual(
            (await run(parsed("export * from '@fixture0';"), overrides)).result
              .errors,
            [],
          );
          for (const source of [
            "import * as Local from '@fixture0';",
            "export * as Local from '@fixture0';",
          ])
            assert.ok(
              (await run(parsed(source), overrides)).result.errors.some(
                (error) => error.includes("missing runtime value 'default'"),
              ),
            );
        }
      },
    );
    await t.test(
      'CommonJS alias requests are rejected explicitly while remaining in the corpus',
      async () => {
        for (const [file, source] of [
          ['entry.ts', "import Local = require('@fixture0');"],
          ['entry.ts', "const Local = require('@fixture0');"],
          ['entry.ts', "import type Local = require('@fixture0');"],
          ['entry.mdx', "export const Local = require('@fixture0');"],
          ['entry.mdx', "<Component value={require('@fixture0')} />"],
        ]) {
          const corpus = parseImports(file!, source!).map((entry) => ({
            ...consumerRecord(entry.specifier),
            ...entry,
          }));
          assert.ok(
            (await run(corpus)).result.errors.some((error) =>
              error.includes('unsupported alias-bearing CommonJS request'),
            ),
          );
        }
      },
    );
    await t.test(
      'string-named MDX re-exports use the original runtime binding',
      async () => {
        const corpus = parseImports(
          'entry.mdx',
          'export { "Value" as Renamed } from "@fixture0";',
        ).map((entry) => ({ ...consumerRecord(entry.specifier), ...entry }));
        assert.deepEqual((await run(corpus)).result.errors, []);
      },
    );
    await t.test(
      'forwarded missing defaults fail without fabricating export surfaces',
      async () => {
        write(
          'consumer/local/missing-default.ts',
          "import Local from './child'; export default Local;",
        );
        const request = {
          ...consumerRecord('@fixture1/missing-default'),
          bindings: [{ name: 'default', typeOnly: false }],
        };
        assert.ok(
          (await run([request])).result.errors.some((error) =>
            error.includes("missing forwarded export 'default'"),
          ),
        );
        configureTs();
        const runtime = await createRuntime(cwd, {
          root: path.join(cwd, 'docs'),
          themeDir: path.join(cwd, 'consumer/theme'),
          mediumZoom: false,
          builderConfig: { resolve: { alias: bindings } },
        });
        try {
          const surface = await createExportReader(runtime.environments[0]!)(
            path.join(cwd, 'consumer/local/missing-default.ts'),
          );
          assert.ok(
            surface.errors.some((error) =>
              error.includes("missing forwarded export 'default'"),
            ),
          );
          assert.equal(surface.names.has('default'), false);
        } finally {
          await runtime.close();
        }
      },
    );
    await t.test(
      'erased type imports accept declaration targets and retain ownership checks',
      async () => {
        write(
          'consumer/local/types.d.ts',
          'export interface Shape { value: number }',
        );
        const typed = {
          ...consumerRecord('@fixture1/types.d.ts'),
          bindings: [{ name: 'Shape', typeOnly: true }],
        };
        assert.deepEqual((await run([typed])).result.errors, []);
        const saved = bindings['@fixture1'];
        bindings['@fixture1'] = path.join(cwd, 'consumer/other');
        write('consumer/other/types.d.ts', 'export interface Shape {}');
        try {
          assert.ok(
            (await run([typed])).result.errors.some((error) =>
              error.includes("source area 'consumer-other' is not permitted"),
            ),
          );
        } finally {
          bindings['@fixture1'] = saved!;
        }
      },
    );
    await t.test(
      'explicit source module formats are retained by Node16 probes',
      async () => {
        write('consumer/local/esm.mts', 'export const Value = 1;');
        write('consumer/local/common.cts', 'export const Value = 1;');
        write('package.json', '{}');
        const saved = bindings['@fixture0$'];
        try {
          for (const extension of ['mts', 'mjs', 'cts', 'cjs']) {
            const esm = extension === 'mts' || extension === 'mjs';
            const typed = {
              ...consumerRecord('@fixture0'),
              importer: `consumer/local/importer.${extension}`,
              bindings: [{ name: 'Value', typeOnly: false }],
            };
            bindings['@fixture0$'] = path.join(
              cwd,
              esm ? 'consumer/local/esm.mts' : 'consumer/local/common.cts',
            );
            assert.deepEqual(
              (
                await run(
                  [typed],
                  {
                    '@fixture0': [
                      esm
                        ? 'consumer/local/esm.mts'
                        : 'consumer/local/common.cts',
                    ],
                  },
                  { module: 'Node16', moduleResolution: 'Node16' },
                )
              ).result.errors,
              [],
            );
          }
        } finally {
          bindings['@fixture0$'] = saved!;
          write('package.json', '{"type":"module"}');
        }
      },
    );
    await t.test(
      'multiple dynamic imports are isolated modules alongside static probes',
      async () => {
        const dynamic = ['entry.ts', 'entry.tsx', 'entry.mdx'].map((file) => ({
          ...consumerRecord('@fixture0'),
          importer: `consumer/local/${file}`,
          kind: 'dynamic' as const,
          bindings: [{ name: '*', typeOnly: false }],
        }));
        assert.deepEqual(
          (await run([...dynamic, consumerRecord('@fixture0')])).result.errors,
          [],
        );
      },
    );
    await t.test(
      'dynamic imports retain ESM resolution from CommonJS probes',
      async () => {
        write('consumer/local/dynamic-target.mts', 'export const Value = 1;');
        write('package.json', '{}');
        const saved = bindings['@fixture0$'];
        bindings['@fixture0$'] = path.join(
          cwd,
          'consumer/local/dynamic-target.mts',
        );
        const dynamic = {
          ...consumerRecord('@fixture0'),
          importer: 'consumer/local/dynamic-importer.cts',
          kind: 'dynamic' as const,
          bindings: [{ name: '*', typeOnly: false }],
        };
        try {
          assert.deepEqual(
            (
              await run(
                [dynamic],
                { '@fixture0': ['consumer/local/dynamic-target.mts'] },
                { module: 'Node16', moduleResolution: 'Node16' },
              )
            ).result.errors,
            [],
          );
        } finally {
          bindings['@fixture0$'] = saved!;
          write('package.json', '{"type":"module"}');
        }
      },
    );
    await t.test(
      'ambient erased imports enforce importer permissions and alias shape',
      async () => {
        write(
          'types/ambient.d.ts',
          `
declare module '@/ambient-types' { export interface Shape {} }
declare module '@luna/ambient-types' { export interface Shape {} }
declare module '@fixture1/ambient-types' { export interface Shape {} }
`,
        );
        const typed = (specifier: string) => ({
          ...consumerRecord(specifier),
          bindings: [{ name: 'Shape', typeOnly: true }],
        });
        const include = { include: ['global.d.ts', 'types/ambient.d.ts'] };
        const runAmbient = async (specifier: string) => {
          // Keep the caller's ambient declarations as probe roots.
          configureTs();
          const original = JSON.parse(
            readFileSync(path.join(cwd, 'tsconfig.json'), 'utf8'),
          );
          write('tsconfig.json', JSON.stringify({ ...original, ...include }));
          const runtime = await createRuntime(cwd, {
            root: path.join(cwd, 'docs'),
            themeDir: path.join(cwd, 'consumer/theme'),
            mediumZoom: false,
            builderConfig: { resolve: { alias: bindings } },
          });
          try {
            return await checkResolution(
              cwd,
              contracts,
              [typed(specifier)],
              runtime,
            );
          } finally {
            await runtime.close();
          }
        };
        assert.deepEqual(
          (await runAmbient('@fixture1/ambient-types')).errors,
          [],
        );
        assert.ok(
          (await runAmbient('@/ambient-types')).errors.some((error) =>
            error.includes("importer owner 'consumer' is not allowed"),
          ),
        );
        assert.ok(
          (await runAmbient('@luna/ambient-types')).errors.some((error) =>
            error.includes('unsupported direct subpath'),
          ),
        );
      },
    );
    await t.test(
      'literal import types retain missing-export and ownership diagnostics',
      async () => {
        write(
          'consumer/local/import-type-target.d.ts',
          'export interface Shape {}',
        );
        const syntax = parseImports(
          'consumer/local/import-type.ts',
          "type Shape = import('@fixture1/import-type-target').Missing;",
        );
        assert.equal(syntax.length, 1);
        const corpus = syntax.map((entry) => ({
          ...consumerRecord(entry.specifier),
          ...entry,
        }));
        assert.ok(
          (await run(corpus)).result.errors.some((error) =>
            error.includes('Missing'),
          ),
        );
      },
    );
    await t.test(
      'barrel type-only edges use declarations and preserve wrapper identities',
      async () => {
        const root = areaRoot('oss-components');
        write(`${root}/erased-types.d.ts`, 'export interface DeclaredShape {}');
        write(
          `${root}/index.ts`,
          `
export { Value } from './entry';
export interface Shape { value: number }
export type { DeclaredShape } from './erased-types.js';
`,
        );
        write(
          'consumer/wrappers/components.ts',
          `
import type { DeclaredShape } from '../../${root}/erased-types.js';
export { Value, Shape } from '../../${root}';
export type { DeclaredShape };
`,
        );
        try {
          assert.deepEqual((await run([record('@lynx')])).result.errors, []);
          write(
            'consumer/wrappers/components.ts',
            `
import { type DeclaredShape } from '../../${root}/erased-types.js';
export { Value, Shape } from '../../${root}';
export { type DeclaredShape };
`,
          );
          assert.deepEqual((await run([record('@lynx')])).result.errors, []);
          write(
            'consumer/wrappers/components.ts',
            `
export { Value, Shape } from '../../${root}';
export type * from '../../${root}/erased-types.js';
`,
          );
          assert.deepEqual((await run([record('@lynx')])).result.errors, []);
          write(
            'consumer/wrappers/components.ts',
            `export { Value, Shape } from '../../${root}';`,
          );
          assert.ok(
            (await run([record('@lynx')])).result.errors.some((error) =>
              error.includes("preserve OSS export 'DeclaredShape'"),
            ),
          );
          write(
            'consumer/wrappers/components.ts',
            `export * from '../../${root}';`,
          );
          write(
            `${root}/index.ts`,
            "export { Value } from './entry'; export type { Missing } from './missing-types.js';",
          );
          assert.ok(
            (await run([record('@lynx')])).result.errors.some((error) =>
              error.includes("unresolved re-export './missing-types.js'"),
            ),
          );
        } finally {
          write(
            `${root}/index.ts`,
            "export { Value } from './entry'; export interface Shape { value: number }",
          );
          write(
            'consumer/wrappers/components.ts',
            `export * from '../../${root}'; export const Unique = 2;`,
          );
        }
      },
    );
    await t.test(
      'side-effect imports require a TypeScript file or ambient declaration',
      async () => {
        const sideEffect = {
          ...consumerRecord('@fixture1/global'),
          bindings: [],
        };
        assert.deepEqual((await run([sideEffect])).result.errors, []);
        assert.ok(
          (
            await run([sideEffect], { '@fixture1/*': ['missing/*'] })
          ).result.errors.some((error) =>
            error.includes('no module or ambient declaration'),
          ),
        );
      },
    );
    await t.test(
      'ambient source declarations do not provide emitted runtime exports',
      async () => {
        const request = consumerRecord('@fixture1/ambient');
        write(
          'consumer/local/ambient.ts',
          'export declare const Value: number;',
        );
        assert.ok(
          (await run([request])).result.errors.some((error) =>
            error.includes("missing runtime value 'Value'"),
          ),
        );
        write(
          'consumer/local/ambient.ts',
          'declare const Value: number; export { Value };',
        );
        assert.ok(
          (await run([request])).result.errors.some((error) =>
            error.includes("missing runtime value 'Value'"),
          ),
        );
        write('consumer/local/ambient.ts', 'export function Value(): number;');
        assert.ok(
          (await run([request])).result.errors.some((error) =>
            error.includes("missing runtime value 'Value'"),
          ),
        );
      },
    );
    await t.test(
      'static export traversal preserves local types, namespaces and default identities',
      async () => {
        write(
          'consumer/local/surface.ts',
          `
interface Shape { value: number }
export { Shape };
export const { Value } = { Value: 1 };
export * as Namespace from './child';
`,
        );
        write(
          'consumer/local/forward.ts',
          `
import * as Local from './child';
export { Local as Namespace };
`,
        );
        write(
          'consumer/local/default.ts',
          'const Value = 1; export default Value;',
        );
        write(
          'consumer/local/forward-default.ts',
          "import Local from './default'; export default Local;",
        );
        write(
          'consumer/local/type-default.ts',
          "import type Local from './default'; export { Local as default };",
        );
        configureTs();
        const runtime = await createRuntime(cwd, {
          root: path.join(cwd, 'docs'),
          themeDir: path.join(cwd, 'consumer/theme'),
          mediumZoom: false,
          builderConfig: { resolve: { alias: bindings } },
        });
        try {
          const read = createExportReader(runtime.environments[0]!);
          const original = await read(
            path.join(cwd, 'consumer/local/surface.ts'),
          );
          const forwarded = await read(
            path.join(cwd, 'consumer/local/forward.ts'),
          );
          assert.deepEqual(original.errors, []);
          assert.equal(original.names.get('Shape')?.value, false);
          assert.equal(original.names.get('Value')?.value, true);
          assert.deepEqual(
            original.names.get('Namespace'),
            forwarded.names.get('Namespace'),
          );
          assert.deepEqual(
            (await read(path.join(cwd, 'consumer/local/default.ts'))).names.get(
              'default',
            ),
            (
              await read(path.join(cwd, 'consumer/local/forward-default.ts'))
            ).names.get('default'),
          );
          assert.equal(
            (
              await read(path.join(cwd, 'consumer/local/type-default.ts'))
            ).names.get('default')?.value,
            false,
          );
          write(
            'consumer/local/cycle-a.ts',
            "export * from './cycle-b'; export const A = 1;",
          );
          write(
            'consumer/local/cycle-b.ts',
            "export * from './cycle-a'; export const B = 1;",
          );
          const a = await read(path.join(cwd, 'consumer/local/cycle-a.ts'));
          const b = await read(path.join(cwd, 'consumer/local/cycle-b.ts'));
          assert.deepEqual(a.errors, []);
          assert.deepEqual(b.errors, []);
          assert.deepEqual([...a.names.keys()].sort(), ['A', 'B']);
          assert.deepEqual([...b.names.keys()].sort(), ['A', 'B']);
          const reverse = createExportReader(runtime.environments[0]!);
          assert.deepEqual(
            [
              ...(
                await reverse(path.join(cwd, 'consumer/local/cycle-b.ts'))
              ).names.keys(),
            ].sort(),
            ['A', 'B'],
          );
          assert.deepEqual(
            [
              ...(
                await reverse(path.join(cwd, 'consumer/local/cycle-a.ts'))
              ).names.keys(),
            ].sort(),
            ['A', 'B'],
          );
          write(
            'consumer/local/named-a.ts',
            "export { B } from './named-b'; export const A = 1;",
          );
          write(
            'consumer/local/named-b.ts',
            "export { A } from './named-a'; export const B = 1;",
          );
          const named = await read(path.join(cwd, 'consumer/local/named-a.ts'));
          assert.deepEqual(named.errors, []);
          assert.deepEqual([...named.names.keys()].sort(), ['A', 'B']);
          write(
            'consumer/local/collision-a.ts',
            "export * from './collision-b'; export * from './child';",
          );
          write(
            'consumer/local/collision-b.ts',
            "export * from './collision-a'; export * from '../other/child';",
          );
          assert.ok(
            (
              await read(path.join(cwd, 'consumer/local/collision-a.ts'))
            ).errors.some((error) =>
              error.includes("export collision 'Value'"),
            ),
          );
          write(
            'consumer/local/overloaded.ts',
            'function Value(): number; function Value() { return 1; } export { Value };',
          );
          assert.equal(
            (
              await read(path.join(cwd, 'consumer/local/overloaded.ts'))
            ).names.get('Value')?.value,
            true,
          );
        } finally {
          await runtime.close();
        }
      },
    );
  },
);

test('Gate 1 rejects shared namespace and override collisions before extension probes', async () => {
  const shared = await loadContracts();
  const extension = {
    ...shared.aliases[0]!,
    id: 'fixture-collision',
    owner: 'consumer',
    visibility: 'owner-private',
    allowedImporters: ['consumer'],
    bareTargetOwners: ['consumer'],
    subpaths: { ...shared.aliases[0]!.subpaths!, targetOwners: ['consumer'] },
    implementationSources: {
      requiredAreas: ['oss-open-graph-config'],
      additionalOwners: [],
    },
    downstream: { implementation: 'required', mayExtendBare: false },
  };
  assert.ok(
    validateAliasContracts({ ...shared, aliasExtensions: [extension] }).some(
      (error) => /duplicate alias specifier/.test(error),
    ),
  );
  extension.specifier = '@fixture-local' as any;
  assert.ok(
    validateAliasContracts({
      ...shared,
      aliasExtensions: [extension],
      resolverOverrides: [
        {
          id: 'fixture-override',
          specifier: '@fixture-local',
          kind: 'package-compatibility',
          match: 'exact',
          reason: 'fixture',
          parity: {
            runtime: 'override-required',
            typescript: 'not-applicable',
          },
          lifecycle: 'temporary',
          removalCondition: 'fixture',
        },
      ],
    }).some((error) => /overlaps a declared alias/.test(error)),
  );
});
