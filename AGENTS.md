# Agent Memory

## Learned User Preferences

- Prefer Tailwind component classes or `@layer components` patterns for reusable styling instead of constants that store classname strings.

## Learned Workspace Facts

- Use the theme provider and Hero UI v3 theming consistently across contribute and browse pages; use accent colors from the setup, not removed brand tokens (e.g. WSU crimson).
- Prefer Hero UI components over custom or other component sets for forms, tabs, buttons, and layout where applicable.
- When using HeroUI Tabs with controlled selectedKey, defer parent setState from onSelectionChange (e.g. queueMicrotask) and pass stable callbacks (useCallback) to avoid React "Maximum update depth exceeded" from React Aria commit-phase updates.
- NEXAFS CSV/JSON upload: treat header "mu" as absorption column; guard against undefined parsed.data and csvRawData (e.g. Array.isArray) before using .length.

