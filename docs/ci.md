# CI quality gates

`.github/workflows/ci.yml` runs on every pull request that is ready for review.
It uses only public actions and has no dependency on private repositories, organization variables or external services.

| Job                          | What it does                                                   |
| ---------------------------- | -------------------------------------------------------------- |
| `Lint & Static Checks`       | lint, format check, manifest check, dead code (knip)           |
| `Unit Tests & Coverage`      | `pnpm test:coverage`, which enforces the coverage floor        |
| `Build, Types & Bundle Size` | build, typecheck (needs the generated route tree), bundle size |
| `Testing Ready`              | one verdict over the three jobs above: the check to require    |

Reports (coverage table, bundle size, gate results) are printed in each job's log and in the run summary page. Nothing is posted through the GitHub API, so no extra credentials or runner IP allow-listing are needed. The coverage HTML is kept as the `coverage` workflow artifact for 7 days.
