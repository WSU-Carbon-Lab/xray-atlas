export function eventToPlotCoords(
  event: PointerEvent,
  svg: SVGSVGElement,
  left: number,
  top: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x - left, y: svgPt.y - top };
}
