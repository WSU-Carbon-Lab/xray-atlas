# Human Interface Guidelines: Motion

Based on [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

Motion can make an experience more engaging and informative when used appropriately.

## Core Principles

1. **Purpose** - Every animation should serve a purpose
2. **Subtlety** - Motion should enhance, not distract
3. **Responsiveness** - Interfaces should feel responsive and alive
4. **Accessibility** - Respect reduced motion preferences

## When to Use Motion

### Appropriate Uses

- **Feedback** - Confirm user actions (button press, form submit)
- **State changes** - Smooth transitions between states
- **Orientation** - Help users understand spatial relationships
- **Focus** - Draw attention to important changes
- **Delight** - Add personality (sparingly)

### Avoid Motion For

- Critical information delivery
- Primary means of conveying state
- Anything that delays user progress
- Purely decorative animation that repeats

## Duration Guidelines

### Standard Durations

```typescript
const duration = {
  instant: 0,       // Immediate feedback
  fast: 100,        // Micro-interactions (hover, press)
  normal: 200,      // Standard transitions
  slow: 300,        // Complex transitions
  slower: 500,      // Page transitions
  slowest: 700,     // Dramatic reveals
};
```

### Duration by Context

| Context | Duration | Example |
|---------|----------|---------|
| Hover states | 100-150ms | Button color change |
| Small elements | 150-200ms | Icons, badges |
| Medium elements | 200-300ms | Cards, modals |
| Large elements | 300-500ms | Page transitions |
| Complex sequences | 500-800ms | Onboarding flows |

```tsx
// Tailwind duration classes
className="transition-colors duration-150"  // Hover
className="transition-all duration-200"     // Standard
className="transition-all duration-300"     // Complex
```

## Easing Functions

### Standard Curves

```typescript
const easing = {
  // Default - smooth acceleration and deceleration
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  
  // In - starts slow, accelerates
  in: "cubic-bezier(0.4, 0, 1, 1)",
  
  // Out - starts fast, decelerates (most common)
  out: "cubic-bezier(0, 0, 0.2, 1)",
  
  // In-Out - slow start and end
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  
  // Spring - bouncy, playful
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  
  // Bounce - overshoots then settles
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
};
```

### When to Use Each Curve

```tsx
// ease-out: Elements entering (most common)
className="transition-all duration-200 ease-out"

// ease-in: Elements exiting
className="transition-opacity duration-150 ease-in"

// ease-in-out: Elements transforming in place
className="transition-transform duration-300 ease-in-out"

// spring: Playful interactions
className="transition-transform duration-300 ease-spring"
```

## Common Animation Patterns

### Hover Feedback

```tsx
// Subtle lift on hover
className={`
  transition-all duration-200
  hover:-translate-y-0.5
  hover:shadow-md
`}

// Color transition
className={`
  transition-colors duration-150
  hover:bg-gray-100 dark:hover:bg-gray-800
`}

// Scale effect
className={`
  transition-transform duration-150
  hover:scale-105
  active:scale-95
`}
```

### Button Press

```tsx
// Press feedback
className={`
  transition-transform duration-100
  active:scale-[0.98]
`}

// With color change
className={`
  transition-all duration-150
  bg-accent
  hover:bg-accent-dark
  active:scale-[0.98]
`}
```

### Page/View Transitions

```tsx
// Fade in with slight rise
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  {content}
</motion.div>
```

### Modal/Dialog

```tsx
// Backdrop fade
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 bg-black/50"
/>

// Modal scale and fade
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
  {modalContent}
</motion.div>
```

### Staggered Lists

```tsx
// Container with stagger
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Individual items
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

## Loading States

### Skeleton Shimmer

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-2) 0%,
    var(--surface-3) 50%,
    var(--surface-2) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Spinner

```tsx
// Simple spinner
<div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-accent" />

// Pulse for loading content
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />
```

### Progress Indicators

```tsx
// Determinate progress
<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
  <motion.div
    className="h-full bg-accent"
    initial={{ width: 0 }}
    animate={{ width: `${progress}%` }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  />
</div>
```

## Data Visualization Animation

### Chart Line Drawing

```tsx
// Animate path drawing
<motion.path
  d={linePath}
  fill="none"
  stroke={color}
  strokeWidth={2}
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 1, ease: "easeOut" }}
/>
```

### Bar Chart Growth

```tsx
// Bars grow from bottom
<motion.rect
  x={x}
  width={barWidth}
  initial={{ y: height, height: 0 }}
  animate={{ y: y, height: barHeight }}
  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.05 }}
/>
```

## Reduced Motion

### Always Respect User Preferences

```tsx
// CSS approach
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

// React hook
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
}

// Usage
const prefersReducedMotion = usePrefersReducedMotion();

<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>
```

### Framer Motion Reduced Motion

```tsx
// Global configuration
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

## Performance Guidelines

### Animate Only Transform and Opacity

```tsx
// Good - GPU accelerated
className="transition-transform"  // translate, scale, rotate
className="transition-opacity"

// Avoid - triggers layout
className="transition-all"  // Be careful - animates everything
// Don't animate: width, height, top, left, margin, padding
```

### Use will-change Sparingly

```tsx
// Only on elements about to animate
className="will-change-transform"

// Remove after animation completes
onAnimationComplete={() => setWillChange(false)}
```

### Debounce Scroll Animations

```tsx
// Don't animate on every scroll event
const debouncedScroll = useMemo(
  () => debounce(handleScroll, 10),
  [handleScroll]
);
```

## Implementation Checklist

- [ ] All animations serve a clear purpose
- [ ] Durations are appropriate for element size
- [ ] Easing curves match the interaction type
- [ ] Reduced motion preference is respected
- [ ] Only transform and opacity are animated
- [ ] Loading states have appropriate feedback
- [ ] Animations don't block user progress
- [ ] Performance is smooth (60fps)
- [ ] Complex sequences are coordinated
- [ ] Exit animations complete before removal

## Related Apple HIG Resources

- [Motion Overview](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Playing Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Animation Best Practices](https://developer.apple.com/design/human-interface-guidelines/motion#Best-practices)
- [Accessibility and Motion](https://developer.apple.com/design/human-interface-guidelines/motion#Accessibility)
