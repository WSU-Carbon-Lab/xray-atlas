import { normalizeNumericSubscriptsToAscii } from "~/lib/chem-formula-subscripts";

const SVG_NS = "http://www.w3.org/2000/svg";

const MARK_ATTR = "data-xa-chem-formula";

const SUB_FONT = "0.72em";
const SUB_SHIFT = "-0.28em";

function appendPart(
  textEl: SVGTextElement,
  chars: string,
  subscript: boolean,
): void {
  const ts = document.createElementNS(SVG_NS, "tspan");
  ts.textContent = chars;
  if (subscript) {
    ts.setAttribute("font-size", SUB_FONT);
    ts.setAttribute("baseline-shift", SUB_SHIFT);
  }
  textEl.appendChild(ts);
}

function tryRewriteCnHm(textEl: SVGTextElement, ascii: string): boolean {
  const m = /^C(\d+)H(\d+)$/.exec(ascii);
  if (!m) return false;
  const n = Number.parseInt(m[1]!, 10);
  const h = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(n) || !Number.isFinite(h) || n < 1) return false;
  if (h !== 2 * n + 1) return false;
  while (textEl.firstChild) {
    textEl.removeChild(textEl.firstChild);
  }
  appendPart(textEl, "C", false);
  appendPart(textEl, m[1]!, true);
  appendPart(textEl, "H", false);
  appendPart(textEl, m[2]!, true);
  textEl.setAttribute(MARK_ATTR, "1");
  return true;
}

function tryRewriteChn(textEl: SVGTextElement, ascii: string): boolean {
  const m = /^CH(\d+)$/.exec(ascii);
  if (!m) return false;
  while (textEl.firstChild) {
    textEl.removeChild(textEl.firstChild);
  }
  appendPart(textEl, "C", false);
  appendPart(textEl, "H", false);
  appendPart(textEl, m[1]!, true);
  textEl.setAttribute(MARK_ATTR, "1");
  return true;
}

function tryRewriteHnC(textEl: SVGTextElement, ascii: string): boolean {
  const m = /^H(\d+)C$/.exec(ascii);
  if (!m) return false;
  while (textEl.firstChild) {
    textEl.removeChild(textEl.firstChild);
  }
  appendPart(textEl, "H", false);
  appendPart(textEl, m[1]!, true);
  appendPart(textEl, "C", false);
  textEl.setAttribute(MARK_ATTR, "1");
  return true;
}

export function applyChemFormulaTypographyToSvgRoot(svgRoot: Element): void {
  const texts = svgRoot.querySelectorAll("text");
  for (const node of texts) {
    if (!(node instanceof SVGTextElement)) continue;
    const textEl = node;
    if (textEl.getAttribute(MARK_ATTR)) continue;
    const raw = textEl.textContent?.trim() ?? "";
    if (!raw) continue;
    if (raw.length > 32) continue;
    const ascii = normalizeNumericSubscriptsToAscii(raw);
    if (tryRewriteCnHm(textEl, ascii)) continue;
    if (tryRewriteChn(textEl, ascii)) continue;
    if (tryRewriteHnC(textEl, ascii)) continue;
  }
}
