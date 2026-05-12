#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const CONFIG_PATH = '.github/cherry-pick-config.json';
const ISSUE_FORM_PATH = '.github/ISSUE_TEMPLATE/cherry_pick_request.yml';
const SUMMARY_MARKER = '<!-- cherry-pick-request-summary -->';
const GENERATED_MARKER_PREFIX = '<!-- cherry-pick-generated:';
const APPROVED_FINGERPRINT_RE =
  /<!-- cherry-pick-approved-fingerprint:\s*([a-f0-9]+)\s*-->/i;
const APPROVED_BY_RE = /<!-- cherry-pick-approved-by:\s*([^>]+?)\s*-->/i;
const APPROVED_AT_RE = /<!-- cherry-pick-approved-at:\s*([^>]+?)\s*-->/i;

const TYPE_LABEL = 'cherry-pick:request';
const APPROVED_LABEL = 'cherry-pick:approved';
const GENERATED_LABEL = 'cherry-pick:generated';
const STATE_LABELS = [
  'cherry-pick:pending-approval',
  'cherry-pick:running',
  'cherry-pick:pr-created',
  'cherry-pick:partial',
  'cherry-pick:failed',
  'cherry-pick:invalid',
];
const TERMINAL_STATE_LABELS = new Set([
  'cherry-pick:pr-created',
  'cherry-pick:partial',
  'cherry-pick:failed',
  'cherry-pick:invalid',
]);
const SUCCESS_RESULTS = new Set([
  'Created',
  'Created with warning',
  'Existing',
]);
const VALID_RISKS = new Set(['Low', 'Medium', 'High']);
const MAX_REASON_LENGTH = 2000;
const MAX_CONFLICT_FILES = 20;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadConfig() {
  return readJson(CONFIG_PATH);
}

function repoFromEnv() {
  let repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !repository.includes('/')) {
    try {
      const event = process.env.GITHUB_EVENT_PATH
        ? readJson(process.env.GITHUB_EVENT_PATH)
        : null;
      repository = event?.repository?.full_name || repository;
    } catch {
      // Keep the original env value and let the explicit validation below fail.
    }
  }
  if (!repository || !repository.includes('/')) {
    throw new Error('GITHUB_REPOSITORY must be set to owner/repo.');
  }
  const [owner, repo] = repository.split('/');
  return { owner, repo, repository };
}

function getEvent() {
  if (!process.env.GITHUB_EVENT_PATH) {
    throw new Error('GITHUB_EVENT_PATH is required.');
  }
  return readJson(process.env.GITHUB_EVENT_PATH);
}

function workflowRunUrl() {
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
  let repo = process.env.GITHUB_REPOSITORY || '';
  if (!repo) {
    try {
      repo = process.env.GITHUB_EVENT_PATH
        ? readJson(process.env.GITHUB_EVENT_PATH)?.repository?.full_name || ''
        : '';
    } catch {
      repo = '';
    }
  }
  const runId = process.env.GITHUB_RUN_ID || '';
  if (!repo || !runId) return '';
  return `${server}/${repo}/actions/runs/${runId}`;
}

function apiBase() {
  return process.env.GITHUB_API_URL || 'https://api.github.com';
}

async function github(pathname, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required.');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(options.headers || {}),
  };
  const response = await fetch(`${apiBase()}${pathname}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && data.message ? data.message : text;
    const error = new Error(
      `GitHub API ${options.method || 'GET'} ${pathname} failed: ${response.status} ${message}`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return { data, headers: response.headers, status: response.status };
}

function parseLinkHeader(header) {
  if (!header) return {};
  const links = {};
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  }
  return links;
}

async function githubPaginate(pathname) {
  const results = [];
  let next = `${apiBase()}${pathname}`;
  while (next) {
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(next, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : [];
    if (!response.ok) {
      const message = data && data.message ? data.message : text;
      throw new Error(
        `GitHub API GET ${next} failed: ${response.status} ${message}`,
      );
    }
    results.push(...data);
    next = parseLinkHeader(response.headers.get('link')).next || '';
  }
  return results;
}

function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) {
    console.log(`${name}=${value}`);
    return;
  }
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function escapeHtmlComment(value) {
  return String(value || '').replaceAll('-->', '-- >');
}

function sanitizeReason(reason) {
  return String(reason || '')
    .replace(/<!--[\s\S]*?-->/g, '[removed html comment]')
    .trim()
    .slice(0, MAX_REASON_LENGTH);
}

function neutralizeMarkdownText(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('@', '&#64;');
}

function truncate(value, maxLength) {
  const input = String(value || '');
  if (input.length <= maxLength) return input;
  return `${input.slice(0, Math.max(0, maxLength - 3))}...`;
}

function markdownTableCell(value) {
  return neutralizeMarkdownText(value)
    .replaceAll('\r', '')
    .replaceAll('\n', '<br>')
    .replaceAll('|', '\\|');
}

function parseIssueSections(body) {
  const sections = new Map();
  let current = null;
  const lines = String(body || '')
    .replaceAll('\r\n', '\n')
    .split('\n');
  for (const line of lines) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].trim();
      sections.set(current, []);
    } else if (current) {
      sections.get(current).push(line);
    }
  }
  const normalized = new Map();
  for (const [key, value] of sections.entries()) {
    const content = value.join('\n').trim();
    normalized.set(key.toLowerCase(), content);
  }
  return normalized;
}

function getSection(sections, expected) {
  return sections.get(expected.toLowerCase()) || '';
}

function normalizeSourcePr(raw, repo) {
  const input = String(raw || '').trim();
  let match = input.match(/^#?(\d+)$/);
  if (match) return Number(match[1]);

  match = input.match(
    /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)\/?$/i,
  );
  if (!match) {
    throw new Error(
      'Source PR must be #123, 123, or a same-repository PR URL.',
    );
  }
  const [, owner, name, number] = match;
  if (
    owner.toLowerCase() !== repo.owner.toLowerCase() ||
    name.toLowerCase() !== repo.repo.toLowerCase()
  ) {
    throw new Error('Source PR URL must point to this repository.');
  }
  return Number(number);
}

function parseCheckedTargets(raw) {
  const targets = [];
  for (const line of String(raw || '').split('\n')) {
    const match = line.match(/^\s*-\s+\[[xX]\]\s+(.+?)\s*$/);
    if (match) targets.push(match[1].trim());
  }
  return [...new Set(targets)];
}

function parseRequestBody(body, config, repo = repoFromEnv()) {
  const sections = parseIssueSections(body);
  const sourceRaw = getSection(sections, 'Source PR');
  const targetRaw = getSection(sections, 'Target release branches');
  const reasonRaw = getSection(sections, 'Why is this cherry-pick needed?');
  const riskRaw = getSection(sections, 'Risk level');

  const sourcePr = normalizeSourcePr(sourceRaw, repo);
  const selectedTargets = parseCheckedTargets(targetRaw);
  if (selectedTargets.length === 0) {
    throw new Error('Select at least one target release branch.');
  }

  const unknownTargets = selectedTargets.filter(
    (target) => !config.targetBranches.includes(target),
  );
  if (unknownTargets.length > 0) {
    throw new Error(`Unsupported target branch: ${unknownTargets.join(', ')}.`);
  }

  const targets = config.targetBranches.filter((target) =>
    selectedTargets.includes(target),
  );
  const reason = sanitizeReason(reasonRaw);
  if (!reason) throw new Error('Reason is required.');

  const risk = riskRaw.trim();
  if (!VALID_RISKS.has(risk)) {
    throw new Error('Risk level must be Low, Medium, or High.');
  }

  return {
    sourcePr,
    targets,
    reason,
    risk,
  };
}

function fingerprint(parsed) {
  const payload = {
    sourcePr: parsed.sourcePr,
    targetBranches: [...parsed.targets].sort(),
    risk: parsed.risk,
  };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
}

function stableBranchName(target, sourcePr) {
  return `cherry-pick/${target.replaceAll('/', '-')}/pr-${sourcePr}`;
}

function generatedMarker(sourcePr, target, requestIssue) {
  return `<!-- cherry-pick-generated: source-pr=${sourcePr} target=${target} request=${requestIssue} -->`;
}

function isBotActor(comment) {
  const user = comment?.user;
  return (
    user?.login === 'github-actions[bot]' ||
    (user?.type === 'Bot' && user?.login?.includes('[bot]'))
  );
}

function isGitHubActionsBot(user) {
  return user?.login === 'github-actions[bot]';
}

function labelsOf(issue) {
  return new Set((issue.labels || []).map((label) => label.name || label));
}

function hasLabel(issue, label) {
  return labelsOf(issue).has(label);
}

function hasTerminalStateLabel(issue) {
  const labels = labelsOf(issue);
  return [...TERMINAL_STATE_LABELS].some((label) => labels.has(label));
}

function issuePath(repo, issueNumber) {
  return `/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}`;
}

async function getCurrentIssue(repo, issueNumber) {
  return (await github(issuePath(repo, issueNumber))).data;
}

async function getPull(repo, number) {
  return (await github(`/repos/${repo.owner}/${repo.repo}/pulls/${number}`))
    .data;
}

async function getPullFiles(repo, number) {
  return githubPaginate(
    `/repos/${repo.owner}/${repo.repo}/pulls/${number}/files?per_page=100`,
  );
}

async function getRepo(repo) {
  return (await github(`/repos/${repo.owner}/${repo.repo}`)).data;
}

async function ensureRequiredLabels(repo, config) {
  const labels = await githubPaginate(
    `/repos/${repo.owner}/${repo.repo}/labels?per_page=100`,
  );
  const existing = new Set(labels.map((label) => label.name));
  const missing = config.requiredLabels.filter((label) => !existing.has(label));
  if (missing.length > 0) {
    throw new Error(
      `Missing required repository labels: ${missing.join(', ')}. Create labels manually before using this workflow.`,
    );
  }
}

async function addLabels(repo, issueNumber, labels) {
  if (labels.length === 0) return;
  await github(`${issuePath(repo, issueNumber)}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  });
}

