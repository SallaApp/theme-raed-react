/**
 * The GitHub reads of the `PR gates` check, over `fetch` so a test can answer them. Read-only: the token needs `contents`, `pull-requests`
 * and `checks` read access. Every value that reaches a URL is a validated number or SHA, never free text.
 */
import type { CheckRunSummary, PullRequestSnapshot } from './prGates.ts';

export type Fetch = (
  url: string,
  init: {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body?: string | undefined;
  }
) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json: () => Promise<unknown>;
}>;

export interface GitHubClient {
  readonly fetch: Fetch;
  readonly token: string;
  /** `https://api.github.com` unless GitHub Enterprise says otherwise. */
  readonly apiUrl: string;
  /** `owner/name`. */
  readonly repository: string;
}

const PAGE_LIMIT = 20;
const COMMIT_SHA = /^[\da-f]{40}$/;

async function request(
  client: GitHubClient,
  method: string,
  url: string,
  body?: unknown
): Promise<unknown> {
  const response = await client.fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${client.token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `GitHub answered ${String(response.status)} to ${method} ${new URL(url).pathname}`
    );
  }
  return response.json();
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** The value at a path of keys, or undefined when any step is not an object. */
function reach(value: unknown, keys: readonly string[]): unknown {
  let current = value;
  for (const key of keys) {
    current = recordOf(current)[key];
  }
  return current;
}

function firstLine(text = ''): string {
  return text.split('\n', 1)[0] ?? '';
}

function listOf(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberOf(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/** Every item of a paged REST list, read from `field` of each page (or the page itself when it is the array). */
async function pagedItems(
  client: GitHubClient,
  path: string,
  field: string | undefined
): Promise<readonly unknown[]> {
  const items: unknown[] = [];
  for (let page = 1; page <= PAGE_LIMIT; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const body = await request(
      client,
      'GET',
      `${client.apiUrl}${path}${separator}per_page=100&page=${String(page)}`
    );
    const pageItems = listOf(field === undefined ? body : recordOf(body)[field]);
    items.push(...pageItems);
    if (pageItems.length < 100) {
      return items;
    }
  }
  throw new Error(`More than ${String(PAGE_LIMIT * 100)} items at ${path}`);
}

function checkRunOf(raw: unknown): CheckRunSummary {
  const run = recordOf(raw);
  const app = recordOf(run['app']);
  return {
    id: numberOf(run['id']) ?? 0,
    name: textOf(run['name']) ?? '',
    status: textOf(run['status']) ?? '',
    conclusion: textOf(run['conclusion']) ?? null,
    appId: numberOf(app['id']),
    appSlug: textOf(app['slug']),
  };
}

/** The subjects (first lines) of the commits `base...head` adds: for a merge group, one per pull request with the squash method. */
export async function commitSubjects(
  client: GitHubClient,
  base: string,
  head: string
): Promise<readonly string[]> {
  if (!COMMIT_SHA.test(base) || !COMMIT_SHA.test(head)) {
    throw new Error('The merge group base and head must be full commit SHAs');
  }
  const commits = await pagedItems(
    client,
    `/repos/${client.repository}/compare/${base}...${head}`,
    'commits'
  );
  return commits.map((commit) => firstLine(textOf(reach(commit, ['commit', 'message']))));
}

const THREADS_QUERY = `query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved }
      }
    }
  }
}`;

async function unresolvedThreadCount(client: GitHubClient, number: number): Promise<number> {
  const [owner = '', name = ''] = client.repository.split('/', 2);
  let unresolved = 0;
  let after: string | null = null;
  for (let page = 0; page < PAGE_LIMIT; page += 1) {
    const body = recordOf(
      await request(client, 'POST', `${client.apiUrl}/graphql`, {
        query: THREADS_QUERY,
        variables: { owner, name, number, after },
      })
    );
    if (listOf(body['errors']).length > 0) {
      throw new Error('GitHub GraphQL returned errors reading the review threads');
    }
    const threads = recordOf(reach(body, ['data', 'repository', 'pullRequest', 'reviewThreads']));
    unresolved += listOf(threads['nodes']).filter(
      (node) => recordOf(node)['isResolved'] !== true
    ).length;
    const pageInfo = recordOf(threads['pageInfo']);
    if (pageInfo['hasNextPage'] !== true) {
      return unresolved;
    }
    after = textOf(pageInfo['endCursor']) ?? null;
  }
  throw new Error('Too many review threads to read');
}

/** The live state of a pull request: its current head, whether it is a draft, its check runs on that head and its open threads. */
export async function pullRequestSnapshot(
  client: GitHubClient,
  number: number,
  withThreads = true
): Promise<PullRequestSnapshot> {
  const pull = recordOf(
    await request(
      client,
      'GET',
      `${client.apiUrl}/repos/${client.repository}/pulls/${String(number)}`
    )
  );
  const headSha = textOf(recordOf(pull['head'])['sha']) ?? '';
  if (!COMMIT_SHA.test(headSha)) {
    throw new Error(`Pull request #${String(number)} has no readable head commit`);
  }
  const runs = await pagedItems(
    client,
    `/repos/${client.repository}/commits/${headSha}/check-runs?filter=latest`,
    'check_runs'
  );
  return {
    number,
    headSha,
    isDraft: pull['draft'] === true,
    checkRuns: runs.map((run) => checkRunOf(run)),
    unresolvedThreads: withThreads ? await unresolvedThreadCount(client, number) : 0,
  };
}
