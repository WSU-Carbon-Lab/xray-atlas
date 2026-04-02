# tRPC procedures and authentication

## Context

- Create context once per request: session, database handle, logger, feature flags.
- Pass **only** what procedures need; avoid putting large mutable objects on context.

## Procedure types

- **Public** procedures: documented unauthenticated reads (marketing data, public configs) with **no** user data leakage.
- **Protected** procedures: require a valid session; return **`UNAUTHORIZED`** when missing.
- **Role or permission** checks belong **inside** the procedure after session exists, using **resource** identifiers from **validated input**, not from unchecked client fields.

## Input validation

- Use **Zod** for every argument shape; coerce **strings** from query-like inputs carefully (dates, numbers) with explicit schemas.
- Reject unknown keys when strictness helps security (`z.object({...}).strict()` where appropriate).

## Data access

- Call **Prisma** only from server-side code invoked by procedures (or shared domain modules they call).
- Use **transactions** for multi-step writes that must succeed or roll back together.
- Select **minimal** columns for list views; avoid **N+1** (`include` vs separate queries—choose per repo performance rules).

## Errors

- **Validation**: `BAD_REQUEST` with safe, field-level messages when the client can act on them.
- **Auth**: `UNAUTHORIZED` (not signed in), `FORBIDDEN` (signed in but not allowed).
- **Missing resource**: `NOT_FOUND` when appropriate; avoid confirming existence of private resources to unauthorized callers.
- **Conflict**: `CONFLICT` for uniqueness or version conflicts.