async function removeLabel(repo, issueNumber, label) {
  try {
    await github(
      `${issuePath(repo, issueNumber)}/labels/${encodeURIComponent(label)}`,
      {
        method: 'DELETE',
      },
    );
  } catch (error) {
    if (error.status !== 404) throw error;
  }
}

async function setStateLabel(repo, issue, nextState) {
  const issueNumber = issue.number;
  const current = labelsOf(issue);
  for (const label of STATE_LABELS) {
    if (label !== nextState && current.has(label)) {
      await removeLabel(repo, issueNumber, label);
    }
  }
  if (nextState && !current.has(nextState)) {
    await addLabels(repo, issueNumber, [nextState]);
  }
}

async function createIssueComment(repo, issueNumber, body) {
  return (
    await github(`${issuePath(repo, issueNumber)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
  ).data;
}

async function updateIssueComment(repo, commentId, body) {
  return (
    await github(
      `/repos/${repo.owner}/${repo.repo}/issues/comments/${commentId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    )
  ).data;
}

async function closeIssue(repo, issueNumber) {
  await github(issuePath(repo, issueNumber), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' }),
  });
}

async function listIssueComments(repo, issueNumber) {
  return githubPaginate(
    `/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}/comments?per_page=100`,
  );
}

async function findBotComment(repo, issueNumber, marker) {
  const comments = await listIssueComments(repo, issueNumber);
  return comments.find(
    (comment) =>
      isBotActor(comment) && String(comment.body || '').includes(marker),
  );
}

function approvedSnapshotFromBody(body) {
  const fingerprintMatch = String(body || '').match(APPROVED_FINGERPRINT_RE);
  if (!fingerprintMatch) return null;
  return {
    fingerprint: fingerprintMatch[1].trim(),
    approvedBy: (String(body || '').match(APPROVED_BY_RE)?.[1] || '').trim(),
    approvedAt: (String(body || '').match(APPROVED_AT_RE)?.[1] || '').trim(),
  };
}

async function getSummaryComment(repo, issueNumber) {
  return findBotComment(repo, issueNumber, SUMMARY_MARKER);
}

function nextActionForStatus(status, errors = []) {
  const normalized = String(status || '').toLowerCase();
  const hasUnmergedSource = errors.some((error) =>
    error.includes('is not merged'),
  );
  const hasWorkflowFiles = errors.some((error) =>
    error.includes('changes GitHub Actions workflow files'),
  );

  if (normalized === 'invalid' && hasUnmergedSource) {
    return 'Wait for the source PR to merge, then edit or reopen this request to revalidate. If validation passes, a user with write, maintain, or admin permission must add `cherry-pick:approved`.';
  }
  if (normalized === 'invalid' && hasWorkflowFiles) {
    return 'Handle this backport manually, or use a separately approved process with a token that has workflow permission.';
  }
  if (normalized === 'invalid') {
    return 'Fix the request fields, then edit or reopen this issue to revalidate. If validation passes, a user with write, maintain, or admin permission must add `cherry-pick:approved`.';
  }
  if (normalized === 'pending approval') {
    return 'A user with write, maintain, or admin permission should add `cherry-pick:approved`.';
  }
  if (normalized === 'approved') {
    return 'Waiting for workflow execution to start.';
  }
  if (normalized === 'running') {
    return 'Wait for target results. The summary table updates as each target finishes.';
  }
  if (normalized === 'pr-created') {
    return 'Review and merge the generated cherry-pick PRs.';
  }
  if (normalized === 'partial') {
    return 'Fix failed or blocked targets, then remove and re-add `cherry-pick:approved` to retry. Successful targets will be skipped.';
  }
  if (normalized === 'failed') {
    return 'Fix the failure, then remove and re-add `cherry-pick:approved` to retry.';
  }
  return '';
}

