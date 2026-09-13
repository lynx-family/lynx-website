import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(
  new URL('./cherry-pick-request.mjs', import.meta.url),
);
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CONFIG_PATH = fileURLToPath(
  new URL('../cherry-pick-config.json', import.meta.url),
);
const ISSUE_FORM_PATH = fileURLToPath(
  new URL('../ISSUE_TEMPLATE/cherry_pick_request.yml', import.meta.url),
);
const WORKFLOW_PATH = fileURLToPath(
  new URL('../workflows/cherry-pick-request.yml', import.meta.url),
);
const RECOVERY_SCRIPT_PATH = fileURLToPath(
  new URL('./cherry-pick-request-recovery.mjs', import.meta.url),
);
const TYPE_LABEL = 'cherry-pick:request';
const STATE_LABELS = [
  'cherry-pick:pending-approval',
  'cherry-pick:running',
  'cherry-pick:pr-created',
  'cherry-pick:partial',
  'cherry-pick:failed',
  'cherry-pick:invalid',
];

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

/** Builds the canonical single-target request body used by workflow tests. */
function requestBody() {
  return [
    '### Source PR',
    '',
    '#1358',
    '',
    '### Target release branches',
    '',
    '- [x] release/4.0',
    '',
    '### Why is this cherry-pick needed?',
    '',
    'Backport a low-risk documentation change.',
    '',
    '### Risk level',
    '',
    'Low',
  ].join('\n');
}

/** Builds a canonical summary at the requested execution phase. */
function executionSummary(status) {
  const nextAction =
    status === 'Approved'
      ? 'Waiting for workflow execution to start.'
      : status === 'Running'
        ? 'Wait for target results.'
        : 'A maintainer must approve this request.';
  return {
    id: 1,
    body: [
      '<!-- cherry-pick-request-summary -->',
      '<!-- cherry-pick-approved-fingerprint: bc2d6fddd07e8fad -->',
      '<!-- cherry-pick-approved-by: maintainer -->',
      '<!-- cherry-pick-approved-at: 2026-09-11T10:00:00.000Z -->',
      '',
      '## Cherry-pick request summary',
      '',
      `Status: **${status}**`,
      `Next action: ${nextAction}`,
      '',
      '- Request issue: #1403',
      '- Source PR: #1358',
      '',
      '### Reason',
      '',
      'Backport a low-risk documentation change.',
      '',
      '### Targets',
      '',
      '| Target branch | Result | Detail |',
      '| --- | --- | --- |',
      '| `release/4.0` | Pending | Waiting to run |',
    ].join('\n'),
    user: { login: 'github-actions[bot]', type: 'Bot' },
  };
}

/** Starts a mock GitHub API server on an available local port. */
async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

/** Parses a JSON request body, returning null when no body is present. */
async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length > 0 ? JSON.parse(Buffer.concat(chunks)) : null;
}

/** Sends one JSON response from the mock GitHub API. */
function sendJson(response, value, statusCode = 200) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

/** Runs a recovery command against a stateful mock GitHub Issue. */
async function runRecovery(stateLabels, status, command = 'cleanup') {
  const issue = {
    number: 1403,
    state: 'open',
    labels: [TYPE_LABEL, ...stateLabels].map((name) => ({ name })),
    user: { login: 'external-contributor' },
    body: requestBody(),
  };
  const comments = [executionSummary(status)];
  const requests = [];

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const body = await readRequestBody(request);
    requests.push({ method: request.method, path: url.pathname, body });

    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403'
    ) {
      sendJson(response, issue);
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/comments'
    ) {
      sendJson(response, comments);
      return;
    }
    if (
      request.method === 'DELETE' &&
      url.pathname.startsWith(
        '/repos/lynx-family/lynx-website/issues/1403/labels/',
      )
    ) {
      const label = decodeURIComponent(url.pathname.split('/').at(-1));
      issue.labels = issue.labels.filter((item) => item.name !== label);
      response.writeHead(204);
      response.end();
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/labels'
    ) {
      for (const name of body.labels) {
        if (!issue.labels.some((label) => label.name === name)) {
          issue.labels.push({ name });
        }
      }
      sendJson(response, issue.labels);
      return;
    }
    if (
      request.method === 'PATCH' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/comments/1'
    ) {
      comments[0].body = body.body;
      sendJson(response, comments[0]);
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/comments'
    ) {
      const comment = {
        id: comments.length + 1,
        body: body.body,
        user: { login: 'github-actions[bot]', type: 'Bot' },
      };
      comments.push(comment);
      sendJson(response, comment, 201);
      return;
    }

    sendJson(response, { message: 'Not Found' }, 404);
  });

  const apiUrl = await listen(server);
  try {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cherry-pick-request-cleanup-test-'),
    );
    temporaryDirectories.push(temporaryDirectory);
    const eventPath = path.join(temporaryDirectory, 'event.json');
    await fs.writeFile(
      eventPath,
      JSON.stringify({
        action: 'labeled',
        issue,
        label: { name: 'cherry-pick:approved' },
        repository: { full_name: 'lynx-family/lynx-website' },
        sender: { login: 'maintainer' },
      }),
    );

    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [SCRIPT_PATH, command], {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          GITHUB_API_URL: apiUrl,
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_REPOSITORY: 'lynx-family/lynx-website',
          GITHUB_RUN_ID: '124',
          GITHUB_SERVER_URL: 'https://github.com',
          GITHUB_TOKEN: 'test-token',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, stdout, stderr }));
    });

    return { ...result, comments, issue, requests };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

