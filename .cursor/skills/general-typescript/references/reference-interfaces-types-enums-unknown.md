# Interfaces, type aliases, enums, `any`, and `unknown`

## `interface` vs `type` (object shapes)

- **`interface`**: Prefer for **object-shaped contracts** that are primarily **property bags**—especially when **`implements`** is used with classes, or when you want a name that reads as a stable **public** surface. Multiple `interface` declarations with the same name **merge**; use that only when intentional (most app code should avoid merge surprises).
- **`type`**: Prefer when the shape is not “just an object”: **unions**, **intersections** of unions, **mapped types**, **conditional types**, **tuple** types, **template literal** types, or when you need **`type` = expression**-level composition that `interface` cannot express.

Rule of thumb: if it is **only** a record of fields and you might **`implements`** it, start with **`interface`**. If you need **`|`**, **`&`** with unions, or advanced type operators, use **`type`**.

## `enum`

- **Avoid numeric `enum`** unless the codebase already standardizes on them; they emit runtime objects and have reverse-mapping footguns.
- Prefer **`as const` object + `typeof` / union of values** for a closed set of strings:

```ts
const Status = { Open: "open", Done: "done" } as const;
type Status = (typeof Status)[keyof typeof Status];
```

- Use **`enum`** when the team explicitly wants a **named runtime namespace** (e.g. interop with a library that expects enums) or has documented enum style—still favor **string enums** over numeric when enums are used.

## `any` (disallowed)

- Do **not** use **`any`**. It disables the type checker and spreads unsoundness to callers.
- Prefer, in order: a **concrete** type, a **generic** with a constraint, a **discriminated union**, **`unknown`** **only** when the user has approved `unknown` at that boundary (see below), or a **narrow** `@ts-expect-error` with a **one-line justification** and a follow-up issue when there is truly no safe typing yet.

## `unknown` (explicit approval)

- **`unknown`** is the correct **top type** for “we must accept anything at runtime” **only** when the project or the **user** has explicitly allowed it for that boundary (e.g. generic JSON ingest, plugin payloads, untyped third-party hooks).
- Before introducing **`unknown`** on a **public** API (exported function parameters, library surface, shared context), **ask** or require the user to state that **`unknown` is acceptable** for that contract.
- Every **`unknown`** value must be **narrowed** (`typeof`, `zod` parse, custom type guard, discriminant checks) before use—no “cast through” to a concrete type without a justified check.

## Public API bar

- Exported functions and methods: prefer **explicit** parameter and return types; avoid **`any`** and avoid **`unknown`** on exports unless the user has approved **`unknown`** for that symbol.
