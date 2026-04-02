# Unions, narrowing, exhaustiveness

## Discriminated unions

- Every variant carries the same **discriminant** field with a **string literal** (or enum) type unique to that variant.
- Narrow with **`switch (x.kind)`** or **`if (x.kind === "a")`** so **TypeScript** refines **`x`** in each branch.

## Exhaustive handling

- After all known variants, a final branch should take **`never`** (for example **`default`** with **`const _exhaustive: never = x`** or a **`assertNever(x)`** helper) so adding a variant **breaks compilation** until handled.

## Optional and nullable

- Prefer **`undefined`** for “missing” when the codebase standardizes on it; be consistent with **`strictNullChecks`**.
- Use **optional chaining** and **nullish coalescing** when they clarify intent; avoid redundant checks that duplicate narrowed types.

## `unknown` from boundaries

- Narrow with **`typeof`**, **`instanceof`**, **discriminated unions**, or **validated schemas** before use; never assume shape without a check.
