---
author: dotagents
name: web-trpc-api
description: tRPC procedures with auth context, Zod inputs, query vs mutation semantics, Prisma on server, error mapping, and optional Next.js REST route handlers that share validation. For T3 Next.js apps. Triggers on tRPC, router, procedure, protectedProcedure, prisma, zod, app/api route.ts.
---

# Web tRPC and API

Use with **typescript-web** spec and **web-trpc-api** Cursor rule. **general-typescript** covers Bun and language hygiene.

## Principles

1. **Context first**: build **tRPC context** from the incoming request (session, user id, tenant). Every procedure that touches user-owned data reads auth from **context**, not from client-supplied “current user id” alone.
2. **Zod at the edge**: `.input(z.object(...))` (and `.output` when the team enforces it). Share **input schemas** with forms or URL parsers when the same shape appears in multiple places.
3. **Query vs mutation**: **queries** for reads (repeatable, no lasting writes). **mutations** for writes. Name procedures so intent is obvious (`listX`, `getById`, `createX`, `updateX`, `deleteX`).
4. **Authorization**: authenticate, then **authorize** per resource (row-level, tenant, role). Reject with **`FORBIDDEN`** or **`NOT_FOUND`** (when hiding existence) per product policy.
5. **Errors**: map domain failures to **tRPC** codes; log server details without sending them to the client.
6. **REST coexistence**: if **`route.ts`** exposes HTTP for the same domain, reuse **Zod** + domain functions; keep **GET** read-only and align status codes (401/403/404/422) with your HTTP helper conventions.

## Reference index

| Topic | File |
|--------|------|
| Procedures, context, auth patterns | [reference-procedures-auth.md](references/reference-procedures-auth.md) |
| REST bridge, HTTP semantics | [reference-rest-bridge.md](references/reference-rest-bridge.md) |

## Delegation

- **URL-only** concerns: **web-url-search-state**.
- **HeroUI / TSX**: **heroui-components**.
- **Pure TypeScript** types: **typescript-types**.