function renderValidationFailureComment(errors, workflowUrl, options = {}) {
  const hasUnmergedSource = errors.some((error) =>
    error.includes('is not merged'),
  );
  const hasWorkflowFiles = errors.some((error) =>
    error.includes('changes GitHub Actions workflow files'),
  );
  const header = hasWorkflowFiles
    ? 'Cherry-pick request is invalid for automatic execution.'
    : options.reopened
      ? 'Cherry-pick request was reopened and revalidated, but it is still invalid.'
    : 'Cherry-pick request is invalid and will not execute yet.';
  const nextSteps = hasWorkflowFiles
    ? [
        'Handle this backport manually, or use a separately approved process with a token that has workflow permission.',
        'Do not retry this request with the default cherry-pick workflow unless the source PR no longer changes workflow files.',
      ]
    : hasUnmergedSource
      ? [
          'Wait until the source PR is merged into the default branch.',
          'After it is merged, edit this request issue or reopen it to trigger validation again.',
          'If validation passes, the request will move back to `cherry-pick:pending-approval`.',
          'A user with write, maintain, or admin permission must add `cherry-pick:approved` again before execution starts.',
        ]
      : [
          'Edit this request issue and fix the fields above.',
          'Save the issue, or reopen it, to trigger validation again.',
          'If validation passes, the request will move back to `cherry-pick:pending-approval`.',
          'A user with write, maintain, or admin permission must add `cherry-pick:approved` before execution starts.',
        ];

  return [
    header,
    '',
    'Validation errors:',
    ...errors.map((error) => `- ${neutralizeMarkdownText(error)}`),
    '',
    'Next steps:',
    ...nextSteps.map((step) => `- ${step}`),
    '',
    `Workflow run: ${workflowUrl}`,
  ].join('\n');
}

function renderWorkflowRunLine() {
  return `Workflow run: ${workflowRunUrl()}`;
}

function renderSummary({
  requestIssue,
  sourcePr,
  sourceTitle,
  sourceCommit,
  requestedBy,
  approvedBy,
  approvedAt,
  risk,
  reason,
  status,
  targets,
  workflowUrl,
  startedAt,
  completedAt,
  approvedFingerprint,
  errors = [],
}) {
  const markerLines = [
    SUMMARY_MARKER,
    approvedFingerprint
      ? `<!-- cherry-pick-approved-fingerprint: ${escapeHtmlComment(approvedFingerprint)} -->`
      : '',
    approvedBy
      ? `<!-- cherry-pick-approved-by: ${escapeHtmlComment(approvedBy)} -->`
      : '',
    approvedAt
      ? `<!-- cherry-pick-approved-at: ${escapeHtmlComment(approvedAt)} -->`
      : '',
  ].filter(Boolean);

  const rows = targets.map((target) => {
    return `| \`${markdownTableCell(target.branch)}\` | ${markdownTableCell(target.status || 'Pending')} | ${markdownTableCell(target.detail || '')} |`;
  });
  const nextAction = nextActionForStatus(status, errors);
  const safeSourceTitle = neutralizeMarkdownText(sourceTitle);
  const safeReason = neutralizeMarkdownText(reason);
  const safeErrors = errors.map((error) => neutralizeMarkdownText(error));

  const body = [
    ...markerLines,
    '',
    '## Cherry-pick request summary',
    '',
    `Status: **${status}**`,
    nextAction ? `Next action: ${nextAction}` : '',
    '',
    `- Request issue: #${requestIssue}`,
    sourcePr ? `- Source PR: #${sourcePr}` : '',
    sourceTitle ? `- Source PR title: ${safeSourceTitle}` : '',
    sourceCommit ? `- Source commit: \`${sourceCommit}\`` : '',
    requestedBy ? `- Requested by: @${requestedBy}` : '',
    approvedBy ? `- Approved by: @${approvedBy}` : '',
    risk ? `- Risk level: ${risk}` : '',
    workflowUrl ? `- Workflow run: ${workflowUrl}` : '',
    startedAt ? `- Started at: ${startedAt}` : '',
    completedAt ? `- Completed at: ${completedAt}` : '',
    '',
    '### Reason',
    '',
    reason ? safeReason : '_No reason parsed yet._',
    '',
    '### Targets',
    '',
    '| Target branch | Result | Detail |',
    '| --- | --- | --- |',
    ...(rows.length > 0 ? rows : ['| _None_ | Pending | |']),
  ].filter((line) => line !== '');

  if (errors.length > 0) {
    body.push('', '### Errors', '', ...safeErrors.map((error) => `- ${error}`));
  }

  body.push(
    '',
    'This workflow only creates cherry-pick PRs. It does not bypass review, required checks, CODEOWNERS, or branch protection.',
  );

  return `${body.join('\n')}\n`;
}

async function upsertSummary(repo, issueNumber, summaryBody) {
  const existing = await getSummaryComment(repo, issueNumber);
  if (existing) return updateIssueComment(repo, existing.id, summaryBody);
  return createIssueComment(repo, issueNumber, summaryBody);
}

function initialTargets(parsed) {
  return parsed.targets.map((branch) => ({
    branch,
    status: 'Pending',
    detail: 'Waiting for approval',
  }));
}

