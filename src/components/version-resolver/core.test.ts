import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import {
  createVersionResolver,
  defineVersionResource,
  VersionResolutionError,
} from './core';
import { createWebsiteRegistry, defineWebsiteResource } from './registration';
import { websiteVersionRegistry } from './registry';
import { createWebsiteVersionResolver } from './website';

const host = { LYNX_VERSION: '4.2.0' };
const websiteVersionResources = websiteVersionRegistry.resources;
const resolver = createWebsiteVersionResolver(host);
const rawResolve = resolver.resolve as (
  key: string,
  params?: unknown,
) => unknown;

function rejects(
  action: () => unknown,
  code: string,
  path?: readonly (string | number)[],
) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof VersionResolutionError);
    assert.equal(error.issues[0].code, code);
    if (path) assert.deepEqual(error.issues[0].path, path);
    return true;
  });
}

test('SDK-only bindings, explicit historical versions, and independent hosts', () => {
  assert.deepEqual(resolver.resolve('lynx.releases.tag'), {
    resource: 'lynx.releases.tag',
    href: 'https://github.com/lynx-family/lynx/releases/tag/4.2.0',
    params: { tag: '4.2.0' },
    origins: { tag: 'binding' },
  });
  const oldHost = { LYNX_VERSION: '3.8.1' };
  const old = createWebsiteVersionResolver(oldHost);
  oldHost.LYNX_VERSION = 'changed';
  assert.equal(old.params('lynx.releases.tag').tag, '3.8.1');
  assert.equal(resolver.params('lynx.releases.tag').tag, '4.2.0');
  const release = resolver.resolve('lynx.releases.tag', { tag: 'v3.8.1' });
  assert.equal(release.params.tag, 'v3.8.1');
  assert.equal(release.origins.tag, 'explicit');
});

test('rules encode raw tags and assets in their URL positions', () => {
  assert.equal(
    resolver.resolve('lynx.releases.download', {
      tag: 'sdk/4.2',
      asset: 'SDK #1%.zip',
    }).href,
    'https://github.com/lynx-family/lynx/releases/download/sdk%2F4.2/SDK%20%231%25.zip',
  );
  assert.equal(
    resolver.resolve('lynx.releases.tag', { tag: 'sdk/4.2' }).href,
    'https://github.com/lynx-family/lynx/releases/tag/sdk%2F4.2',
  );
});

test('release tags reject short and full commit SHA forms in params and host bindings', () => {
  for (const tag of [
    'dead',
    '1234567',
    'DEADBEEF',
    'a'.repeat(40),
    'F'.repeat(64),
  ]) {
    rejects(
      () => resolver.resolve('lynx.releases.tag', { tag }),
      'invalid-params',
      ['tag'],
    );
    rejects(
      () =>
        resolver.resolve('lynx.releases.download', { tag, asset: 'app.apk' }),
      'invalid-params',
      ['tag'],
    );
    rejects(
      () => createWebsiteVersionResolver({ LYNX_VERSION: tag }),
      'invalid-binding',
      ['tag'],
    );
  }
  for (const tag of ['4.2.0', 'v3.8.1', 'sdk/4.2', 'release-abcdef']) {
    assert.equal(resolver.params('lynx.releases.tag', { tag }).tag, tag);
  }
});