/** Extracts the API-only bootstrap from the recovery workflow step. */
function recoveryWorkflowScript(workflow) {
  const marker = '          script: |\n';
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, 'Recovery workflow script is missing.');
  const scriptLines = [];
  for (const line of workflow.slice(start + marker.length).split('\n')) {
    if (line && !line.startsWith('            ')) break;
    scriptLines.push(line.slice(12));
  }
  return scriptLines.join('\n');
}

/** Runs the config check with controlled Issue Form default labels. */
async function runConfigCheck(defaultLabels) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'cherry-pick-config-test-'),
  );
  temporaryDirectories.push(directory);
  const configDirectory = path.join(directory, '.github');
  const formDirectory = path.join(configDirectory, 'ISSUE_TEMPLATE');
  await fs.mkdir(formDirectory, { recursive: true });
  await fs.copyFile(
    CONFIG_PATH,
    path.join(configDirectory, 'cherry-pick-config.json'),
  );
  const form = await fs.readFile(ISSUE_FORM_PATH, 'utf8');
  const labelBlock = [
    'labels:',
    ...defaultLabels.map((label) => `  - '${label}'`),
    '',
  ].join('\n');
  await fs.writeFile(
    path.join(formDirectory, 'cherry_pick_request.yml'),
    form.replace(/^body:/m, `${labelBlock}body:`),
  );

  const child = spawn(process.execPath, [SCRIPT_PATH, 'check-config'], {
    cwd: directory,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  return new Promise((resolve) => {
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/** Runs request validation against a minimal mock GitHub API. */
async function runValidation(stateLabels = []) {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  const issue = {
    number: 1403,
    state: 'open',
    labels: [TYPE_LABEL, ...stateLabels].map((name) => ({ name })),
    user: { login: 'external-contributor' },
    body: requestBody(),
  };
  const comments = [];
  const requests = [];

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const body = await readRequestBody(request);
    requests.push({ method: request.method, path: url.pathname, body });

    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403'
    ) {
      sendJson(response, issue);
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/labels'
    ) {
      sendJson(
        response,
        config.requiredLabels.map((name) => ({ name })),
      );
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website'
    ) {
      sendJson(response, { default_branch: 'main' });
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/pulls/1358'
    ) {
      sendJson(response, {
        merged: true,
        base: { ref: 'main' },
        merge_commit_sha: 'source-commit',
        title: 'docs: update Miso logo and website link',
      });
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/pulls/1358/files'
    ) {
      sendJson(response, [{ filename: 'docs/example.mdx' }]);
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/branches/release%2F4.0'
    ) {
      sendJson(response, { name: 'release/4.0' });
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/comments'
    ) {
      sendJson(response, comments);
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/labels'
    ) {
      for (const name of body.labels) {
        if (!issue.labels.some((label) => label.name === name)) {
          issue.labels.push({ name });
        }
      }
      sendJson(response, issue.labels);
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/comments'
    ) {
      const comment = {
        id: comments.length + 1,
        body: body.body,
        user: { login: 'github-actions[bot]', type: 'Bot' },
      };
      comments.push(comment);
      sendJson(response, comment, 201);
      return;
    }

    sendJson(response, { message: 'Not Found' }, 404);
  });

  const apiUrl = await listen(server);
  try {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cherry-pick-request-test-'),
    );
    temporaryDirectories.push(temporaryDirectory);
    const eventPath = path.join(temporaryDirectory, 'event.json');
    const outputPath = path.join(temporaryDirectory, 'output.txt');
    await fs.writeFile(
      eventPath,
      JSON.stringify({
        action: 'labeled',
        issue,
        label: { name: TYPE_LABEL },
        repository: { full_name: 'lynx-family/lynx-website' },
        sender: { login: 'maintainer' },
      }),
    );
    await fs.writeFile(outputPath, '');

    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [SCRIPT_PATH, 'validate'], {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          GITHUB_API_URL: apiUrl,
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_OUTPUT: outputPath,
          GITHUB_REPOSITORY: 'lynx-family/lynx-website',
          GITHUB_RUN_ID: '123',
          GITHUB_SERVER_URL: 'https://github.com',
          GITHUB_TOKEN: 'test-token',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, stdout, stderr }));
    });

    return { ...result, comments, requests };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('cherry-pick request label initialization', () => {
  it('initializes an external contributor request when the type label is added', async () => {
    const result = await runValidation();

    assert.equal(result.code, 0, result.stderr);
    assert.doesNotMatch(
      result.stdout,
      /Ignoring labeled event for cherry-pick:request/,
    );
    assert.ok(
      result.requests.some(
        (request) =>
          request.method === 'POST' &&
          request.path.endsWith('/issues/1403/labels') &&
          request.body.labels.includes('cherry-pick:pending-approval'),
      ),
    );
    assert.ok(
      result.comments.some((comment) =>
        comment.body.includes('<!-- cherry-pick-request-summary -->'),
      ),
    );
  });

  for (const lifecycleLabel of ['cherry-pick:approved', ...STATE_LABELS]) {
    it(`ignores a duplicate type-label event when ${lifecycleLabel} exists`, async () => {
      const result = await runValidation([lifecycleLabel]);

      assert.equal(result.code, 0, result.stderr);
      assert.match(
        result.stdout,
        /Ignoring labeled event for cherry-pick:request/,
      );
      assert.equal(
        result.requests.filter((request) => request.method !== 'GET').length,
        0,
      );
    });
  }
});

