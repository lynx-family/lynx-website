// Gate 1 of the portable alias contract work tracked by:
// https://github.com/lynx-family/lynx-website/issues/1487
// This registry implements:
// https://github.com/lynx-family/lynx-website/issues/1503
// It is not a copy of rspress.config.ts or tsconfig.json: it describes which
// import forms are portable and who owns them. Later gates bind and verify the
// corresponding resolver configuration.
// cspell:ignore lynxai

import type {
  AliasContract,
  CanonicalSpelling,
  Owner,
  ResolverOverride,
  SourceArea,
} from './types.js';

// Owners are stable logical identities, independent of checkout layout.
// Consumers map physical source areas to these IDs without redefining policy.
export const owners = [
  {
    id: 'lynx-website',
    description: 'Source maintained by the Lynx website OSS repository.',
  },
  {
    id: 'lynx-ui',
    description:
      'Source and generated documentation owned by the lynx-ui OSS repository.',
  },
  {
    id: 'consumer',
    description:
      'Source owned by the active host; both the OSS website and downstream sites are consumers.',
  },
  {
    id: 'rspress',
    description: 'Adapters supplied by the active Rspress theme.',
  },
] as const satisfies readonly Owner[];

const publicCanonicalSpelling = {
  omitIndex: true,
  omitSourceExtensions: true,
} as const satisfies CanonicalSpelling;

const stablePublicLifecycle = {
  state: 'stable',
  changePolicy: 'breaking-change',
} as const;

