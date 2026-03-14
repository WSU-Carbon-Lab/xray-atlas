# NEXAFS drag-upload: Maximum update depth exceeded

## Summary

When a user drags a CSV file onto the NEXAFS upload zone, the app can throw "Maximum update depth exceeded" due to React Aria's collection layer triggering state updates during the commit phase.

## Root cause

The loop occurs in the React commit phase when the dataset tab list first appears (datasets go from 0 to 1). HeroUI Tabs (built on React Aria) builds a collection from `Tabs.Tab` children. During commit, ref callbacks run and `@react-aria/collections` runs `queueUpdate` -> subscription -> getSnapshot. That can trigger another React update; the re-render runs the same path again and the cycle repeats until React throws.

References:

- adobe/react-spectrum#3104, #5013, #5469 (controlled tabs + dynamic children / selection correction)
- React Aria CollectionBuilder ref callback and Document.queueUpdate run in commit phase

## Architectural fix (implemented)

**Replace HeroUI Tabs in DatasetTabs with a minimal custom tab bar** so the component no longer uses React Aria collections.

- **Change:** `src/components/contribute/nexafs/dataset-tabs.tsx` now renders a `role="tablist"` container with `role="tab"` divs (one per dataset). Selection is driven only by `activeDatasetId` and `onDatasetSelect`; no collection builder or `useSyncExternalStore` subscription.
- **Preserved:** Styling (border, selected underline, bg), Cmd+1-9 keyboard shortcuts, Arrow Left/Right for tab navigation, inline edit and remove per tab, "+ New Dataset" button. HeroUI `Chip` is still used for status badges.
- **Result:** No commit-phase collection updates, so the infinite recursion cannot occur when the first file is dropped.

## Lighter-weight alternatives (if reverting or for other tab UIs)

1. **Valid selectedKey on first render:** Only render the tab list when `datasets.length > 0` and pass a derived `selectedKey` that is always a valid dataset id (e.g. `datasets[0].id`). Avoids the hook "correcting" selection and firing `onSelectionChange` on init (see adobe/react-spectrum#5013).
2. **Defer controlled mode:** Use `selectedKey={hasMounted ? activeKey : undefined}` with `hasMounted` set in `useEffect(() => setMounted(true), [])` so the first paint is uncontrolled.
3. **Uncontrolled + remount:** Use `defaultSelectedKey` and remount the Tabs when the list changes via `key={datasets.map(d => d.id).join(',')}`.

## Related

- GitHub issue: WSU-Carbon-Lab/xray-atlas#39
