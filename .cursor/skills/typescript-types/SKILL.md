---
author: dotagents
name: typescript-types
description: Deep TypeScript typing for discriminated unions, exhaustive handling, generics, satisfies, branding, and fixing tsc output without any or silent unknown on public APIs. Use when resolving complex type errors or designing type-heavy APIs. Pairs with general-typescript (no any; unknown only with explicit user approval). Triggers on generics, union, narrowing, exhaustive, satisfies, inference.
---

# TypeScript types

Use this skill when **`general-typescript`** is not enough: complex **generics**, **discriminated unions**, **inference** breaks, **`tsc` errors** that need structure changes, or **public type-heavy** APIs.

## When to use

- **`tsc`** reports errors involving **generics**, **indexed access**, **mapped types**, or **conditional types**.
- New **variants** of a union should force **compile-time** updates (exhaustive **`switch`** or **`if`/`else`** chains).
- You need **branded** or **opaque** nominal-style types on top of structural typing.
- **`any`** or **`unknown`** appears at a boundary and needs a **narrowing** strategy.

## Practices

1. **Discriminated unions**: a shared **literal discriminant** (`kind`, `type`, `tag`) on every variant; narrow with **`switch`** and **`assertNever`**-style exhaustiveness. See [reference-unions-exhaustive.md](references/reference-unions-exhaustive.md).
2. **Generics**: constrain with **`extends`**; avoid **unbounded** type parameters on public APIs when a minimal constraint exists; prefer **inference** from values before adding explicit type arguments. See [reference-generics-inference.md](references/reference-generics-inference.md).
3. **`satisfies`**: preserve **literal** types while checking assignability to a wider shape; use when **`as const` alone** is insufficient.
4. **Type guards**: user-defined predicates **`x is Foo`** only when the runtime check matches the type claim.
5. **Avoid widening fixes**: prefer **`satisfies`**, **helper generics**, or **splitting overloads** over **`as any`**, raw **`any`**, or **`@ts-expect-error`** without justification. **`unknown`** on an export requires **explicit user approval** per the TypeScript bundle spec—do not introduce it silently.

## Reference index

| Topic | File |
|--------|------|
| Unions, narrowing, exhaustive checks | [reference-unions-exhaustive.md](references/reference-unions-exhaustive.md) |
| Generics, inference, constraints | [reference-generics-inference.md](references/reference-generics-inference.md) |

## External anchors

- [TypeScript handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

## Delegation

If the change is mostly **Bun**, **eslint**, **test runner**, or **import graph** hygiene, use **`general-typescript`** instead; return here for **type-level** design and **`tsc`** fixes.
