---
author: dotagents
name: web-url-search-state
description: Next.js App Router URL search state: Zod schemas for searchParams, shareable list/filter URLs, sync with Link and router, SSR-friendly patterns. Triggers on searchParams, nuqs, URL, query string, bookmark.
---

# URL and search state

Use with **typescript-web** spec. Complements **web-trpc-api** (server data) by defining **what** the user can put in the address bar.

## Principles

1. **Single schema**: one **Zod** schema (or composed schemas) per route pattern for **`searchParams`**; reuse for client navigations when possible.
2. **Defaults**: apply **defaults** after parse so omitted keys behave predictably; document defaults in one place.
3. **Stable keys**: prefer short, stable query names; version or namespace if multiple features share a page (`filter.status`, `tab`).
4. **SSR**: read **`searchParams`** on the **server** in `page.tsx` for the initial HTML; client updates should **push** the same shape via **`Link`** or **`useRouter`** (or the project’s URL-state library).
5. **Secrets**: never put **tokens** or **PII** in query strings.
6. **Size**: keep URLs reasonably short; offload **large** filter state to session or server-backed prefs when the product requires it.

## Reference index

| Topic | File |
|--------|------|
| Parsing, navigation, RSC | [reference-search-params.md](references/reference-search-params.md) |

## Delegation

- **tRPC** procedure design: **web-trpc-api**.
- **Form-only** state that must not be shared: keep in **React state**; do not force into URL.
