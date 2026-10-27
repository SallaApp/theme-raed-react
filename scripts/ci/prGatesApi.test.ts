import { describe, expect, it } from 'vitest';
import {
  commitSubjects,
  pullRequestSnapshot,
  type Fetch,
  type GitHubClient,
} from './prGatesApi.ts';

const SHA = 'b'.repeat(40);

function clientAnswering(
  answer: (url: string, body: string | undefined) => { status?: number; body: unknown }
): {
  client: GitHubClient;
  urls: string[];
} {
  const urls: string[] = [];
  const fetchStub: Fetch = (url, init) => {
    urls.push(`${init.method} ${url}`);
    const { status = 200, body } = answer(url, init.body);
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
  };
  return {
    client: { fetch: fetchStub, token: 't', apiUrl: 'https://api.test', repository: 'o/r' },
    urls,
  };
}

describe('commitSubjects', () => {
  it('returns the first line of each commit of the range', async () => {
    const { client, urls } = clientAnswering(() => ({
      body: { commits: [{ commit: { message: 'a (#1)\n\nbody' } }, { commit: {} }] },
    }));
    expect(await commitSubjects(client, SHA, SHA)).toEqual(['a (#1)', '']);
    expect(urls[0]).toContain(`/repos/o/r/compare/${SHA}...${SHA}?per_page=100&page=1`);
  });

  it('refuses a base or head that is not a full SHA', async () => {
    const { client } = clientAnswering(() => ({ body: {} }));
    await expect(commitSubjects(client, '--help', SHA)).rejects.toThrow('full commit SHAs');
  });

  it('follows pages and gives up on a huge list', async () => {
    const page = {
      commits: Array.from({ length: 100 }, () => ({ commit: { message: 'x (#1)' } })),
    };
    const { client, urls } = clientAnswering((url) => ({
      body: url.endsWith('page=2') ? { commits: [] } : page,
    }));
    expect(await commitSubjects(client, SHA, SHA)).toHaveLength(100);
    expect(urls).toHaveLength(2);
    const endless = clientAnswering(() => ({ body: page }));
    await expect(commitSubjects(endless.client, SHA, SHA)).rejects.toThrow('More than');
  });
});

const DRAFT_PULL = { head: { sha: SHA }, draft: true };

type Answer = (url: string) => { status?: number; body: unknown };

function pullAnswers(threadPages: readonly unknown[], pull: unknown = DRAFT_PULL): Answer {
  let thread = 0;
  return (url: string): { status?: number; body: unknown } => {
    if (url.endsWith('/graphql')) {
      return { body: threadPages[thread++] };
    }
    if (url.includes('/check-runs')) {
      return {
        body: {
          check_runs: [
            {
              id: 4,
              name: 'Greptile Review',
              status: 'completed',
              conclusion: 'success',
              app: { id: 867_647, slug: 'greptile-apps' },
            },
            'junk',
          ],
        },
      };
    }
    return { body: pull };
  };
}

function threads(nodes: readonly unknown[], next?: string): unknown {
  return {
    data: {
      repository: {
        pullRequest: {
          reviewThreads: { pageInfo: { hasNextPage: next !== undefined, endCursor: next }, nodes },
        },
      },
    },
  };
}

async function failureOf(answer: Answer): Promise<string> {
  try {
    await pullRequestSnapshot(clientAnswering(answer).client, 9);
  } catch (error: unknown) {
    return error instanceof Error ? error.message : '';
  }
  return '';
}

describe('pullRequestSnapshot', () => {
  it('reads the live head, draft state, check runs of that head and unresolved threads across pages', async () => {
    const { client, urls } = clientAnswering(
      pullAnswers([
        threads([{ isResolved: false }, { isResolved: true }], 'c1'),
        threads([{ isResolved: false }]),
      ])
    );
    const result = await pullRequestSnapshot(client, 9);
    expect(result).toMatchObject({ number: 9, headSha: SHA, isDraft: true, unresolvedThreads: 2 });
    expect(result.checkRuns[0]).toEqual({
      id: 4,
      name: 'Greptile Review',
      status: 'completed',
      conclusion: 'success',
      appId: 867_647,
      appSlug: 'greptile-apps',
    });
    expect(result.checkRuns[1]).toEqual({
      id: 0,
      name: '',
      status: '',
      conclusion: null,
      appId: undefined,
      appSlug: undefined,
    });
    expect(
      urls.some((url) => url.includes(`/commits/${SHA}/check-runs?filter=latest&per_page=100`))
    ).toBe(true);
  });

  it('skips the threads when the job does not need them, and treats a missing draft flag as ready', async () => {
    const { client, urls } = clientAnswering(pullAnswers([], { head: { sha: SHA } }));
    expect(await pullRequestSnapshot(client, 9, false)).toMatchObject({
      isDraft: false,
      unresolvedThreads: 0,
    });
    expect(urls.some((url) => url.endsWith('/graphql'))).toBe(false);
  });

  it('fails on a head that is not a commit, an API error, GraphQL errors and endless thread pages', async () => {
    expect(await failureOf(() => ({ body: {} }))).toContain('no readable head');
    expect(await failureOf(() => ({ status: 403, body: {} }))).toContain(
      '403 to GET /repos/o/r/pulls/9'
    );
    expect(await failureOf(pullAnswers([{ errors: [{}] }]))).toContain('GraphQL returned errors');
    const endless = Array.from({ length: 25 }, () => threads([], 'next'));
    expect(await failureOf(pullAnswers(endless))).toContain('Too many review threads');
  });

  it('stops when a page says there is more but gives no cursor', async () => {
    const noCursor = {
      data: {
        repository: {
          pullRequest: { reviewThreads: { pageInfo: { hasNextPage: true }, nodes: [] } },
        },
      },
    };
    const { client } = clientAnswering(pullAnswers([noCursor, threads([])]));
    const snapshotWithoutCursor = await pullRequestSnapshot(client, 9);
    expect(snapshotWithoutCursor.unresolvedThreads).toBe(0);
  });
});
