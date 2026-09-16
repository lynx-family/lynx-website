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

/** Adds a newer target while retaining the original request target. */
function requestBodyWithNewTarget() {
  return requestBody().replace(
    '- [x] release/4.0',
    ['- [x] release/4.1', '- [x] release/4.0'].join('\n'),
  );
}

/** Builds the canonical summary created when a request is initialized. */
function initializedSummary() {
  return {
    id: 1,
    body: [
      '<!-- cherry-pick-request-summary -->',
      '<!-- cherry-pick-source-pr: 1358 -->',
      '',
      '## Cherry-pick request summary',
      '',
      'Status: **Pending approval**',
      '',
      '- Request issue: #1403',
      '- Source PR: #1358',
    ].join('\n'),
    user: { login: 'github-actions[bot]', type: 'Bot' },
  };
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
      '<!-- cherry-pick-source-pr: 1358 -->',
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

/** Runs one workflow command and captures its process output. */
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

/** Installs a deterministic git stub used by execution tests. */
async function createFakeGit(temporaryDirectory, targetContainsSource = true) {
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
      `if (args[0] === 'merge-base') process.exit(${targetContainsSource ? 0 : 1});`,
    ].join('\n'),
    { mode: 0o755 },
  );
  return { fakeBin, gitLogPath };
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