// Field semantics live in types.ts; concrete import inventories belong to
// Gates 2/3. Keep records explicit so policy changes are visible in review.
export const aliases = [
  {
    id: 'lynx-components',
    specifier: '@lynx',
    owner: 'lynx-website',
    visibility: 'public',
    kind: 'bare-and-subpaths',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    bareTargetOwners: ['lynx-website', 'consumer'],
    // Direct component paths are existing migration inputs, not individually
    // versioned Component APIs. New and changed imports belong to Gate 3.
    subpaths: {
      targetOwners: ['lynx-website'],
      lifecycle: {
        state: 'migration',
        removalCondition: 'migrate-imports-to-bare-entry',
      },
    },
    canonical: publicCanonicalSpelling,
    // Downstream resolvers may use ordered fallback roots for this namespace.
    // Resolution remains first-match, so roots never form a merged barrel.
    allowMultipleResolverRoots: true,
    implementationSources: {
      requiredAreas: ['oss-components'],
      additionalOwners: ['consumer'],
    },
    downstream: {
      implementation: 'required',
      mayExtendBare: true,
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'lynx-ui-components',
    specifier: '@lynx-ui',
    // These lynx-ui-specific documentation components are maintained in this
    // repository. Synced lynx-ui docs consume them but do not own them.
    owner: 'lynx-website',
    visibility: 'public',
    kind: 'bare-and-subpaths',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    bareTargetOwners: ['lynx-website', 'consumer'],
    subpaths: {
      targetOwners: ['lynx-website'],
      lifecycle: {
        state: 'migration',
        removalCondition: 'migrate-imports-to-bare-entry',
      },
    },
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['oss-lynx-ui-components'],
      additionalOwners: ['consumer'],
    },
    downstream: {
      implementation: 'required',
      mayExtendBare: true,
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'luna-entry',
    specifier: '@luna',
    owner: 'lynx-website',
    visibility: 'public',
    kind: 'exact',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    bareTargetOwners: ['lynx-website'],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['oss-luna'],
      additionalOwners: [],
    },
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    // The active host owns the configuration values. In OSS this contract is
    // implemented by shared-og-config.ts; downstream binds its own module.
    id: 'open-graph-config',
    specifier: '@og-config',
    owner: 'consumer',
    visibility: 'public',
    kind: 'exact',
    allowedImporters: ['lynx-website', 'consumer'],
    bareTargetOwners: ['consumer'],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['oss-open-graph-config'],
      additionalOwners: [],
    },
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'package-documents',
    specifier: '@docs',
    owner: 'consumer',
    visibility: 'public',
    kind: 'subpaths-only',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    subpaths: {
      targetOwners: ['lynx-ui'],
      lifecycle: {
        state: 'stable',
        changePolicy: 'producer-controlled',
      },
    },
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['lynx-ui-package-docs'],
      additionalOwners: [],
    },
    downstream: {
      implementation: 'required',
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    // Legacy compatibility for existing src/theme consumers only.
    // Documentation imports are forbidden; Gate 3 owns no-new enforcement.
    id: 'public-assets',
    specifier: '@assets',
    owner: 'consumer',
    visibility: 'public',
    kind: 'subpaths-only',
    allowedImporters: ['lynx-website', 'consumer'],
    subpaths: {
      targetOwners: ['consumer'],
      lifecycle: {
        state: 'migration',
        removalCondition:
          'remove-after-runtime-assets-move-to-source-owned-locations',
      },
    },
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['site-public-assets'],
      additionalOwners: [],
    },
    downstream: {
      implementation: 'required',
    },
    lifecycle: {
      state: 'migration',
      removalCondition:
        'remove-after-runtime-assets-move-to-source-owned-locations',
    },
  },
  {
    id: 'rspress-theme',
    specifier: '@theme',
    owner: 'rspress',
    visibility: 'public',
    kind: 'bare-and-subpaths',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    // The active site's custom theme may be OSS- or consumer-owned. Direct
    // subpaths use Rspress's ordered custom-theme/default-theme fallback.
    bareTargetOwners: ['lynx-website', 'consumer'],
    subpaths: {
      targetOwners: ['lynx-website', 'consumer', 'rspress'],
      lifecycle: {
        state: 'stable',
        changePolicy: 'framework-controlled',
      },
    },
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: true,
    implementationSources: {
      requiredAreas: ['oss-theme', 'rspress-default-theme'],
      additionalOwners: ['consumer'],
    },
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'reviewed-host-adapters',
    specifier: '@site',
    owner: 'consumer',
    visibility: 'public',
    kind: 'subpaths-only',
    allowedImporters: ['lynx-website', 'consumer'],
    // The broad resolver remains legacy inventory for Issue #1328. Gate 3
    // inventories concrete uses without promoting them to stable adapters.
    subpaths: {
      targetOwners: ['lynx-website', 'consumer'],
      lifecycle: {
        state: 'migration',
        removalCondition: 'remove-legacy-subpaths-after-issue-1328',
      },
    },
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: [],
      additionalOwners: ['lynx-website', 'consumer'],
    },
    downstream: {
      implementation: 'optional',
    },
    lifecycle: {
      state: 'migration',
      removalCondition: 'remove-legacy-subpaths-after-issue-1328',
    },
  },
  {
    id: 'oss-private-source',
    specifier: '@',
    owner: 'lynx-website',
    visibility: 'owner-private',
    kind: 'subpaths-only',
    allowedImporters: ['lynx-website'],
    subpaths: {
      targetOwners: ['lynx-website'],
      lifecycle: {
        state: 'stable',
        changePolicy: 'owner-controlled',
      },
    },
    canonical: {
      omitIndex: false,
      omitSourceExtensions: false,
    },
    // Preserve supported downstream fallback layouts. This does not grant
    // cross-owner imports or authorize consumer-owned shadow targets.
    allowMultipleResolverRoots: true,
    implementationSources: {
      requiredAreas: [
        'oss-components',
        'oss-hooks',
        'oss-lib',
        'oss-luna',
        'oss-lynx-ui-components',
        'oss-styles',
      ],
      additionalOwners: [],
    },
    downstream: {
      implementation: 'required',
    },
    lifecycle: {
      state: 'stable',
      changePolicy: 'owner-controlled',
    },
  },
] as const satisfies readonly AliasContract[];

