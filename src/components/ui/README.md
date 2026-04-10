# UI component library (`src/components/ui`)

Small reusable primitives and chrome shared across routes.

## Color selection

Use **`HexColorSelector`** (`hex-color-selector.tsx`) for choosing a **six-digit hex** color when the control may live inside **Headless UI** `Dialog` / `SimpleDialog` or any environment where **stacked modal overlays misbehave**.

**Why not HeroUI `ColorPicker` here:** `ColorPicker` is built on React Aria `DialogTrigger` + a **modal `Popover`**. That clashes with Headless UI dialog **focus traps** and **inert** handling, so the color popover often fails to open or interact. `HexColorSelector` deliberately avoids overlay popovers: it uses the browser **`input[type=color]`** (system picker), a **paged preset carousel** (arrows, dots on their own row below swatches, **next** appends a new page of random swatches after the last static preset page, and **page size follows track width** via `ResizeObserver`), and **`parseColor` only for those random swatches** (comma-separated `hsl()`).

For full-spectrum UI inside non-modal surfaces, HeroUI `ColorPicker` remains appropriate.

Shared preset values: `~/lib/hex-color-presets` (`DISCORD_STYLE_HEX_COLOR_PRESETS`). Isolated tryout: `/sandbox/color-selector`.

**Admin favicon flow:** when a role favicon URL is entered or changed on `/admin/users`, `admin.sampleIconPrimaryHex` (tRPC query, `adminProcedure`) is invoked via `useUtils().admin.sampleIconPrimaryHex.fetch`; it fetches the image server-side (SSRF-filtered URL, size cap), decodes with `sharp`, runs `primaryHexFromRgbaBuffer` from `~/lib/extract-image-primary-hex`, and applies the resulting `#RRGGBB` to the role color field unless the user keeps the original stored URL unchanged in edit mode.
