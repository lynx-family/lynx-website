// Compile-only API contract cases, included by the site typecheck.
import { z } from 'zod';

import { createVersionComponents } from './components';
import { createVersionResolver, defineVersionResource } from './core';
import { createWebsiteRegistry, defineWebsiteResource } from './registration';
import { websiteVersionRegistry } from './registry';
import { createWebsiteVersionResolver } from './website';

function checkContracts() {
  const resolver = createWebsiteVersionResolver({
    LYNX_VERSION: '4.2.0',
  });
  const { VersionLink, VersionQRCode } = createVersionComponents(
    resolver,
    websiteVersionRegistry.label,
  );
  const download = resolver.resolve('lynx.releases.download', {
    asset: 'app.apk',
  });
  const tag: string = download.params.tag;
  const asset: string = download.params.asset;
  const key: 'lynx.releases.download' = download.resource;
  resolver.resolve('lynx.releases.tag');
  resolver.params('lynx.releases.tag', { tag: '3.8.1' });
  // @ts-expect-error Missing unbound asset.
  resolver.resolve('lynx.releases.download');
  // @ts-expect-error Unknown resource.
  resolver.resolve('missing');
  // @ts-expect-error Wrong parameter type.
  resolver.resolve('lynx.releases.tag', { tag: 4 });
  // @ts-expect-error Unknown parameter on a literal object.
  resolver.resolve('lynx.releases.tag', { tag: '4.2', asset: 'app.apk' });
  // @ts-expect-error Results retain the selected schema, not a parameter union.
  resolver.resolve('lynx.releases.tag').params.asset;
  // @ts-expect-error Results are immutable.
  download.params.tag = 'changed';

  const optional: Partial<{ tag: string }> = {};
  const unbound = createVersionResolver({
    resources: websiteVersionRegistry.resources,
    bindings: { 'lynx.releases.tag': optional },
  });
  // @ts-expect-error A broad Partial does not guarantee a bound tag.
  unbound.resolve('lynx.releases.tag');
  unbound.resolve('lynx.releases.tag', { tag: '4.2' });
  const optionalResource: { 'lynx.releases.tag'?: { tag: string } } = {};
  const maybeBound = createVersionResolver({
    resources: websiteVersionRegistry.resources,
    bindings: optionalResource,
  });
  // @ts-expect-error The resource binding itself must also definitely exist.
  maybeBound.resolve('lynx.releases.tag');

  const custom = createVersionResolver({
    resources: {
      custom: defineVersionResource({
        params: z.strictObject({
          version: z.string(),
          arch: z.enum(['arm64', 'x64']),
        }),
        resolve: ({ version, arch }) =>
          `https://example.com/${version}/${arch}`,
      }),
    },
    bindings: { custom: { version: '1.0' } },
  });
  const Custom = createVersionComponents(custom);

  return [
    tag,
    asset,
    key,
    <VersionLink resource="lynx.releases.tag">Release</VersionLink>,
    <VersionLink
      resource="lynx.releases.download"
      params={{ asset: 'app.apk' }}
    >
      Download
    </VersionLink>,
    <VersionQRCode
      resource="lynx.releases.download"
      params={{ asset: 'app.apk' }}
      label="Download"
    />,
    <Custom.VersionLink resource="custom" params={{ arch: 'arm64' }}>
      Custom
    </Custom.VersionLink>,
    <VersionLink resource="lynx.releases.tag" />,
    <VersionLink
      resource="lynx.releases.download"
      params={{ asset: 'app.apk' }}
      code
    />,
    <VersionLink resource="lynx.releases.tag" code>
      v4.2.0
    </VersionLink>,
    <VersionLink resource="lynx.releases.tag" code={false} />,
    <VersionQRCode
      resource="lynx.releases.download"
      params={{ asset: 'app.apk' }}
    />,
    <Custom.VersionLink resource="custom" params={{ arch: 'arm64' }} />,
    // @ts-expect-error Download requires asset.
    <VersionLink resource="lynx.releases.download">Download</VersionLink>,
    // @ts-expect-error Params stay correlated with resource.
    <VersionLink resource="lynx.releases.tag" params={{ asset: 'app.apk' }}>
      Release
    </VersionLink>,
    // @ts-expect-error href is owned by the resolver.
    <VersionLink resource="lynx.releases.tag" href="https://example.com">
      Release
    </VersionLink>,
    <VersionQRCode
      resource="lynx.releases.tag"
      label="Release"
      // @ts-expect-error QR value is owned by the resolver.
      value="https://example.com"
    />,
    // @ts-expect-error Resource registry stays associated with generated components.
    <Custom.VersionLink resource="lynx.releases.tag">
      Wrong registry
    </Custom.VersionLink>,
  ];
}

void checkContracts;

function checkRegistrationContracts() {
  const params = z.strictObject({
    version: z.string(),
    file: z.string(),
  });
  const optional: Partial<z.output<typeof params>> = {};
  const registry = createWebsiteRegistry(
    {
      artifact: defineWebsiteResource({
        params,
        resolve: ({ version, file }) =>
          `https://example.com/${version}/${file}`,
        bind: ({ LYNX_VERSION }) => ({ version: LYNX_VERSION }),
        label: ({ file }) => file,
      }),
    },
    {
      optional: defineWebsiteResource({
        params,
        resolve: ({ version, file }) =>
          `https://example.com/${version}/${file}`,
        bind: () => optional,
        label: ({ version, file }) => `${version}/${file}`,
      }),
      home: defineWebsiteResource({
        params: z.strictObject({}),
        resolve: () => 'https://example.com/',
        bind: () => ({}),
        label: () => 'Home',
      }),
    },
  );
  const resolver = createVersionResolver({
    resources: registry.resources,
    bindings: registry.bindings({ LYNX_VERSION: '4.2.0' }),
  });
  resolver.resolve('artifact', { file: 'app.zip' });
  resolver.resolve('home');
  resolver.resolve('optional', { version: '4.2.0', file: 'app.zip' });
  // @ts-expect-error Only the definitely bound version is optional.
  resolver.resolve('artifact');
  // @ts-expect-error Partial bindings do not make required parameters optional.
  resolver.resolve('optional', { file: 'app.zip' });
  registry.label(resolver.resolve('artifact', { file: 'app.zip' }));
  // @ts-expect-error Label resource and params remain correlated.
  registry.label({ resource: 'artifact', params: {}, href: '', origins: {} });

  defineWebsiteResource({
    params,
    resolve: () => 'https://example.com/',
    // @ts-expect-error Bindings cannot introduce parameters outside the schema.
    bind: () => ({ version: '4.2.0', extra: true }),
    label: ({ file }) => file,
  });
  defineWebsiteResource({
    params,
    resolve: () => 'https://example.com/',
    // @ts-expect-error Bindings retain schema value types.
    bind: () => ({ version: 42 }),
    label: ({ file }) => file,
  });
}

void checkRegistrationContracts;