test('registry groups supply rules, host bindings, and labels from effective params', () => {
  const groups = {
    artifact: defineWebsiteResource({
      params: z.object({ version: z.string(), file: z.string() }),
      resolve: ({ version, file }) => `https://example.com/${version}/${file}`,
      bind: ({ LYNX_VERSION }) => ({ version: LYNX_VERSION }),
      label: ({ version, file }) => `${file} (${version})`,
    }),
  };
  const registry = createWebsiteRegistry(groups, {
    home: defineWebsiteResource({
      params: z.strictObject({}),
      resolve: () => 'https://example.com/',
      bind: () => ({}),
      label: () => 'Home',
    }),
  });
  const instance = createVersionResolver({
    resources: registry.resources,
    bindings: registry.bindings(host),
  });
  const result = instance.resolve('artifact', { file: 'app.zip' });
  assert.equal(result.href, 'https://example.com/4.2.0/app.zip');
  assert.equal(registry.label(result), 'app.zip (4.2.0)');
  const override = instance.resolve('artifact', {
    version: '3.8.1',
    file: 'old.zip',
  });
  assert.equal(registry.label(override), 'old.zip (3.8.1)');
  assert.deepEqual(override.origins, { version: 'explicit', file: 'explicit' });
  assert.equal(registry.label(instance.resolve('home')), 'Home');
  rejects(
    () =>
      instance.resolve('artifact', {
        file: 'app.zip',
        extra: true,
      } as never),
    'invalid-params',
    ['extra'],
  );
  assert.equal(
    websiteVersionRegistry.label(
      resolver.resolve('lynx.releases.tag', { tag: 'v3.8.1' }),
    ),
    'GitHub Release v3.8.1',
  );
  assert.equal(
    websiteVersionRegistry.label(
      resolver.resolve('lynx.releases.download', { asset: 'app.apk' }),
    ),
    'app.apk',
  );
});

test('registry composition rejects duplicate keys and snapshots resource definitions', () => {
  const definition = {
    params: z.strictObject({ version: z.string() }),
    resolve: ({ version }: { version: string }) =>
      `https://example.com/${version}`,
    bind: ({ LYNX_VERSION }: typeof host) => ({ version: LYNX_VERSION }),
    label: ({ version }: { version: string }) => `Release ${version}`,
  };
  const group = { release: definition };
  const registry = createWebsiteRegistry(group);
  assert.throws(
    () => createWebsiteRegistry(group, group),
    /Duplicate version resource: release/,
  );
  definition.resolve = () => 'https://wrong.example.com/';
  definition.bind = () => ({ version: 'changed' });
  definition.label = () => 'Wrong label';
  const instance = createVersionResolver({
    resources: registry.resources,
    bindings: registry.bindings(host),
  });
  assert.equal(instance.resolve('release').href, 'https://example.com/4.2.0');
  assert.equal(registry.label(instance.resolve('release')), 'Release 4.2.0');
  rejects(
    () => registry.label({ resource: 'missing', params: {} } as never),
    'unknown-resource',
  );
});

test('invalid keys and parameters produce structured diagnostics', () => {
  rejects(() => rawResolve('toString'), 'unknown-resource');
  rejects(() => rawResolve('lynx.releases.download'), 'invalid-params', [
    'asset',
  ]);
  rejects(
    () => rawResolve('lynx.releases.tag', { asset: 'app.apk' }),
    'invalid-params',
    ['asset'],
  );
  for (const tag of [
    '',
    null,
    undefined,
    'HEAD~1',
    '../4.2',
    'refs/.tag',
    'x.lock',
    'a\nb',
  ]) {
    rejects(() => rawResolve('lynx.releases.tag', { tag }), 'invalid-params', [
      'tag',
    ]);
  }
  rejects(() => rawResolve('lynx.releases.tag', null), 'invalid-params');
  for (const asset of ['', '..', 'dir/app.apk', 'a\\b', 'a\0b']) {
    rejects(
      () => rawResolve('lynx.releases.download', { asset }),
      'invalid-params',
      ['asset'],
    );
  }
});

