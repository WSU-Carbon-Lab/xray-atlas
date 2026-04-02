# REST route handlers alongside tRPC

## When to use `route.ts`

- **Webhooks**, **OAuth callbacks**, **file uploads** to storage, **third-party integrations**, or **clients that cannot use tRPC**.
- Avoid a **parallel** REST surface for the **same** app UI resources unless migrating; prefer **one** primary contract (tRPC) and extract **shared** domain + Zod into modules both can call.

## HTTP mapping

- **GET**: read-only; **no** body mutations to persistent state.
- **POST**: create or non-idempotent actions.
- **PUT** / **PATCH**: updates; document idempotency expectations.
- **DELETE**: removal; confirm authz and side effects.

## Consistency

- Parse **JSON body** and **search params** with **Zod** before logic.
- Return **JSON** error shapes consistent with the rest of the app (stable `code` / `message` fields if the repo defines them).
- Apply the **same authorization** rules as the equivalent tRPC procedure would.

## Status codes

- **401** unauthenticated, **403** authenticated but forbidden, **404** missing or hidden resource, **422** validation failure, **409** conflict, **500** only for unexpected server failures (log internally).
