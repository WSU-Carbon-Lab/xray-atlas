# Human Interface Guidelines: Icons and Symbols

Based on [Apple Human Interface Guidelines: Icons and Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

Icons communicate meaning quickly and universally - use them thoughtfully and consistently.

## Core Principles

1. **Clarity** - Icons must be immediately recognizable
2. **Consistency** - Use the same icon for the same action throughout
3. **Simplicity** - Avoid overly detailed or decorative icons
4. **Accessibility** - Always provide text alternatives

## Icon Libraries

### Recommended Libraries

```tsx
// Primary: Lucide React (fork of Feather, actively maintained)
import { Download, Search, Settings } from 'lucide-react';

// Secondary: Heroicons (by Tailwind team)
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

// Custom: Project-specific icons
import { WSULogoIcon } from '~/app/components/icons';
```

### Choosing Between Libraries

| Use Case | Library | Style |
|----------|---------|-------|
| General UI | Lucide React | Outline |
| Status/filled | Heroicons Solid | Filled |
| Brand/custom | Custom SVG | Varies |

## Icon Sizing

### Standard Size Scale

```tsx
const iconSizes = {
  xs: "h-3 w-3",   // 12px - inline with small text
  sm: "h-4 w-4",   // 16px - buttons, inputs
  md: "h-5 w-5",   // 20px - default, navigation
  lg: "h-6 w-6",   // 24px - prominent icons
  xl: "h-8 w-8",   // 32px - feature icons
  "2xl": "h-10 w-10", // 40px - empty states
  "3xl": "h-12 w-12", // 48px - hero icons
};
```

### Size by Context

```tsx
// Inline with text - match text size
<span className="inline-flex items-center gap-1 text-sm">
  <InfoIcon className="h-4 w-4" />
  <span>Help text</span>
</span>

// In buttons
<button className="inline-flex items-center gap-2 px-4 py-2">
  <DownloadIcon className="h-4 w-4" />
  <span>Download</span>
</button>

// Icon-only buttons (need larger touch target)
<button className="p-2 rounded-lg" aria-label="Settings">
  <SettingsIcon className="h-5 w-5" />
</button>

// Empty states
<div className="text-center py-12">
  <SearchIcon className="h-12 w-12 mx-auto text-gray-400" />
  <p className="mt-4 text-gray-500">No results found</p>
</div>
```

## Icon Accessibility

### Always Provide Labels

```tsx
// Icon-only button - MUST have aria-label
<button 
  aria-label="Close dialog" 
  className="p-2 rounded-lg hover:bg-gray-100"
>
  <XIcon className="h-5 w-5" />
</button>

// Icon with visible text - icon is decorative
<button className="inline-flex items-center gap-2">
  <DownloadIcon className="h-4 w-4" aria-hidden="true" />
  <span>Download</span>
</button>

// Informational icon - needs accessible description
<span className="inline-flex items-center gap-1">
  <WarningIcon 
    className="h-4 w-4 text-amber-500" 
    aria-label="Warning"
  />
  <span>This action cannot be undone</span>
</span>
```

### Screen Reader Considerations

```tsx
// Hide decorative icons from screen readers
<Icon aria-hidden="true" />

// Or in SVG
<svg role="img" aria-hidden="true">...</svg>

// Meaningful icons need description
<svg role="img" aria-label="Error status">...</svg>
```

## Icon Colors

### Using currentColor

```tsx
// Icons inherit text color via currentColor
<button className="text-gray-600 hover:text-gray-900">
  <SettingsIcon className="h-5 w-5" /> {/* Inherits text color */}
</button>

// Explicit color when needed
<CheckIcon className="h-5 w-5 text-green-500" />
<XIcon className="h-5 w-5 text-red-500" />
```

### Dark Mode Adaptation

```tsx
// Icons should adapt to dark mode
className="text-gray-600 dark:text-gray-400"

// Status colors adapt
className="text-green-600 dark:text-green-400"
className="text-red-600 dark:text-red-400"

// Accent icons
className="text-accent dark:text-accent-light"
```

### Multi-Color Icons

```tsx
// For icons with multiple colors, define explicitly
function StatusIcon({ status }: { status: 'success' | 'error' }) {
  return (
    <svg className="h-5 w-5">
      <circle 
        cx="10" cy="10" r="8" 
        className={status === 'success' 
          ? 'fill-green-100 dark:fill-green-900' 
          : 'fill-red-100 dark:fill-red-900'
        }
      />
      <path 
        d="..." 
        className={status === 'success'
          ? 'stroke-green-600 dark:stroke-green-400'
          : 'stroke-red-600 dark:stroke-red-400'
        }
      />
    </svg>
  );
}
```

## Icon Placement

### Alignment with Text

```tsx
// Vertically center with text
<div className="flex items-center gap-2">
  <Icon className="h-5 w-5" />
  <span>Label text</span>
</div>

// Baseline alignment for mixed sizes
<div className="flex items-baseline gap-1">
  <Icon className="h-4 w-4 self-center" />
  <span className="text-lg">Large text</span>
</div>
```

### Leading vs Trailing Icons

```tsx
// Leading icon - indicates action type
<button className="inline-flex items-center gap-2">
  <PlusIcon className="h-4 w-4" />
  <span>Add Item</span>
</button>

// Trailing icon - indicates state or navigation
<button className="inline-flex items-center gap-2">
  <span>Menu</span>
  <ChevronDownIcon className="h-4 w-4" />
</button>

// Both - sparingly
<button className="inline-flex items-center gap-2">
  <DocumentIcon className="h-4 w-4" />
  <span>Export PDF</span>
  <ArrowDownTrayIcon className="h-4 w-4" />
</button>
```

## Common Icon Patterns

### Navigation Icons

```tsx
// Consistent navigation icons
const navIcons = {
  home: HomeIcon,
  search: SearchIcon,
  settings: SettingsIcon,
  profile: UserIcon,
  menu: MenuIcon,
  close: XIcon,
  back: ArrowLeftIcon,
  forward: ArrowRightIcon,
};
```

### Action Icons

```tsx
// Standard action icons
const actionIcons = {
  add: PlusIcon,
  edit: PencilIcon,
  delete: TrashIcon,
  save: CheckIcon,
  cancel: XIcon,
  download: ArrowDownTrayIcon,
  upload: ArrowUpTrayIcon,
  share: ShareIcon,
  copy: ClipboardIcon,
  refresh: ArrowPathIcon,
};
```

### Status Icons

```tsx
// Status indicators
const statusIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  loading: SpinnerIcon,
};

// Usage with semantic colors
<CheckCircleIcon className="h-5 w-5 text-green-500" />
<XCircleIcon className="h-5 w-5 text-red-500" />
<ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
<InformationCircleIcon className="h-5 w-5 text-blue-500" />
```

## Icon Buttons

### Proper Touch Targets

```tsx
// Icon buttons need adequate padding for touch
<button 
  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
  aria-label="Settings"
>
  <SettingsIcon className="h-5 w-5" />
</button>

// Minimum touch target: 44x44px
// Icon: 20x20px + padding: 8px each side = 36px (needs more)
// Better: p-3 (12px each side) = 44px total
<button className="p-3 rounded-lg" aria-label="Settings">
  <SettingsIcon className="h-5 w-5" />
</button>
```

### Icon Button States

```tsx
className={`
  p-2 rounded-lg
  transition-colors duration-150
  
  // Default
  text-gray-500 dark:text-gray-400
  
  // Hover
  hover:text-gray-700 dark:hover:text-gray-200
  hover:bg-gray-100 dark:hover:bg-gray-800
  
  // Focus
  focus-visible:ring-2 focus-visible:ring-accent
  focus-visible:ring-offset-2
  
  // Active
  active:bg-gray-200 dark:active:bg-gray-700
  
  // Disabled
  disabled:opacity-50 disabled:pointer-events-none
`}
```

## Animated Icons

### Loading Spinner

```tsx
// Simple spin animation
<svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
  <circle 
    cx="12" cy="12" r="10" 
    stroke="currentColor" 
    strokeWidth="4" 
    fill="none" 
    className="opacity-25"
  />
  <path 
    fill="currentColor" 
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    className="opacity-75"
  />
</svg>
```

### Icon Transitions

```tsx
// Rotate on state change
<ChevronDownIcon 
  className={`h-4 w-4 transition-transform duration-200 ${
    isOpen ? 'rotate-180' : ''
  }`}
/>

// Swap icons with crossfade
<div className="relative h-5 w-5">
  <SunIcon className={`absolute inset-0 transition-opacity ${
    isDark ? 'opacity-0' : 'opacity-100'
  }`} />
  <MoonIcon className={`absolute inset-0 transition-opacity ${
    isDark ? 'opacity-100' : 'opacity-0'
  }`} />
</div>
```

## Custom SVG Icons

### Creating Custom Icons

```tsx
// Follow consistent structure
function CustomIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M..." />
    </svg>
  );
}
```

### Icon Component Pattern

```tsx
// icons.tsx - centralized icon exports
export { 
  Home as HomeIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from 'lucide-react';

export { WSULogoIcon } from './custom/WSULogoIcon';

// Re-export with consistent naming
import { BoltIcon as HeroBoltIcon } from '@heroicons/react/24/outline';
export const BoltIcon = HeroBoltIcon;
```

## Implementation Checklist

- [ ] Using consistent icon library throughout
- [ ] Icon sizes from standard scale (h-4, h-5, h-6)
- [ ] All icon buttons have aria-label
- [ ] Decorative icons have aria-hidden="true"
- [ ] Icons use currentColor for color inheritance
- [ ] Dark mode colors properly defined
- [ ] Touch targets meet 44px minimum
- [ ] Focus states visible on icon buttons
- [ ] Loading states use consistent spinner
- [ ] Icon-only buttons have visible labels on hover/focus
- [ ] Custom icons follow same structure as library icons

## Related Apple HIG Resources

- [SF Symbols Overview](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)
- [App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Custom Icons](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Custom-symbols)
- [Icon Rendering](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Rendering-modes)
