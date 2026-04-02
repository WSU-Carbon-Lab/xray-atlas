# HeroUI imports and theme

## Imports

- Prefer **`import { Button, Input, ... } from "@heroui/react"`** for v3.
- Align **types** with the same entry (`import type { ButtonProps } from "@heroui/react"`).
- When migrating from **`@heroui/button`**-style packages, consolidate to **`@heroui/react`** if types and runtime match.

## Theme provider

- Keep the app’s **ThemeProvider** (or equivalent) at the **root layout** as the project already does; do not strip **HeroUI** theme context from subtrees without a reason.

## Tailwind

- Use **utility classes** for **layout** and **spacing**; use **semantic** color utilities that map to **theme variables** (`text-foreground`, project token names).
- Avoid **overriding** HeroUI **internal** colors in ways that break **dark mode**; fix **tokens** instead.

## Focus and labels

- Wire **`id`**, **`htmlFor`**, **`aria-*`**, and **`isRequired`** (or equivalent) per HeroUI docs; pair with visible **labels** for forms.
