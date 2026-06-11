import { cn } from "@heroui/styles";
import { normalizeNumericSubscriptsToAscii } from "~/lib/chem-formula-subscripts";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

function charToSubscript(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) {
    return SUBSCRIPT_DIGITS[code - 48] ?? ch;
  }
  return ch;
}

/**
 * Renders a chemical formula with Unicode subscripts for numeric runs.
 *
 * Accepts plain ASCII (`C8H8`) or pre-subscripted strings and normalizes
 * digits after element symbols to subscript glyphs for cards and dropdown rows.
 */
export function ChemicalFormula({
  formula,
  className,
  title,
}: {
  formula: string;
  className?: string;
  title?: string;
}) {
  const trimmed = formula.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const ascii = normalizeNumericSubscriptsToAscii(trimmed);
  const parts: Array<{ text: string; sub: boolean }> = [];
  let index = 0;
  while (index < ascii.length) {
    const ch = ascii[index]!;
    if (/[A-Za-z\(\)\[\]\+\-\.]/.test(ch)) {
      parts.push({ text: ch, sub: false });
      index += 1;
      let digits = "";
      while (index < ascii.length && /\d/.test(ascii[index]!)) {
        digits += ascii[index]!;
        index += 1;
      }
      if (digits.length > 0) {
        parts.push({
          text: [...digits].map(charToSubscript).join(""),
          sub: true,
        });
      }
      continue;
    }
    if (/\d/.test(ch)) {
      let digits = ch;
      index += 1;
      while (index < ascii.length && /\d/.test(ascii[index]!)) {
        digits += ascii[index]!;
        index += 1;
      }
      parts.push({
        text: [...digits].map(charToSubscript).join(""),
        sub: true,
      });
      continue;
    }
    parts.push({ text: ch, sub: false });
    index += 1;
  }

  return (
    <span className={cn("font-mono", className)} title={title ?? trimmed}>
      {parts.map((part, partIndex) =>
        part.sub ? (
          <sub key={`${partIndex}-${part.text}`} className="text-[0.72em]">
            {part.text}
          </sub>
        ) : (
          <span key={`${partIndex}-${part.text}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}
