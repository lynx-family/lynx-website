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

// Test fixtures

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

/** Adds a newer target while retaining the request's original target. */
function requestBodyWithNewTarget() {
  return requestBody().replace(
    '- [x] release/4.0',
    ['- [x] release/4.1', '- [x] release/4.0'].join('\n'),
  );
}

/** Builds the bot summary persisted after the original request was approved. */
function approvedSummary() {
  return {
    id: 1,
    body: [
      '<!-- cherry-pick-request-summary -->',
      '<!-- cherry-pick-source-pr: 1358 -->',
      '<!-- cherry-pick-approved-fingerprint: bc2d6fddd07e8fad -->',
      '<!-- cherry-pick-approved-by: original-maintainer -->',
      '<!-- cherry-pick-approved-at: 2026-09-11T10:00:00.000Z -->',
      '',
      '## Cherry-pick request summary',
      '- Source PR: #1358',
    ].join('\n'),
    user: { login: 'github-actions[bot]', type: 'Bot' },
  };
}

/** Builds a summary left behind by an interrupted execution. */
function runningSummary() {
  const summary = approvedSummary();
  summary.body = [
    summary.body,
    '',
    'Status: **Running**',
    'Next action: Wait for target results.',
    '',
    '### Targets',
    '',
    '| Target branch | Result | Detail |',
    '| --- | --- | --- |',
    '| `release/4.0` | Pending | Waiting to run |',
  ].join('\n');
  return summary;
}

// Test process and HTTP utilities

/** Starts a mock GitHub API server on an available local port. */
async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

/** Parses a JSON request body, returning null for requests without a body. */
async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length > 0 ? JSON.parse(Buffer.concat(chunks)) : null;
}

/** Sends a JSON response from a mock GitHub API endpoint. */
function sendJson(response, value, statusCode = 200) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

/**
 * Runs one CLI command in a child process with the supplied workflow
 * environment and captures its output.
 */
async function runWorkflowProcess(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, command], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
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
}

/** Creates and tracks a temporary directory for one workflow invocation. */
async function createTemporaryDirectory(prefix) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

/**
 * Installs a deterministic git stub that records commands, reports no remote
 * generated branch, and reports that the new target lacks the source commit.
 */
async function createFakeGit(temporaryDirectory) {
  const fakeBin = path.join(temporaryDirectory, 'bin');
  const gitLogPath = path.join(temporaryDirectory, 'git.log');
  await fs.mkdir(fakeBin);
  await fs.writeFile(
    path.join(fakeBin, 'git'),
    [
      '#!/usr/bin/env node',
      "const fs = require('node:fs');",
      'const args = process.argv.slice(2);',
      "fs.appendFileSync(process.env.FAKE_GIT_LOG, `${args.join(' ')}\\n`);",
      "if (args[0] === 'ls-remote') process.exit(2);",
      "if (args[0] === 'merge-base') process.exit(1);",
    ].join('\n'),
    { mode: 0o755 },
  );
  return { fakeBin, gitLogPath };
}

// Validation harness

