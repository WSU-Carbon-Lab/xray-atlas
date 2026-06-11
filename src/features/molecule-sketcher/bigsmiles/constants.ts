export const BLOCK_LABELS = ["A", "B", "C", "D"] as const;

export const BLOCK_ACCENT_HUES = [
  12, 210, 135, 285, 48, 330, 175, 245,
] as const;

/**
 * Returns a theme-safe HSL accent for a block index in the components strip.
 *
 * @param index - Zero-based block position in the strip.
 */
export function blockAccentColor(index: number): string {
  const hue = BLOCK_ACCENT_HUES[index % BLOCK_ACCENT_HUES.length] ?? 210;
  return `hsl(${hue} 70% 42%)`;
}