async function validateParsedRequest(repo, config, parsed) {
  const repository = await getRepo(repo);
  const pull = await getPull(repo, parsed.sourcePr);
  const errors = [];
  if (!pull.merged) {
    errors.push(`Source PR #${parsed.sourcePr} is not merged.`);
  }
  if (pull.base?.ref !== repository.default_branch) {
    errors.push(
      `Source PR base branch is ${pull.base?.ref || 'unknown'}, expected ${repository.default_branch}.`,
    );
  }
  if (!pull.merge_commit_sha) {
    errors.push(`Source PR #${parsed.sourcePr} has no merge_commit_sha.`);
  }
  const files = await getPullFiles(repo, parsed.sourcePr);
  const workflowFiles = files
    .map((file) => file.filename)
    .filter((filename) => filename.startsWith('.github/workflows/'));
  if (workflowFiles.length > 0) {
    errors.push(
      [
        `Source PR #${parsed.sourcePr} changes GitHub Actions workflow files, which cannot be cherry-picked by the default GITHUB_TOKEN because it lacks the workflow permission.`,
        `Workflow files: ${workflowFiles.slice(0, 10).join(', ')}${workflowFiles.length > 10 ? `, and ${workflowFiles.length - 10} more` : ''}.`,
        'Handle this backport manually or with a token that explicitly has workflow permission.',
      ].join(' '),
    );
  }
  for (const target of parsed.targets) {
    if (target === repository.default_branch || target === pull.base?.ref) {
      errors.push(
        `Target branch ${target} must not be the default/source branch.`,
      );
      continue;
    }
    try {
      await github(
        `/repos/${repo.owner}/${repo.repo}/branches/${encodeURIComponent(target)}`,
      );
    } catch (error) {
      if (error.status === 404)
        errors.push(`Target branch ${target} does not exist.`);
      else throw error;
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    sourceTitle: pull.title,
    sourceCommit: pull.merge_commit_sha,
    defaultBranch: repository.default_branch,
  };
}

function shouldNoopValidate(event, issue) {
  if (!hasLabel(issue, TYPE_LABEL) && event.action !== 'opened') {
    return 'Issue does not have cherry-pick:request label.';
  }
  if (issue.state === 'closed' && event.action !== 'closed') {
    return 'Issue is closed.';
  }
  if (event.action === 'labeled') {
    const label = event.label?.name;
    if (label !== APPROVED_LABEL) {
      return `Ignoring labeled event for ${label}.`;
    }
  }
  if (event.action === 'unlabeled') {
    const label = event.label?.name;
    if (label !== APPROVED_LABEL && label !== TYPE_LABEL) {
      return `Ignoring unlabeled event for ${label}.`;
    }
  }
  return '';
}

async function hasWritePermission(repo, username) {
  const result = await github(
    `/repos/${repo.owner}/${repo.repo}/collaborators/${encodeURIComponent(username)}/permission`,
  );
  return ['write', 'maintain', 'admin'].includes(result.data.permission);
}

async function clearApprovedSnapshot(repo, issueNumber) {
  const summary = await getSummaryComment(repo, issueNumber);
  if (!summary) return;
  const body = String(summary.body || '')
    .replace(APPROVED_FINGERPRINT_RE, '')
    .replace(APPROVED_BY_RE, '')
    .replace(APPROVED_AT_RE, '');
  await updateIssueComment(repo, summary.id, body);
}

async function validateCommand() {
  const repo = repoFromEnv();
  const config = loadConfig();
  const event = getEvent();
  const issueNumber = event.issue.number;
  console.log(
    `Validating cherry-pick request issue #${issueNumber} in ${repo.repository} for action ${event.action}.`,
  );
  let issue = await getCurrentIssue(repo, issueNumber);
  const noopReason = shouldNoopValidate(event, issue);
  if (noopReason) {
    console.log(noopReason);
    setOutput('should_execute', 'false');
    return;
  }

  if (!hasLabel(issue, TYPE_LABEL)) {
    console.log('Issue is not a cherry-pick request.');
    setOutput('should_execute', 'false');
    return;
  }

  if (event.action === 'closed') {
    await createIssueComment(
      repo,
      issueNumber,
      [
        'Cherry-pick request was closed.',
        '',
        'Closed requests will not start new execution.',
        '',
        'Next steps:',
        '- Reopen this request if it should be validated again.',
        `- A user with write, maintain, or admin permission must add \`${APPROVED_LABEL}\` again before execution starts.`,
        '',
        renderWorkflowRunLine(),
      ].join('\n'),
    );
    setOutput('should_execute', 'false');
    return;
  }

  if (event.action === 'unlabeled' && event.label?.name === TYPE_LABEL) {
    console.log('cherry-pick:request label removed; no longer managing issue.');
    setOutput('should_execute', 'false');
    return;
  }

  if (event.action === 'unlabeled' && event.label?.name === APPROVED_LABEL) {
    if (isGitHubActionsBot(event.sender)) {
      console.log(
        'Approval label was removed by github-actions[bot]; no-op.',
      );
      setOutput('should_execute', 'false');
      return;
    }
    if (hasTerminalStateLabel(issue)) {
      console.log(
        'Approval label removal arrived after a terminal state; no-op.',
      );
      setOutput('should_execute', 'false');
      return;
    }
    if (hasLabel(issue, 'cherry-pick:running')) {
      console.log(
        'Approval label was removed while execution is running; no-op.',
      );
      setOutput('should_execute', 'false');
      return;
    }
    await clearApprovedSnapshot(repo, issueNumber);
    await setStateLabel(repo, issue, 'cherry-pick:pending-approval');
    await createIssueComment(
      repo,
      issueNumber,
      [
        'Cherry-pick approval was removed.',
        '',
        'The request is back to pending approval.',
        '',
        'Next steps:',
        `- A user with write, maintain, or admin permission must add \`${APPROVED_LABEL}\` again before execution starts.`,
        '',
        renderWorkflowRunLine(),
      ].join('\n'),
    );
    setOutput('should_execute', 'false');
    return;
  }

  if (hasLabel(issue, 'cherry-pick:running') && event.action !== 'labeled') {
    console.log('Request is already running; validation event is a no-op.');
    setOutput('should_execute', 'false');
    return;
  }

  try {
    await ensureRequiredLabels(repo, config);
  } catch (error) {
    await createIssueComment(
      repo,
      issueNumber,
      `Cherry-pick workflow configuration is incomplete.\n\n${error.message}\n\nWorkflow run: ${workflowRunUrl()}`,
    );
    throw error;
  }

  let parsed;
  let validation = null;
  const errors = [];
  try {
    parsed = parseRequestBody(issue.body || '', config, repo);
    validation = await validateParsedRequest(repo, config, parsed);
    errors.push(...validation.errors);
  } catch (error) {
    errors.push(error.message);
  }

  const summaryBase = {
    requestIssue: issueNumber,
    sourcePr: parsed?.sourcePr,
    sourceTitle: validation?.sourceTitle,
    sourceCommit: validation?.sourceCommit,
    requestedBy: issue.user?.login,
    risk: parsed?.risk,
    reason: parsed?.reason,
    targets: parsed ? initialTargets(parsed) : [],
    workflowUrl: workflowRunUrl(),
  };

  if (errors.length > 0 || !parsed || !validation?.valid) {
    await setStateLabel(repo, issue, 'cherry-pick:invalid');
    if (hasLabel(issue, APPROVED_LABEL)) {
      await removeLabel(repo, issueNumber, APPROVED_LABEL);
    }
    await clearApprovedSnapshot(repo, issueNumber);
    await upsertSummary(
      repo,
      issueNumber,
      renderSummary({
        ...summaryBase,
        status: 'Invalid',
        errors,
      }),
    );
    await createIssueComment(
      repo,
      issueNumber,
      renderValidationFailureComment(errors, workflowRunUrl(), {
        reopened: event.action === 'reopened',
      }),
    );
    setOutput('should_execute', 'false');
    return;
  }

  const currentFingerprint = fingerprint(parsed);
  const summary = await getSummaryComment(repo, issueNumber);
  const approvedSnapshot = approvedSnapshotFromBody(summary?.body || '');
  const isApprovalEvent =
    event.action === 'labeled' && event.label?.name === APPROVED_LABEL;

  if (event.action === 'edited' || event.action === 'reopened') {
    if (
      approvedSnapshot?.fingerprint &&
      approvedSnapshot.fingerprint !== currentFingerprint
    ) {
      if (hasLabel(issue, APPROVED_LABEL)) {
        await removeLabel(repo, issueNumber, APPROVED_LABEL);
      }
      await clearApprovedSnapshot(repo, issueNumber);
      await createIssueComment(
        repo,
        issueNumber,
        [
          'Cherry-pick approval was cleared because request parameters changed.',
          '',
          'Changed fields that require re-approval:',
          '- Source PR, target branches, or risk level.',
          '',
          'Next steps:',
          '- Review the updated request.',
          `- A user with write, maintain, or admin permission must add \`${APPROVED_LABEL}\` again before execution starts.`,
          '',
          renderWorkflowRunLine(),
        ].join('\n'),
      );
    } else if (approvedSnapshot?.fingerprint) {
      await upsertSummary(
        repo,
        issueNumber,
        renderSummary({
          ...summaryBase,
          status: 'Pending approval',
          approvedFingerprint: approvedSnapshot?.fingerprint,
          approvedBy: approvedSnapshot?.approvedBy,
          approvedAt: approvedSnapshot?.approvedAt,
        }),
      );
    }
  }

  if (event.action === 'reopened') {
    if (hasLabel(issue, APPROVED_LABEL)) {
      await removeLabel(repo, issueNumber, APPROVED_LABEL);
    }
    await clearApprovedSnapshot(repo, issueNumber);
  }

  if (isApprovalEvent) {
    if (hasLabel(issue, 'cherry-pick:running')) {
      await createIssueComment(
        repo,
        issueNumber,
        [
          'Cherry-pick execution is already running. New approval trigger was ignored.',
          '',
          'Next steps:',
          '- Wait for the running workflow to finish.',
          '- If it fails or is interrupted, remove and re-add `cherry-pick:approved` to retry.',
          '',
          renderWorkflowRunLine(),
        ].join('\n'),
      );
      setOutput('should_execute', 'false');
      return;
    }
    const approver = event.sender?.login;
    if (!(await hasWritePermission(repo, approver))) {
      await removeLabel(repo, issueNumber, APPROVED_LABEL);
      await setStateLabel(repo, issue, 'cherry-pick:pending-approval');
      await createIssueComment(
        repo,
        issueNumber,
        [
          'Approval was not accepted.',
          '',
          `@${approver} does not have write, maintain, or admin permission for this repository.`,
          `The \`${APPROVED_LABEL}\` label was removed.`,
          '',
          'Next steps:',
          '- Ask a user with write, maintain, or admin permission to review this request.',
          `- That user should add \`${APPROVED_LABEL}\` if the request is approved.`,
          '',
          renderWorkflowRunLine(),
        ].join('\n'),
      );
      setOutput('should_execute', 'false');
      return;
    }

    const approvedAt = new Date().toISOString();
    await upsertSummary(
      repo,
      issueNumber,
      renderSummary({
        ...summaryBase,
        status: 'Approved',
        approvedBy: approver,
        approvedAt,
        approvedFingerprint: currentFingerprint,
      }),
    );
    await createIssueComment(
      repo,
      issueNumber,
      [
        `Cherry-pick request approved by @${approver}. Execution will start.`,
        '',
        'Next steps:',
        '- Wait for the execution workflow to start.',
        '- The summary comment will show target progress and final results.',
        '',
        renderWorkflowRunLine(),
      ].join('\n'),
    );
    setOutput('request_fingerprint', currentFingerprint);
    setOutput('source_pr', String(parsed.sourcePr));
    setOutput('target_branches', parsed.targets.join(','));
    setOutput('should_execute', 'true');
    return;
  }

  issue = await getCurrentIssue(repo, issueNumber);
  await setStateLabel(repo, issue, 'cherry-pick:pending-approval');
  await upsertSummary(
    repo,
    issueNumber,
    renderSummary({
      ...summaryBase,
      status: 'Pending approval',
      approvedFingerprint: approvedSnapshot?.fingerprint,
      approvedBy: approvedSnapshot?.approvedBy,
      approvedAt: approvedSnapshot?.approvedAt,
    }),
  );
  if (event.action === 'reopened') {
    await createIssueComment(
      repo,
      issueNumber,
      [
        'Cherry-pick request was reopened and revalidated successfully.',
        '',
        'The request is back to pending approval.',
        '',
        'Next steps:',
        `- A user with write, maintain, or admin permission should add \`${APPROVED_LABEL}\` if the request is approved.`,
        '',
        renderWorkflowRunLine(),
      ].join('\n'),
    );
  }
  setOutput('should_execute', 'false');
}

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    ...options,
  });
  if (options.allowFailure) return result;
  if (result.status !== 0) {
    const detail =
      result.stderr || result.stdout || `exit status ${result.status}`;
    const error = new Error(`git ${args.join(' ')} failed: ${detail}`);
    error.git = {
      args,
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
    throw error;
  }
  return result;
}

