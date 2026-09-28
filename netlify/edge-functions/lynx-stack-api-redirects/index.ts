// The API reference moved to the pages generated from the TSDoc of lynx-stack
// (https://github.com/lynx-family/lynx-stack/pull/3938). This keeps every URL
// the old reference published working: the shapes that map by rule are
// computed here, the rest are listed one by one in legacy.json.

import legacy from './legacy.json' with { type: 'json' };

// The kind directories of the testing library, which TypeDoc names in the
// language of the page. Its members are listed in legacy.json instead of
// derived from the old URL: a member that used to be a function can be a
// variable today, and only the generated pages know which.
const ZH_KINDS: Record<string, string> = {
  Classes: '类',
  Functions: '函数',
  Interfaces: '接口',
  Namespaces: '命名空间',
  Type_Aliases: '类型别名',
  Variables: '变量',
};

const TESTING_LIBRARY = '/api/react/testing-library/';

// The kinds the old reference published for this package.
const TESTING_ENVIRONMENT: Record<string, string> = {
  Class: 'classes',
  Function: 'functions',
  Interface: 'interfaces',
  TypeAlias: 'type-aliases',
};

function target(path: string): string | undefined {
  // An entry of the table wins: it names where a member actually is, which a
  // rule cannot tell when its kind changed with the API itself.
  const listed = (legacy as Record<string, string>)[path];
  if (listed) return listed;
  let m = /^\/api\/lynx-testing-environment(?:\/(?:index|(\w+)\.(\w+)))?$/.exec(
    path,
  );
  if (m) {
    const page = '/api/packages/testing-environment';
    const dir = TESTING_ENVIRONMENT[m[1]];
    return dir && m[2] ? `${page}/${dir}/${m[2]}` : page;
  }
  if (/^\/api\/reactlynx-testing-library\/?(?:index)?$/.test(path)) {
    return '/api/react/testing-library';
  }
  m = /^\/api\/genui\/(.+?)\/(?:(\w[\w-]*)\/(\w+)|index)$/.exec(path);
  if (m) {
    const module = m[1] === 'openui' ? 'openui/core' : m[1];
    return m[2]
      ? `/api/genui/${module}/${m[2]}/${m[3]}`
      : `/api/genui/${module}`;
  }
  return undefined;
}

export default (request: Request) => {
  const url = new URL(request.url);
  const [, prefix, path] =
    /^((?:\/next)?(?:\/zh)?)(\/.*?)(?:\.html)?\/?$/.exec(url.pathname) ?? [];
  let to = path && target(path);
  // A rule can answer with the path it was given, for a URL the reference
  // still publishes. Redirecting it to itself is a loop.
  if (!to || prefix + to === url.pathname) return;
  if (prefix.includes('/zh') && to.startsWith(TESTING_LIBRARY)) {
    const [kind, ...rest] = to.slice(TESTING_LIBRARY.length).split('/');
    const localized = ZH_KINDS[kind!];
    if (localized) to = TESTING_LIBRARY + [localized, ...rest].join('/');
  }
  const destination = new URL(prefix + to, url);
  destination.search = url.search;
  return Response.redirect(destination, 301);
};

export const config = {
  pattern:
    '^(/next)?(/zh)?/api/(rspeedy|reactlynx-testing-library|lynx-testing-environment|react/[A-Z][a-z]+\\.|genui/.+/(classes|functions|interfaces|type-aliases|variables|index)).*$',
};
