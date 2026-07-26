import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

type Loader<T> = () => Promise<T>;
type ErrorFallback = (error: unknown, retry: () => void) => ReactNode;

/**
 * Load a client-only module after mount (optionally on idle).
 * Keeps the initial theme graph thin and avoids hydration mismatches
 * by rendering `fallback` on both SSG and the first client paint.
 */
export function DeferredClient<T>({
  loader,
  fallback = null,
  errorFallback,
  idle = false,
  children,
}: {
  loader: Loader<T>;
  fallback?: ReactNode;
  errorFallback?: ErrorFallback;
  idle?: boolean;
  children: (mod: T) => ReactNode;
}) {
  const [mod, setMod] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const run = () => {
      Promise.resolve()
        .then(loader)
        .then(
          (resolved) => {
            if (!cancelled) {
              setMod(() => resolved);
            }
          },
          (reason: unknown) => {
            if (!cancelled) {
              setError(reason);
            }
          },
        );
    };

    if (idle && typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(run, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(run, idle ? 200 : 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [loader, idle, attempt]);

  if (!mod) {
    if (error && errorFallback) {
      return <>{errorFallback(error, retry)}</>;
    }
    return <>{fallback}</>;
  }

  return <>{children(mod)}</>;
}

export function DeferredComponent<P extends object>({
  loader,
  fallback = null,
  errorFallback,
  idle = false,
  props,
}: {
  loader: () => Promise<ComponentType<P>>;
  fallback?: ReactNode;
  errorFallback?: ErrorFallback;
  idle?: boolean;
  props: P;
}) {
  return (
    <DeferredClient
      loader={loader}
      fallback={fallback}
      errorFallback={errorFallback}
      idle={idle}
    >
      {(Comp) => <Comp {...props} />}
    </DeferredClient>
  );
}