function gitOutput(args, options = {}) {
  return runGit(args, options).stdout.trim();
}

function cleanWorkingTree() {
  runGit(['cherry-pick', '--abort'], { allowFailure: true });
  runGit(['reset', '--hard'], { stdio: 'inherit' });
  runGit(['clean', '-fd'], { stdio: 'inherit' });
}

function remoteRefExists(ref) {
  const result = runGit(
    ['ls-remote', '--exit-code', '--heads', 'origin', ref],
    {
      allowFailure: true,
    },
  );
  return result.status === 0;
}

function conflictFiles() {
  const output = gitOutput(['diff', '--name-only', '--diff-filter=U'], {
    allowFailure: true,
  });
  return output ? output.split('\n').filter(Boolean) : [];
}

function formatConflictList(files) {
  if (files.length === 0) return 'No conflicted files reported by git.';
  const visible = files.slice(0, MAX_CONFLICT_FILES);
  const lines = visible.map((file) => `- ${file}`);
  if (files.length > visible.length) {
    lines.push(`- and ${files.length - visible.length} more`);
  }
  return lines.join('\n');
}

function isWorkflowPermissionPushError(error) {
  const text = [
    error?.message,
    error?.git?.stdout,
    error?.git?.stderr,
  ]
    .filter(Boolean)
    .join('\n');
  return (
    text.includes('refusing to allow a GitHub App to create or update workflow') ||
    text.includes('without `workflows` permission') ||
    text.includes('without `workflow` permission')
  );
}

function shortErrorMessage(error) {
  return truncate(
    [error?.message, error?.git?.stderr, error?.git?.stdout]
      .filter(Boolean)
      .join('\n')
      .trim(),
    2000,
  );
}

function renderFinalResultComment(finalState, workflowUrl) {
  if (finalState === 'cherry-pick:pr-created') {
    return [
      'Cherry-pick request completed successfully.',
      '',
      'Result:',
      'All targets were created or already existed.',
      '',
      'Next steps:',
      '- Review and merge the generated cherry-pick PRs.',
      '- This request issue will be closed automatically.',
      '',
      `Workflow run: ${workflowUrl}`,
    ].join('\n');
  }

  if (finalState === 'cherry-pick:partial') {
    return [
      'Cherry-pick request completed with partial success.',
      '',
      'Result:',
      'Some targets succeeded, but one or more targets failed, were blocked, or were interrupted.',
      '',
      'Next steps:',
      '- Check the summary table for each target result.',
      '- Fix blocked or failed targets manually if needed.',
      `- To retry remaining work, remove and re-add \`${APPROVED_LABEL}\`.`,
      '- Already successful targets will be skipped by idempotency checks.',
      '',
      `Workflow run: ${workflowUrl}`,
    ].join('\n');
  }

  return [
    'Cherry-pick request failed.',
    '',
    'Result:',
    'No target branch completed successfully.',
    '',
    'Next steps:',
    '- Check the failure comments and summary table.',
    '- Fix the underlying issue.',
    `- Remove and re-add \`${APPROVED_LABEL}\` to retry after the issue is resolved.`,
    '',
    `Workflow run: ${workflowUrl}`,
  ].join('\n');
}

