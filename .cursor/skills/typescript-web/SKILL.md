---
author: dotagents
name: typescript-web
description: T3 Next.js App Router umbrella: stack roles, src/ layout, RSC vs client, HeroUI-only UI, globals.css theme authority. Load web-trpc-api, web-url-search-state, heroui-components for depth; general-typescript for Bun and TS.
---

When this skill applies:

- Follow the **typescript-web** spec (T3): **Next.js App Router**, **tRPC**, **Prisma**, **Zod**, **Tailwind**, **HeroUI** only.
- Load **general-typescript** for **Bun**, **strict TS**, **ESM**, **async**, and **tests**.
- For **data and API**: **web-trpc-api** (auth, Zod, procedures, REST bridge).
- For **bookmarkable filters and search**: **web-url-search-state**.
- For **HeroUI and theme**: **heroui-components**.
- For **deep types** at Zod/tRPC boundaries: **typescript-types**.
- **`globals.css`** + **HeroUI** theme are the **style** source of truth; extend **tokens** before arbitrary colors.
- **Server Components** by default; **`use client`** at **leaves**; **Prisma** and **session** only on **server**.
- Use **`src/`** roles: **app**, **features**, **components**, **server**, **lib**, **utils**, **common**, **styles** as in the spec.

Subagents when a focused pass helps: **web-ui-reviewer**, **web-api-reviewer**, **heroui-implementation**.
