# Human Interface Guidelines: Dark Mode

Based on [Apple Human Interface Guidelines: Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)

Dark Mode is a system-wide appearance setting that uses a dark color palette to provide a comfortable viewing experience tailored for low-light environments.

## Core Principles

1. **Focus on content** - Dark backgrounds let content stand out
2. **Maintain contrast** - Ensure readability with proper contrast ratios
3. **Use semantic colors** - Colors should adapt automatically
4. **Test in both modes** - Every screen must work in light and dark

## Background Colors

### Use True Dark, Not Pure Black

```typescript
// Recommended dark background hierarchy
const darkBackgrounds = {
  base: "#0f172a",      // Slate 900 - main background
  elevated: "#1e293b",  // Slate 800 - cards, modals
  overlay: "#334155",   // Slate 700 - dropdowns, popovers
};

// Avoid pure black (#000000) - too harsh
// Exception: OLED optimization where true black is intentional
// OLED-optimized dark background hierarchy
const oledDarkBackgrounds = {
  base: "#000000",      // Pure black for main background
  elevated: "#18181b",  // Slightly raised surfaces (zinc 900)
  overlay: "#27272a",   // Further elevated surfaces (zinc 800)
};

```

### Surface Elevation

In dark mode, elevation is communicated through lighter surfaces:

```tsx
// Base level - darkest
<div className="bg-slate-900">

  // Elevated - slightly lighter
  <div className="bg-slate-800">

    // More elevated - even lighter
    <div className="bg-slate-700">
    </div>
  </div>
</div>

// Light mode uses shadows instead
<div className="bg-white shadow-sm">
  <div className="bg-white shadow-md">
    <div className="bg-white shadow-lg">
    </div>
  </div>
</div>
```

### Combined Pattern

```tsx
// Card that works in both modes
className={`
  bg-white dark:bg-slate-800
  shadow-lg dark:shadow-none
  border border-gray-200 dark:border-slate-700
`}
```

## Text Colors

### Maintain Readable Contrast

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary text | `#0f172a` | `#f8fafc` |
| Secondary text | `#475569` | `#cbd5e1` |
| Tertiary text | `#94a3b8` | `#64748b` |
| Disabled text | `#cbd5e1` | `#475569` |

```tsx
// Always pair light and dark variants
className="text-gray-900 dark:text-gray-100"
className="text-gray-600 dark:text-gray-400"
className="text-gray-400 dark:text-gray-500"
```

### Avoid Pure White Text

```tsx
// Bad: Pure white can be too harsh
className="dark:text-white"

// Good: Slightly off-white for comfort
className="dark:text-gray-100"
className="dark:text-slate-100"
```

## Color Adaptation

### System Colors Automatically Adapt

```tsx
// Semantic colors that adapt
className="text-primary"      // Adapts automatically
className="bg-surface"        // Adapts automatically
className="border-default"    // Adapts automatically
```

### Manual Adaptation for Custom Colors

```tsx
// Accent colors need explicit dark variants
className="text-accent dark:text-accent-light"
// #6366f1 (light) -> #818cf8 (dark)

// Status colors adapt for visibility
className="text-red-600 dark:text-red-400"
className="text-green-600 dark:text-green-400"
className="text-amber-600 dark:text-amber-400"
```

### Inverted Colors

Some elements need inverted treatment in dark mode:

```tsx
// Badges/tags might invert
<span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
  Tag
</span>

// Code blocks might use inverted theme
<code className="bg-gray-100 dark:bg-gray-800">
  {code}
</code>
```

## Borders and Dividers

### Subtle Borders in Dark Mode

```tsx
// Borders should be subtle
className="border-gray-200 dark:border-gray-700"
className="border-gray-300 dark:border-gray-600"

// Dividers
className="divide-gray-200 dark:divide-gray-700"

// Focus rings adapt
className="focus:ring-accent dark:focus:ring-accent-light"
```

### Border Visibility

