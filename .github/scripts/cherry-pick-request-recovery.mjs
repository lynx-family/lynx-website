const SUMMARY_MARKER = '<!-- cherry-pick-request-summary -->';
const APPROVED_FINGERPRINT_MARKER = '<!-- cherry-pick-approved-fingerprint:';
const APPROVED_LABEL = 'cherry-pick:approved';
const FAILED_LABEL = 'cherry-pick:failed';
const STATE_LABELS = [
  'cherry-pick:pending-approval',
  'cherry-pick:running',
  'cherry-pick:pr-created',
  'cherry-pick:partial',
  FAILED_LABEL,
  'cherry-pick:invalid',
];

export const RETRY_APPROVAL_INSTRUCTION =
  'Ensure `cherry-pick:approved` is absent, then add it to retry.';

/** Normalizes REST Issue labels into a set of names. */
function labelsOf(issue) {
  return new Set(
    (issue.labels || []).map((label) =>
      typeof label === 'string' ? label : label.name,
    ),
  );
}

/** Returns whether a comment belongs to a GitHub bot account. */
function isBotActor(comment) {
  return (
    comment.user?.type === 'Bot' ||
    String(comment.user?.login || '').endsWith('[bot]')
  );
}

/** Identifies the interrupted phase represented by current Issue state. */
export function recoveryState(labels, summaryBody) {
  const names = new Set(labels);
  const status = (
    String(summaryBody || '').match(/^Status: \*\*(.+?)\*\*$/m)?.[1] || ''
  ).toLowerCase();
  if (names.has('cherry-pick:running') || status === 'running') {
    return 'running';
  }
  if (
    status === 'approved' &&
    String(summaryBody || '').includes(APPROVED_FINGERPRINT_MARKER)
  ) {
    return 'approved';
  }
  return '';
}

/** Marks an existing summary failed while preserving its target details. */
export function renderRecoveredSummary(body, completedAt) {
  let summary = String(body || '');
  const statusLine = 'Status: **Failed**';
  const nextActionLine = `Next action: Fix the failure. ${RETRY_APPROVAL_INSTRUCTION}`;

  if (/^Status: \*\*.+\*\*$/m.test(summary)) {
    summary = summary.replace(/^Status: \*\*.+\*\*$/m, statusLine);
  } else {
    summary = summary.replace(
      '## Cherry-pick request summary',
      `## Cherry-pick request summary\n\n${statusLine}`,
    );
  }
  if (/^Next action: .*$/m.test(summary)) {
    summary = summary.replace(/^Next action: .*$/m, nextActionLine);
  } else {
    summary = summary.replace(statusLine, `${statusLine}\n${nextActionLine}`);
  }

  const completedLine = `- Completed at: ${completedAt}`;
  if (/^- Completed at: .*$/m.test(summary)) {
    summary = summary.replace(/^- Completed at: .*$/m, completedLine);
  } else if (/^### (?:Reason|Targets)$/m.test(summary)) {
    summary = summary.replace(
      /^### (Reason|Targets)$/m,
      `${completedLine}\n\n### $1`,
    );
  } else {
    summary = `${summary.trimEnd()}\n\n${completedLine}`;
  }

  return `${summary.trimEnd()}\n`;
}

/** Removes one known-present label while treating a concurrent 404 as success. */
async function removeLabel(github, issue, labels, name) {
  if (!labels.has(name)) return;
  try {
    await github.rest.issues.removeLabel({ ...issue, name });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  labels.delete(name);
}

/**
 * Recovers an interrupted request using only GitHub Issues APIs supplied by
 * actions/github-script.
 */
export default async function recoverRequest({ github, context, core }) {
  const issue = {
    ...context.repo,
    issue_number: context.issue.number,
  };
  const { data: currentIssue } = await github.rest.issues.get(issue);
  const labels = labelsOf(currentIssue);
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...issue,
    per_page: 100,
  });
  const summary = comments.find(
    (comment) =>
      isBotActor(comment) &&
      String(comment.body || '').includes(SUMMARY_MARKER),
  );
  const summaryBody = String(summary?.body || '');
  const previousState = recoveryState(labels, summaryBody);

  if (!previousState) {
    core.info('Request has no interrupted execution state to recover.');
    return '';
  }

  await removeLabel(github, issue, labels, APPROVED_LABEL);
  for (const label of STATE_LABELS) {
    if (label !== FAILED_LABEL) {
      await removeLabel(github, issue, labels, label);
    }
  }
  if (!labels.has(FAILED_LABEL)) {
    await github.rest.issues.addLabels({
      ...issue,
      labels: [FAILED_LABEL],
    });
  }

  if (summary) {
    await github.rest.issues.updateComment({
      ...context.repo,
      comment_id: summary.id,
      body: renderRecoveredSummary(summaryBody, new Date().toISOString()),
    });
  }

  await github.rest.issues.createComment({
    ...issue,
    body: [
      'Cherry-pick execution did not finish successfully.',
      '',
      `The request was moved from ${previousState} to failed.`,
      '',
      'Next steps:',
      '- Inspect the failed workflow run.',
      `- ${RETRY_APPROVAL_INSTRUCTION}`,
      '',
      `Workflow run: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
    ].join('\n'),
  });
  return previousState;
}
