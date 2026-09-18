/**
 * Stable logical owners shared by OSS and consumer source maps.
 *
 * `consumer` means source supplied by the active host documentation site. Both
 * the OSS website and downstream sites instantiate this role; it does not
 * identify one specific repository or physical directory.
 */
export type OwnerId = 'lynx-website' | 'lynx-ui' | 'consumer' | 'rspress';

export interface Owner {
  /** Stable logical identity used by policy and diagnostics. */
  readonly id: OwnerId;
  /** Human-readable ownership description. */
  readonly description: string;
}

/** Determines whether an alias is public, owner-private, or adapter-provided. */
export type AliasVisibility =
  | 'public'
  | 'owner-private'
  | 'framework-adapter'
  | 'host-adapter';

export interface PublicSubpath {
  /** Canonical path relative to the alias specifier. */
  readonly path: string;
  /**
   * A module exposes only this path. A namespace also exposes descendants
   * below this path.
   */
  readonly kind: 'module' | 'namespace';
  /** Logical owner of the exposed module or namespace. */
  readonly owner: OwnerId;
}

export interface CanonicalSpelling {
  /** Whether public imports must omit a trailing `/index`. */
  readonly omitIndex: boolean;
  /** Whether public imports must omit JavaScript/TypeScript extensions. */
  readonly omitSourceExtensions: boolean;
}

export interface DownstreamContract {
  /** Whether every consumer must provide an implementation of this alias. */
  readonly implementation: 'required' | 'optional';
  /** Whether a consumer may add unique exports to the bare entry module. */
  readonly mayExtendBare: boolean;
  /** Owner retained by subpaths, or null when subpaths are unsupported. */
  readonly subpathOwner: OwnerId | null;
}

export interface AliasLifecycle {
  /** Current compatibility phase, such as stable or migration. */
  readonly state: string;
  /** Condition or compatibility rule governing removal. */
  readonly removalPolicy: string;
}

interface AliasContractBase {
  /** Stable registry identity; independent of resolver spelling. */
  readonly id: string;
  /** Import spelling without resolver-only `$` or `/*` syntax. */
  readonly specifier: string;
  /** Logical owner of the alias contract. */
  readonly owner: OwnerId;
  /** Visibility and cross-owner usage category. */
  readonly visibility: AliasVisibility;
  /**
   * Logical owners whose source files may import this alias. For example,
   * `lynx-ui` permits source classified as lynx-ui-owned after synchronization;
   * it does not grant access to every path reachable by the resolver.
   */
  readonly allowedImporters: readonly OwnerId[];
  /** Required spelling of public imports. */
  readonly canonical: CanonicalSpelling;
  /** Whether ordered fallback roots are part of the supported contract. */
  readonly allowMultipleResolverRoots: boolean;
  /**
   * IDs of source areas allowed to provide this alias's implementation.
   *
   * This is a foreign key into the active source-area map, not a fixed enum:
   * OSS uses `ossSourceAreas`, while a consumer supplies its own physical map.
   */
  readonly sourceAreas: readonly string[];
  /** Obligations and permitted extensions for consuming repositories. */
  readonly downstream: DownstreamContract;
  /** Stability and removal policy for the exposed contract. */
  readonly lifecycle: AliasLifecycle;
}

export type AliasContract = AliasContractBase &
  (
    | {
        /** Only the bare specifier is supported. */
        readonly kind: 'exact';
        readonly supportsBare: true;
        readonly publicSubpaths: readonly [];
      }
    | {
        /** The bare specifier and registered subpaths are supported. */
        readonly kind: 'bare-and-subpaths';
        readonly supportsBare: true;
        readonly publicSubpaths: readonly PublicSubpath[];
      }
    | {
        /** Only registered subpaths are supported. */
        readonly kind: 'subpaths-only';
        readonly supportsBare: false;
        readonly publicSubpaths: readonly PublicSubpath[];
      }
    | {
        /** An owner-private prefix; the bare specifier is not supported. */
        readonly kind: 'prefix-only';
        readonly supportsBare: false;
        readonly publicSubpaths: readonly [];
      }
  );

export interface SourceOrigin {
  /** Canonical source repository, without a checkout-specific local path. */
  readonly repository: string;
  /** Root or glob within the canonical source repository. */
  readonly root: string;
}

interface SourceAreaBase {
  /** Stable physical-area identity referenced by alias contracts. */
  readonly id: string;
  /** Normalized path relative to the repository root. */
  readonly root: string;
  /** Logical owner retained by source at this physical location. */
  readonly owner: OwnerId;
}

export type SourceArea =
  | (SourceAreaBase & {
      /** Source maintained directly at this repository path. */
      readonly role: 'authoritative';
      readonly origins?: never;
    })
  | (SourceAreaBase & {
      /** Source mounted from another repository without changing ownership. */
      readonly role: 'mounted';
      /** Canonical repositories and roots assembled at this location. */
      readonly origins: readonly [SourceOrigin, ...SourceOrigin[]];
    })
  | (SourceAreaBase & {
      /** Output generated from one or more canonical sources. */
      readonly role: 'generated';
      /** Canonical repositories and roots used to generate this output. */
      readonly origins: readonly [SourceOrigin, ...SourceOrigin[]];
    });

export interface ResolverOverride {
  /** Stable identity used by validation and lifecycle tracking. */
  readonly id: string;
  /** Complete package specifier affected by this local exception. */
  readonly specifier: string;
  /** Supported reason category for the override. */
  readonly kind: 'package-compatibility';
  /** Overrides must not capture sibling or descendant package specifiers. */
  readonly match: 'exact';
  /** Why normal portable alias resolution cannot be used. */
  readonly reason: string;
  /** Expected behavior in runtime and TypeScript resolution. */
  readonly parity: {
    readonly runtime: 'override-required';
    readonly typescript: 'not-applicable';
  };
  /** Current state of the exception, normally temporary. */
  readonly lifecycle: string;
  /** Concrete condition after which the override must be deleted. */
  readonly removalCondition: string;
}