/** Runs validation against a stateful mock of the GitHub issue APIs. */
async function runValidation(stateLabels = [], options = {}) {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  const issue = {
    number: 1403,
    state: options.issueState || 'open',
    labels: [TYPE_LABEL, ...stateLabels].map((name) => ({ name })),
    user: { login: 'external-contributor' },
    body: options.body || requestBody(),
  };
  const comments = structuredClone(options.comments || []);
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
      url.pathname.startsWith(
        '/repos/lynx-family/lynx-website/collaborators/',
      ) &&
      url.pathname.endsWith('/permission')
    ) {
      sendJson(response, {
        permission: options.senderPermission || 'maintain',
      });
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
      [
        '/repos/lynx-family/lynx-website/branches/release%2F4.1',
        '/repos/lynx-family/lynx-website/branches/release%2F4.0',
      ].includes(url.pathname)
    ) {
      sendJson(response, {
        name: decodeURIComponent(url.pathname.split('/').at(-1)),
      });
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
    if (
      request.method === 'PATCH' &&
      url.pathname.startsWith(
        '/repos/lynx-family/lynx-website/issues/comments/',
      )
    ) {
      const commentId = Number(url.pathname.split('/').at(-1));
      const comment = comments.find((item) => item.id === commentId);
      comment.body = body.body;
      sendJson(response, comment);
      return;
    }

    sendJson(response, { message: 'Not Found' }, 404);
  });

  const apiUrl = await listen(server);
  try {
    const temporaryDirectory = await createTemporaryDirectory(
      'cherry-pick-request-test-',
    );
    const eventPath = path.join(temporaryDirectory, 'event.json');
    const outputPath = path.join(temporaryDirectory, 'output.txt');
    await fs.writeFile(
      eventPath,
      JSON.stringify({
        action: options.action || 'labeled',
        issue: {
          ...issue,
          body: options.eventBody ?? issue.body,
        },
        label: options.eventLabel
          ? { name: options.eventLabel }
          : { name: TYPE_LABEL },
        repository: { full_name: 'lynx-family/lynx-website' },
        sender: { login: options.sender || 'maintainer' },
      }),
    );
    await fs.writeFile(outputPath, '');

    const result = await runWorkflowProcess('validate', {
      GITHUB_API_URL: apiUrl,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: outputPath,
      GITHUB_REPOSITORY: 'lynx-family/lynx-website',
      GITHUB_RUN_ID: '123',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_TOKEN: 'test-token',
    });

    return {
      ...result,
      comments,
      issue,
      output: await fs.readFile(outputPath, 'utf8'),
      requests,
    };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

// Execution harness

/**
 * Runs execution with one existing target PR and one target requiring a new
 * cherry-pick PR.
 */
async function runExecution({
  body,
  command = 'execute',
  comments,
  eventBody = body,
  existingPullLabels = [{ name: 'cherry-pick:generated' }],
  stateLabels = ['cherry-pick:pending-approval'],
  failFirstExecutionComment = false,
}) {
  const issue = {
    number: 1403,
    state: 'open',
    labels: [TYPE_LABEL, ...stateLabels].map((name) => ({ name })),
    user: { login: 'external-contributor' },
    body,
  };
  const mutableComments = structuredClone(comments);
  const requests = [];
  const createdPulls = [];
  let shouldFailExecutionComment = failFirstExecutionComment;
  const existingPull = {
    number: 2000,
    html_url: 'https://github.com/lynx-family/lynx-website/pull/2000',
    base: { ref: 'release/4.0' },
    head: {
      ref: 'cherry-pick/release-4.0/pr-1358',
      repo: { full_name: 'lynx-family/lynx-website' },
    },
    labels: structuredClone(existingPullLabels),
    body: [
      '<!-- cherry-pick-generated: source-pr=1358 target=release/4.0 request=1403 -->',
    ].join('\n'),
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const requestData = await readRequestBody(request);
    requests.push({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: requestData,
    });

    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403'
    ) {
      sendJson(response, issue);
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
      url.pathname.startsWith(
        '/repos/lynx-family/lynx-website/branches/release%2F4.',
      )
    ) {
      sendJson(response, {
        name: decodeURIComponent(url.pathname.split('/').at(-1)),
      });
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/comments'
    ) {
      sendJson(response, mutableComments);
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/pulls'
    ) {
      const pulls =
        url.searchParams.get('state') === 'open' &&
        url.searchParams.get('base') === 'release/4.0'
          ? [existingPull]
          : [];
      sendJson(response, pulls);
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/repos/lynx-family/lynx-website/pulls'
    ) {
      createdPulls.push(requestData);
      sendJson(
        response,
        {
          number: 2001,
          html_url: 'https://github.com/lynx-family/lynx-website/pull/2001',
        },
        201,
      );
      return;
    }
    if (request.method === 'POST' && url.pathname.endsWith('/labels')) {
      if (
        url.pathname === '/repos/lynx-family/lynx-website/issues/1403/labels'
      ) {
        for (const name of requestData.labels) {
          if (!issue.labels.some((label) => label.name === name)) {
            issue.labels.push({ name });
          }
        }
      }
      if (
        url.pathname === '/repos/lynx-family/lynx-website/issues/2000/labels'
      ) {
        for (const name of requestData.labels) {
          if (!existingPull.labels.some((label) => label.name === name)) {
            existingPull.labels.push({ name });
          }
        }
      }
      sendJson(response, requestData.labels);
      return;
    }
    if (
      request.method === 'DELETE' &&
      url.pathname.startsWith(
        '/repos/lynx-family/lynx-website/issues/1403/labels/',
      )
    ) {
      const label = decodeURIComponent(url.pathname.split('/').at(-1));
      if (!issue.labels.some((item) => item.name === label)) {
        sendJson(response, { message: 'Not Found' }, 404);
        return;
      }
      issue.labels = issue.labels.filter((item) => item.name !== label);
      response.writeHead(204);
      response.end();
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403/comments'
    ) {
      if (shouldFailExecutionComment) {
        shouldFailExecutionComment = false;
        sendJson(response, { message: 'Injected failure' }, 500);
        return;
      }
      const comment = {
        id: mutableComments.length + 1,
        body: requestData.body,
        user: { login: 'github-actions[bot]', type: 'Bot' },
      };
      mutableComments.push(comment);
      sendJson(response, comment, 201);
      return;
    }
    if (
      request.method === 'PATCH' &&
      url.pathname.startsWith(
        '/repos/lynx-family/lynx-website/issues/comments/',
      )
    ) {
      const commentId = Number(url.pathname.split('/').at(-1));
      const comment = mutableComments.find((item) => item.id === commentId);
      comment.body = requestData.body;
      sendJson(response, comment);
      return;
    }
    if (
      request.method === 'PATCH' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403'
    ) {
      issue.state = requestData.state;
      sendJson(response, issue);
      return;
    }

    sendJson(response, { message: 'Not Found' }, 404);
  });

  const apiUrl = await listen(server);
  try {
    const temporaryDirectory = await createTemporaryDirectory(
      'cherry-pick-request-execute-test-',
    );
    const eventPath = path.join(temporaryDirectory, 'event.json');
    const { fakeBin, gitLogPath } = await createFakeGit(temporaryDirectory);
    await fs.writeFile(
      eventPath,
      JSON.stringify({
        action: 'labeled',
        issue: { ...issue, body: eventBody },
        label: { name: 'cherry-pick:approved' },
        repository: { full_name: 'lynx-family/lynx-website' },
        sender: { login: 'maintainer' },
      }),
    );

    const result = await runWorkflowProcess(command, {
      FAKE_GIT_LOG: gitLogPath,
      GITHUB_API_URL: apiUrl,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REPOSITORY: 'lynx-family/lynx-website',
      GITHUB_RUN_ID: '124',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_TOKEN: 'test-token',
      PATH: `${fakeBin}:${process.env.PATH}`,
    });

    return {
      ...result,
      comments: mutableComments,
      createdPulls,
      gitCalls: (await fs.readFile(gitLogPath, 'utf8').catch(() => ''))
        .trim()
        .split('\n')
        .filter(Boolean),
      issue,
      requests,
    };
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

  for (const stateLabel of STATE_LABELS) {
    it(`ignores a duplicate type-label event when ${stateLabel} exists`, async () => {
      const result = await runValidation([stateLabel]);

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

describe('terminal cherry-pick request reuse', () => {
  it('persists a parseable source identity when other fields are invalid', async () => {
    const result = await runValidation([], {
      body: requestBody().replace('- [x] release/4.0', '- [ ] release/4.0'),
    });

    assert.equal(result.code, 0, result.stderr);
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(summary.body, /<!-- cherry-pick-source-pr: 1358 -->/);
    assert.doesNotMatch(summary.body, /cherry-pick-source-pr: unset/);
  });

  it('allows the first valid source after an invalid initial source', async () => {
    const invalid = await runValidation([], {
      body: requestBody().replace('#1358', 'not-a-pull-request'),
    });
    assert.equal(invalid.code, 0, invalid.stderr);
    const invalidSummary = invalid.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(invalidSummary.body, /<!-- cherry-pick-source-pr: unset -->/);

    const corrected = await runValidation(['cherry-pick:invalid'], {
      action: 'edited',
      comments: invalid.comments,
    });

    assert.equal(corrected.code, 0, corrected.stderr);
    assert.deepEqual(
      corrected.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:pending-approval'].sort(),
    );
    const correctedSummary = corrected.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(correctedSummary.body, /<!-- cherry-pick-source-pr: 1358 -->/);
    assert.doesNotMatch(correctedSummary.body, /cherry-pick-source-pr: unset/);
  });

  it('does not infer a legacy source identity from reason text', async () => {
    const result = await runValidation(['cherry-pick:partial'], {
      action: 'edited',
      comments: [
        {
          id: 1,
          body: [
            '<!-- cherry-pick-request-summary -->',
            '',
            '## Cherry-pick request summary',
            '',
            '### Reason',
            '',
            '- Source PR: #1400',
          ].join('\n'),
          user: { login: 'github-actions[bot]', type: 'Bot' },
        },
      ],
    });

    assert.equal(result.code, 0, result.stderr);
    assert.equal(
      result.requests.some(
        (request) =>
          request.method === 'GET' && request.path.endsWith('/pulls/1400'),
      ),
      false,
    );
    assert.ok(
      result.comments.some((comment) =>
        /persisted source PR identity is missing/i.test(comment.body),
      ),
    );
  });

  it('fails closed when an initialized request loses its source identity', async () => {
    const result = await runValidation(['cherry-pick:partial'], {
      action: 'edited',
      comments: [],
    });

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:partial'].sort(),
    );
    assert.equal(
      result.requests.some(
        (request) =>
          request.method === 'GET' && request.path.endsWith('/pulls/1358'),
      ),
      false,
    );
    assert.equal(
      result.comments.some((comment) =>
        comment.body.includes('<!-- cherry-pick-request-summary -->'),
      ),
      false,
    );
    assert.ok(
      result.comments.some(
        (comment) =>
          /persisted source PR identity is missing/i.test(comment.body) &&
          comment.body.includes('Open a new cherry-pick request'),
      ),
    );
  });

  it('rejects changing the source PR of an existing request', async () => {
    const legacySummary = approvedSummary();
    legacySummary.body = legacySummary.body.replace(
      '<!-- cherry-pick-source-pr: 1358 -->\n',
      '',
    );
    const result = await runValidation(
      ['cherry-pick:partial', 'cherry-pick:approved'],
      {
        action: 'edited',
        body: requestBody().replace('#1358', '#1400'),
        comments: [legacySummary],
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:invalid'].sort(),
    );
    assert.equal(
      result.requests.some(
        (request) =>
          request.method === 'GET' && request.path.endsWith('/pulls/1400'),
      ),
      false,
    );
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(summary.body, /<!-- cherry-pick-source-pr: 1358 -->/);
    assert.match(summary.body, /^- Source PR: #1358$/m);
    assert.doesNotMatch(summary.body, /^- Source PR: #1400$/m);
    assert.match(summary.body, /Status: \*\*Invalid\*\*/);
    assert.ok(
      result.comments.some(
        (comment) =>
          comment.body.includes(
            'Source PR cannot be changed from #1358 to #1400.',
          ) && comment.body.includes('open a new Cherry-pick request'),
      ),
    );
  });

  for (const action of ['edited', 'reopened']) {
    it(`clears stale approval metadata when a terminal request is ${action}`, async () => {
      const terminalState =
        action === 'edited' ? 'cherry-pick:partial' : 'cherry-pick:pr-created';
      const stateLabels =
        action === 'edited'
          ? [terminalState, 'cherry-pick:approved']
          : [terminalState];
      const result = await runValidation(stateLabels, {
        action,
        body: requestBodyWithNewTarget(),
        comments: [approvedSummary()],
      });

      assert.equal(result.code, 0, result.stderr);

      assert.deepEqual(
        result.issue.labels.map((label) => label.name).sort(),
        [TYPE_LABEL, 'cherry-pick:pending-approval'].sort(),
      );
      const summary = result.comments.find((comment) =>
        comment.body.includes('<!-- cherry-pick-request-summary -->'),
      );
      assert.doesNotMatch(summary.body, /cherry-pick-approved-fingerprint/);
      assert.doesNotMatch(summary.body, /cherry-pick-approved-by/);
      assert.doesNotMatch(summary.body, /cherry-pick-approved-at/);
      assert.match(summary.body, /Status: \*\*Pending approval\*\*/);
    });
  }

  it('reuses an existing target and creates a PR only for the new target after reapproval', async () => {
    const body = requestBodyWithNewTarget();
    const reopened = await runValidation(['cherry-pick:pr-created'], {
      action: 'reopened',
      body,
      comments: [approvedSummary()],
    });
    assert.equal(reopened.code, 0, reopened.stderr);

    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        action: 'labeled',
        body,
        comments: reopened.comments,
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(approval.code, 0, approval.stderr);
    assert.match(approval.output, /^should_execute=true$/m);
    assert.match(
      approval.output,
      /^target_branches=release\/4.1,release\/4.0$/m,
    );

    const execution = await runExecution({
      body,
      comments: approval.comments,
    });

    assert.equal(execution.code, 0, execution.stderr);
    assert.deepEqual(
      execution.createdPulls.map((pull) => pull.base),
      ['release/4.1'],
    );
    assert.equal(
      execution.gitCalls.filter((call) =>
        call.startsWith('cherry-pick -x source-commit'),
      ).length,
      1,
    );
    assert.ok(
      execution.comments.some((comment) =>
        comment.body.includes(
          'Existing cherry-pick PR found for `release/4.0`',
        ),
      ),
    );
    assert.equal(execution.issue.state, 'closed');
    assert.ok(
      execution.issue.labels.some(
        (label) => label.name === 'cherry-pick:pr-created',
      ),
    );
  });
});

describe('cherry-pick request execution approval', () => {
  it('approves the event snapshot when the issue changes afterward', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        action: 'labeled',
        body: requestBodyWithNewTarget(),
        comments: [approvedSummary()],
        eventBody: requestBody(),
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.output, /^should_execute=true$/m);
    assert.match(result.output, /^target_branches=release\/4.0$/m);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:pending-approval'].sort(),
    );
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.doesNotMatch(summary.body, /release\/4\.1/);
  });

  it('rejects an approval event from a triage-only actor', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        action: 'labeled',
        comments: [approvedSummary()],
        eventLabel: 'cherry-pick:approved',
        sender: 'triage-user',
        senderPermission: 'triage',
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.doesNotMatch(result.output, /^should_execute=true$/m);
    assert.equal(
      result.issue.labels.some(
        (label) => label.name === 'cherry-pick:approved',
      ),
      false,
    );
  });

  it('removes a redundant approval label while execution is running', async () => {
    const result = await runValidation(
      ['cherry-pick:running', 'cherry-pick:approved'],
      {
        action: 'labeled',
        comments: [runningSummary()],
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.doesNotMatch(result.output, /^should_execute=true$/m);
    assert.equal(
      result.issue.labels.some(
        (label) => label.name === 'cherry-pick:approved',
      ),
      false,
    );
  });

  it('clears approval when only the reason is edited', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        action: 'edited',
        body: requestBody().replace(
          'Backport a low-risk documentation change.',
          'Clarify the release impact.',
        ),
        comments: [approvedSummary()],
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:pending-approval'].sort(),
    );
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.doesNotMatch(summary.body, /cherry-pick-approved-fingerprint/);
  });

  it('executes the approved event snapshot after later edits and label removal', async () => {
    const execution = await runExecution({
      body: requestBodyWithNewTarget(),
      comments: [approvedSummary()],
      eventBody: requestBody(),
      stateLabels: ['cherry-pick:pending-approval'],
    });

    assert.equal(execution.code, 0, execution.stderr);
    assert.deepEqual(execution.createdPulls, []);
    assert.equal(
      execution.gitCalls.some((call) => call.startsWith('cherry-pick -x ')),
      false,
    );
    assert.equal(execution.issue.state, 'closed');
    assert.ok(
      execution.comments.some((comment) =>
        comment.body.includes(
          'Existing cherry-pick PR found for `release/4.0`',
        ),
      ),
    );
  });

  it('clears the running state after an unexpected execution failure', async () => {
    const execution = await runExecution({
      body: requestBody(),
      comments: [approvedSummary()],
      failFirstExecutionComment: true,
    });

    assert.equal(execution.code, 1);
    assert.deepEqual(
      execution.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:failed'].sort(),
    );
    assert.ok(
      execution.comments.some((comment) =>
        comment.body.includes(
          'Cherry-pick workflow encountered an unexpected error',
        ),
      ),
    );
  });

  it('repairs an orphaned running state in the cleanup command', async () => {
    const cleanup = await runExecution({
      body: requestBody(),
      command: 'cleanup',
      comments: [runningSummary()],
      stateLabels: ['cherry-pick:running'],
    });

    assert.equal(cleanup.code, 0, cleanup.stderr);
    assert.deepEqual(
      cleanup.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:failed'].sort(),
    );
    assert.ok(
      cleanup.comments.some((comment) =>
        comment.body.includes('moved from running to failed'),
      ),
    );
    const summary = cleanup.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(summary.body, /Status: \*\*Failed\*\*/);
    assert.match(
      summary.body,
      /Next action: Fix the failure, then add `cherry-pick:approved`/,
    );
  });

  it('reuses a generated PR whose label write previously failed', async () => {
    const execution = await runExecution({
      body: requestBody(),
      comments: [approvedSummary()],
      existingPullLabels: [],
    });

    assert.equal(execution.code, 0, execution.stderr);
    assert.deepEqual(execution.createdPulls, []);
    assert.equal(
      execution.gitCalls.some((call) => call.startsWith('cherry-pick -x ')),
      false,
    );
    assert.ok(
      execution.requests.some(
        (request) =>
          request.method === 'POST' &&
          request.path.endsWith('/issues/2000/labels') &&
          request.body.labels.includes('cherry-pick:generated'),
      ),
    );
  });
});
