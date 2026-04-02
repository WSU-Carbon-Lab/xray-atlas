---
author: dotagents
name: heroui-components
description: HeroUI as the only component library: v3 imports from @heroui/react, theme tokens from globals.css, Tailwind composition without fighting HeroUI variants, forms and accessibility hooks. Triggers on HeroUI, heroui, Button, Input, Modal, TSX UI.
---

# HeroUI components

Use with **typescript-web** spec and **heroui-theme** rule. **web-accessibility** rule covers baseline a11y.

## Principles

1. **HeroUI only** for interactive primitives: do not add **MUI**, **Chakra**, **Radix-as-primary**, or duplicate kits.
2. **Version**: prefer **v3** and **`@heroui/react`** imports when the repo pins v3; use legacy subpath imports only when v3 lacks the component and the gap is documented.
3. **Theme**: use **CSS variables** and **Tailwind** tokens defined in **`globals.css`** / HeroUI theme; add **tokens** instead of arbitrary colors on each screen.
4. **Compound components**: follow HeroUI **compound** APIs (`Select.Trigger`, etc.); do not fight internal structure with conflicting **`className`** overrides—use **slots** / **variants** when the library provides them.
5. **Native HTML**: prefer HeroUI **`Input`**, **`Select`**, **`Button`** over raw **`<input>`** for app UI unless a documented exception (e.g. file inputs where the team standardizes native).
6. **Client boundary**: files that use hooks, event handlers, or browser APIs need **`"use client"`** at the top; keep **server** parents passing **serializable** props.

## Reference index

| Topic | File |
|--------|------|
| Imports, theme, Tailwind coexistence | [reference-theme-imports.md](references/reference-theme-imports.md) |

## Delegation

- **tRPC / data**: **web-trpc-api**.
- **URL state**: **web-url-search-state**.
- **Full UI review pass**: **web-ui-reviewer** subagent.
