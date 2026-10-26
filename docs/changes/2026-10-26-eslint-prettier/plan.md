# Plan: eslint-prettier (SAL-3508 / G2)

## Overview

Add ESLint 9 (flat config: typescript-eslint, react, react-hooks, jsx-a11y) and Prettier to the theme, expose `pnpm lint` and `pnpm format:check`, and make the existing code pass without changing runtime behaviour. Mechanical churn is handled by config, not mass edits; every disabled or downgraded rule is listed with a one-line reason in the PR body.

## Design Context

Constraints from the issue and project rules (no separate design.md; scope is fully specified by SAL-3508):

- [HIGH / scope] Branch from and PR into `feature/quality-gates-twig-parity-audit`, never `master`. One task per PR. PR body must not mention AI tools or session links.
- [HIGH / behaviour] No runtime behaviour change. Do not touch `app/routeTree.gen.ts`, `twilight.json` semantics, locales, or engine components. Do not fork engine components.
- [HIGH / tooling] pnpm 10 (`packageManager: pnpm@10.34.9`). The lockfile must be updated and committed; `pnpm install --frozen-lockfile` must pass afterwards. Do not run `pnpm dev`.
- [MED / config] ESLint ignores: `dist`, `.tanstack`, `coverage`, `app/routeTree.gen.ts`, `theme-raed/`, `.notes/`. Use the same ignore list in `.prettierignore`. Also ignore `node_modules`, `.wrangler`, `pnpm-lock.yaml`, `twilight.json` (large generated-style JSON; confirm it is not already prettier-formatted before ignoring, otherwise leave it checked), `locales/*.json` only if they churn (see Task 3).
- [MED / AGENTS.md] The engine documents `@salla.sa/twilight-theme-engine/eslint` exporting `twilightEslintConfig` (https://docs.salla.dev/twilight/react/guide/lint-your-theme.md): restricted imports of the broad barrels, `window.location`, `document.querySelector` etc., bare `location`; all as warnings, `.ts`/`.tsx` only. Spread it first in the flat config if the export exists in the installed engine (`^1.0.132`); verify in `node_modules/@salla.sa/twilight-theme-engine/package.json` `exports`. If missing, skip it and note it in the PR. Own entries go AFTER the spread.

Current repo facts (verified):

- ~156 source files: 106 `.tsx`, 50 `.ts`, 45 `.scss`, 2 `.css`, 2 `.cjs` (`postcss.config.cjs`, `tailwind.config.cjs`) under `app/`, `tests/`, plus root `vite.config.ts`, `vitest.config.ts`.
- `package.json` has `"type": "module"`, no eslint/prettier deps, no `lint`/`format:check` scripts. TypeScript `^6.0.3`, React `19.2.8`, node 26.
- `tsconfig.json` includes only `app/**/*`, `vite.config.ts`, `*.d.ts`; `tests/` is NOT type-checked (so no type-aware linting on tests unless the lint tsconfig is widened; prefer non-type-aware `tseslint.configs.recommended` to avoid a parserOptions project setup and speed).
- `.gitignore` already lists `dist/`, `coverage/`, `.tanstack/`, `app/routeTree.gen.ts`.
- Only `*.ts`/`*.tsx`/`*.cjs`/`*.scss`/`*.css`/`*.json`/`*.md` exist; no `.eslintrc`, `.prettierrc`, `.editorconfig` today.
- AGENTS.md / FORKS.md are already prettier-style formatted (markdown tables padded), suggesting default-ish Prettier with `printWidth` 80+, `singleQuote`. Infer the real style from the code (see Task 2) and write the `.prettierrc` to match so the format diff is minimal.

## Execution Strategy

### Parallel Execution Waves

Wave 1: Task 1 (deps + configs + scripts).
Wave 2: Task 2 (Prettier baseline) and Task 3 (ESLint fixes) are sequential in practice because Prettier reformatting touches the same files; run Prettier first, then ESLint.
Wave 3: Task 4 (full verification, PR body notes).

### Dependency Matrix

| Task | Blocked By | Blocks |
| ---- | ---------- | ------ |
| 1    | none       | 2, 3   |
| 2    | 1          | 3      |
| 3    | 2          | 4      |
| 4    | 3          | none   |

## Tasks

- [ ] 1. Install tooling and add configs and scripts (Agent: quick | Blocks: [2, 3] | Blocked By: [])
  - Files: `package.json`, `pnpm-lock.yaml`, new `eslint.config.js`, new `.prettierrc.json`, new `.prettierignore`.
  - `pnpm add -D eslint@^9 @eslint/js@^9 typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y globals eslint-config-prettier prettier` (ESLint must stay on major 9; check peer ranges of `eslint-plugin-react` / `jsx-a11y` against ESLint 9 and TS 6; if `typescript-eslint` does not yet support TypeScript 6, use the newest release that works and say so in the PR). Use `eslint-plugin-react-hooks` flat `recommended-latest`/`flat.recommended` preset as the installed version documents.
  - `eslint.config.js` (ESM, `export default tseslint.config(...)`): `{ ignores: ['dist','.tanstack','coverage','app/routeTree.gen.ts','theme-raed/','.notes/','node_modules','.wrangler'] }`; `js.configs.recommended`; `tseslint.configs.recommended`; react flat recommended + `jsx-runtime` (React 19 automatic runtime, so `react/react-in-jsx-scope` off), `settings.react.version: 'detect'`; react-hooks recommended; `jsx-a11y` flat recommended; `eslint-config-prettier` LAST so formatting rules never conflict; `languageOptions.globals` browser for `app/`, node for `*.config.*`/`*.cjs`; spread engine `twilightEslintConfig` if available. `.cjs` files need `sourceType: 'commonjs'` and `globals.node`.
  - `package.json` scripts: `"lint": "eslint ."`, `"format:check": "prettier --check ."`. Optionally also `"format": "prettier --write ."` (harmless, helpful). Do not add husky/lint-staged (out of scope).
  - Acceptance: `pnpm install --frozen-lockfile` exits 0; `pnpm lint` and `pnpm format:check` run (they may still report violations at this point).
  - Verify: `pnpm install --frozen-lockfile && pnpm lint --version 2>/dev/null; pnpm exec eslint --version && pnpm exec prettier --version`; expected: versions print, ESLint 9.x.

- [ ] 2. Prettier baseline (Agent: quick | Blocks: [3] | Blocked By: [1])
  - Files: `.prettierrc.json`, `.prettierignore`, then whatever `prettier --write` rewrites.
  - First run `pnpm exec prettier --check .` with a candidate config derived from existing style (inspect a few files in `app/components/` and `tests/` for quotes, semicolons, trailing commas, width) and pick the options that minimize the diff. Compare 2 to 3 candidates by counting files reported.
  - If the diff is small (tens of files), run `prettier --write` and commit it as its own commit ("chore: format with prettier") separate from config so review is easy. If it is large and noisy, narrow by ignoring only the noisiest generated-ish paths (e.g. `twilight.json`, `locales/*.json`, `pnpm-lock.yaml`) and list each in the PR; never ignore `app/**/*.ts(x)`.
  - Confirm formatting changes are whitespace/punctuation only: `pnpm build` output unchanged in behaviour and `pnpm test` green after the write. Check that Prettier does not reorder/alter `.scss` semantics (it does not) and that `.cjs` configs still load (`pnpm build` proves tailwind/postcss load).
  - Verify: `pnpm format:check` exits 0.

- [ ] 3. Make ESLint pass (Agent: quick | Blocks: [4] | Blocked By: [2])
  - Files: `eslint.config.js`, plus the specific source files with real issues.
  - Run `pnpm lint`; triage findings by rule. Fix REAL issues in code when the fix is local and behaviour-preserving (unused imports/vars, missing `key`, hook dependency problems ONLY when provably safe, missing alt/label, empty interfaces, `prefer-const`). Never alter effect dependency arrays or hook order in a way that could change runtime behaviour: if `react-hooks/exhaustive-deps` or a rules-of-hooks / new React-compiler-style rule (e.g. `react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/purity`) flags something non-trivial, downgrade that rule to `warn` or turn it off for the repo rather than editing logic, and record it.
  - Prefer config over mass edits for large mechanical churn (e.g. a11y rules triggered by many design-system markup patterns, `@typescript-eslint/no-explicit-any` on engine-typed code). Per-rule choice order: fix if under about 10 sites; otherwise `warn`; otherwise `off`. Prefer scoping overrides to `files: ['tests/**']` etc. rather than global off.
  - Do NOT add blanket `/* eslint-disable */` file headers. Single-line `eslint-disable-next-line <rule> -- <reason>` is acceptable for a few justified sites.
  - Maintain a running list in the format `rule - level (off|warn) - scope - one-line reason` for the PR body. Include count of sites when relevant.
  - If everything passes with warnings only, decide: keep warnings (exit 0) but if warning count is 0 set the script to `eslint . --max-warnings 0` to make the gate strict (engine doc recommends it). If warnings remain, leave `eslint .` and state the count in the PR.
  - Verify: `pnpm lint` exits 0 and `pnpm format:check` still exits 0 after the ESLint edits (re-run `pnpm exec prettier --write` on touched files).

- [ ] 4. Full gate and PR notes (Agent: quick | Blocks: [] | Blocked By: [3])
  - After implementation is complete, invoke the openflow-quality-gate skill. The skill decides whether harden is required and performs evidence-aware verify. Do not claim completion until the quality gate reports readiness.
  - Run in order and confirm each exits 0: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm check:manifest`. (`pnpm build` must run before `typecheck` because typecheck needs `app/routeTree.gen.ts`; `pnpm build` regenerates it and it is gitignored, so confirm `git status` shows it untracked-ignored and not committed.)
  - Confirm `git diff --stat origin/feature/quality-gates-twig-parity-audit` shows only: config files, `package.json`, `pnpm-lock.yaml`, formatting-only diffs, and minimal local lint fixes. No changes to `twilight.json` values, `locales/` values, or `app/routeTree.gen.ts`.
  - PR: title `ci(devops): add ESLint and Prettier with lint and format:check scripts` (valid for lint-pr; type `ci`, scope `devops`; the branch name stays `feature/SAL-3508-...`). Base `feature/quality-gates-twig-parity-audit`. Body: what changed, the commands run with results, and a table "Rules disabled or downgraded" (rule, level, scope, reason), plus any ignore additions beyond the issue's list. No mention of AI tools or session links. Commits use `Made-with` trailers via the `git_commit` tool (automatic).
  - Verify: all seven commands exit 0.

## Quality Gate

After implementation is complete, invoke the openflow-quality-gate skill. The skill decides whether harden is required and performs evidence-aware verify. Do not claim completion until the quality gate reports readiness.
