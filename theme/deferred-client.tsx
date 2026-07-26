import { type ComponentType, type ReactNode, useEffect, useState } from 'react';

type Loader<T> = () => Promise<T>;

/**
 * Load a client-only module after mount (optionally on idle).
 * Keeps the initial theme graph thin and avoids hydration mismatches
 * by rendering `fallback` on both SSG and the first client paint.
 */
export function DeferredClient<T>({
  loader,
  fallback = null,
  idle = false,
  children,
}: {
  loader: Loader<T>;
  fallback?: ReactNode;
  idle?: boolean;
  children: (mod: T) => ReactNode;
}) {
  const [mod, setMod] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const run = () => {
      loader().then((resolved) => {
        if (!cancelled) {
          setMod(() => resolved);
        }
      });
    };

    if (idle && typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(run, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(run, idle ? 200 : 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [loader, idle]);

  if (!mod) {
    return <>{fallback}</>;
  }

  return <>{children(mod)}</>;
}

export function DeferredComponent<P extends object>({
  loader,
  fallback = null,
  idle = false,
  props,
}: {
  loader: () => Promise<ComponentType<P>>;
  fallback?: ReactNode;
  idle?: boolean;
  props: P;
}) {
  return (
    <DeferredClient loader={loader} fallback={fallback} idle={idle}>
      {(Comp) => <Comp {...props} />}
    </DeferredClient>
  );
}
