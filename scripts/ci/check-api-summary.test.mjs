import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findApiSummaryViolations,
  parseCompatQuery,
} from './check-api-summary.mjs';

const docPath = 'docs/en/api/example.mdx';
const scriptPath = fileURLToPath(
  new URL('./check-api-summary.mjs', import.meta.url),
);

/**
 * Create a deterministic compat resolver for document-level policy tests.
 *
 * @param {Record<string, object>} entries Query results keyed by query.
 * @returns {(query: string) => object} Resolver matching the production shape.
 */
function resolver(entries) {
  return (query) =>
    entries[query] ?? {
      error: `compatibility target does not exist: ${query}`,
    };
}

test('parses compatibility module and accessor queries', () => {
  assert.deepEqual(parseCompatQuery('css/properties/color'), {
    module: 'css/properties/color',
    accessor: 'css.properties.color',
  });
  assert.deepEqual(parseCompatQuery('lynx-api/lynx/performance.profileEnd()'), {
    module: 'lynx-api/lynx/performance',
    accessor: 'lynx-api.lynx.performance.profileEnd()',
  });
});

test('rejects empty compatibility query path segments', () => {
  for (const query of [
    'test//api.leaf',
    'test/api..leaf',
    'test/api.leaf.',
    '/test/api.leaf',
  ]) {
    assert.deepEqual(parseCompatQuery(query), {
      error: 'query contains an empty path segment',
    });
  }
});

test('rejects file arguments because the CLI always scans the full tree', () => {
  const result = spawnSync(process.execPath, [scriptPath, docPath], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not accept file arguments/);
});

test('accepts frontmatter and supported static query forms', () => {
  const content = `---
api: test/api.leaf
---

<APISummary />
<APITable query="test/api.leaf" />
<APITable query='test/api.leaf' />
<APITable query={'test/api.leaf'} />
`;
  assert.deepEqual(
    findApiSummaryViolations(docPath, content, {
      resolveCompat: resolver({
        'test/api.leaf': { direct: true },
      }),
    }),
    [],
  );
});

test('validates compatibility components inside MDX expressions', () => {
  const violations = findApiSummaryViolations(
    docPath,
    `{showSummary && <APISummary query="test/api.aggregate" />}
{showTable && <APITable query={'test/api.leaf'} />}
`,
    {
      resolveCompat: resolver({
        'test/api.aggregate': { direct: false },
        'test/api.leaf': { direct: true },
      }),
    },
  );
  assert.deepEqual(
    violations.map(({ line, component, reason }) => ({
      line,
      component,
      reason,
    })),
    [
      {
        line: 1,
        component: 'APISummary',
        reason: 'target has no direct __compat record',
      },
      {
        line: 2,
        component: 'APITable',
        reason: 'API table page requires an APISummary',
      },
    ],
  );
});

test('accepts a page summary with a differently queried direct table', () => {
  const content = `<APISummary query="test/api.leaf" />
<APITable query="test/api.related" />
`;
  assert.deepEqual(
    findApiSummaryViolations(docPath, content, {
      resolveCompat: resolver({
        'test/api.leaf': { direct: true },
        'test/api.related': { direct: true },
      }),
    }),
    [],
  );
});

test('rejects aggregate table targets', () => {
  const violations = findApiSummaryViolations(
    docPath,
    `<APISummary query="test/api.leaf" />
<APITable query="test/api.aggregate" />
`,
    {
      resolveCompat: resolver({
        'test/api.leaf': { direct: true },
        'test/api.aggregate': { direct: false },
      }),
    },
  );
  assert.deepEqual(
    violations.map(({ line, component, reason }) => ({
      line,
      component,
      reason,
    })),
    [
      {
        line: 2,
        component: 'APITable',
        reason: 'target has no direct __compat record',
      },
    ],
  );
});

test('requires valid summaries for API table pages', () => {
  const violations = findApiSummaryViolations(
    docPath,
    `<APISummary query="test/api.aggregate" />
<APITable query="test/api.leaf" />
`,
    {
      resolveCompat: resolver({
        'test/api.aggregate': { direct: false },
        'test/api.leaf': { direct: true },
      }),
    },
  );
  assert.deepEqual(
    violations.map(({ line, component, reason }) => ({
      line,
      component,
      reason,
    })),
    [
      {
        line: 1,
        component: 'APISummary',
        reason: 'target has no direct __compat record',
      },
      {
        line: 2,
        component: 'APITable',
        reason: 'API table page requires an APISummary',
      },
    ],
  );
});

test('reports missing, dynamic, and unresolved queries', () => {
  const violations = findApiSummaryViolations(
    docPath,
    `<APISummary />
<APISummary query={apiQuery} />
<APITable query="test/api.missing" />
`,
    { resolveCompat: resolver({}) },
  );
  assert.deepEqual(
    violations.map(({ line, component, reason }) => ({
      line,
      component,
      reason,
    })),
    [
      {
        line: 1,
        component: 'APISummary',
        reason: 'query is missing and frontmatter has no api value',
      },
      {
        line: 2,
        component: 'APISummary',
        reason: 'query must be a static string',
      },
      {
        line: 3,
        component: 'APITable',
        reason: 'compatibility target does not exist: test/api.missing',
      },
    ],
  );
});
