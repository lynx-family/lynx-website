import type { z } from 'zod';

import { defineVersionResource, VersionResolutionError } from './core';
import type {
  DeepReadonly,
  ResolvedResource,
  VersionResource,
  VersionResources,
} from './core';

export type WebsiteVersionData = {
  readonly LYNX_VERSION: string;
};

export type ResolvedVersionResource<R extends VersionResources> = {
  [K in keyof R & string]: ResolvedResource<K, z.output<R[K]['params']>>;
}[keyof R & string];

export type VersionLabelResolver<R extends VersionResources> = (
  result: ResolvedVersionResource<R>,
) => string;

type WebsiteResource<
  S extends z.ZodObject = z.ZodObject,
  B extends Partial<z.output<S>> = Partial<z.output<S>>,
> = VersionResource<S> & {
  bind(versionData: WebsiteVersionData): B;
  label(params: DeepReadonly<z.output<S>>): string;
};

/** Resource authors own validation, URL construction, bindings, and text together. */
export function defineWebsiteResource<
  S extends z.ZodObject,
  const B extends Partial<z.output<S>>,
>(
  resource: WebsiteResource<S, B> & {
    bind(
      versionData: WebsiteVersionData,
    ): B & Record<Exclude<keyof B, keyof z.output<S>>, never>;
  },
): WebsiteResource<S, B> {
  return Object.freeze({
    ...defineVersionResource(resource),
    bind: resource.bind,
    label: resource.label,
  });
}

type WebsiteResources = Record<string, WebsiteResource>;
type MergeGroups<Groups extends readonly WebsiteResources[]> =
  Groups extends readonly [
    infer First extends WebsiteResources,
    ...infer Rest extends readonly WebsiteResources[],
  ]
    ? First & MergeGroups<Rest>
    : {};

type CoreResources<R extends WebsiteResources> = {
  readonly [K in keyof R]: VersionResource<R[K]['params']>;
};
type ResourceBindings<R extends WebsiteResources> = {
  [K in keyof R]: ReturnType<R[K]['bind']>;
};
type WebsiteRegistry<R extends WebsiteResources> = {
  readonly resources: CoreResources<R>;
  bindings(versionData: WebsiteVersionData): ResourceBindings<R>;
  readonly label: VersionLabelResolver<CoreResources<R>>;
};

/** Explicit groups preserve ownership; duplicate keys fail instead of overwriting. */
export function createWebsiteRegistry<
  const Groups extends readonly WebsiteResources[],
>(...groups: Groups): WebsiteRegistry<MergeGroups<Groups>> {
  const entries = new Map<string, WebsiteResource>();
  for (const group of groups) {
    for (const [key, resource] of Object.entries(group)) {
      if (entries.has(key)) {
        throw new Error(`Duplicate version resource: ${key}`);
      }
      entries.set(key, defineWebsiteResource(resource));
    }
  }

  const resources = Object.freeze(
    Object.fromEntries(
      [...entries].map(([key, resource]) => [
        key,
        defineVersionResource(resource),
      ]),
    ),
  );

  const label: VersionLabelResolver<VersionResources> = (result) => {
    const resource = entries.get(result.resource);
    if (!resource) {
      throw new VersionResolutionError([
        {
          code: 'unknown-resource',
          resource: result.resource,
          message: 'Unknown resource label',
        },
      ]);
    }
    return resource.label(result.params);
  };

  const registry = Object.freeze({
    resources,
    bindings(versionData: WebsiteVersionData) {
      return Object.fromEntries(
        [...entries].map(([key, resource]) => [
          key,
          resource.bind(versionData),
        ]),
      );
    },
    label,
  });
  // Object iteration erases key/schema correlations; restore them at this boundary.
  return registry as unknown as WebsiteRegistry<MergeGroups<Groups>>;
}
