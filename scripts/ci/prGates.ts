/**
 * The decision behind the `PR gates` check (.github/workflows/pr-gates.yml, docs/merge-queue.md). The org rulesets "Pull Requests"
 * and "Tested & Coverage" require `Greptile Review`, `Validate PR title` and `Validate branch name`, which never run on a merge queue
 * commit, so the queue would wait for them forever. This check reports on the pull request and on the merge group instead, and
 * reproduces what those rules enforce: the same checks green on the head of every pull request, no open review thread, not a draft.
 * Everything here is a pure function of data the CLI fetched; none of it comes from a command line.
 */

/** A check that must have succeeded, and the GitHub App that must have reported it (a workflow cannot impersonate it by name). */
interface RequiredCheck {
  readonly name: string;
  readonly appId: number;
  readonly appSlug: string;
}

const GREPTILE_CHECK_NAME = 'Greptile Review';

export const GREPTILE_APP = { appId: 867_647, appSlug: 'greptile-apps' } as const;

/** `Validate PR title` and `Validate branch name` come from the organisation's internal bot, not from a workflow of this repository. */
export const SALLA_BOT_APP = { appId: 1_131_467, appSlug: 'sallainternalbot' } as const;

const REQUIRED_CHECKS: readonly RequiredCheck[] = [
  { name: GREPTILE_CHECK_NAME, ...GREPTILE_APP },
  { name: 'Validate PR title', ...SALLA_BOT_APP },
  { name: 'Validate branch name', ...SALLA_BOT_APP },
];

/** The fields of a check run the decision needs. */
export interface CheckRunSummary {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly appId: number | undefined;
  readonly appSlug: string | undefined;
}

export interface PullRequestSnapshot {
  readonly number: number;
  readonly headSha: string;
  readonly isDraft: boolean;
  readonly checkRuns: readonly CheckRunSummary[];
  /** Review threads that are not resolved (outdated ones included: the ruleset's conversation resolution counts them too). */
  readonly unresolvedThreads: number;
}

export interface PullRequestVerdict {
  readonly number: number;
  readonly passed: boolean;
  /** Why it did not pass, one line each; empty when it passed. */
  readonly reasons: readonly string[];
  /** True when a failing reason is only that a check has not finished or not started: re-evaluating later can change it. */
  readonly waiting: boolean;
}

interface CheckVerdict {
  readonly reason: string | undefined;
  readonly waiting: boolean;
}

/** The newest run of a check reported by the required app; runs of the same name from any other app do not count. */
function latestRunOf(
  required: RequiredCheck,
  runs: readonly CheckRunSummary[]
): CheckRunSummary | undefined {
  let latest: CheckRunSummary | undefined;
  for (const run of runs) {
    const fromRequiredApp =
      run.name === required.name &&
      run.appId === required.appId &&
      run.appSlug === required.appSlug;
    if (fromRequiredApp && (latest === undefined || run.id > latest.id)) {
      latest = run;
    }
  }
  return latest;
}

function checkVerdict(required: RequiredCheck, runs: readonly CheckRunSummary[]): CheckVerdict {
  const run = latestRunOf(required, runs);
  if (run === undefined) {
    return {
      reason: `"${required.name}" has not been reported by ${required.appSlug} on the head commit yet`,
      waiting: true,
    };
  }
  if (run.status !== 'completed') {
    return { reason: `"${required.name}" is still ${run.status}`, waiting: true };
  }
  return {
    reason:
      run.conclusion === 'success'
        ? undefined
        : `"${required.name}" concluded ${run.conclusion ?? 'without a result'}`,
    waiting: false,
  };
}

/** What one job verifies: the default is every gate of `PR gates`; the merge group jobs named after a check verify one each. */
export interface GateScope {
  readonly required: readonly RequiredCheck[];
  readonly rejectDraft: boolean;
  readonly requireResolvedThreads: boolean;
}

export const ALL_GATES: GateScope = {
  required: REQUIRED_CHECKS,
  rejectDraft: true,
  requireResolvedThreads: true,
};

