# Generics and inference

## Constraints

- Write **`<T extends SomeBound>`** when **`T`** must have certain keys or methods; the bound should be the **minimal** useful interface.

## Defaults

- **`<T = Default>`** when a type parameter is usually one type but sometimes specialized.

## Inference

- Let **TypeScript infer** from arguments when possible; add **explicit type arguments** only when inference **widens** too far or fails.

## Complexity budget

- **Conditional types** and **mapped types** are powerful; prefer **named type aliases** and **small helpers** so **`tsc` errors** remain readable for the next contributor.

## `const` type parameters

- **`function f<const T>(...)`** (when supported by the project’s TS version) can preserve **literal** types through generic inference where appropriate.