/** Runs request validation against a stateful mock GitHub API. */
async function runValidation(stateLabels = [], options = {}) {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  const issue = {
    id: 140300,
    number: 1403,
    state: options.issueState || 'open',
    labels: [TYPE_LABEL, ...stateLabels].map((name) => ({ name })),
    user: { login: 'external-contributor' },
    body: options.body || requestBody(),
    updated_at: options.issueUpdatedAt || '2026-09-14T01:00:00Z',
  };
  const comments = structuredClone(
    options.comments ??
      (stateLabels.some((label) => STATE_LABELS.includes(label))
        ? [initializedSummary()]
        : []),
  );
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
      if (options.permissionStatus === 404) {
        sendJson(response, { message: 'Not Found' }, 404);
      } else {
        sendJson(response, {
          permission: options.senderPermission || 'maintain',
        });
      }
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/pulls/1358'
    ) {
      if (options.sourcePullStatus && options.sourcePullStatus !== 200) {
        sendJson(
          response,
          { message: options.sourcePullError || 'Source pull request failed' },
          options.sourcePullStatus,
        );
      } else {
        sendJson(response, {
          merged: true,
          base: { ref: 'main' },
          merge_commit_sha: 'source-commit',
          title: 'docs: update Miso logo and website link',
          ...options.sourcePull,
        });
      }
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
      if (
        label === 'cherry-pick:approved' &&
        options.approvalDeleteStatus === 404
      ) {
        sendJson(response, { message: 'Not Found' }, 404);
        return;
      }
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
    const eventIssue = {
      ...issue,
      state: options.eventIssueState || issue.state,
      body: options.eventBody ?? issue.body,
      labels: (options.eventStateLabels || [TYPE_LABEL, ...stateLabels]).map(
        (name) => ({ name }),
      ),
      updated_at:
        options.eventUpdatedAt ||
        options.issueUpdatedAt ||
        '2026-09-14T01:00:00Z',
    };
    await fs.writeFile(
      eventPath,
      JSON.stringify({
        action: options.action || 'labeled',
        issue: eventIssue,
        label: {
          name: options.eventLabel || TYPE_LABEL,
        },
        repository: {
          id: 850,
          full_name: 'lynx-family/lynx-website',
        },
        sender: {
          id: options.senderId || 42,
          login: options.sender || 'maintainer',
        },
      }),
    );
    await fs.writeFile(outputPath, '');

    const result = await runWorkflowProcess('validate', {
      GITHUB_API_URL: apiUrl,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: outputPath,
      GITHUB_REPOSITORY: 'lynx-family/lynx-website',
      GITHUB_RUN_ID: options.runId || '123',
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

/** Runs execution against the approval event while exposing live Issue drift. */
async function runExecution(options) {
  const issue = {
    id: 140300,
    number: 1403,
    state: options.issueState || 'open',
    labels: [TYPE_LABEL, ...(options.stateLabels || [])].map((name) => ({
      name,
    })),
    user: { login: 'external-contributor' },
    body: options.body || requestBody(),
    updated_at: options.issueUpdatedAt || '2026-09-14T01:01:00Z',
  };
  const comments = structuredClone(options.comments || []);
  const requests = [];
  const createdPulls = [];
  const existingPullState = options.existingPullState || 'open';
  const existingPull =
    options.existingPullLabels === undefined
      ? null
      : {
          number: 2000,
          html_url: 'https://github.com/lynx-family/lynx-website/pull/2000',
          base: { ref: 'release/4.0' },
          head: {
            ref: 'cherry-pick/release-4.0/pr-1358',
            repo: { full_name: 'lynx-family/lynx-website' },
          },
          labels: structuredClone(options.existingPullLabels),
          body: '<!-- cherry-pick-generated: source-pr=1358 target=release/4.0 request=1403 -->',
          merged_at: options.existingPullMergedAt || null,
        };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const body = await readRequestBody(request);
    requests.push({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
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
      sendJson(response, comments);
      return;
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/repos/lynx-family/lynx-website/pulls'
    ) {
      const pulls =
        existingPull &&
        url.searchParams.get('state') === existingPullState &&
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
      createdPulls.push(body);
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
      url.pathname === '/repos/lynx-family/lynx-website/issues/2000/labels'
    ) {
      if (options.existingLabelWriteStatus) {
        sendJson(
          response,
          { message: 'Generated label write failed' },
          options.existingLabelWriteStatus,
        );
        return;
      }
      for (const name of body.labels) {
        if (!existingPull.labels.some((label) => label.name === name)) {
          existingPull.labels.push({ name });
        }
      }
      sendJson(response, existingPull.labels);
      return;
    }
    if (request.method === 'POST' && url.pathname.endsWith('/labels')) {
      sendJson(response, body.labels);
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
    if (
      request.method === 'PATCH' &&
      url.pathname === '/repos/lynx-family/lynx-website/issues/1403'
    ) {
      issue.state = body.state;
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
    const { fakeBin, gitLogPath } = await createFakeGit(
      temporaryDirectory,
      options.targetContainsSource,
    );
    await fs.writeFile(
      eventPath,
      JSON.stringify({
        action: 'labeled',
        issue: {
          id: 140300,
          number: 1403,
          state: 'open',
          labels: [
            TYPE_LABEL,
            'cherry-pick:pending-approval',
            'cherry-pick:approved',
          ].map((name) => ({ name })),
          user: { login: 'external-contributor' },
          body: options.eventBody || requestBody(),
          updated_at: options.eventUpdatedAt || '2026-09-14T01:00:00Z',
        },
        label: { name: 'cherry-pick:approved' },
        repository: {
          id: 850,
          full_name: 'lynx-family/lynx-website',
        },
        sender: {
          id: options.senderId || 42,
          login: options.sender || 'maintainer',
        },
      }),
    );

    const result = await runWorkflowProcess('execute', {
      FAKE_GIT_LOG: gitLogPath,
      GITHUB_API_URL: apiUrl,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REPOSITORY: 'lynx-family/lynx-website',
      GITHUB_RUN_ID: options.runId || '123',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_TOKEN: 'test-token',
      PATH: `${fakeBin}:${process.env.PATH}`,
    });

    return {
      ...result,
      comments,
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

  it('allows correcting a parseable source PR that does not exist', async () => {
    const invalid = await runValidation([], {
      body: requestBody().replace('#1358', '#10000'),
    });

    assert.equal(invalid.code, 0, invalid.stderr);
    const invalidSummary = invalid.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(invalidSummary.body, /<!-- cherry-pick-source-pr: unset -->/);
    assert.match(invalidSummary.body, /Source PR #10000 does not exist/);

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
  });

  it('does not persist source identity after a transient PR lookup failure', async () => {
    const result = await runValidation([], {
      sourcePullStatus: 500,
    });

    assert.equal(result.code, 1);
    assert.equal(
      result.comments.some((comment) =>
        comment.body.includes('<!-- cherry-pick-request-summary -->'),
      ),
      false,
    );
  });

  it('locks an existing source PR and reuses its lookup result', async () => {
    const result = await runValidation([], {
      sourcePull: { merged: false },
    });

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:invalid'].sort(),
    );
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.match(summary.body, /<!-- cherry-pick-source-pr: 1358 -->/);
    assert.equal(
      result.requests.filter(
        (request) =>
          request.method === 'GET' && request.path.endsWith('/pulls/1358'),
      ).length,
      1,
    );
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
    assert.ok(
      result.comments.some(
        (comment) =>
          /persisted source PR identity is missing/i.test(comment.body) &&
          comment.body.includes('Open a new cherry-pick request'),
      ),
    );
  });

  for (const scenario of [
    { name: 'edited', stateLabels: [], options: { action: 'edited' } },
    { name: 'reopened', stateLabels: [], options: { action: 'reopened' } },
    {
      name: 'approval',
      stateLabels: ['cherry-pick:approved'],
      options: { eventLabel: 'cherry-pick:approved' },
    },
  ]) {
    it(`fails closed for ${scenario.name} events without persisted source identity or state`, async () => {
      const result = await runValidation(scenario.stateLabels, {
        ...scenario.options,
        comments: [],
      });

      assert.equal(result.code, 0, result.stderr);
      assert.match(result.output, /^should_execute=false$/m);
      assert.deepEqual(
        result.issue.labels.map((label) => label.name),
        [TYPE_LABEL],
      );
      assert.equal(
        result.requests.some(
          (request) =>
            request.method === 'GET' && request.path.endsWith('/pulls/1358'),
        ),
        false,
      );
      assert.ok(
        result.comments.some((comment) =>
          /persisted source PR identity is missing/i.test(comment.body),
        ),
      );
    });
  }

  it('rejects changing the source PR of an existing request', async () => {
    const initialized = await runValidation();
    assert.equal(initialized.code, 0, initialized.stderr);
    const legacySummary = initialized.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
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
      const approved = await runValidation(
        ['cherry-pick:pending-approval', 'cherry-pick:approved'],
        { eventLabel: 'cherry-pick:approved' },
      );
      assert.equal(approved.code, 0, approved.stderr);

      const terminalState =
        action === 'edited' ? 'cherry-pick:partial' : 'cherry-pick:pr-created';
      const stateLabels =
        action === 'edited'
          ? [terminalState, 'cherry-pick:approved']
          : [terminalState];
      const result = await runValidation(stateLabels, {
        action,
        body: requestBodyWithNewTarget(),
        comments: approved.comments,
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
      assert.doesNotMatch(summary.body, /cherry-pick-approval-event/);
      assert.doesNotMatch(summary.body, /cherry-pick-approved-by/);
      assert.doesNotMatch(summary.body, /cherry-pick-approved-at/);
      assert.match(summary.body, /Status: \*\*Pending approval\*\*/);
    });
  }

  it('reuses an existing target and creates a PR only for the new target after reapproval', async () => {
    const initialApproval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      { eventLabel: 'cherry-pick:approved' },
    );
    assert.equal(initialApproval.code, 0, initialApproval.stderr);

    const body = requestBodyWithNewTarget();
    const reopened = await runValidation(['cherry-pick:pr-created'], {
      action: 'reopened',
      body,
      comments: initialApproval.comments,
    });
    assert.equal(reopened.code, 0, reopened.stderr);

    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        body,
        comments: reopened.comments,
        eventLabel: 'cherry-pick:approved',
        eventUpdatedAt: '2026-09-14T02:00:00Z',
        issueUpdatedAt: '2026-09-14T02:00:00Z',
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
      eventBody: body,
      eventUpdatedAt: '2026-09-14T02:00:00Z',
      existingPullLabels: [{ name: 'cherry-pick:generated' }],
      targetContainsSource: false,
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

  it('restores a missing generated label while reusing the existing PR', async () => {
    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      { eventLabel: 'cherry-pick:approved' },
    );
    assert.equal(approval.code, 0, approval.stderr);

    const execution = await runExecution({
      comments: approval.comments,
      eventBody: requestBody(),
      existingPullLabels: [],
      targetContainsSource: false,
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

  it('reuses the existing PR when generated label restoration also fails', async () => {
    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      { eventLabel: 'cherry-pick:approved' },
    );
    assert.equal(approval.code, 0, approval.stderr);

    const execution = await runExecution({
      comments: approval.comments,
      eventBody: requestBody(),
      existingPullLabels: [],
      existingLabelWriteStatus: 500,
      targetContainsSource: false,
    });

    assert.equal(execution.code, 0, execution.stderr);
    assert.match(
      execution.stderr,
      /Failed to restore cherry-pick:generated on PR #2000/,
    );
    assert.deepEqual(execution.createdPulls, []);
    assert.equal(
      execution.gitCalls.some((call) => call.startsWith('cherry-pick -x ')),
      false,
    );
    assert.ok(
      execution.comments.some((comment) =>
        comment.body.includes(
          'Existing cherry-pick PR found for `release/4.0`',
        ),
      ),
    );
  });

  it('reuses an existing merged PR without recreating its target', async () => {
    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      { eventLabel: 'cherry-pick:approved' },
    );
    assert.equal(approval.code, 0, approval.stderr);

    const execution = await runExecution({
      comments: approval.comments,
      eventBody: requestBody(),
      existingPullLabels: [],
      existingPullState: 'closed',
      existingPullMergedAt: '2026-09-14T03:00:00Z',
      targetContainsSource: false,
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
          request.path.endsWith('/issues/2000/labels'),
      ),
    );
    assert.ok(
      execution.issue.labels.some(
        (label) => label.name === 'cherry-pick:pr-created',
      ),
    );
    assert.equal(execution.issue.state, 'closed');
  });

  it('blocks a target whose generated PR was closed without merging', async () => {
    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      { eventLabel: 'cherry-pick:approved' },
    );
    assert.equal(approval.code, 0, approval.stderr);

    const execution = await runExecution({
      comments: approval.comments,
      eventBody: requestBody(),
      existingPullLabels: [{ name: 'cherry-pick:generated' }],
      existingPullState: 'closed',
      targetContainsSource: false,
    });

    assert.equal(execution.code, 0, execution.stderr);
    assert.deepEqual(execution.createdPulls, []);
    assert.equal(
      execution.gitCalls.some((call) => call.startsWith('cherry-pick -x ')),
      false,
    );
    assert.ok(
      execution.comments.some((comment) =>
        comment.body.includes(
          'existing generated cherry-pick PR for this source PR and target branch was closed without merging',
        ),
      ),
    );
    assert.ok(
      execution.issue.labels.some(
        (label) => label.name === 'cherry-pick:failed',
      ),
    );
    assert.equal(execution.issue.state, 'open');
  });
});

describe('cherry-pick request approval authorization', () => {
  for (const permission of ['write', 'maintain', 'admin']) {
    it(`accepts an approval event from an actor with ${permission} permission`, async () => {
      const result = await runValidation(
        ['cherry-pick:pending-approval', 'cherry-pick:approved'],
        {
          eventLabel: 'cherry-pick:approved',
          senderPermission: permission,
        },
      );

      assert.equal(result.code, 0, result.stderr);
      assert.match(result.output, /^should_execute=true$/m);
      assert.equal(
        result.issue.labels.some(
          (label) => label.name === 'cherry-pick:approved',
        ),
        false,
      );
    });
  }

  for (const permission of ['read', 'triage', 'none']) {
    it(`rejects an approval event from an actor with ${permission} permission`, async () => {
      const result = await runValidation(
        ['cherry-pick:pending-approval', 'cherry-pick:approved'],
        {
          eventLabel: 'cherry-pick:approved',
          senderPermission: permission,
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
  }

  it('rejects an approval actor missing from repository permissions', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        eventLabel: 'cherry-pick:approved',
        permissionStatus: 404,
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

  it('authorizes the immutable event body instead of a later live edit', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        body: requestBodyWithNewTarget(),
        eventBody: requestBody(),
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.output, /^target_branches=release\/4\.0$/m);
    const summary = result.comments.find((comment) =>
      comment.body.includes('<!-- cherry-pick-request-summary -->'),
    );
    assert.ok(summary);
    assert.doesNotMatch(summary.body, /release\/4\.1/);
  });

  it('rejects approval captured after acceptance but before execution starts', async () => {
    const first = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        eventLabel: 'cherry-pick:approved',
      },
    );
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.output, /^should_execute=true$/m);

    const eventStateLabels = [
      ...first.issue.labels.map((label) => label.name),
      'cherry-pick:approved',
    ];
    const queued = await runValidation(
      ['cherry-pick:failed', 'cherry-pick:approved'],
      {
        comments: first.comments,
        eventLabel: 'cherry-pick:approved',
        eventStateLabels,
        eventUpdatedAt: '2026-09-14T01:05:00Z',
        issueUpdatedAt: '2026-09-14T01:05:00Z',
      },
    );

    assert.equal(queued.code, 0, queued.stderr);
    assert.doesNotMatch(queued.output, /^should_execute=true$/m);
    assert.deepEqual(
      queued.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:failed'].sort(),
    );
  });

  it('establishes running before removing the approval trigger', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(result.code, 0, result.stderr);
    const summaryWrite = result.requests.findIndex(
      (request) =>
        ['POST', 'PATCH'].includes(request.method) &&
        request.body?.body?.includes('<!-- cherry-pick-request-summary -->') &&
        request.body.body.includes('Status: **Approved**'),
    );
    const runningState = result.requests.findIndex(
      (request) =>
        request.method === 'POST' &&
        request.path.endsWith('/issues/1403/labels') &&
        request.body?.labels?.includes('cherry-pick:running'),
    );
    const triggerCleanup = result.requests.findIndex(
      (request) =>
        request.method === 'DELETE' &&
        request.path.endsWith(
          `/labels/${encodeURIComponent('cherry-pick:approved')}`,
        ),
    );
    assert.notEqual(summaryWrite, -1);
    assert.ok(runningState > summaryWrite);
    assert.ok(triggerCleanup > runningState);
    assert.deepEqual(
      result.issue.labels.map((label) => label.name).sort(),
      [TYPE_LABEL, 'cherry-pick:running'].sort(),
    );
  });

  it('accepts approval when the trigger label was already removed', async () => {
    const result = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        approvalDeleteStatus: 404,
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.output, /^should_execute=true$/m);
  });

  it('ignores a duplicate delivery of an accepted approval event', async () => {
    const first = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        eventLabel: 'cherry-pick:approved',
      },
    );
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.output, /^should_execute=true$/m);
    assert.ok(
      first.comments.some((comment) =>
        comment.body.includes('<!-- cherry-pick-approval-event:'),
      ),
    );

    const duplicate = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        comments: first.comments,
        eventLabel: 'cherry-pick:approved',
      },
    );

    assert.equal(duplicate.code, 0, duplicate.stderr);
    assert.doesNotMatch(duplicate.output, /^should_execute=true$/m);
    assert.match(duplicate.stdout, /already accepted/i);
  });

  it('accepts a fresh approval cycle for the same request body', async () => {
    const first = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        eventLabel: 'cherry-pick:approved',
      },
    );
    assert.equal(first.code, 0, first.stderr);

    const retry = await runValidation(
      ['cherry-pick:failed', 'cherry-pick:approved'],
      {
        comments: first.comments,
        eventLabel: 'cherry-pick:approved',
        eventUpdatedAt: '2026-09-14T01:05:00Z',
        issueUpdatedAt: '2026-09-14T01:05:00Z',
      },
    );

    assert.equal(retry.code, 0, retry.stderr);
    assert.match(retry.output, /^should_execute=true$/m);
  });

  it('executes the accepted event after later body, state, and label changes', async () => {
    const approval = await runValidation(
      ['cherry-pick:pending-approval', 'cherry-pick:approved'],
      {
        body: requestBodyWithNewTarget(),
        eventBody: requestBody(),
        eventLabel: 'cherry-pick:approved',
      },
    );
    assert.equal(approval.code, 0, approval.stderr);
    assert.match(approval.output, /^should_execute=true$/m);

    const execution = await runExecution({
      body: requestBodyWithNewTarget(),
      comments: approval.comments,
      eventBody: requestBody(),
      issueState: 'closed',
      stateLabels: ['cherry-pick:pending-approval'],
    });

    assert.equal(execution.code, 0, execution.stderr);
    assert.ok(
      execution.gitCalls.some((call) =>
        call.includes('release-4.0 origin/release/4.0'),
      ),
    );
    assert.equal(
      execution.gitCalls.some((call) => call.includes('release/4.1')),
      false,
    );
    assert.equal(
      execution.requests.some((request) =>
        request.path.includes('branches/release%2F4.1'),
      ),
      false,
    );
  });
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
      /must not assign reserved workflow labels automatically/,
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