```tsx
// Sometimes borders are more visible in dark mode
className={`
  border
  border-gray-200 dark:border-gray-700
  hover:border-gray-300 dark:hover:border-gray-600
`}
```

## Images and Media

### Adapt Images for Dark Mode

```tsx
// Different images for each mode
<picture>
  <source
    srcSet="/logo-dark.svg"
    media="(prefers-color-scheme: dark)"
  />
  <img src="/logo-light.svg" alt="Logo" />
</picture>

// Or with Tailwind
<img
  src="/logo-light.svg"
  className="dark:hidden"
  alt="Logo"
/>
<img
  src="/logo-dark.svg"
  className="hidden dark:block"
  alt="Logo"
/>
```

### Reduce Brightness of Full-Color Images

```tsx
// Slightly dim images in dark mode to reduce eye strain
className="dark:brightness-90"

// Or for very bright images
className="dark:brightness-75 dark:contrast-125"
```

### SVG Icons Adaptation

```tsx
// Icons using currentColor adapt automatically
<svg className="text-gray-600 dark:text-gray-400" fill="currentColor">
  ...
</svg>

// For multi-color icons, provide variants
<Logo className="fill-gray-900 dark:fill-white" />
```

## Shadows and Depth

### Shadows Are Less Visible in Dark Mode

```tsx
// In light mode, shadows provide depth
// In dark mode, use lighter surfaces or borders instead

className={`
  // Light mode: shadow
  shadow-lg

  // Dark mode: no shadow, border instead
  dark:shadow-none
  dark:border dark:border-gray-700
`}

// Or use very subtle shadows with opacity
className="shadow-lg dark:shadow-2xl dark:shadow-black/20"
```

### Glow Effects for Dark Mode

```tsx
// Glows can replace shadows in dark mode
className={`
  shadow-lg
  dark:shadow-none
  dark:ring-1 dark:ring-white/10
`}

// Accent glow for interactive elements
className="dark:hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
```

## Form Controls

### Input Fields

```tsx
className={`
  // Background
  bg-white dark:bg-slate-800

  // Border
  border border-gray-300 dark:border-gray-600

  // Text
  text-gray-900 dark:text-gray-100

  // Placeholder
  placeholder:text-gray-400 dark:placeholder:text-gray-500

  // Focus
  focus:ring-accent dark:focus:ring-accent-light
  focus:border-accent dark:focus:border-accent-light
`}
```

### Checkboxes and Radios

```tsx
className={`
  // Unchecked
  bg-white dark:bg-slate-700
  border-gray-300 dark:border-gray-500

  // Checked
  checked:bg-accent dark:checked:bg-accent-light
  checked:border-accent dark:checked:border-accent-light
`}
```

## Implementation with next-themes

### Setup

```tsx
// layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Theme Toggle

```tsx
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <SunIcon className="h-5 w-5 dark:hidden" />
      <MoonIcon className="h-5 w-5 hidden dark:block" />
    </button>
  );
}
```

### Respecting System Preference

```tsx
// Default to system preference
<ThemeProvider attribute="class" defaultTheme="system">

// Check system preference in JS
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

## Testing Checklist

- [ ] All text meets contrast requirements in both modes
- [ ] No pure black (#000) or pure white (#fff) backgrounds
- [ ] Borders are visible but subtle in dark mode
- [ ] Images adapted or dimmed for dark mode
- [ ] Shadows replaced with borders/elevation in dark mode
- [ ] Focus states visible in both modes
- [ ] Form controls properly styled for both modes
- [ ] Data visualizations readable in both modes
- [ ] No hard-coded colors that don't adapt
- [ ] Theme toggle works correctly
- [ ] System preference is respected by default

## Related Apple HIG Resources

- [Dark Mode Overview](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Color in Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Colors)
- [Materials and Vibrancy](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Appearances](https://developer.apple.com/design/human-interface-guidelines/color#Specifications)
