# @salla.sa/theme-raed

React storefront theme starter kit for [Salla](https://salla.sa) stores —
built with TanStack Start and Vite, rendered server-side in workerd via
`@salla.sa/twilight-theme-engine`.

## Quick start

Scaffold a new theme with the Salla CLI:

```bash
npx @salla.sa/cli@beta theme create
```

Or work directly inside a copy of this package:

```bash
pnpm install
pnpm dev
```

Running `salla theme dev` writes a `.env` with `VITE_STORE_DOMAIN`
(defaults to the demo store), which points the dev server at your store's data,
and `VITE_TWILIGHT_URL`, the fallback twilight SDK build used only when the
store's settings don't pin a release (`theme.twilight.version`).

## Scripts

| Script           | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the Vite dev server (workerd)  |
| `pnpm build`     | Production build                     |
| `pnpm preview`   | Preview the production build         |
| `pnpm typecheck` | TypeScript type checking             |
| `pnpm test`      | Run the test suite (Vitest)          |

## Deployment

Salla builds and publishes your theme on its own infrastructure — push to your
theme repository and the platform takes it from there. No deploy configuration,
credentials, or server runtime settings ship with this starter kit.
