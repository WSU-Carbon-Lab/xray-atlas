# Modules and imports

## ESM

- Prefer **`"type": "module"`** when the project is ESM-native; respect **`.mts` / `.cts`** or **`package.json` `type`** boundaries when they exist.
- **`package.json` `exports`**: treat as the public graph for libraries; avoid deep imports that bypass `exports` unless the repo explicitly allows them.

## Import style

- **Static imports at the top** of the file; avoid inline dynamic `import()` except for lazy loading or genuine code splitting.
- **`import type`** for type-only symbols when **`verbatimModuleSyntax`** or team style requires it.

## Cycles

- **Circular imports** between implementation modules confuse both bundlers and inference; break cycles by introducing a small shared types module or pushing shared logic downward.
- **Barrel files** (`index.ts` that re-export many modules): convenient but can create cycles and slow typechecking; use for intentional package facades, not as a default for every folder.

## Resolution

- **`paths` in tsconfig**: use for internal aliases only when the build tool and runtime agree; avoid aliases that work in `tsc` but fail at runtime.
