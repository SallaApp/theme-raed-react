import { describe, expect, it } from 'vitest';
import {
  ALL_GATES,
  evaluatePullRequest,
  GREPTILE_APP,
  mergeGroupPullRequests,
  SALLA_BOT_APP,
  scopeOfCheck,
  summaryMarkdown,
  type CheckRunSummary,
  type PullRequestSnapshot,
} from './prGates.ts';

function run(name: string, overrides: Partial<CheckRunSummary> = {}): CheckRunSummary {
  const app = name === 'Greptile Review' ? GREPTILE_APP : SALLA_BOT_APP;
  return {
    id: 1,
    name,
    status: 'completed',
    conclusion: 'success',
    appId: app.appId,
    appSlug: app.appSlug,
    ...overrides,
  };
}

function snapshot(overrides: Partial<PullRequestSnapshot> = {}): PullRequestSnapshot {
  return {
    number: 7,
    headSha: 'a'.repeat(40),
    isDraft: false,
    checkRuns: [run('Greptile Review'), run('Validate PR title'), run('Validate branch name')],
    unresolvedThreads: 0,
    ...overrides,
  };
}

describe('evaluatePullRequest', () => {
  it('passes when every gate holds', () => {
    expect(evaluatePullRequest(snapshot())).toEqual({
      number: 7,
      passed: true,
      reasons: [],
      waiting: false,
    });
  });

  it('fails a draft', () => {
    expect(evaluatePullRequest(snapshot({ isDraft: true })).reasons).toEqual([
      'the pull request is a draft',
    ]);
  });

  it('fails open review threads, singular and plural', () => {
    expect(evaluatePullRequest(snapshot({ unresolvedThreads: 1 })).reasons).toEqual([
      '1 review thread is not resolved',
    ]);
    expect(evaluatePullRequest(snapshot({ unresolvedThreads: 3 })).reasons).toEqual([
      '3 review threads are not resolved',
    ]);
  });

  it('waits for a check that has not been reported or has not finished', () => {
    const missing = evaluatePullRequest(
      snapshot({ checkRuns: [run('Validate PR title'), run('Validate branch name')] })
    );
    expect(missing).toMatchObject({ passed: false, waiting: true });
    expect(missing.reasons[0]).toContain('has not been reported by greptile-apps');
    const running = evaluatePullRequest(
      snapshot({
        checkRuns: [
          run('Greptile Review', { status: 'in_progress', conclusion: null }),
          run('Validate PR title'),
          run('Validate branch name'),
        ],
      })
    );
    expect(running).toMatchObject({
      passed: false,
      waiting: true,
      reasons: ['"Greptile Review" is still in_progress'],
    });
  });

  it('fails a check that concluded anything but success, without waiting', () => {
    const verdict = evaluatePullRequest(
      snapshot({
        checkRuns: [
          run('Greptile Review', { conclusion: 'failure' }),
          run('Validate PR title'),
          run('Validate branch name', { conclusion: null }),
        ],
      })
    );
    expect(verdict.waiting).toBe(false);
    expect(verdict.reasons).toEqual([
      '"Greptile Review" concluded failure',
      '"Validate branch name" concluded without a result',
    ]);
  });

  it('does not accept a check of the right name from the wrong app (a workflow borrowing the name)', () => {
    const spoofed = run('Greptile Review', { id: 99, appId: 15_368, appSlug: 'github-actions' });
    const verdict = evaluatePullRequest(
      snapshot({ checkRuns: [spoofed, run('Validate PR title'), run('Validate branch name')] })
    );
    expect(verdict).toMatchObject({ passed: false, waiting: true });
  });

  it('does not let a spoofed success hide the real failure, nor the real one be replaced by an older run', () => {
    const spoofed = run('Greptile Review', { id: 99, appId: 15_368, appSlug: 'github-actions' });
    const real = run('Greptile Review', { id: 5, conclusion: 'failure' });
    const verdict = evaluatePullRequest(
      snapshot({
        checkRuns: [real, spoofed, run('Validate PR title'), run('Validate branch name')],
      })
    );
    expect(verdict.reasons).toEqual(['"Greptile Review" concluded failure']);
    const rerun = evaluatePullRequest(
      snapshot({
        checkRuns: [
          run('Greptile Review', { id: 3, conclusion: 'failure' }),
          run('Greptile Review', { id: 8 }),
          run('Validate PR title'),
          run('Validate branch name'),
        ],
      })
    );
    expect(rerun.passed).toBe(true);
  });

  it('requires the app slug as well as the id', () => {
    const verdict = evaluatePullRequest(
      snapshot({
        checkRuns: [
          run('Greptile Review', { appSlug: 'someone-else' }),
          run('Validate PR title'),
          run('Validate branch name'),
        ],
      })
    );
    expect(verdict.passed).toBe(false);
  });

  it('collects every reason', () => {
    const verdict = evaluatePullRequest(
      snapshot({ isDraft: true, checkRuns: [], unresolvedThreads: 2 })
    );
    expect(verdict.reasons).toHaveLength(5);
  });
});

