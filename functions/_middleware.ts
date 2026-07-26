// Read version config at build time. Each branch has its own version.json.
import versionJson from '../docs/public/version.json';

interface CFEventContext {
  request: Request;
  next: (input?: Request | string) => Promise<Response>;
  env: {
    ASSETS?: {
      fetch: (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => Promise<Response>;
    };
    [key: string]: unknown;
  };
  waitUntil?: (promise: Promise<unknown>) => void;
}

// Cloudflare Pages project name — used to build branch-deploy URLs.
const CF_PAGES_PROJECT = 'lynx-website';

const PROXY_HEADER = 'X-Lynx-Proxy';

const SITE_VERSION = versionJson.current_version;
const KNOWN_VERSIONS = new Set(
  versionJson.versions.map((v: { version_number: string }) => v.version_number),
);

function buildProxiedResponse(resp: Response) {
  const newHeaders = new Headers(resp.headers);
  newHeaders.delete('x-frame-options');

  // Edge-cache proxied docs briefly so version switches / prefetch warm hits.
  // HTML stays short-lived; hashed assets can be reused longer.
  const contentType = newHeaders.get('content-type') || '';
  if (!newHeaders.has('Cache-Control')) {
    if (contentType.includes('text/html')) {
      newHeaders.set(
        'Cache-Control',
        'public, max-age=60, stale-while-revalidate=300',
      );
    } else if (
      contentType.includes('javascript') ||
      contentType.includes('css') ||
      contentType.includes('font') ||
      contentType.includes('image')
    ) {
      newHeaders.set(
        'Cache-Control',
        'public, max-age=86400, stale-while-revalidate=604800',
      );
    }
  }

  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders,
  });
}

export const onRequest = async (context: CFEventContext) => {
  if (context.request.headers.get(PROXY_HEADER)) {
    return context.next();
  }

  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Match /next/... or /X.Y/... version prefixes
  const match = pathname.match(/^\/(next|\d+\.\d+)(\/.*)?$/);
  if (!match) {
    return context.next();
  }

  const version = match[1];
  const rest = match[2] || '/';

  // Current version → internal rewrite (avoid an extra 302 hop)
  if (version === SITE_VERSION) {
    const rewriteUrl = new URL(rest + url.search, url.origin);
    if (context.env.ASSETS?.fetch) {
      return context.env.ASSETS.fetch(new Request(rewriteUrl, context.request));
    }
    // Fallback for environments without the Pages ASSETS binding
    return Response.redirect(rewriteUrl.toString(), 302);
  }

  // Other known versions → only proxy on production
  if (!KNOWN_VERSIONS.has(version)) {
    return context.next();
  }

  // Reverse-proxy to the corresponding branch deploy
  const branch =
    version === 'next' ? 'next' : `release-${version.replace('.', '-')}`;
  const origin = `https://${CF_PAGES_PROJECT}-${branch}.pages.dev`;
  const proxyUrl = origin + rest + url.search;

  const cache =
    typeof caches !== 'undefined'
      ? // Cloudflare Workers Cache API
        (caches as unknown as { default: Cache }).default
      : undefined;

  const isCacheableGet = context.request.method === 'GET';
  const cacheKey = new Request(proxyUrl, { method: 'GET' });

  if (isCacheableGet && cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const headers = new Headers(context.request.headers);
  headers.set(PROXY_HEADER, '1');

  const resp = await fetch(proxyUrl, {
    method: context.request.method,
    headers,
  });

  const proxied = buildProxiedResponse(resp);

  if (isCacheableGet && cache && resp.ok) {
    const cachedResponse = proxied.clone();
    const putPromise = cache.put(cacheKey, cachedResponse);
    if (context.waitUntil) {
      context.waitUntil(putPromise);
    } else {
      // Best-effort when waitUntil is unavailable
      void putPromise;
    }
  }

  return proxied;
};