async function listPulls(repo, state, extra = '') {
  return githubPaginate(
    `/repos/${repo.owner}/${repo.repo}/pulls?state=${state}&per_page=100${extra}`,
  );
}

function prHasGeneratedIdentity(
  pr,
  repo,
  sourcePr,
  target,
  requestIssue,
  branchName,
) {
  const body = String(pr.body || '');
  const marker = generatedMarker(sourcePr, target, requestIssue);
  const labelMatches = (pr.labels || []).some(
    (label) => label.name === GENERATED_LABEL,
  );
  return (
    pr.base?.ref === target &&
    pr.head?.repo?.full_name === `${repo.owner}/${repo.repo}` &&
    pr.head?.ref === branchName &&
    labelMatches &&
    body.includes(marker)
  );
}

async function findExistingGeneratedPr(
  repo,
  sourcePr,
  target,
  requestIssue,
  branchName,
) {
  const head = encodeURIComponent(`${repo.owner}:${branchName}`);
  const openPulls = await listPulls(
    repo,
    'open',
    `&head=${head}&base=${encodeURIComponent(target)}`,
  );
  const open = openPulls.find((pr) =>
    prHasGeneratedIdentity(pr, repo, sourcePr, target, requestIssue, branchName),
  );
  if (open) return { kind: 'open', pr: open };

  const closedPulls = await listPulls(
    repo,
    'closed',
    `&head=${head}&base=${encodeURIComponent(target)}`,
  );
  const closed = closedPulls.find((pr) =>
    prHasGeneratedIdentity(pr, repo, sourcePr, target, requestIssue, branchName),
  );
  if (closed)
    return {
      kind: closed.merged_at ? 'merged' : 'closed-unmerged',
      pr: closed,
    };

  return null;
}