describe('scopeOfCheck', () => {
  it('scopes a merge group job to its check; only Greptile also needs resolved threads, none needs a non-draft', () => {
    expect(scopeOfCheck('Greptile Review')).toMatchObject({
      rejectDraft: false,
      requireResolvedThreads: true,
    });
    expect(scopeOfCheck('Validate PR title')).toMatchObject({ requireResolvedThreads: false });
    expect(scopeOfCheck('Testing Ready')).toBeUndefined();
  });

  it('verifies only its own check', () => {
    const scope = scopeOfCheck('Validate PR title');
    const onlyTitle = snapshot({
      isDraft: true,
      unresolvedThreads: 4,
      checkRuns: [run('Validate PR title')],
    });
    expect(scope && evaluatePullRequest(onlyTitle, scope).passed).toBe(true);
    expect(evaluatePullRequest(onlyTitle, ALL_GATES).passed).toBe(false);
  });
});

describe('mergeGroupPullRequests', () => {
  const REF = 'refs/heads/gh-readonly-queue/master/pr-12-0123456789abcdef0123456789abcdef01234567';

  it('reads the last pull request from the branch name, with or without refs/heads', () => {
    expect(mergeGroupPullRequests(REF, ['feat: x (#12)'])).toEqual({
      numbers: [12],
      unidentifiedCommits: [],
    });
    expect(
      mergeGroupPullRequests(REF.replace('refs/heads/', ''), ['feat: x (#12)']).numbers
    ).toEqual([12]);
  });

  it('adds every pull request named by the squash commits of the group, sorted, and ignores earlier suffixes in a title', () => {
    expect(
      mergeGroupPullRequests(REF, ['fix: a (#10)', 'fix: b (#3) (#11)', 'feat: x (#12)  '])
    ).toEqual({
      numbers: [10, 11, 12],
      unidentifiedCommits: [],
    });
  });

  it('reports a commit that names no pull request, so the check fails closed', () => {
    expect(
      mergeGroupPullRequests(REF, ['Merge pull request #5 from x/y', 'feat: x (#12)'])
    ).toEqual({
      numbers: [12],
      unidentifiedCommits: ['Merge pull request #5 from x/y'],
    });
  });

  it('reports a branch that is not a queue branch when nothing else identifies a pull request', () => {
    expect(mergeGroupPullRequests('refs/heads/main', [])).toEqual({
      numbers: [],
      unidentifiedCommits: ['refs/heads/main'],
    });
    expect(
      mergeGroupPullRequests('gh-readonly-queue/master/pr-0-abcdef1', ['x (#0)'])
        .unidentifiedCommits
    ).toEqual(['x (#0)']);
  });
});

describe('summaryMarkdown', () => {
  it('lists the verdicts, the reasons and the unidentified commits, never a title or a branch name', () => {
    const failed = evaluatePullRequest(snapshot({ isDraft: true }));
    const text = summaryMarkdown([evaluatePullRequest(snapshot({ number: 1 })), failed], ['x']);
    expect(text).toBe(
      '## PR gates\n\n- #1: passed\n- #7: failed\n  - the pull request is a draft\n- 1 commit(s) of the merge group name no pull request (squash merge expected)\n'
    );
  });

  it('takes a heading and a note for the merge group jobs', () => {
    expect(summaryMarkdown([], [], 'Greptile Review', 'note')).toBe(
      '## Greptile Review\n\nnote\n\n'
    );
  });
});