describe('cherry-pick request config validation', () => {
  it('rejects every reserved default label', async () => {
    const lifecycleLabels = [
      TYPE_LABEL,
      'cherry-pick:approved',
      ...STATE_LABELS,
    ];
    const result = await runConfigCheck(lifecycleLabels);

    assert.equal(result.code, 1);
    assert.match(
      result.stderr,
      /must not assign reserved workflow labels before maintainer triage/,
    );
    for (const lifecycleLabel of lifecycleLabels) {
      assert.match(result.stderr, new RegExp(lifecycleLabel));
    }
  });

  it('accepts a non-workflow default label', async () => {
    const result = await runConfigCheck(['bug']);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Cherry-pick config check passed/);
  });
});

describe('cherry-pick request execution recovery', () => {
  for (const scenario of [
    {
      name: 'approved execution before the running state',
      status: 'Approved',
      stateLabels: ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      recoveredState: 'approved',
    },
    {
      name: 'orphaned running execution',
      status: 'Running',
      stateLabels: ['cherry-pick:running'],
      recoveredState: 'running',
    },
    {
      name: 'terminal transition with a stale running summary',
      status: 'Running',
      stateLabels: ['cherry-pick:partial'],
      recoveredState: 'running',
    },
  ]) {
    it(`recovers ${scenario.name}`, async () => {
      const result = await runRecovery(scenario.stateLabels, scenario.status);

      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(
        result.issue.labels.map((label) => label.name).sort(),
        [TYPE_LABEL, 'cherry-pick:failed'].sort(),
      );
      const summary = result.comments.find((comment) =>
        comment.body.includes('<!-- cherry-pick-request-summary -->'),
      );
      assert.match(summary.body, /Status: \*\*Failed\*\*/);
      assert.match(
        summary.body,
        /Next action: Fix the failure\. Ensure `cherry-pick:approved` is absent, then add it to retry\./,
      );
      assert.match(summary.body, /^- Completed at: .+$/m);
      assert.ok(
        result.comments.some((comment) =>
          comment.body.includes(
            `moved from ${scenario.recoveredState} to failed`,
          ),
        ),
      );
    });
  }

  it('recovers an approved request when execution fails before running', async () => {
    const result = await runRecovery(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      'Approved',
      'execute',
    );

    assert.equal(result.code, 1);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:failed'].sort(),
    );
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(summary.body, /Status: \*\*Failed\*\*/);
    assert.ok(
      result.comments.some(
        (comment) =>
          comment.body.includes(
            'Cherry-pick workflow encountered an unexpected error',
          ) && comment.body.includes('moved from approved to failed'),
      ),
    );
  });

  it('does not recover a request without an interrupted execution', async () => {
    const result = await runRecovery(
      ['cherry-pick:pending-approval'],
      'Pending approval',
    );

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:pending-approval'].sort(),
    );
    assert.match(result.stdout, /no interrupted execution state to recover/i);
    assert.equal(
      result.requests.some((request) => request.method !== 'GET'),
      false,
    );
  });
});

