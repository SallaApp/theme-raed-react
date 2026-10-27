/**
 * `node scripts/ci/prGatesCli.ts`: the `PR gates` check. Reads `EVENT`, `REPOSITORY`, `GITHUB_TOKEN` and, for a pull request,
 * `PR_NUMBER`, or, for a merge group, `MERGE_GROUP_HEAD_REF`, `MERGE_GROUP_BASE_SHA` and `MERGE_GROUP_HEAD_SHA` from the environment.
 * `CHECK_NAME` (merge group jobs named after a required check) narrows it to that one check: the job then verifies the stage 1 result
 * of the real check on each pull request instead of reporting a check of its own. Prints one verdict per pull request, appends it to the job summary and exits 1 when any pull request does not pass.
 */
import { appendFileSync } from 'node:fs';
import { commitSubjects, pullRequestSnapshot, type GitHubClient } from './prGatesApi.ts';
import {
  ALL_GATES,
  evaluatePullRequest,
  mergeGroupPullRequests,
  scopeOfCheck,
  summaryMarkdown,
  type GateScope,
  type PullRequestVerdict,
} from './prGates.ts';

const environment = process.env;
const token = environment['GITHUB_TOKEN'] ?? '';
const repository = environment['REPOSITORY'] ?? '';

const client: GitHubClient = {
  fetch: (url, { body, ...init }) => fetch(url, body === undefined ? init : { ...init, body }),
  token,
  apiUrl: environment['GITHUB_API_URL'] ?? 'https://api.github.com',
  repository,
};

async function pullRequestNumbers(): Promise<{
  numbers: readonly number[];
  unidentifiedCommits: readonly string[];
}> {
  if (environment['EVENT'] === 'merge_group') {
    const subjects = await commitSubjects(
      client,
      environment['MERGE_GROUP_BASE_SHA'] ?? '',
      environment['MERGE_GROUP_HEAD_SHA'] ?? ''
    );
    return mergeGroupPullRequests(environment['MERGE_GROUP_HEAD_REF'] ?? '', subjects);
  }
  const number = Number(environment['PR_NUMBER']);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error('PR_NUMBER is not a pull request number');
  }
  return { numbers: [number], unidentifiedCommits: [] };
}

/** The scope of this job: every gate, or the one check named by `CHECK_NAME` (the merge group jobs). */
function jobScope(checkName: string): GateScope {
  const scope = checkName === '' ? ALL_GATES : scopeOfCheck(checkName);
  if (scope === undefined) {
    throw new Error('CHECK_NAME is not a required check');
  }
  return scope;
}

const STAGE_ONE_NOTE =
  'Verifies the stage 1 result: the real check on the head of each pull request in the merge group (docs/merge-queue.md).';

function report(markdown: string): void {
  process.stdout.write(markdown);
  const summary = environment['GITHUB_STEP_SUMMARY'];
  if (summary !== undefined) {
    appendFileSync(summary, markdown);
  }
}

async function main(): Promise<void> {
  if (token === '' || !/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error('GITHUB_TOKEN and REPOSITORY (owner/name) are required');
  }
  const checkName = environment['CHECK_NAME'] ?? '';
  const scope = jobScope(checkName);
  const { numbers, unidentifiedCommits } = await pullRequestNumbers();
  const verdicts: PullRequestVerdict[] = [];
  for (const number of numbers) {
    verdicts.push(
      evaluatePullRequest(
        await pullRequestSnapshot(client, number, scope.requireResolvedThreads),
        scope
      )
    );
  }
  report(
    checkName === ''
      ? summaryMarkdown(verdicts, unidentifiedCommits)
      : summaryMarkdown(verdicts, unidentifiedCommits, checkName, STAGE_ONE_NOTE)
  );
  const failed = verdicts.filter((verdict) => !verdict.passed);
  if (failed.length === 0 && unidentifiedCommits.length === 0) {
    return;
  }
  const pending = failed.some((verdict) => verdict.waiting)
    ? ': a check is still pending, this job re-runs by itself when it finishes (see docs/merge-queue.md)'
    : '';
  process.stderr.write(`::error::PR gates failed${pending}\n`);
  process.exitCode = 1;
}

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(
    `::error::PR gates could not be evaluated: ${error instanceof Error ? error.message : 'unknown error'}\n`
  );
  process.exitCode = 1;
}