test('initialization validates partial bindings without running cross-field refinements', () => {
  const range = defineVersionResource({
    params: z
      .strictObject({ min: z.number(), max: z.number() })
      .refine(({ min, max }) => min <= max, {
        path: ['max'],
        message: 'Invalid range',
      }),
    resolve: ({ min, max }) => `https://example.com/${min}/${max}`,
  });
  const ranged = createVersionResolver({
    resources: { range },
    bindings: { range: { min: 2 } },
  });
  rejects(() => ranged.resolve('range', { max: 1 }), 'invalid-params', ['max']);
  assert.equal(
    ranged.resolve('range', { max: 3 }).href,
    'https://example.com/2/3',
  );
  rejects(
    () => createWebsiteVersionResolver({ ...host, LYNX_VERSION: '' }),
    'invalid-binding',
    ['tag'],
  );
  rejects(
    () =>
      createVersionResolver({
        resources: websiteVersionResources,
        // @ts-expect-error Unknown binding key is also rejected at runtime.
        bindings: { missing: {} },
      }),
    'invalid-binding',
  );
  rejects(
    () =>
      createVersionResolver({
        resources: websiteVersionResources,
        bindings: { 'lynx.releases.tag': { tag: '4.2', surprise: true } },
      }),
    'invalid-binding',
    ['surprise'],
  );
});

test('snapshots are deeply immutable, input objects stay mutable, and merging is shallow', () => {
  const config = defineVersionResource({
    params: z.strictObject({
      config: z.strictObject({
        names: z.array(z.string()),
        enabled: z.boolean().optional(),
      }),
    }),
    resolve: ({ config }) => `https://example.com/${config.names.join(',')}`,
  });
  const resources = { config };
  const bindings = {
    config: { config: { names: ['default'], enabled: true } },
  };
  const instance = createVersionResolver({ resources, bindings });
  bindings.config.config.names.push('mutated');
  resources.config = defineVersionResource({
    params: config.params,
    resolve: () => 'https://wrong.example.com',
  });
  const result = instance.resolve('config');
  assert.equal(result.href, 'https://example.com/default');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.origins));
  assert.ok(Object.isFrozen(result.params.config.names));
  const input = { config: { names: ['explicit'] } };
  const explicit = instance.resolve('config', input);
  input.config.names.push('changed');
  assert.deepEqual(explicit.params.config, { names: ['explicit'] });
  assert.equal(explicit.origins.config, 'explicit');
});

test('schemas preserve JSON parameters and params() never constructs a URL', () => {
  let calls = 0;
  const data = defineVersionResource({
    params: z.strictObject({ data: z.unknown() }),
    resolve: () => {
      calls++;
      return 'https://example.com';
    },
  });
  const instance = createVersionResolver({ resources: { data } });
  instance.params('data', { data: { nested: [true, null, 1] } });
  assert.equal(calls, 0);
  const circular: unknown[] = [];
  circular.push(circular);
  for (const value of [
    undefined,
    NaN,
    Infinity,
    1n,
    new Date(),
    () => 1,
    circular,
  ]) {
    rejects(() => instance.resolve('data', { data: value }), 'invalid-params');
  }
  const changed = defineVersionResource({
    params: z.strictObject({ tag: z.string().default('hidden') }),
    resolve: ({ tag }) => `https://example.com/${tag}`,
  });
  rejects(
    () =>
      createVersionResolver({ resources: { changed } }).resolve(
        'changed',
        {} as never,
      ),
    'invalid-params',
  );
  const coerced = defineVersionResource({
    params: z.strictObject({ version: z.coerce.string() }),
    resolve: ({ version }) => `https://example.com/${version}`,
  });
  rejects(
    () =>
      createVersionResolver({ resources: { coerced } }).resolve('coerced', {
        version: 1,
      } as never),
    'invalid-params',
  );
});

test('URL failures cannot silently produce a fallback link', () => {
  for (const href of [
    'javascript:alert(1)',
    '/local',
    'https://',
    'https://example.com/a b',
  ]) {
    const invalid = defineVersionResource({
      params: z.strictObject({}),
      resolve: () => href,
    });
    rejects(
      () =>
        createVersionResolver({ resources: { invalid } }).resolve('invalid'),
      'invalid-url',
    );
  }
  const broken = defineVersionResource({
    params: z.strictObject({}),
    resolve: () => {
      throw new Error('Construction failed');
    },
  });
  rejects(
    () => createVersionResolver({ resources: { broken } }).resolve('broken'),
    'resolution-failed',
  );
});