// Every `id` below is a valid OSS `requiredAreas` reference. Gate 1 records
// concrete alias implementations and producer areas, not broad importer-only
// roots such as docs/en or docs/zh. Gate 3 derives complete importer ownership
// from the real corpus and producer manifests, including generated lynx-stack
// routes. Logical ownership and source role are separate: generated or mounted
// content retains the owner of its canonical source. Consumers provide the IDs
// required by shared aliases, bind them to their own roots, and may add areas
// needed to classify consumer source.
export const ossSourceAreas = [
  {
    // Classifies the current @site target without approving that legacy
    // spelling. Issue #1328 will migrate it to the exact @version-data alias.
    id: 'oss-version-data',
    root: 'docs/public/version.json',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    // This is the OSS host's final assembled asset root. A downstream host
    // binds the same ID to its final tree after copying OSS assets and applying
    // its overlays; `@assets` still resolves through one deterministic root.
    id: 'site-public-assets',
    root: 'docs/public/assets',
    owner: 'consumer',
    role: 'authoritative',
  },
  {
    // These hand-authored introductions are maintained in this repository.
    // Unlike packageDocs and lynx-ui-intros.ts, prepare does not regenerate
    // this tree from the lynx-ui checkout.
    id: 'lynx-ui-intro-docs',
    root: 'sharedDocs/introDocs',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'lynx-ui-package-docs',
    root: 'sharedDocs/packageDocs',
    owner: 'lynx-ui',
    role: 'generated',
    origins: [
      {
        repository: 'lynx-family/lynx-ui',
        root: 'packages/*/docs',
      },
    ],
  },
  {
    // Synced package README files import this lookup through a relative path.
    // It is generated support source, not part of the `@docs` namespace.
    id: 'lynx-ui-intros',
    root: 'sharedDocs/lynx-ui-intros.ts',
    owner: 'lynx-ui',
    role: 'generated',
    origins: [
      {
        repository: 'lynx-family/lynx-ui',
        root: 'packages/*/README*.md',
      },
    ],
  },
  {
    id: 'oss-components',
    root: 'src/components',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'oss-hooks',
    root: 'src/hooks',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'oss-lib',
    root: 'src/lib',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'oss-luna',
    root: 'src/luna',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    // The OSS site owns these components even though they serve lynx-ui docs;
    // they are not synchronized from the lynx-ui repository.
    id: 'oss-lynx-ui-components',
    root: 'src/lynx-ui/components',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'oss-styles',
    root: 'src/styles',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'oss-open-graph-config',
    root: 'shared-og-config.ts',
    owner: 'consumer',
    role: 'authoritative',
  },
  {
    // Each host provides and maintains its own authoritative
    // shared-route-config.ts. This source area only classifies the target of
    // the legacy @site/shared-route-config import; it does not register that
    // spelling as a supported host adapter.
    id: 'site-route-config',
    root: 'shared-route-config.ts',
    owner: 'consumer',
    role: 'authoritative',
  },
  {
    id: 'oss-theme',
    root: 'theme',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'rspress-default-theme',
    root: 'node_modules/@rspress/core/dist/theme',
    owner: 'rspress',
    role: 'mounted',
    origins: [
      {
        repository: 'web-infra-dev/rspress',
        root: 'packages/core/src/theme',
      },
    ],
  },
] as const satisfies readonly SourceArea[];

// Resolver overrides are exact, repository-local exceptions, not portable
// aliases. A consumer supplies its own list and does not inherit these
// physical implementation choices automatically.
export const ossResolverOverrides = [
  {
    id: 'rspress-react-18-renderer',
    specifier: '@rspress/core/_private/react',
    kind: 'package-compatibility',
    match: 'exact',
    reason:
      'Legacy React 18 renderer mapping still present in rspress.config.ts; Rspress 2.0.19 uses react-render-to-markdown directly.',
    parity: {
      runtime: 'override-required',
      typescript: 'not-applicable',
    },
    lifecycle: 'temporary',
    removalCondition:
      'Gate 2 must verify the mapping is unused, then remove the resolver key and this record together.',
  },
] as const satisfies readonly ResolverOverride[];
