# Human Interface Guidelines: Accessibility

Based on [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

Accessibility is not optional - design for everyone from the start.

## Core Principles

1. **Perceivable** - Information must be presentable in ways all users can perceive
2. **Operable** - Interface components must be operable by all users
3. **Understandable** - Information and UI operation must be understandable
4. **Robust** - Content must be robust enough to work with assistive technologies

## Visual Accessibility

### Color and Contrast

**Minimum Contrast Ratios (WCAG 2.1 AA):**
- Normal text (< 18px): **4.5:1**
- Large text (>= 18px or 14px bold): **3:1**
- UI components and graphics: **3:1**

**Never rely on color alone:**
```tsx
// Bad: Color is the only indicator
<span className={error ? "text-red-500" : "text-green-500"}>
  {status}
</span>

// Good: Color + icon + text
<span className={error ? "text-red-500" : "text-green-500"}>
  {error ? <XIcon /> : <CheckIcon />}
  {error ? "Error: " : "Success: "}
  {status}
</span>
```

**Support for color blindness:**
- Use patterns, shapes, or icons in addition to color
- Test with color blindness simulators
- Avoid red/green as the only differentiator

### Text and Typography

**Support Dynamic Type / user font preferences:**
```tsx
// Use relative units, not fixed pixels
className="text-base" // Not: style={{ fontSize: '16px' }}

// Respect user's font size preferences
className="text-sm md:text-base lg:text-lg"
```

**Text legibility requirements:**
- Minimum body text size: 16px (1rem)
- Line height: 1.4-1.6 for body text
- Maximum line length: 65-80 characters
- Sufficient letter spacing for readability

### Visual Indicators

**Focus states must be visible:**
```tsx
// Always provide visible focus indicators
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"

// Never remove focus outlines without replacement
// Bad: outline-none (alone)
// Good: outline-none + custom focus indicator
```

**Loading and progress states:**
- Provide visual feedback for all async operations
- Use aria-live regions for dynamic content updates
- Include text alternatives for spinners/loaders

## Motor Accessibility

### Touch and Click Targets

**Minimum target sizes:**
- Touch targets: **44x44 points** minimum
- Adequate spacing between targets: **8px** minimum

```tsx
// Ensure buttons meet minimum size
className="min-h-[44px] min-w-[44px] p-3"

// Icon buttons need padding for touch
<button className="p-3 rounded-lg" aria-label="Close">
  <XIcon className="h-5 w-5" />
</button>
```

### Keyboard Navigation

**All interactive elements must be keyboard accessible:**
```tsx
// Ensure proper tab order
<button tabIndex={0}>Focusable</button>

// Skip links for main content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

// Keyboard event handlers
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleAction();
  }
}}
```

**Keyboard shortcuts:**
- Provide keyboard alternatives for all mouse actions
- Document keyboard shortcuts
- Allow customization where possible
- Don't override system shortcuts

### Timing and Gestures

**Don't require precise timing:**
- Allow users to extend time limits
- Avoid time-based interactions when possible
- Provide pause/stop controls for moving content

**Support alternative input methods:**
- Don't require complex gestures
- Provide button alternatives for gestures
- Support single-pointer alternatives for multi-touch

## Screen Reader Support

### Semantic HTML

**Use semantic elements:**
```tsx
// Use proper heading hierarchy
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>

// Use semantic landmarks
<header>...</header>
<nav>...</nav>
<main>...</main>
<aside>...</aside>
<footer>...</footer>

// Use appropriate elements
<button> // for actions
<a href="..."> // for navigation
<input> // for form fields
```

### ARIA Labels and Roles

**Label all interactive elements:**
```tsx
// Icon buttons need labels
<button aria-label="Download spectrum data">
  <DownloadIcon className="h-5 w-5" />
</button>

// Form inputs need labels
<label htmlFor="energy-input">Energy (eV)</label>
<input id="energy-input" type="number" />

// Or use aria-label
<input aria-label="Search molecules" type="search" />
```

**ARIA roles for custom components:**
```tsx
// Custom tabs
<div role="tablist">
  <button role="tab" aria-selected={active} aria-controls="panel-1">
    Tab 1
  </button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  Content
</div>

// Custom dialogs
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Dialog Title</h2>
</div>
```

### Live Regions

**Announce dynamic content changes:**
```tsx
// For status messages
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// For urgent alerts
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// For loading states
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? "Loading..." : content}
</div>
```

## Data Visualization Accessibility

### Charts and Graphs

**Provide text alternatives for data visualizations:**
```tsx
// Include accessible data table
<figure>
  <SpectrumPlot data={data} aria-hidden="true" />
  <figcaption className="sr-only">
    NEXAFS spectrum showing carbon K-edge with peaks at 285.1 eV and 288.5 eV
  </figcaption>
  
  {/* Hidden data table for screen readers */}
  <table className="sr-only">
    <caption>Spectrum Data Points</caption>
    <thead>
      <tr><th>Energy (eV)</th><th>Intensity</th></tr>
    </thead>
    <tbody>
      {data.map(point => (
        <tr key={point.x}>
          <td>{point.x}</td>
          <td>{point.y}</td>
        </tr>
      ))}
    </tbody>
  </table>
</figure>
```

**Interactive chart elements:**
- Provide keyboard navigation for data points
- Announce values on focus
- Include sonification where appropriate

## Reduced Motion

**Respect user preferences:**
```tsx
// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// In Tailwind/CSS
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// In Framer Motion
<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
```

## Testing Checklist

Before shipping, verify:

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and predictable
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Content is understandable without color
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Error messages are announced to screen readers
- [ ] Page works with 200% zoom
- [ ] Touch targets are at least 44x44px
- [ ] Animations respect prefers-reduced-motion
- [ ] Screen reader testing completed (VoiceOver, NVDA)

## Utility Classes

```css
/* Screen reader only - visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Show on focus (for skip links) */
.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

## Related Apple HIG Resources

- [Accessibility Overview](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/accessibility#VoiceOver)
- [Color and Contrast](https://developer.apple.com/design/human-interface-guidelines/color#Accessibility)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion#Accessibility)
