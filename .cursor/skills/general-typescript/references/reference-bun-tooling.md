# Bun tooling

## Package management

- **`bun install`**: sync dependencies from `package.json` into `node_modules` and update the lockfile when manifests change.
- **`bun add <pkg>`**: add a runtime dependency; **`bun add -d <pkg>`** for devDependencies.
- **`bun add <pkg>@<range>`** or **`@latest`**: upgrade or pin intentionally; avoid editing `package.json` version fields by hand for routine bumps.
- **`bun remove <pkg>`**: remove a dependency and update the lockfile.

## Scripts and execution

- **`bun run <name>`**: run a script from `package.json` **`scripts`**; no need to prefix with `npm run`.
- **`bun <path.ts>`**: run TypeScript directly when the project allows script-style entrypoints (check repo docs).

## Ad-hoc CLIs

- **`bunx <package> <args>`**: execute a package binary without a global install; prefer matching the version the repo pins when reproducibility matters.

## Tests

- **`bun test`**: native test runner when the project standardizes on it; discover tests via project conventions (glob config in `bunfig` or `package.json`).

## Monorepos

- Use **`workspaces`** as defined in the root `package.json`. To add a dependency to a specific member, **`cd`** into that package and run **`bun add`** there, unless the repository documents a different wrapper script. **`bun install --filter`** can scope installation to matching workspace packages when the project uses it in CI or docs.

## CI

- Prefer **`bun install --frozen-lockfile`** (or the project’s equivalent) so CI does not rewrite `bun.lock`.