/** Passes only when every required check succeeded on the head commit, no review thread is open and the pull request is not a draft. */
export function evaluatePullRequest(
  snapshot: PullRequestSnapshot,
  scope: GateScope = ALL_GATES
): PullRequestVerdict {
  const reasons: string[] = [];
  let waiting = false;
  if (scope.rejectDraft && snapshot.isDraft) {
    reasons.push('the pull request is a draft');
  }
  for (const check of scope.required) {
    const verdict = checkVerdict(check, snapshot.checkRuns);
    if (verdict.reason === undefined) {
      continue;
    }
    reasons.push(verdict.reason);
    waiting ||= verdict.waiting;
  }
  if (scope.requireResolvedThreads && snapshot.unresolvedThreads > 0) {
    reasons.push(
      `${String(snapshot.unresolvedThreads)} review thread${snapshot.unresolvedThreads === 1 ? ' is' : 's are'} not resolved`
    );
  }
  return { number: snapshot.number, passed: reasons.length === 0, reasons, waiting };
}

/** The scope of a job from its `CHECK_NAME` ("Greptile Review" also needs resolved threads); undefined for a name that is not a required check. */
export function scopeOfCheck(name: string): GateScope | undefined {
  const required = REQUIRED_CHECKS.filter((check) => check.name === name);
  return required.length === 0
    ? undefined
    : { required, rejectDraft: false, requireResolvedThreads: name === GREPTILE_CHECK_NAME };
}

/** `gh-readonly-queue/<base>/pr-<N>-<sha>` (with or without `refs/heads/`): the pull request the queue added last. */
const QUEUE_REF = /^(?:refs\/heads\/)?gh-readonly-queue\/.+\/pr-(\d+)-[\da-f]{7,40}$/;

/** The `(#N)` GitHub appends to the title of a squash commit; only the last one counts, a title can contain others. */
const SQUASH_SUFFIX = /\(#(\d+)\)$/;

export interface MergeGroupPullRequests {
  /** Every pull request in the group, ascending. */
  readonly numbers: readonly number[];
  /** Commits of the group whose subject names no pull request; the group cannot be fully identified and must fail. */
  readonly unidentifiedCommits: readonly string[];
}

function parseNumber(digits: string | undefined): number | undefined {
  const value = Number(digits);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

/**
 * The pull requests of a merge group. The branch name only names the last one added, so the commits of the group
 * (`base_sha...head_sha`) are read as well: with the squash merge method of the queue each carries `(#N)` at the end of its subject.
 * A commit that does not (another merge method) is reported instead of ignored, so the check fails closed.
 */
export function mergeGroupPullRequests(
  headRef: string,
  commitSubjects: readonly string[]
): MergeGroupPullRequests {
  const numbers = new Set<number>();
  const unidentifiedCommits: string[] = [];
  const fromRef = parseNumber(QUEUE_REF.exec(headRef)?.[1]);
  if (fromRef !== undefined) {
    numbers.add(fromRef);
  }
  for (const subject of commitSubjects) {
    const fromSubject = parseNumber(SQUASH_SUFFIX.exec(subject.trim())?.[1]);
    if (fromSubject === undefined) {
      unidentifiedCommits.push(subject);
    } else {
      numbers.add(fromSubject);
    }
  }
  if (numbers.size === 0 && unidentifiedCommits.length === 0) {
    unidentifiedCommits.push(headRef);
  }
  return { numbers: [...numbers].toSorted((a, b) => a - b), unidentifiedCommits };
}

/** The job summary (Markdown): one line per pull request. Titles and branch names never appear in it, only numbers and fixed texts. */
export function summaryMarkdown(
  verdicts: readonly PullRequestVerdict[],
  unidentifiedCommits: readonly string[] = [],
  heading = 'PR gates',
  note = ''
): string {
  const lines = [`## ${heading}`, '', ...(note === '' ? [] : [note, ''])];
  for (const verdict of verdicts) {
    lines.push(
      verdict.passed
        ? `- #${String(verdict.number)}: passed`
        : `- #${String(verdict.number)}: failed`,
      ...verdict.reasons.map((reason) => `  - ${reason}`)
    );
  }
  if (unidentifiedCommits.length > 0) {
    lines.push(
      `- ${String(unidentifiedCommits.length)} commit(s) of the merge group name no pull request (squash merge expected)`
    );
  }
  return `${lines.join('\n')}\n`;
}
