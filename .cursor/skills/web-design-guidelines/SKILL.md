---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "2.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines and Apple Human Interface Guidelines.

## How It Works

1. Read the relevant guideline references for the review type
2. Read the specified files (or prompt user for files/pattern)
3. Check against all applicable rules
4. Output findings in the terse `file:line` format

## Guidelines Sources

### Vercel Web Interface Guidelines

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

### Apple Human Interface Guidelines

Reference the local HIG guideline files in the `references/` directory for platform-specific design patterns. Each reference includes links to the official Apple HIG documentation.

## Reference Documents

The following Human Interface Guidelines references are available:

| Reference | Description | Apple HIG Link |
|-----------|-------------|----------------|
| [Accessibility](references/hig-accessibility.md) | WCAG compliance, screen readers, keyboard navigation | [HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| [Color](references/hig-color.md) | Semantic colors, contrast, data visualization | [HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color) |
| [Dark Mode](references/hig-dark-mode.md) | Appearance modes, surface elevation, adaptation | [HIG: Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) |
| [Icons](references/hig-icons.md) | Icon sizing, accessibility, animation | [HIG: SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) |
| [Layout](references/hig-layout.md) | Spacing, grids, responsive design | [HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| [Motion](references/hig-motion.md) | Animation timing, easing, reduced motion | [HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| [Typography](references/hig-typography.md) | Type scale, hierarchy, scientific typography | [HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |

## Usage

When a user provides a file or pattern argument:

1. Fetch Vercel guidelines from the source URL above
2. Read the relevant HIG reference files from `references/`
3. Read the specified files
4. Apply all rules from both guideline sources
5. Output findings using the format specified in the guidelines

### Review Types

**General UI Review** - Use all references:
- Accessibility, Color, Dark Mode, Icons, Layout, Motion, Typography

**Accessibility Audit** - Focus on:
- Accessibility reference
- Color reference (contrast requirements)
- Typography reference (legibility)

**Design System Review** - Focus on:
- Color reference
- Typography reference
- Icons reference

**Animation Review** - Focus on:
- Motion reference
- Accessibility reference (reduced motion)

**Responsive/Layout Review** - Focus on:
- Layout reference
- Typography reference (responsive scaling)

If no files specified, ask the user which files to review.

## Apple HIG Quick Links

Core guidelines from Apple Human Interface Guidelines:

- **Foundations**
  - [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
  - [Color](https://developer.apple.com/design/human-interface-guidelines/color)
  - [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
  - [Icons](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)
  - [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
  - [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
  - [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

- **Additional Resources**
  - [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
  - [Right to Left](https://developer.apple.com/design/human-interface-guidelines/right-to-left)
  - [Spatial Layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)
  - [Playing Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
