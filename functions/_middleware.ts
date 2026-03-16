interface CFEventContext {
  request: Request;
  next: () => Promise<Response>;
  env: Record<string, string | undefined>;
}

// Cloudflare Pages project name — used to build branch-deploy URLs.
const CF_PAGES_PROJECT = 'lynx-website';

const PROXY_HEADER = 'X-Lynx-Proxy';

export const onRequest = async (context: CFEventContext) => {
  // Only the production deployment should proxy version routes.
  // Branch deploys (subsite) skip all proxy logic and serve static assets directly.
  // Set IS_MAIN_SITE=true in Cloudflare Pages environment variables for production.
  if (!context.env.IS_MAIN_SITE) {
    return context.next();
  }

  // Prevent infinite loop: if this request was already proxied, serve static assets directly
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

  const version = match[1]; // "next", "3.5", "3.4", ...
  const rest = match[2] || '/'; // remaining path

  // Current version → 302 strip the prefix (this site already serves it)
  const currentVersion = context.env.CURRENT_VERSION || 'next';
  if (version === currentVersion) {
    return Response.redirect(
      new URL(rest + url.search, url.origin).toString(),
      302,
    );
  }

  // Other versions → reverse-proxy to the corresponding branch deploy
  // "next" → main branch, "3.5" → release-3-5 branch
  const branch =
    version === 'next' ? 'next' : `release-${version.replace('.', '-')}`;
  const origin = `https://${CF_PAGES_PROJECT}-${branch}.pages.dev`;

  // Strip the version prefix — build output is at the root of doc_build/
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
