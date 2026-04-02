# tsconfig, typecheck, lint, format

## Compiler

- Run **`tsc --noEmit`** (or the repo script, often **`typecheck`**) on changed packages before claiming work is done.
- Keep **`strict`** (or the project’s strict subset) enabled; fixing the underlying type is preferred over **`any`** (disallowed) or file-level **`@ts-nocheck`**. Prefer **`unknown`** only where the user or repo policy explicitly allows it on that boundary; narrow before use.
- **`verbatimModuleSyntax`** (when enabled): use **`import type`** / **`export type`** for type-only imports so emit stays correct under ESM.
- **`moduleResolution`**: follow the value already set (**`bundler`**, **`node16`**, **`nodenext`**) when adding new packages or subpath exports.

## Public APIs

- Exported functions and class methods: prefer **explicit return types** on the public surface so refactors do not silently widen contracts.
- Use **`satisfies`** when literal types must stay narrow without widening to a supertype.

## Lint and format

- **typescript-eslint** rules often encode footguns (floating promises, unsafe argument types); fix the code rather than disabling whole categories.
- Align **Prettier** or **Biome** with existing config; avoid reformatting unrelated files in a feature change.

## Documentation

- If the repo uses **JSDoc** or **TSDoc** on exports, match section order and tags already present in sibling modules.
