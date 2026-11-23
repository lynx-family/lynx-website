import { z } from 'zod';

export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type VersionResolutionIssue = {
  readonly code:
    | 'unknown-resource'
    | 'invalid-binding'
    | 'invalid-params'
    | 'resolution-failed'
    | 'invalid-url';
  readonly resource: string;
  readonly path?: readonly (string | number)[];
  readonly message: string;
};

export class VersionResolutionError extends Error {
  readonly issues: readonly VersionResolutionIssue[];

  constructor(issues: readonly VersionResolutionIssue[]) {
    super(
      issues
        .map(
          ({ resource, path, message }) =>
            `${resource}${path?.length ? `.${path.join('.')}` : ''}: ${message}`,
        )
        .join('; '),
    );
    this.name = 'VersionResolutionError';
    this.issues = Object.freeze(
      issues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.path ? { path: Object.freeze([...issue.path]) } : {}),
        }),
      ),
    );
  }
}

export type VersionResource<S extends z.ZodObject = z.ZodObject> = {
  readonly params: S;
  /** Synchronous, deterministic URL construction; no IO or mutable globals. */
  resolve(params: DeepReadonly<z.output<S>>): string;
};

export function defineVersionResource<S extends z.ZodObject>(
  resource: VersionResource<S>,
): VersionResource<S> {
  return Object.freeze({
    // Always reject unknown top-level fields, even for a non-strict input schema.
    params: resource.params.strict() as S,
    resolve: resource.resolve,
  });
}

export type VersionResources = Record<string, VersionResource>;
type Params<R extends VersionResources, K extends keyof R> = z.output<
  R[K]['params']
>;
export type VersionBindings<R extends VersionResources> = {
  [K in keyof R]?: Partial<Params<R, K>>;
};

type DefiniteKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K>
    ? never
    : undefined extends T[K]
      ? never
      : K;
}[keyof T];

type BoundKeys<B, K extends PropertyKey> =
  K extends DefiniteKeys<B>
    ? K extends keyof B
      ? DefiniteKeys<B[K]>
      : never
    : never;

type CallerParams<
  R extends VersionResources,
  B,
  K extends keyof R,
> = keyof Params<R, K> extends never
  ? Record<string, never>
  : Omit<Params<R, K>, BoundKeys<B, K>> &
      Partial<Pick<Params<R, K>, Extract<BoundKeys<B, K>, keyof Params<R, K>>>>;

export type VersionRequest<R extends VersionResources, B> = {
  [K in keyof R & string]: { resource: K } & ({} extends CallerParams<R, B, K>
    ? { params?: CallerParams<R, B, K> }
    : { params: CallerParams<R, B, K> });
}[keyof R & string];

export type VersionResolverArgs<R extends VersionResources, B> = {
  [K in keyof R & string]: {} extends CallerParams<R, B, K>
    ? [resource: K, params?: CallerParams<R, B, K>]
    : [resource: K, params: CallerParams<R, B, K>];
}[keyof R & string];

export type ResolvedResource<K extends string, P> = {
  readonly resource: K;
  readonly href: string;
  readonly params: DeepReadonly<P>;
  readonly origins: Readonly<Partial<Record<keyof P, 'binding' | 'explicit'>>>;
};

export type VersionResolver<R extends VersionResources, B> = {
  resolve<K extends keyof R & string>(
    ...args: VersionResolverArgs<R, B> & [resource: K, params?: unknown]
  ): ResolvedResource<K, Params<R, K>>;
  params<K extends keyof R & string>(
    ...args: VersionResolverArgs<R, B> & [resource: K, params?: unknown]
  ): DeepReadonly<Params<R, K>>;
};

type ValidationCode = 'invalid-binding' | 'invalid-params';

function fail(
  code: VersionResolutionIssue['code'],
  resource: string,
  message: string,
  path: readonly (string | number)[] = [],
): never {
  throw new VersionResolutionError([{ code, resource, path, message }]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

// Copy before freezing: callers retain ownership of their input objects.
function snapshot(
  value: unknown,
  code: ValidationCode,
  resource: string,
  path: readonly (string | number)[] = [],
  ancestors = new Set<object>(),
): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  if (!Array.isArray(value) && !isRecord(value)) {
    return fail(code, resource, 'Expected JSON data without undefined', path);
  }
  if (ancestors.has(value)) {
    return fail(code, resource, 'Circular parameters are not supported', path);
  }
  if (Object.getOwnPropertySymbols(value).length) {
    return fail(code, resource, 'Symbol keys are not JSON data', path);
  }
  ancestors.add(value);
  const copy = Array.isArray(value)
    ? Array.from(value, (item, index) =>
        snapshot(item, code, resource, [...path, index], ancestors),
      )
    : Object.fromEntries(
        Object.entries(Object.getOwnPropertyDescriptors(value)).map(
          ([key, descriptor]) => {
            if (!descriptor.enumerable || !('value' in descriptor)) {
              return fail(code, resource, 'Expected plain JSON fields', [
                ...path,
                key,
              ]);
            }
            return [
              key,
              snapshot(
                descriptor.value,
                code,
                resource,
                [...path, key],
                ancestors,
              ),
            ];
          },
        ),
      );
  ancestors.delete(value);
  return Object.freeze(copy);
}

function sameData(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }
  const a = Object.entries(left);
  const b = Object.entries(right);
  return (
    a.length === b.length &&
    a.every(
      ([key, value]) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        sameData(value, (right as Record<string, unknown>)[key]),
    )
  );
}

