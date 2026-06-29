// Read version config at build time. Each branch has its own version.json.
import versionJson from '../docs/public/version.json';

interface CFEventContext {
  request: Request;
  next: () => Promise<Response>;
  env: Record<string, string | undefined>;
}

// Cloudflare Pages project name — used to build branch-deploy URLs.
const CF_PAGES_PROJECT = 'lynx-website';

const PROXY_HEADER = 'X-Lynx-Proxy';

const SITE_VERSION = versionJson.current_version;
const KNOWN_VERSIONS = new Set(
  versionJson.versions.map((v: { version_number: string }) => v.version_number),
);

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

  // Current version → 302 strip prefix (works on all deployments)
  if (version === SITE_VERSION) {
    return Response.redirect(
      new URL(rest + url.search, url.origin).toString(),
      302,
    );
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

  const headers = new Headers(context.request.headers);
  headers.set(PROXY_HEADER, '1');

  const resp = await fetch(proxyUrl, {
    method: context.request.method,
    headers,
  });

  const newHeaders = new Headers(resp.headers);
  newHeaders.delete('x-frame-options');

  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders,
  });
};
