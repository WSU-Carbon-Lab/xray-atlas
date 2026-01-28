# Human Interface Guidelines: Layout

Based on [Apple Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

Great layouts make content easy to understand and interact with, regardless of device or context.

## Core Principles

1. **Consistency** - Use consistent margins, spacing, and alignment
2. **Content-first** - Layout should serve the content, not the other way around
3. **Adaptability** - Layouts must work across all screen sizes
4. **Visual hierarchy** - Guide users through content with clear structure

## Spacing System

### Base Unit: 4px

All spacing should be multiples of 4px for visual consistency:

```typescript
const spacing = {
  0: "0px",
  1: "4px",    // Tight: related items
  2: "8px",    // Default: standard gap
  3: "12px",   // Comfortable
  4: "16px",   // Sections within component
  5: "20px",
  6: "24px",   // Component padding
  8: "32px",   // Between components
  10: "40px",
  12: "48px",  // Section separation
  16: "64px",  // Page sections
  20: "80px",
  24: "96px",  // Major divisions
};
```

### Spacing Guidelines

```tsx
// Tight: Related elements (labels and inputs)
<div className="space-y-1">
  <label>Energy</label>
  <input />
</div>

// Standard: Items in a list
<div className="space-y-2">
  {items.map(item => <Item key={item.id} />)}
</div>

// Comfortable: Card content
<div className="p-4 space-y-4">
  <h3>Title</h3>
  <p>Content</p>
</div>

// Generous: Page sections
<section className="py-12 md:py-16">
  <h2>Section Title</h2>
</section>
```

## Container Widths

### Standard Container Sizes

```tsx
const containers = {
  sm: "max-w-screen-sm",   // 640px - narrow content
  md: "max-w-screen-md",   // 768px - readable text
  lg: "max-w-screen-lg",   // 1024px - standard pages
  xl: "max-w-screen-xl",   // 1280px - dashboards
  "2xl": "max-w-screen-2xl", // 1536px - wide layouts
  full: "max-w-full",      // 100%
};
```

### Content Width for Readability

```tsx
// Prose/reading content: limit line length
<article className="max-w-prose mx-auto">
  {/* ~65 characters per line */}
</article>

// Dashboard content: wider
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Full dashboard layout */}
</div>
```

## Responsive Design

### Mobile-First Breakpoints

```typescript
const breakpoints = {
  sm: "640px",   // Large phones, landscape
  md: "768px",   // Tablets
  lg: "1024px",  // Small laptops
  xl: "1280px",  // Desktops
  "2xl": "1536px", // Large screens
};
```

### Responsive Patterns

```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  <aside className="w-full md:w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>

// Grid columns adapt
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// Hide/show elements
<nav className="hidden md:flex">Desktop Nav</nav>
<button className="md:hidden">Mobile Menu</button>
```

## Grid Systems

### 12-Column Grid

```tsx
// Standard 12-column layout
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-12 lg:col-span-3">Sidebar</div>
  <div className="col-span-12 lg:col-span-9">Main</div>
</div>

// Common column patterns
// Full width: col-span-12
// Half: col-span-6
// Third: col-span-4
// Quarter: col-span-3
// Two-thirds: col-span-8
```

### Auto-Fit Grids for Cards

```tsx
// Cards that auto-fit available space
<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
  {cards.map(card => <Card key={card.id} />)}
</div>
```

## Safe Areas and Margins

### Page Margins

```tsx
// Consistent page margins
<div className="px-4 sm:px-6 lg:px-8">
  {/* Content respects screen edges */}
</div>

// Full-bleed with contained content
<section className="bg-gray-100">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    {/* Content is contained */}
  </div>
</section>
```

### Touch-Safe Spacing

```tsx
// Ensure touch targets don't overlap edges
<nav className="fixed bottom-0 left-0 right-0 pb-safe">
  {/* pb-safe accounts for home indicator on iOS */}
</nav>

// Safe area for notched devices
<header className="pt-safe">
  {/* pt-safe accounts for notch */}
</header>
```

## Common Layout Patterns

### Sticky Header

```tsx
<header className="sticky top-0 z-sticky bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
  <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
    {/* Header content */}
  </div>
</header>
```

### Sidebar Layout

```tsx
<div className="flex min-h-screen">
  {/* Fixed sidebar */}
  <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r">
    <nav className="flex-1 px-4 py-6 space-y-1">
      {/* Navigation */}
    </nav>
  </aside>
  
  {/* Main content with offset */}
  <main className="flex-1 lg:pl-64">
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Content */}
    </div>
  </main>
</div>
```

### Split View

```tsx
// Resizable split panels
<div className="flex h-screen">
  <div className="w-1/3 min-w-[200px] max-w-[400px] border-r overflow-auto">
    {/* List panel */}
  </div>
  <div className="flex-1 overflow-auto">
    {/* Detail panel */}
  </div>
</div>
```

### Card Grid with Masonry

```tsx
// Equal-height cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id} className="flex flex-col h-full">
      <Card className="flex-1" />
    </div>
  ))}
</div>
```

## Visual Hierarchy

### Establish Clear Hierarchy

```tsx
// Clear visual hierarchy with spacing and size
<article className="space-y-8">
  {/* Page title - largest, most prominent */}
  <header className="space-y-2">
    <h1 className="text-4xl font-bold">Page Title</h1>
    <p className="text-xl text-gray-600">Subtitle or description</p>
  </header>
  
  {/* Section - clear separation */}
  <section className="space-y-4">
    <h2 className="text-2xl font-semibold">Section Title</h2>
    <div className="space-y-2">
      {/* Content */}
    </div>
  </section>
</article>
```

### Group Related Content

```tsx
// Visual grouping with cards
<div className="rounded-xl border bg-white p-6 space-y-4">
  <h3 className="font-semibold">Group Title</h3>
  <div className="space-y-2">
    {/* Related items */}
  </div>
</div>

// Visual grouping with spacing
<div className="space-y-6">
  <div className="space-y-2">
    {/* Tightly related items */}
  </div>
  <div className="space-y-2">
    {/* Another group */}
  </div>
</div>
```

## Alignment

### Consistent Alignment

```tsx
// Left-align text content (for LTR languages)
<div className="text-left">
  <h2>Title</h2>
  <p>Body text should be left-aligned for readability.</p>
</div>

// Center for hero/marketing sections
<div className="text-center max-w-2xl mx-auto">
  <h1>Hero Title</h1>
  <p>Centered text for impact.</p>
</div>

// Right-align numbers in tables
<td className="text-right tabular-nums">{value}</td>
```

### Vertical Alignment

```tsx
// Center items vertically
<div className="flex items-center gap-2">
  <Icon className="h-5 w-5" />
  <span>Label</span>
</div>

// Align to baseline for mixed text sizes
<div className="flex items-baseline gap-2">
  <span className="text-3xl font-bold">42</span>
  <span className="text-sm text-gray-500">items</span>
</div>
```

## Data-Dense Layouts

### Tables for Structured Data

```tsx
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
        <th className="px-4 py-3 text-right text-sm font-semibold">Value</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {rows.map(row => (
        <tr key={row.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-sm">{row.name}</td>
          <td className="px-4 py-3 text-sm text-right tabular-nums">{row.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Dashboard Layouts

```tsx
// Stats grid
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(stat => (
    <div key={stat.label} className="p-4 rounded-lg border">
      <dt className="text-sm text-gray-500">{stat.label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
    </div>
  ))}
</div>
```

## Implementation Checklist

- [ ] Using 4px base spacing consistently
- [ ] Responsive breakpoints properly implemented
- [ ] Container widths appropriate for content type
- [ ] Safe areas respected on mobile devices
- [ ] Visual hierarchy is clear and consistent
- [ ] Related items are visually grouped
- [ ] Alignment is consistent throughout
- [ ] Layouts tested on mobile, tablet, and desktop
- [ ] Touch targets meet 44px minimum
- [ ] Content is readable at all viewport sizes

## Related Apple HIG Resources

- [Layout Overview](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Columns](https://developer.apple.com/design/human-interface-guidelines/layout#Columns)
- [Safe Areas](https://developer.apple.com/design/human-interface-guidelines/layout#Safe-areas)
- [Adaptivity and Layout](https://developer.apple.com/design/human-interface-guidelines/layout#Best-practices)
