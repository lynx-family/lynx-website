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

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

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

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length > 0 ? JSON.parse(Buffer.concat(chunks)) : null;
}

function sendJson(response, value, statusCode = 200) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

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
