# CI quality gates

Ported from `SallaApp/checkout-react/.github`, limited to what this repository has.

| Workflow                   | What it does                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                   | `static` (typecheck, lint, format, manifest, knip), `unit` (coverage floor), `build` (build + bundle size), `Testing Ready` verdict, `Test Reports` index |
| `pr-gates.yml`             | `PR gates`: the Greptile app, the title and branch validators passed on the head commit, no open review thread, not a draft                               |
| `pr-gates-merge-group.yml` | Merge-queue-only jobs that re-verify the stage 1 result (`Greptile Review`, `Validate PR title`, `Validate branch name`)                                  |
| `pr-gates-rerun.yml`       | Re-runs `PR gates` when Greptile, a validator or a review changes                                                                                         |

Reports (coverage, bundle size) are pushed to the shared tests-reports worker through
`SallaApp/checkout-tests-reports/publish` and `/finalize`. They need the repository secrets
`R2_REPORTS_ACCESS_KEY_ID`, `R2_REPORTS_SECRET_ACCESS_KEY`, `R2_REPORTS_ENDPOINT` and `REPORTS_BASE_URL`;
publishing is `continue-on-error`, so missing secrets never block a merge. `RUNS_ON` (repository variable) selects the
runner and falls back to `ubuntu-latest`.

Not ported because this repository has no Storybook, Playwright E2E, API contract tests, Lighthouse setup or Cloudflare
checkout Worker: `storybook-baselines`, `figma-visual*`, `e2e-nightly`, `api-drift`, `deploy`.

Admin setup for the required checks (`Testing Ready`, `Greptile Review`, `Validate PR title`, `Validate branch name`,
`PR gates`) and the merge queue follows checkout-react's `docs/merge-queue.md`.
