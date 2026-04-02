---
author: dotagents
name: general-typescript
description: TypeScript hub for Bun workflows, tsconfig and tsc, interface vs type vs enum, no any, unknown only with explicit user approval, ESM, lint/format, Vitest or Bun test, JSDoc or TSDoc, delegation to typescript-types. Triggers on TypeScript, interface, type, enum, any, unknown, Bun, tsc, eslint.
---

# General TypeScript

This skill is the **hub** for conventions that come from the project **TypeScript** section (often merged into **AGENTS.md**), the **TypeScript Cursor rule** on `**/*.{ts,tsx}`, and the **typescript-reviewer** / **typescript-types** / **typescript-refactor** subagents. Load topic files below instead of drifting from project defaults.

## Synergy map

| Source | Role |
|--------|------|
| **TypeScript spec** (AGENTS.md block) | Bun, strict TS, interface/type/enum, no `any`, `unknown` policy, modules, async, testing, JSDoc/TSDoc |
| **TypeScript rule** | Globs TS/JS: Bun commands, strict typing, imports, floating promises |
| **typescript-reviewer** | Post-change review: lockfile, types, async, tests |
| **typescript-types** | Deep typing: unions, generics, exhaustive handling, `tsc` |
| **typescript-refactor** | Structure: cycles, barrels, module size, layering |
| **typescript-web** / **typescript-cli** | Framework or CLI-specific stacks when installed |

## Quick decisions

1. **Dependencies (Bun)**: `bun add` / `bun remove` / `bun install`. Do not hand-edit version ranges in `package.json` for routine changes. See [reference-bun-tooling.md](references/reference-bun-tooling.md).
2. **Typecheck**: project `tsc --noEmit` or equivalent on touched code. See [reference-tsconfig-quality.md](references/reference-tsconfig-quality.md).
3. **Modules**: ESM-first, avoid cycles; prefer explicit exports. See [reference-modules-imports.md](references/reference-modules-imports.md).
4. **Async**: no silent floating promises; intentional `void` only where documented. See [reference-async-errors.md](references/reference-async-errors.md).
5. **Tests**: one primary runner (Bun test or Vitest, etc.). See [reference-testing.md](references/reference-testing.md).
6. **Public APIs**: stable explicit types; JSDoc/TSDoc if the repo uses them. See [reference-tsconfig-quality.md](references/reference-tsconfig-quality.md).
7. **Types**: `interface` vs `type` vs `enum`; **never `any`**; **`unknown` only if the user explicitly allows it** on that boundary. See [reference-interfaces-types-enums-unknown.md](references/reference-interfaces-types-enums-unknown.md).

## Reference index

| Topic | File |
|--------|------|
| interface, type, enum, `any`, `unknown` | [reference-interfaces-types-enums-unknown.md](references/reference-interfaces-types-enums-unknown.md) |
| Bun install, add, run, test, bunx, workspaces | [reference-bun-tooling.md](references/reference-bun-tooling.md) |
| tsconfig strictness, tsc, lint and format stack | [reference-tsconfig-quality.md](references/reference-tsconfig-quality.md) |
| ESM, barrels, cycles, import placement | [reference-modules-imports.md](references/reference-modules-imports.md) |
| Promises, async boundaries, errors | [reference-async-errors.md](references/reference-async-errors.md) |
| Vitest, Bun test, mocks, determinism | [reference-testing.md](references/reference-testing.md) |

## External anchors

- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Bun documentation](https://bun.sh/docs)
- [typescript-eslint](https://typescript-eslint.io/)

## Modern practice snapshot

Strict **`tsconfig`**, **locked installs**, a single **test runner**, and **ESLint** (or **Biome**) integrated in CI keep TypeScript codebases maintainable; **explicit module boundaries** beat large barrel graphs for large repos. See [reference-modules-imports.md](references/reference-modules-imports.md).
