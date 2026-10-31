/**
 * Stable logical owners shared by OSS and consumer source maps.
 *
 * `consumer` means source supplied by the active host documentation site. Both
 * the OSS website and downstream sites instantiate this role; it does not
 * identify one specific repository or physical directory.
 */
export type OwnerId =
  | 'lynx-website'
  | 'lynx-ui'
  | 'lynx-stack'
  | 'consumer'
  | 'rspress';

/** Registry metadata for one stable logical source owner. */
export interface Owner {
  /** Stable logical identity used by policy and diagnostics. */
  readonly id: OwnerId;
  /** Non-empty human-readable ownership description. */
  readonly description: string;
}

/** Determines whether an alias is portable across owners or owner-private. */
export type AliasVisibility =
  /**
   * Portable surface available to every explicitly allowed importer owner,
   * e.g. `@lynx`, `@theme`, or `@og-config`.
   */
  | 'public'
  /**
   * Implementation namespace whose importers and bare/direct-subpath targets
   * must belong to the alias owner, e.g. `@/*`, even with multiple resolver roots.
   */
  | 'owner-private';

/** Canonical source spelling required for portable public imports. */
export interface CanonicalSpelling {
  /** Whether public imports must omit a trailing `/index`. */
  readonly omitIndex: boolean;
  /** Whether public imports must omit JavaScript/TypeScript extensions. */
  readonly omitSourceExtensions: boolean;
}

/** Whether consuming repositories must provide an alias implementation. */
export type DownstreamImplementation =
  /** Every consumer must provide the alias implementation. */
  | 'required'
  /** A consumer may omit the alias implementation entirely. */
  | 'optional';

/** Implementation obligation shared by all downstream alias shapes. */
export interface DownstreamContract {
  /** Whether consumers must provide an implementation of this alias. */
  readonly implementation: DownstreamImplementation;
}

/** Downstream policy for an alias shape that exposes a bare entry module. */
export interface BareEntryDownstreamContract extends DownstreamContract {
  /** Whether a consumer may add unique exports to the bare entry module. */
  readonly mayExtendBare: boolean;
}

/** Governance rule for changing a stable alias contract surface. */
export type AliasChangePolicy =
  /** Changes require explicit breaking-change treatment. */
  | 'breaking-change'
  /** The logical owner controls changes to its private surface. */
  | 'owner-controlled'
  /** The upstream content producer controls changes to generated paths. */
  | 'producer-controlled'
  /** The active framework controls changes to its adapter surface. */
  | 'framework-controlled';

/**
 * Compatibility phase and the rule relevant to that phase.
 *
 * Stable surfaces declare how changes are governed. Migration surfaces instead
 * declare the concrete condition that permits their removal.
 */
export type AliasLifecycle =
  | {
      readonly state: 'stable';
      readonly changePolicy: AliasChangePolicy;
      readonly removalCondition?: never;
    }
  | {
      readonly state: 'migration';
      readonly changePolicy?: never;
      readonly removalCondition: string;
    };

/** Target ownership and lifecycle policy shared by direct subpath imports. */
export interface AliasSubpathPolicy {
  /** Logical owners that may provide the first resolved direct-subpath target. */
  readonly targetOwners: readonly [OwnerId, ...OwnerId[]];
  /**
   * Stability of the subpath import form, not of every currently reachable
   * file. Gate 2 and Gate 3 derive concrete specifiers from the import corpus.
   */
  readonly lifecycle: AliasLifecycle;
}

/**
 * Physical source policy for modules that implement an alias.
 *
 * Required areas are stable IDs present in every source map. Additional
 * owners permit consumer maps to bind the alias to repository-local areas
 * without registering their private IDs in OSS.
 */
export interface AliasImplementationSources {
  /** Source-area IDs that every active source map must provide. */
  readonly requiredAreas: readonly string[];
  /** Owners permitted to provide additional repository-local source areas. */
  readonly additionalOwners: readonly OwnerId[];
}

/** Fields shared by every supported alias namespace shape. */
interface AliasContractBase {
  /** Stable registry identity; independent of resolver spelling. */
  readonly id: string;
  /** Import spelling without resolver-only `$` or `/*` syntax. */
  readonly specifier: string;
  /** Logical owner that governs the alias namespace contract. */
  readonly owner: OwnerId;
  /** Whether this alias is portable across owners or owner-private. */
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
  /** Required and repository-local sources allowed to implement this alias. */
  readonly implementationSources: AliasImplementationSources;
  /** Stability and phase-specific governance for the exposed contract. */
  readonly lifecycle: AliasLifecycle;
}

/**
 * Portable import namespace policy shared by OSS and downstream consumers.
 *
 * `kind` determines whether the bare specifier, its direct subpaths, or both
 * are supported. Physical resolver paths remain in source-area mappings.
 */
export type AliasContract = AliasContractBase &
  (
    | {
        /** Only the bare specifier is supported. */
        readonly kind: 'exact';
        readonly subpaths?: never;
        /** Logical owners that may provide the resolved bare entry. */
        readonly bareTargetOwners: readonly [OwnerId, ...OwnerId[]];
        readonly downstream: BareEntryDownstreamContract;
      }
    | {
        /** The bare specifier and direct subpath imports are supported. */
        readonly kind: 'bare-and-subpaths';
        /** Logical owners that may provide the resolved bare entry. */
        readonly bareTargetOwners: readonly [OwnerId, ...OwnerId[]];
        readonly subpaths: AliasSubpathPolicy;
        readonly downstream: BareEntryDownstreamContract;
      }
    | {
        /** Only direct subpath imports are supported. */
        readonly kind: 'subpaths-only';
        readonly bareTargetOwners?: never;
        readonly subpaths: AliasSubpathPolicy;
        readonly downstream: DownstreamContract & {
          readonly mayExtendBare?: never;
        };
      }
  );

/**
 * Additive, site-local namespace using the same schema as shared aliases.
 *
 * Extensions cannot overlap shared aliases or other extensions. Importers and
 * targets stay consumer-owned; implementation areas must be explicitly listed
 * in the active source map. No owner-wide source permission is allowed.
 */
export type ConsumerAliasExtension = AliasContract & {
  readonly owner: 'consumer';
  readonly visibility: 'owner-private';
  readonly allowedImporters: readonly ['consumer'];
  readonly bareTargetOwners?: readonly ['consumer'];
  readonly subpaths?: AliasSubpathPolicy & {
    readonly targetOwners: readonly ['consumer'];
  };
  readonly implementationSources: {
    readonly requiredAreas: readonly [string, ...string[]];
    readonly additionalOwners: readonly [];
  };
  /** Local entries own their exports; they do not extend a shared OSS barrel. */
  readonly downstream: DownstreamContract & {
    readonly mayExtendBare?: false;
  };
};

/** Canonical upstream repository and root contributing to a source area. */
export interface SourceOrigin {
  /** Canonical source repository, without a checkout-specific local path. */
  readonly repository: string;
  /** Root or glob within the canonical source repository. */
  readonly root: string;
}

/** Fields shared by every physical source area in an active repository map. */
interface SourceAreaBase {
  /** Stable physical-area identity referenced by alias contracts. */
  readonly id: string;
  /** Normalized path relative to the repository root. */
  readonly root: string;
  /** Logical owner retained by source at this physical location. */
  readonly owner: OwnerId;
}

/**
 * Physical source tree classified by logical owner and assembly method.
 *
 * Mounted and generated trees retain canonical provenance through `origins`;
 * authoritative trees are maintained directly at their registered root.
 */
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

/** Exact repository-local resolver exception outside portable alias policy. */
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
