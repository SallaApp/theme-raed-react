# Plan: i18n keys check

## Overview
Add `tests/lib/i18n-keys.test.ts`: every key used in `app/` exists in `locales/ar.json` and
`locales/en.json`, the two files have identical key sets, and keys served by the engine/platform are
listed in an explicit allowlist with a one-line reason each.

## Design Context
`docs/changes/2026-10-26-i18n-keys-check/design.md`. Base branch `feature/quality-gates-twig-parity-audit`.
Constraints: do not add the 10 missing Twig keys (task F23); do not edit locale files or app code;
test-only PR; PR body must not mention AI tools; PR into the base branch, not master.

## Execution Strategy

### Parallel Execution Waves
Wave 1: task 1
Wave 2: task 2
Wave 3: task 3

### Dependency Matrix
| Task | Blocked By | Blocks |
| 1 | - | 2 |
| 2 | 1 | 3 |
| 3 | 2 | - |

## Tasks
- [ ] 1. Write the test (Agent: quick | Blocks: [2] | Blocked By: [])
  File: `tests/lib/i18n-keys.test.ts` (imports `../../locales/{ar,en}.json` and `COMPONENT_TRANSLATION_KEYS`).
  Tests: (a) ar/en key sets equal (report keys only in one); (b) every used key (extracted + COMPONENT_TRANSLATION_KEYS) is in ar and en unless allowlisted; (c) every allowlist entry is still used in `app/` and absent from both locale files; (d) extractor finds a sane number of keys. Allowlist = the ~40 used-but-not-in-locale keys found by the extractor, each with a one-line reason (e.g. "engine pack: product page labels"). Export the extractor/compare as small pure functions inside the test file so the failure cases can be unit-tested with fixtures (removed key from ar, removed from en, extra key in one file).
  Acceptance: `pnpm vitest run tests/lib/i18n-keys.test.ts` passes on base; the fixture tests prove missing-key and mismatch detection.
- [ ] 2. Prove it fails (Agent: quick | Blocks: [3] | Blocked By: [1])
  Temporarily delete a used key (e.g. `blocks.header.search`) from `locales/en.json`, then from `locales/ar.json`; run the test and capture the failing output for the PR body; restore both files (`git diff locales/` must be empty).
- [ ] 3. Quality gate and PR evidence (Agent: quick | Blocks: [] | Blocked By: [2])
  `pnpm install --frozen-lockfile && pnpm test && pnpm typecheck && pnpm build` (typecheck needs the route tree from build). After implementation is complete, invoke the openflow-quality-gate skill. Do not claim completion until the quality gate reports readiness.
  PR into `feature/quality-gates-twig-parity-audit`; title e.g. `test(themes): check every translation key used in app/ exists in both locales`; body shows the failing output from task 2.