async function createPull(repo, title, body, head, base) {
  return (
    await github(`/repos/${repo.owner}/${repo.repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, head, base }),
    })
  ).data;
}

async function addIssueLabelSafe(repo, issueNumber, label) {
  await addLabels(repo, issueNumber, [label]);
}

function renderGeneratedPrBody({
  requestIssue,
  sourcePr,
  sourceTitle,
  sourceCommit,
  target,
  requestedBy,
  approvedBy,
  risk,
  reason,
}) {
  const safeSourceTitle = neutralizeMarkdownText(sourceTitle);
  const safeReason = neutralizeMarkdownText(reason);
  return [
    generatedMarker(sourcePr, target, requestIssue),
    '',
    'Automatically generated cherry-pick PR.',
    '',
    `- Request issue: #${requestIssue}`,
    `- Source PR: #${sourcePr}`,
    `- Source PR title: ${safeSourceTitle}`,
    `- Source commit: ${sourceCommit}`,
    `- Target branch: \`${target}\``,
    `- Requested by: @${requestedBy}`,
    `- Approved by: @${approvedBy}`,
    `- Risk level: ${risk}`,
    '',
    'Reason:',
    '',
    safeReason,
    '',
    'This workflow only creates the cherry-pick PR. It does not bypass review, required checks, CODEOWNERS, or branch protection.',
  ].join('\n');
}

function renderPrTitle(target, sourcePr, sourceTitle) {
  return truncate(`[${target}] Cherry-pick #${sourcePr}: ${sourceTitle}`, 180);
}

async function updateExecutionSummary(repo, issue, context, targets, status) {
  await upsertSummary(
    repo,
    issue.number,
    renderSummary({
      requestIssue: issue.number,
      sourcePr: context.parsed.sourcePr,
      sourceTitle: context.validation.sourceTitle,
      sourceCommit: context.validation.sourceCommit,
      requestedBy: issue.user?.login,
      approvedBy: context.approvedBy,
      approvedAt: context.approvedAt,
      risk: context.parsed.risk,
      reason: context.parsed.reason,
      status,
      targets,
      workflowUrl: workflowRunUrl(),
      startedAt: context.startedAt,
      completedAt: context.completedAt,
      approvedFingerprint: context.fingerprint,
    }),
  );
}

function targetDetailLink(pr) {
  if (!pr) return '';
  return `[#${pr.number}](${pr.html_url})`;
}

async function executeCommand() {
  const repo = repoFromEnv();
  const config = loadConfig();
  const event = getEvent();
  const issueNumber = event.issue.number;
  console.log(
    `Executing cherry-pick request issue #${issueNumber} in ${repo.repository}.`,
  );
  let issue = await getCurrentIssue(repo, issueNumber);
  if (!hasLabel(issue, TYPE_LABEL)) {
    console.log('Issue is no longer a cherry-pick request.');
    return;
  }
  if (issue.state === 'closed') {
    console.log('Issue is closed before execution start.');
    return;
  }

  const parsed = parseRequestBody(issue.body || '', config, repo);
  const validation = await validateParsedRequest(repo, config, parsed);
  if (!validation.valid) {
    throw new Error(
      `Approved request became invalid: ${validation.errors.join('; ')}`,
    );
  }
  const currentFingerprint = fingerprint(parsed);
  const summary = await getSummaryComment(repo, issueNumber);
  const approvedSnapshot = approvedSnapshotFromBody(summary?.body || '');
  if (approvedSnapshot?.fingerprint !== currentFingerprint) {
    throw new Error(
      'Approved fingerprint does not match current request body.',
    );
  }

  const context = {
    parsed,
    validation,
    fingerprint: currentFingerprint,
    approvedBy: approvedSnapshot.approvedBy || event.sender?.login,
    approvedAt: approvedSnapshot.approvedAt || new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: '',
  };
  const targets = parsed.targets.map((branch) => ({
    branch,
    status: 'Pending',
    detail: 'Waiting to run',
  }));

  await setStateLabel(repo, issue, 'cherry-pick:running');
  await removeLabel(repo, issueNumber, APPROVED_LABEL);
  await createIssueComment(
    repo,
    issueNumber,
    [
      'Cherry-pick execution started.',
      '',
      'Targets will be processed serially from newest to oldest release branch.',
      'The summary comment will be updated as each target finishes.',
      '',
      renderWorkflowRunLine(),
    ].join('\n'),
  );
  await updateExecutionSummary(repo, issue, context, targets, 'Running');

  runGit(['config', '--global', 'user.name', 'github-actions[bot]']);
  runGit([
    'config',
    '--global',
    'user.email',
    'github-actions[bot]@users.noreply.github.com',
  ]);
  runGit(['fetch', 'origin', '--prune', '--no-tags'], { stdio: 'inherit' });

  for (const row of targets) {
    row.status = 'Running';
    row.detail = 'Cherry-pick in progress';
    await updateExecutionSummary(repo, issue, context, targets, 'Running');
    await createIssueComment(
      repo,
      issueNumber,
      `Started cherry-pick for \`${row.branch}\`.\n\nWorkflow run: ${workflowRunUrl()}`,
    );

    try {
      cleanWorkingTree();
      runGit(
        [
          'checkout',
          '-B',
          row.branch.replaceAll('/', '-'),
          `origin/${row.branch}`,
        ],
        {
          stdio: 'inherit',
        },
      );

      const branchName = stableBranchName(row.branch, parsed.sourcePr);
      const existing = await findExistingGeneratedPr(
        repo,
        parsed.sourcePr,
        row.branch,
        issueNumber,
        branchName,
      );
      if (existing?.kind === 'open' || existing?.kind === 'merged') {
        row.status = 'Existing';
        row.detail = `Existing ${existing.kind} PR ${targetDetailLink(existing.pr)}`;
        await updateExecutionSummary(repo, issue, context, targets, 'Running');
        await createIssueComment(
          repo,
          issueNumber,
          `Existing cherry-pick PR found for \`${row.branch}\`: ${existing.pr.html_url}`,
        );
        continue;
      }
      if (existing?.kind === 'closed-unmerged') {
        row.status = 'Blocked';
        row.detail = `Existing closed unmerged PR ${targetDetailLink(existing.pr)}.`;
        await updateExecutionSummary(repo, issue, context, targets, 'Running');
        await createIssueComment(
          repo,
          issueNumber,
          [
            `Cherry-pick for \`${row.branch}\` is blocked.`,
            '',
            'Reason:',
            `An existing generated cherry-pick PR for this source PR and target branch was closed without merging: ${existing.pr.html_url}.`,
            '',
            'Next steps:',
            '- Review why the existing PR was closed.',
            '- Reopen it or handle this target manually.',
            '- This workflow will not overwrite or recreate the branch automatically.',
            '',
            renderWorkflowRunLine(),
          ].join('\n'),
        );
        continue;
      }

      if (remoteRefExists(branchName)) {
        row.status = 'Blocked';
        row.detail = `Remote branch ${branchName} already exists without an acceptable generated PR.`;
        await updateExecutionSummary(repo, issue, context, targets, 'Running');
        await createIssueComment(
          repo,
          issueNumber,
          [
            `Cherry-pick for \`${row.branch}\` is blocked.`,
            '',
            'Reason:',
            `Remote branch \`${branchName}\` already exists, but no acceptable generated PR was found.`,
            '',
            'Next steps:',
            '- Inspect the remote branch manually.',
            '- Delete or rename the stale branch if it is safe.',
            `- Re-add \`${APPROVED_LABEL}\` to retry after cleanup.`,
            '',
            renderWorkflowRunLine(),
          ].join('\n'),
        );
        continue;
      }

      const contains = runGit(
        [
          'merge-base',
          '--is-ancestor',
          validation.sourceCommit,
          `origin/${row.branch}`,
        ],
        { allowFailure: true },
      );
      if (contains.status === 0) {
        row.status = 'Existing';
        row.detail = 'Target branch already contains the change.';
        await updateExecutionSummary(repo, issue, context, targets, 'Running');
        await createIssueComment(
          repo,
          issueNumber,
          `No cherry-pick PR needed for \`${row.branch}\`: target branch already contains the change.`,
        );
        continue;
      }

      runGit(['checkout', '-B', branchName, `origin/${row.branch}`], {
        stdio: 'inherit',
      });
      const cherryPick = runGit(
        ['cherry-pick', '-x', validation.sourceCommit],
        {
          allowFailure: true,
        },
      );
      if (cherryPick.status !== 0) {
        const empty =
          String(cherryPick.stderr || '').includes(
            'previous cherry-pick is now empty',
          ) ||
          String(cherryPick.stdout || '').includes(
            'previous cherry-pick is now empty',
          );
        if (empty) {
          cleanWorkingTree();
          row.status = 'Existing';
          row.detail = 'Target branch already contains the change.';
          await updateExecutionSummary(
            repo,
            issue,
            context,
            targets,
            'Running',
          );
          await createIssueComment(
            repo,
            issueNumber,
            `No cherry-pick PR needed for \`${row.branch}\`: cherry-pick is empty, so the target branch already contains the change.`,
          );
          continue;
        }

        const files = conflictFiles();
        cleanWorkingTree();
        row.status = 'Failed';
        row.detail = `Cherry-pick conflict in ${files.length} file(s).`;
        await updateExecutionSummary(repo, issue, context, targets, 'Running');
        await createIssueComment(
          repo,
          issueNumber,
          [
            `Cherry-pick failed for \`${row.branch}\` due to conflicts.`,
            '',
            'Conflicted files:',
            formatConflictList(files),
            '',
            'Next steps:',
            '- Resolve this target manually, or prepare a manual cherry-pick PR.',
            '- If there are remaining targets to retry after cleanup, remove and re-add `cherry-pick:approved`.',
            '- Already successful targets will be skipped by idempotency checks.',
            '',
            renderWorkflowRunLine(),
          ].join('\n'),
        );
        continue;
      }

      try {
        runGit(['push', 'origin', branchName]);
      } catch (error) {
        if (isWorkflowPermissionPushError(error)) {
          cleanWorkingTree();
          row.status = 'Blocked';
          row.detail =
            'Source change modifies GitHub Actions workflow files; GITHUB_TOKEN cannot push workflow file changes.';
          await updateExecutionSummary(
            repo,
            issue,
            context,
            targets,
            'Running',
          );
          await createIssueComment(
            repo,
            issueNumber,
            [
              `Cherry-pick for \`${row.branch}\` was blocked by GitHub workflow-file permission rules.`,
              '',
              'Reason:',
              'The source change modifies `.github/workflows/*`. GitHub does not allow the default `GITHUB_TOKEN` to create or update workflow files without an explicit `workflow` permission.',
              '',
              'Next steps:',
              '- Handle this target manually, or use a separately approved credential with workflow permission.',
              '- Do not retry this request with the default workflow unless the source PR no longer changes workflow files.',
              '',
              renderWorkflowRunLine(),
            ].join('\n'),
          );
          continue;
        }
        throw error;
      }
      const pr = await createPull(
        repo,
        renderPrTitle(row.branch, parsed.sourcePr, validation.sourceTitle),
        renderGeneratedPrBody({
          requestIssue: issueNumber,
          sourcePr: parsed.sourcePr,
          sourceTitle: validation.sourceTitle,
          sourceCommit: validation.sourceCommit,
          target: row.branch,
          requestedBy: issue.user?.login,
          approvedBy: context.approvedBy,
          risk: parsed.risk,
          reason: parsed.reason,
        }),
        branchName,
        row.branch,
      );
      try {
        await addIssueLabelSafe(repo, pr.number, GENERATED_LABEL);
        row.status = 'Created';
        row.detail = `Created PR ${targetDetailLink(pr)}`;
      } catch (error) {
        row.status = 'Created with warning';
        row.detail = `Created PR ${targetDetailLink(pr)}, but failed to add ${GENERATED_LABEL}: ${error.message}`;
      }
      await updateExecutionSummary(repo, issue, context, targets, 'Running');
    } catch (error) {
      try {
        cleanWorkingTree();
      } catch {
        // Best effort cleanup; the next target starts by cleaning again.
      }
      row.status = 'Interrupted';
      row.detail = shortErrorMessage(error);
      await updateExecutionSummary(repo, issue, context, targets, 'Running');
      await createIssueComment(
        repo,
        issueNumber,
        [
          `Cherry-pick execution was interrupted for \`${row.branch}\`.`,
          '',
          'Reason:',
          shortErrorMessage(error),
          '',
          'Next steps:',
          '- Open the workflow run and inspect the logs.',
          `- If this was a transient GitHub API, rate limit, or runner issue, remove and re-add \`${APPROVED_LABEL}\` to retry.`,
          '- Already successful targets will be skipped by idempotency checks.',
          '',
          renderWorkflowRunLine(),
        ].join('\n'),
      );
    }
  }

  context.completedAt = new Date().toISOString();
  const successCount = targets.filter((target) =>
    SUCCESS_RESULTS.has(target.status),
  ).length;
  const finalState =
    successCount === targets.length
      ? 'cherry-pick:pr-created'
      : successCount > 0
        ? 'cherry-pick:partial'
        : 'cherry-pick:failed';
  const finalStatus = finalState.replace('cherry-pick:', '');

  issue = await getCurrentIssue(repo, issueNumber);
  await setStateLabel(repo, issue, finalState);
  await updateExecutionSummary(repo, issue, context, targets, finalStatus);
  await createIssueComment(
    repo,
    issueNumber,
    renderFinalResultComment(finalState, workflowRunUrl()),
  );
  if (finalState === 'cherry-pick:pr-created') {
    await closeIssue(repo, issueNumber);
  }
}

function parseYamlListAfterKey(content, key) {
  const lines = content.split('\n');
  const index = lines.findIndex((line) => line.trim() === `${key}:`);
  if (index < 0) return [];
  const values = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\S/.test(line) && !line.trim().startsWith('- ')) break;
    const match = line.match(/^\s*-\s+(.+?)\s*$/);
    if (match) values.push(match[1].replace(/^["']|["']$/g, ''));
  }
  return values;
}

function parseIssueFormTargets(content) {
  const lines = content.split('\n');
  const targets = [];
  let inTargetBlock = false;
  for (const line of lines) {
    if (line.includes('id: target_branches')) {
      inTargetBlock = true;
      continue;
    }
    if (inTargetBlock && /^\s+-\s+type:\s+/.test(line)) break;
    if (inTargetBlock) {
      const match = line.match(/^\s*-\s+label:\s+(.+?)\s*$/);
      if (match) targets.push(match[1].replace(/^["']|["']$/g, ''));
    }
  }
  return targets;
}

function assertNoDuplicates(name, values) {
  const seen = new Set();
  const duplicates = [];
  for (const value of values) {
    if (seen.has(value)) duplicates.push(value);
    seen.add(value);
  }
  if (duplicates.length > 0) {
    throw new Error(`${name} has duplicate values: ${duplicates.join(', ')}`);
  }
}

function checkConfigCommand() {
  const config = loadConfig();
  const form = fs.readFileSync(ISSUE_FORM_PATH, 'utf8');
  assertNoDuplicates('targetBranches', config.targetBranches);
  assertNoDuplicates('requiredLabels', config.requiredLabels);
  const formTargets = parseIssueFormTargets(form);
  if (JSON.stringify(formTargets) !== JSON.stringify(config.targetBranches)) {
    throw new Error(
      `Issue Form target branches do not match config order. form=${JSON.stringify(formTargets)} config=${JSON.stringify(config.targetBranches)}`,
    );
  }
  const defaultLabels = parseYamlListAfterKey(form, 'labels');
  if (!defaultLabels.includes(TYPE_LABEL)) {
    throw new Error(`Issue Form must include default label ${TYPE_LABEL}.`);
  }
  if (defaultLabels.includes('cherry-pick:pending-approval')) {
    throw new Error(
      'Issue Form must not default to cherry-pick:pending-approval.',
    );
  }
  const requiredUsedLabels = [
    TYPE_LABEL,
    APPROVED_LABEL,
    GENERATED_LABEL,
    ...STATE_LABELS,
  ];
  for (const label of requiredUsedLabels) {
    if (!config.requiredLabels.includes(label)) {
      throw new Error(`requiredLabels is missing ${label}.`);
    }
  }
  console.log('Cherry-pick config check passed.');
}

function getArgValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return '';
  return args[index + 1] || '';
}

function dryRunValidate(args) {
  const config = loadConfig();
  const bodyFile = getArgValue(args, '--body-file');
  if (!bodyFile) throw new Error('--body-file is required for dry-run.');
  const body = fs.readFileSync(bodyFile, 'utf8');
  const repo = process.env.GITHUB_REPOSITORY
    ? repoFromEnv()
    : { owner: 'lynx-family', repo: 'lynx-website' };
  const parsed = parseRequestBody(body, config, repo);
  console.log(
    JSON.stringify(
      {
        ...parsed,
        fingerprint: fingerprint(parsed),
      },
      null,
      2,
    ),
  );
}

function parseCommand(args) {
  dryRunValidate(args);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'parse') {
    parseCommand(args);
    return;
  }
  if (command === 'validate' && args.includes('--dry-run')) {
    dryRunValidate(args);
    return;
  }
  if (command === 'check-config') {
    checkConfigCommand();
    return;
  }
  if (command === 'validate') {
    await validateCommand();
    return;
  }
  if (command === 'execute') {
    await executeCommand();
    return;
  }
  throw new Error(
    'Usage: cherry-pick-request.mjs parse --body-file <file> | validate [--dry-run --body-file <file>] | check-config | execute',
  );
}

async function commentWorkflowFailure(error) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_EVENT_PATH) {
    return;
  }
  try {
    const repo = repoFromEnv();
    const event = getEvent();
    const issueNumber = event.issue?.number;
    if (!issueNumber) return;
    await createIssueComment(
      repo,
      issueNumber,
      [
        'Cherry-pick workflow encountered an unexpected error before it could finish updating the summary.',
        '',
        truncate(error.message || String(error), 1000),
        '',
        `Workflow run: ${workflowRunUrl()}`,
      ].join('\n'),
    );
  } catch (commentError) {
    console.error(
      `Failed to write workflow failure comment: ${commentError.message}`,
    );
  }
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  await commentWorkflowFailure(error);
  process.exitCode = 1;
});