function validate(
  schema: z.ZodType,
  input: unknown,
  code: ValidationCode,
  resource: string,
  path: readonly (string | number)[] = [],
): unknown {
  let result: ReturnType<z.ZodType['safeParse']>;
  try {
    result = schema.safeParse(input);
  } catch (error) {
    return fail(
      code,
      resource,
      error instanceof Error ? error.message : 'Schema validation failed',
      path,
    );
  }
  if (!result.success) {
    throw new VersionResolutionError(
      result.error.issues.flatMap((issue) => {
        const issuePath = [
          ...path,
          ...issue.path.map((part) =>
            typeof part === 'number' ? part : String(part),
          ),
        ];
        const paths =
          issue.code === 'unrecognized_keys'
            ? issue.keys.map((key) => [...issuePath, key])
            : [issuePath];
        return paths.map((path) => ({
          code,
          resource,
          path,
          message: issue.message,
        }));
      }),
    );
  }
  const output = snapshot(result.data, code, resource, path);
  if (!sameData(input, output)) {
    return fail(
      code,
      resource,
      'Schemas must preserve parameters; defaults belong in bindings',
      path,
    );
  }
  return output;
}

export function createVersionResolver<
  R extends VersionResources,
  const B extends VersionBindings<R> = {},
>({
  resources,
  bindings,
}: {
  resources: R;
  bindings?: B & Record<Exclude<keyof B, keyof R>, never>;
}): VersionResolver<R, B> {
  const rules = new Map(
    Object.entries(resources).map(([key, rule]) => [
      key,
      defineVersionResource(rule),
    ]),
  );
  const defaults = new Map<string, Record<string, unknown>>();
  for (const [key, value] of Object.entries(bindings ?? {})) {
    const rule = rules.get(key);
    if (!rule) fail('invalid-binding', key, 'Unknown resource binding');
    if (!isRecord(value))
      fail('invalid-binding', key, 'Expected a parameter object');
    const copy = snapshot(value, 'invalid-binding', key) as Record<
      string,
      unknown
    >;
    for (const [field, input] of Object.entries(copy)) {
      if (!Object.prototype.hasOwnProperty.call(rule.params.shape, field)) {
        fail('invalid-binding', key, 'Unknown parameter', [field]);
      }
      validate(rule.params.shape[field], input, 'invalid-binding', key, [
        field,
      ]);
    }
    defaults.set(key, copy);
  }

  function prepare(key: string, input: unknown) {
    const rule = rules.get(key);
    if (!rule) fail('unknown-resource', key, 'Unknown resource');
    if (input !== undefined && !isRecord(input)) {
      fail('invalid-params', key, 'Expected a parameter object');
    }
    const explicit = snapshot(input ?? {}, 'invalid-params', key) as Record<
      string,
      unknown
    >;
    const merged = { ...defaults.get(key), ...explicit };
    const params = validate(
      rule.params,
      merged,
      'invalid-params',
      key,
    ) as Record<string, unknown>;
    const origins = Object.freeze(
      Object.fromEntries(
        Object.keys(params).map((field) => [
          field,
          Object.prototype.hasOwnProperty.call(explicit, field)
            ? 'explicit'
            : 'binding',
        ]),
      ),
    );
    return { rule, params, origins };
  }

  // The registry lookup erases the key/schema relation internally. Only the
  // validated dispatch boundary needs a cast; callers retain correlated types.
  return Object.freeze({
    params(key: string, input?: unknown) {
      return prepare(key, input).params;
    },
    resolve(key: string, input?: unknown) {
      const { rule, params, origins } = prepare(key, input);
      let href: string;
      try {
        href = rule.resolve(params);
      } catch (error) {
        return fail(
          'resolution-failed',
          key,
          error instanceof Error ? error.message : 'URL construction failed',
        );
      }
      try {
        const url = new URL(href);
        if (
          typeof href !== 'string' ||
          !/^https?:\/\//i.test(href) ||
          /[\u0000-\u0020\u007f]/.test(href) ||
          !['http:', 'https:'].includes(url.protocol) ||
          !url.hostname ||
          url.username ||
          url.password
        ) {
          throw new Error('Invalid URL');
        }
      } catch {
        return fail('invalid-url', key, 'Expected an absolute HTTP(S) URL');
      }
      return Object.freeze({ resource: key, href, params, origins });
    },
  }) as VersionResolver<R, B>;
}
