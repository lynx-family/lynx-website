import { describe, expect, it } from 'vitest';

import { isDocRoute, toRoute } from './doc-routes.js';

describe('toRoute', () => {
  it('should strip the extension', () => {
    expect(toRoute('api/lynx-api/main-thread.mdx')).toBe(
      'api/lynx-api/main-thread',
    );
    expect(toRoute('guide/networking.md')).toBe('guide/networking');
  });

  it('should collapse index files to their directory route', () => {
    expect(toRoute('api/lynx-api/nodes-ref/index.mdx')).toBe(
      'api/lynx-api/nodes-ref',
    );
    expect(toRoute('index.mdx')).toBe('');
  });

  it('should not collapse a file merely ending in "index"', () => {
    expect(toRoute('api/css/z-index.mdx')).toBe('api/css/z-index');
  });

  it('should normalize Windows separators', () => {
    // `path.relative()` yields backslashes on win32, while every route,
    // `lynx_path` and `doc_url` uses `/`. Without normalization the route set
    // would depend on the OS that generated it.
    expect(toRoute('api\\lynx-api\\main-thread.mdx')).toBe(
      'api/lynx-api/main-thread',
    );
    expect(toRoute('api\\lynx-api\\nodes-ref\\index.mdx')).toBe(
      'api/lynx-api/nodes-ref',
    );
  });
});

describe('isDocRoute', () => {
  const routes = new Set(['api/lynx-api/main-thread', 'guide/interaction']);

  it('should accept a route with or without a leading slash', () => {
    expect(isDocRoute(routes, 'api/lynx-api/main-thread')).toBe(true);
    expect(isDocRoute(routes, '/api/lynx-api/main-thread')).toBe(true);
  });

  it('should ignore a fragment', () => {
    expect(isDocRoute(routes, 'api/lynx-api/main-thread#elementanimate')).toBe(
      true,
    );
  });

  it('should ignore a trailing slash', () => {
    expect(isDocRoute(routes, 'guide/interaction/')).toBe(true);
  });

  it('should reject a route that does not exist', () => {
    expect(isDocRoute(routes, 'api/lynx-api/main-thread/element-animate')).toBe(
      false,
    );
  });
});
