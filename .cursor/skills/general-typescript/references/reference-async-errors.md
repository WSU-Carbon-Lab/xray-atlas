# Async and errors

## Promises

- **`async` functions**: every code path should either **`await`** relevant promises or **`return`** them intentionally for the caller to handle.
- **Floating promises** at the top level or in event handlers should be **`await`ed**, chained with **`.catch`**, or prefixed with **`void`** only when fire-and-forget is explicit and safe (document why).

## Boundaries

- Prefer a **thin async shell** around a **synchronous core** when business rules are easier to test without timers and I/O.
- **Batch concurrent work** with **`Promise.all`** (or **`Promise.allSettled`** when partial failure is expected) instead of sequential **`await`** when independence is guaranteed.

## Errors

- **`throw`**: document or type **expected** failures on public APIs; avoid catching **`unknown`** and rethrowing without context when debugging production issues.
- **User input and external I/O**: validate at the boundary; narrow types before calling deeper layers.