describe('cherry-pick request recovery workflow', () => {
  it('runs API-only recovery for validation and execution failures', async () => {
    const workflow = await fs.readFile(WORKFLOW_PATH, 'utf8');
    const cleanupJob = workflow.split('\n  cleanup:\n')[1];

    assert.ok(cleanupJob);
    assert.match(cleanupJob, /needs\.validate\.result != 'success'/);
    assert.match(cleanupJob, /needs\.validate\.result != 'skipped'/);
    assert.match(cleanupJob, /needs\.execute\.result != 'success'/);
    assert.match(cleanupJob, /actions\/github-script@/);
    assert.match(cleanupJob, /github\.rest\.repos\.getContent/);
    assert.match(cleanupJob, /cherry-pick-request-recovery\.mjs/);
    assert.doesNotMatch(cleanupJob, /actions\/checkout@/);
    assert.doesNotMatch(cleanupJob, /actions\/setup-node@/);
  });

  it('executes API-only recovery for an approved request', async () => {
    const workflow = await fs.readFile(WORKFLOW_PATH, 'utf8');
    const script = recoveryWorkflowScript(workflow);
    const recoverySource = await fs.readFile(RECOVERY_SCRIPT_PATH, 'utf8');
    const issue = {
      labels: [
        TYPE_LABEL,
        'cherry-pick:pending-approval',
        'cherry-pick:approved',
      ].map((name) => ({ name })),
    };
    const comments = [executionSummary('Approved')];
    const createdComments = [];
    const issues = {
      get: async () => ({ data: issue }),
      listComments: async () => ({ data: comments }),
      removeLabel: async ({ name }) => {
        issue.labels = issue.labels.filter((label) => label.name !== name);
      },
      addLabels: async ({ labels }) => {
        for (const name of labels) issue.labels.push({ name });
      },
      updateComment: async ({ comment_id, body }) => {
        comments.find((comment) => comment.id === comment_id).body = body;
      },
      createComment: async ({ body }) => {
        createdComments.push(body);
      },
    };
    const github = {
      rest: {
        issues,
        repos: {
          getContent: async ({ owner, repo, path, ref }) => {
            assert.deepEqual(
              { owner, repo, path, ref },
              {
                owner: 'lynx-family',
                repo: 'lynx-website',
                path: '.github/scripts/cherry-pick-request-recovery.mjs',
                ref: 'abc123',
              },
            );
            return {
              data: {
                type: 'file',
                encoding: 'base64',
                content: Buffer.from(recoverySource).toString('base64'),
              },
            };
          },
        },
      },
      paginate: async () => comments,
    };
    const context = {
      issue: { number: 1403 },
      repo: { owner: 'lynx-family', repo: 'lynx-website' },
      runId: 125,
      serverUrl: 'https://github.com',
      sha: 'abc123',
    };
    const core = { info() {} };
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    await new AsyncFunction('github', 'context', 'core', script)(
      github,
      context,
      core,
    );

    assert.deepEqual(
      issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:failed'].sort(),
    );
    assert.match(comments[0].body, /Status: \*\*Failed\*\*/);
    assert.ok(
      createdComments.some((comment) =>
        comment.includes('moved from approved to failed'),
      ),
    );
  });
});
