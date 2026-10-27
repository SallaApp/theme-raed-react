# CI quality gates

`.github/workflows/ci.yml` runs on every pull request that is ready for review (and on pushes to the base branch).
It uses only public actions and has no dependency on private repositories, organization variables or external services.

| Job                          | What it does                                                              |
| ---------------------------- | ------------------------------------------------------------------------- |
| `Lint & Static Checks`       | lint, format check, manifest check, dead code (knip)                      |
| `Unit Tests & Coverage`      | `pnpm test:coverage`, which enforces the coverage floor                   |
| `Build, Types & Bundle Size` | build, typecheck (needs the generated route tree), bundle size            |
| `Testing Ready`              | one verdict over the three jobs above: the check to require               |
| `Test Reports`               | posts one summary comment on the pull request and updates it on each push |

The `Test Reports` job posts with the workflow token (`pull-requests: write`, no extra credentials) and also writes the report to the job summary. The organization restricts API calls by IP, so it runs on the `RUNS_ON` runner when that variable is set. Reports are plain text in that comment, with no links. The coverage HTML is kept as the `coverage` workflow artifact for 7 days.
