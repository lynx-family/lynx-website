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
  OwnerId,
  PublicSubpath,
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
  removalPolicy: 'breaking-change',
} as const;

/**
 * Declare bounded top-level namespaces while keeping their ownership explicit.
 *
 */
function namespaceSubpaths(
  paths: readonly string[],
  owner: OwnerId,
): PublicSubpath[] {
  return paths.map((path) => ({ path, kind: 'namespace', owner }));
}

// Each record describes one portable import namespace:
// - `specifier` is the import spelling, without resolver-only `$` or `/*`.
// - `kind` controls its supported forms: exact is bare-only,
//   bare-and-subpaths supports both forms, subpaths-only rejects the bare form,
//   and prefix-only is an owner-private namespace.
// - `allowedImporters` names logical source owners, not repositories or paths.
// - `publicSubpaths` lists public modules or bounded namespaces; resolver
//   reachability alone does not make a subpath public.
// - `sourceAreas` contains IDs from the active source-area map, never physical
//   paths. It identifies where an alias implementation is allowed to come from.
// - `downstream` and `lifecycle` define the compatibility contract.
export const aliases = [
  {
    id: 'lynx-components',
    specifier: '@lynx',
    owner: 'lynx-website',
    visibility: 'public',
    kind: 'bare-and-subpaths',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    supportsBare: true,
    // Canonical forms of the reviewed executable subpath imports present at
    // the inventory revision. Existing `.tsx` spellings are migration inputs,
    // not additional public subpaths.
    publicSubpaths: [
      {
        path: 'NextSteps',
        kind: 'module',
        owner: 'lynx-website',
      },
      {
        path: 'api-status/APIStatusLayout',
        kind: 'module',
        owner: 'lynx-website',
      },
      {
        path: 'api-table-explorer/APITableExplorer',
        kind: 'module',
        owner: 'lynx-website',
      },
      {
        path: 'foldable-render-flow',
        kind: 'module',
        owner: 'lynx-website',
      },
    ],
    canonical: publicCanonicalSpelling,
    // Downstream resolvers may use ordered fallback roots for this namespace.
    // Resolution remains first-match, so roots never form a merged barrel.
    allowMultipleResolverRoots: true,
    sourceAreas: ['oss-components'],
    downstream: {
      implementation: 'required',
      mayExtendBare: true,
      subpathOwner: 'lynx-website',
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
    supportsBare: true,
    // `@lynx-ui/index` is a legacy non-canonical spelling of the bare entry,
    // not a public subpath. Issue #1505 inventories it; a later Issue #1508
    // migration replaces it with `@lynx-ui`.
    publicSubpaths: [],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: ['oss-lynx-ui-components'],
    downstream: {
      implementation: 'required',
      mayExtendBare: true,
      subpathOwner: 'lynx-website',
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
    supportsBare: true,
    publicSubpaths: [],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: ['oss-luna'],
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
      subpathOwner: null,
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    // The active host owns the configuration values. In OSS this contract is
    // implemented by shared-og-config.ts; downstream binds its own module.
    id: 'open-graph-config',
    specifier: '@og-config',
    owner: 'consumer',
    visibility: 'host-adapter',
    kind: 'exact',
    allowedImporters: ['lynx-website', 'consumer'],
    supportsBare: true,
    publicSubpaths: [],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: ['oss-open-graph-config'],
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
      subpathOwner: null,
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
    supportsBare: false,
    // Add a package only when @docs/<package>/... becomes a reviewed portable
    // contract. Synchronizing a new package directory does not register it.
    publicSubpaths: namespaceSubpaths(
      [
        'lynx-ui-button',
        'lynx-ui-checkbox',
        'lynx-ui-dialog',
        'lynx-ui-draggable',
        'lynx-ui-feed-list',
        'lynx-ui-form',
        'lynx-ui-input',
        'lynx-ui-lazy-component',
        'lynx-ui-list',
        'lynx-ui-overlay',
        'lynx-ui-popover',
        'lynx-ui-radio-group',
        'lynx-ui-scroll-view',
        'lynx-ui-sheet',
        'lynx-ui-slider',
        'lynx-ui-sortable',
        'lynx-ui-swipe-action',
        'lynx-ui-swiper',
        'lynx-ui-switch',
      ],
      'lynx-ui',
    ),
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: ['lynx-ui-package-docs'],
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
      subpathOwner: 'lynx-ui',
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'public-assets',
    specifier: '@assets',
    owner: 'consumer',
    visibility: 'public',
    kind: 'subpaths-only',
    // TODO(https://github.com/lynx-family/lynx-website/issues/1508):
    // Drop `lynx-ui` after its LazyComponent docs stop importing `@assets`.
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    supportsBare: false,
    publicSubpaths: [
      ...namespaceSubpaths(
        [
          // TODO(https://github.com/lynx-family/lynx-website/issues/1508):
          // Remove after upstream lynx-ui docs use the stable CDN asset URL.
          'LazyComponent',
          'blog',
          'doc',
          'home',
          'lynx-ui-home',
          'lynxtron',
        ],
        'consumer',
      ),
      {
        path: 'favicon.png',
        kind: 'module',
        owner: 'consumer',
      },
      {
        path: 'lynx-ui-icon-dark.svg',
        kind: 'module',
        owner: 'consumer',
      },
      {
        path: 'lynx-ui-icon-light.svg',
        kind: 'module',
        owner: 'consumer',
      },
      {
        path: 'lynxai-logo-dark.svg',
        kind: 'module',
        owner: 'consumer',
      },
      {
        path: 'lynxai-logo-light.svg',
        kind: 'module',
        owner: 'consumer',
      },
      {
        path: 'x-logo.svg',
        kind: 'module',
        owner: 'consumer',
      },
    ],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: ['site-public-assets'],
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
      subpathOwner: 'consumer',
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'rspress-theme',
    specifier: '@theme',
    owner: 'rspress',
    visibility: 'framework-adapter',
    kind: 'bare-and-subpaths',
    allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
    supportsBare: true,
    publicSubpaths: [
      {
        path: 'reference',
        kind: 'namespace',
        owner: 'rspress',
      },
    ],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: ['oss-theme'],
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
      subpathOwner: 'rspress',
    },
    lifecycle: stablePublicLifecycle,
  },
  {
    id: 'reviewed-host-adapters',
    specifier: '@site',
    owner: 'consumer',
    visibility: 'host-adapter',
    kind: 'subpaths-only',
    allowedImporters: ['lynx-website', 'consumer'],
    supportsBare: false,
    // The broad resolver remains legacy inventory for Issue #1328. Add only
    // separately reviewed host adapters here.
    publicSubpaths: [],
    canonical: publicCanonicalSpelling,
    allowMultipleResolverRoots: false,
    sourceAreas: [],
    downstream: {
      implementation: 'optional',
      mayExtendBare: false,
      subpathOwner: 'consumer',
    },
    lifecycle: {
      state: 'migration',
      removalPolicy: 'remove-legacy-subpaths-after-issue-1328',
    },
  },
  {
    id: 'oss-private-source',
    specifier: '@',
    owner: 'lynx-website',
    visibility: 'owner-private',
    kind: 'prefix-only',
    allowedImporters: ['lynx-website'],
    supportsBare: false,
    publicSubpaths: [],
    canonical: {
      omitIndex: false,
      omitSourceExtensions: false,
    },
    allowMultipleResolverRoots: false,
    sourceAreas: [
      'oss-components',
      'oss-hooks',
      'oss-lib',
      'oss-luna',
      'oss-lynx-ui-components',
      'oss-styles',
    ],
    downstream: {
      implementation: 'required',
      mayExtendBare: false,
      subpathOwner: 'lynx-website',
    },
    lifecycle: {
      state: 'stable',
      removalPolicy: 'owner-controlled',
    },
  },
] as const satisfies readonly AliasContract[];

// Every `id` below is a valid OSS `sourceAreas` reference. This is the OSS
// repository's physical source map. Logical ownership and source role are
// separate: generated or mounted content retains the owner of its canonical
// source. Consumers provide the IDs required by shared aliases, bind them to
// their own roots, and may add areas needed to classify consumer source.
export const ossSourceAreas = [
  {
    id: 'oss-docs-en',
    root: 'docs/en',
    owner: 'lynx-website',
    role: 'authoritative',
  },
  {
    id: 'oss-docs-zh',
    root: 'docs/zh',
    owner: 'lynx-website',
    role: 'authoritative',
  },
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
    // It is generated support source, not an `@docs` public subpath.
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
    // spelling as a supported public subpath.
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
      'Rspress rendering expects a React 19 implementation, while this site uses React 18.',
    parity: {
      runtime: 'override-required',
      typescript: 'not-applicable',
    },
    lifecycle: 'temporary',
    removalCondition:
      'Remove when Rspress no longer requires the React 19 implementation while this site uses React 18.',
  },
] as const satisfies readonly ResolverOverride[];
