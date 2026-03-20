# Peak Overlay Layer Design Note

## Goal
Provide an overlay layer that owns all peak editing interactions in the spectrum plot when `plotContext.kind === "peak-edit"`:

- click-to-select existing peaks (toggle)
- click-to-add peaks on empty space
- drag-to-adjust selected peak energy
- Delete/Backspace to remove the selected peak

## Annotation DOM Strategy
Use SVG-only DOM inside the existing plot clipPath so interaction hit-testing is strictly limited to the plot interior (between axis spines).

1. Render a transparent SVG `<rect>` as the interaction surface:
   - `fill="transparent"`
   - `pointerEvents="all"`
   - placed inside the same translated group and clipped by the plot clipPath
2. Keep all interactive affordances (drag handles and selection visuals) as SVG elements:
   - selected peak energy handle is rendered only for `isSelected`
   - label rendering stays with the existing `PeakIndicators` component (so the overlay focuses on interaction)

Why this approach:
SVG overlay rects preserve correct coordinate mapping (clientX/clientY to plot energy via scales) and avoid layout/clip issues that can happen with `foreignObject`.

## Label Collision Avoidance Approach
Collision avoidance is handled at the label-rendering layer (`PeakIndicators`), not the overlay.

Initial strategy (deterministic and stable):
1. Sort peaks by energy (ascending).
2. Use a fixed base label Y offset per energy.
3. If labels overlap (estimated by comparing adjacent projected Y positions within a small tolerance), apply small incremental Y offsets following this order:
   - alternate upward/downward offsets
   - cap total displacement to avoid pushing labels outside the plot

This yields stable behavior across re-renders (no “jumping” labels).

## Interaction Model
Peak interactions are enabled only when `plotContext.kind === "peak-edit"`.

1. Click:
   - if click is near an existing peak: select it (toggle)
   - otherwise: add a new peak at the click energy
2. Drag:
   - only the selected peak shows an energy handle
   - dragging the handle continuously updates peak energy
3. Delete key:
   - Delete/Backspace removes the currently selected peak

All pointer/keyboard interaction handlers are attached only while peak-edit is active.

