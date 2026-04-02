# searchParams patterns

## Server Components

- `page.tsx` receives **`searchParams`** as a **Promise** (Next.js 15+) or a plain object (earlier versions)—match the **installed** Next types and docs for this repo.
- Parse with **Zod** in a small function: `parseProductListSearchParams(searchParams)` returning typed **`{ q, page, sort }`** or a **safe fallback** on parse failure (redirect or default view).

## Client navigation

- Building links: **`href={`/items?${new URLSearchParams({...})}`}`** or a typed builder that shares the Zod schema’s keys.
- After navigation, **server** **RSC** refetches with new params when using **full navigation**; for **shallow** patterns follow project conventions.

## nuqs and helpers

- If the repo uses **nuqs** or similar, **define** the canonical schema once and avoid duplicating key strings in random components.

## Auth and URLs

- Unauthenticated users hitting a **protected** URL: redirect to **login** with **`callbackUrl`** (validated) when the product supports return navigation.
