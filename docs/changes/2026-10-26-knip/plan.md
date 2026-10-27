# Plan: knip (SAL-3509 / G3)

## Overview

Add knip so the repo fails on unused files, exports and dependencies, expose `pnpm knip`, delete what is truly dead, and record every deliberate keep as a one-line-reason entry in the knip config. No runtime behaviour change.

## Design Context

- [HIGH / scope] Branch from and PR into `feature/quality-gates-twig-parity-audit`, never `master`. One task per PR. PR body must not mention AI tools or session links.
- [HIGH / ordering] SAL-3508 (G2) is merged (PR #52, base head `c7b0a0f`). The issue branch `feature/SAL-3509-add-knip-to-find-unused-files-exports-and-dependencies` was cut from master (`575b51e`) and is BEHIND the base. First step: `git fetch origin && git rebase origin/feature/quality-gates-twig-parity-audit`, then `pnpm install --frozen-lockfile`. The only file this branch adds before rebase is this plan (new directory, no conflict).
- [HIGH / behaviour] Do not change runtime behaviour. Never edit `app/routeTree.gen.ts`, `twilight.json` semantics, `locales/*`. Do not fork engine components.
- [HIGH / tooling] pnpm 10 (`packageManager: pnpm@10.34.9`). `package.json` and `pnpm-lock.yaml` change; `pnpm install --frozen-lockfile` must pass afterwards. Do not run `pnpm dev`.
- [MED / G2 gates] After rebase the repo has `lint` (`eslint .`) and `format:check` (`prettier --check .`). New config and any edited file must pass both.
- [MED / existing guard tests] Tests that read the source tree and constrain what may be deleted (all on the base):
  - `tests/lib/forkDrift.test.ts` compares engine components listed in `FORKS.md` with the engine. Do NOT delete a file listed in `FORKS.md`; if knip flags one, keep it via config with that reason.
  - `tests/lib/settingsUsage.test.ts` fails when a `twilight.json` setting is read by nothing. Do not delete code that reads a setting without checking this test.
  - `tests/lib/i18n-keys.test.ts` checks every key used under `app/` exists in both locales. Deleting dead code only removes uses; do not delete locale keys (locale rule: only add keys).
  - `vitest.config.ts` coverage thresholds (lines 74, branches 70, functions 64, statements 72) are a ratchet. Run `pnpm test:coverage` before and after the deletions; never lower a threshold. Removing a dead file that tests cover may move the numbers; if coverage falls below the floor, keep the file in knip config with a reason instead and say so in the PR.

## Repo facts (verified on the base, not guessed)

- Entry surface: `app/client.tsx` (`bootClient`, dynamic `import('./hydrate')`), `app/server.ts`, `app/start.ts`, `app/router.tsx`, `app/routes.ts` (empty virtual-routes array), `app/routes/**` (file routes, 25 files incl. `__root.tsx`), `app/hydrate.tsx`. `app/routeTree.gen.ts` is generated AND gitignored, so it is absent on a clean checkout.
- Non-JS config files read by tools: `vite.config.ts` (engine `twilightReact()` plugin, `rollup-plugin-visualizer`, regex alias `swiper/css... -> app/lib/empty-css.ts`), `vitest.config.ts` (setup file `tests/setup.tsx`, alias `virtual:twilight/theme-translations -> tests/stubs/theme-translations.ts`), `eslint.config.js`, `postcss.config.cjs` (`tailwindcss`, `autoprefixer`), `tailwind.config.cjs`, `.prettierrc.json`.
- Engine virtual modules: `virtual:twilight/*` specifiers are served only by the engine Vite plugin (also `tsconfig.json` loads `node_modules/@salla.sa/twilight-theme-engine/dist/ambient/virtual-modules.d.ts`). Knip sees them as unresolved imports.
- Source inventory: `app/components` (46 files incl. barrels `cart/index.ts`, `common/index.ts`, `home/index.ts`, `product/index.ts`), `app/hooks` (11, `index.tsx` holds hook-slot registrations), `app/lib` (12), `app/types/fslightbox.d.ts`, 45 `.scss` + 2 `.css` under `app/styles`.
- No `.github/` workflows in the repo, so there is no CI step to wire; the gate is the script.
- knip latest is 6.43.0 (node `^20.19.0 || >=22.12.0`; local node is 26). Knip has built-in plugins for `vite`, `vitest`, `eslint`, `prettier`, `postcss`, `tailwind` and `tanstack-router`; rely on them first and only add config where a run proves a gap.

## Tasks

### Task 1: install knip, script, baseline run

- `pnpm add -D knip` (caret range like the other devDependencies; commit the lockfile). Keep `package.json` key order/format (prettier).
- Add script `"knip": "knip"` to `package.json` after `format:check`.
- Run `pnpm knip` once with no config to capture the raw report; keep it as scratch (not committed) to drive Task 2/3.

### Task 2: `knip.jsonc` (comments allowed, so every keep carries its one-line reason)

Create `knip.jsonc` at repo root (`$schema: https://unpkg.com/knip@6/schema.json`). Start from this and trim to what the run proves is needed:

- `entry`: `app/client.tsx`, `app/server.ts`, `app/start.ts`, `app/router.tsx`, `app/routes.ts`, `app/routes/**/*.{ts,tsx}` (the tanstack-router plugin assumes `src/routes`; this theme uses `app/routes`, and files there are loaded by the generated route tree, not imported), `app/lib/empty-css.ts` (target of the regex alias in `vite.config.ts`, which knip cannot follow). Plugin-provided entries stay automatic (`vite.config.ts`, `vitest.config.ts`, `tests/**/*.test.*`, `tests/setup.tsx`, `eslint.config.js`).
- `project`: `app/**/*.{ts,tsx}`, `tests/**/*.{ts,tsx}`, root `*.{ts,js,cjs}` (code only; SCSS/CSS are not scanned for unused files).
- `ignore`: `app/routeTree.gen.ts` (generated, never edited), `app/types/*.d.ts` if flagged (ambient declaration, consumed by tsc not by import).
- `ignoreUnresolved`: `^virtual:twilight/` (served by the engine Vite plugin), and `./routeTree.gen` if flagged on a clean checkout (generated at build).
- `ignoreDependencies`: only entries a run actually flags AND that grep/`pnpm why` confirms are used implicitly (e.g. peers/pins of the engine, tools loaded by name from config). Candidates to check, not to blanket-ignore: `esbuild` (exact pin, likely a version pin for vite), `postcss`/`autoprefixer`/`sass`/`@tailwindcss/forms`/`@salla.sa/twilight-tailwind-theme` (loaded by config or Vite by name), `@vitest/coverage-v8`/`jsdom` (vitest provider/environment), `@tanstack/react-query-devtools`/`@tanstack/react-router-devtools`, `@salla.sa/twilight-components-react`. If a dependency is genuinely unreferenced and not a pin, remove it (`pnpm remove`) and say so in the PR. If something is imported but unlisted (e.g. `swiper`, `react-i18next`, `i18next`, `globals`), do not add it silently: if it resolves only through the engine's dependency tree add it to `ignoreDependencies`/`ignoreUnlisted` equivalent with the reason "provided by the engine"; if the app really needs it directly, flag it in the PR instead of changing resolution.
- Barrel files (`app/components/{cart,common,home,product}/index.ts`): re-exports nobody imports are unused exports. Prefer deleting the dead re-export (or the whole barrel if nothing imports it). If a barrel is part of how the engine/FORKS documentation expects to find components, keep it with a reason.
- Every kept item gets a `//` one-line reason comment in `knip.jsonc`. No blanket `ignore: ['app/**']`, no `rules: { ... off }` to silence a whole issue type.

### Task 3: remove what is truly unused

- For each finding (files, exports, types, dependencies): confirm unused by searching the whole repo including `tests/`, `twilight.json` (home-block keys and settings reference component names by string), `FORKS.md`, and `app/hooks/index.tsx` / `app/router.tsx` registrations (`registerHomeComponents`, `registry.register('product:card', ...)`, hook-slot registrations are dynamic and may be invisible to knip; knip follows their static imports, so a "used by registry" component is normally already reachable, but check before deleting).
- Delete unused files; remove the `export` keyword (not the symbol) when something is used only in its own file; delete dead exports/types otherwise. Do not refactor, rename or reformat unrelated code.
- Keep a running ledger (file/symbol, action, reason) for the PR body: one line per removal, one line per ignore.

### Task 4: verification and PR notes

Run every command below on the rebased branch; all must exit 0. In the PR body list: every removal (path or symbol and why it was dead), every config ignore with its reason, whether any dependency was removed, and any finding deliberately left (should be none; knip must exit 0).

## Verification

- `pnpm install --frozen-lockfile` — exits 0 (lockfile committed).
- `pnpm knip` — exits 0, no issues.
- Negative check (do not commit): add `export const __knipProbe = 1;` to an `app/lib/*.ts` file, run `pnpm knip` and confirm it reports it, then revert. Also confirm a clean checkout without `app/routeTree.gen.ts` still passes (run `pnpm knip` before `pnpm build` after `rm -f app/routeTree.gen.ts`, then again after build).
- `pnpm build` — exits 0.
- `pnpm typecheck` — exits 0.
- `pnpm test` — exits 0; `pnpm test:coverage` still meets thresholds.
- `pnpm check:manifest` — exits 0.
- `pnpm lint` and `pnpm format:check` — exit 0 (G2 gates; `knip.jsonc` must be prettier-clean).

## Risks

- Knip false positives on engine-registered or string-referenced components → grep `twilight.json`, `FORKS.md`, `registry.register`, `registerHomeComponents`, and `app/hooks/index.tsx` before deleting; keep with a reason when in doubt.
- Deleting a file listed in `FORKS.md` breaks `forkDrift.test.ts` → never delete those; ignore with reason.
- Coverage ratchet can drop when dead-but-tested code is removed → measure before/after; never lower thresholds.
- Removing a dependency that is a version pin or implicit tool plugin → verify with `pnpm why`, `pnpm build` and `pnpm test` before committing the removal.
- `app/routeTree.gen.ts` absent on a clean checkout → config must pass in both states (checked in Verification).
- `package.json`/lockfile conflict with other quality-gate PRs merging meanwhile → rebase on the base just before opening the PR and re-run `pnpm install --frozen-lockfile`.
