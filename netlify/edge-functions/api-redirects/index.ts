import legacy from './legacy.json' with { type: 'json' };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const anchored = (page: string, name?: string) =>
  name ? `${page}#${slug(name)}` : page;

function target(path: string): string | undefined {
  let m =
    /^\/api\/(reactlynx-testing-library|lynx-testing-environment)(?:\/(?:\w+\.(\w+)|[\w.]+))?$/.exec(
      path,
    );
  if (m) {
    return anchored(
      m[1] === 'lynx-testing-environment'
        ? '/api/packages/testing-environment'
        : '/api/react/testing-library',
      m[2],
    );
  }
  m =
    /^\/api\/genui\/(.+?)\/(?:(?:classes|functions|interfaces|type-aliases|variables)\/(\w+)|index)$/.exec(
      path,
    );
  if (m) return anchored(`/api/genui/${m[1].replaceAll('/', '-')}`, m[2]);
  return (legacy as Record<string, string>)[path];
}

export default (request: Request) => {
  const url = new URL(request.url);
  const [, prefix, path] =
    /^((?:\/next)?(?:\/zh)?)(\/.*?)(?:\.html)?\/?$/.exec(url.pathname) ?? [];
  const to = path && target(path);
  if (to) return Response.redirect(new URL(prefix + to, url), 301);
};

export const config = {
  pattern:
    '^(/next)?(/zh)?/api/(rspeedy|reactlynx-testing-library|lynx-testing-environment|react/[A-Z]|genui/.+/(classes|functions|interfaces|type-aliases|variables|index)).*$',
};
