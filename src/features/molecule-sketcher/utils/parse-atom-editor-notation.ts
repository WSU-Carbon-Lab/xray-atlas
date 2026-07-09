/**
 * Parses compact atom-editor notation typed in the molecule sketcher (for example
 * `Cu2+`, `N-`, `Cu20+2`) into an element symbol, formal charge, and a
 * Unicode label preview with subscripts and superscripts.
 */

import { Molecule as MoleculeCtor } from "openchemlib";

import { clampMoleculeDrawCharge } from "./molecule-2d-depiction-style";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Result of parsing atom-editor shorthand notation. */
export interface ParsedAtomEditorNotation {
  /** Periodic-table symbol assigned to the edited atom. */
  symbol: string;
  /** Formal charge clamped to the sketcher editor range. */
  charge: number;
  /** Unicode preview such as `Cu₂O²⁺` for display beside the input. */
  displayLabel: string;
}

function toSubscriptDigits(value: string): string {
  return [...value].map((char) => {
    const digit = Number.parseInt(char, 10);
    if (!Number.isFinite(digit) || digit < 0 || digit > 9) {
      return char;
    }
    return SUBSCRIPT_DIGITS[digit] ?? char;
  }).join("");
}

function toSuperscriptSignedCharge(charge: number): string {
  const sign = charge > 0 ? "⁺" : "⁻";
  const magnitude = Math.abs(charge);
  if (magnitude === 1) {
    return sign;
  }
  const magnitudeText = String(magnitude);
  const superscriptMagnitude = [...magnitudeText]
    .map((char) => {
      const digit = Number.parseInt(char, 10);
      return SUPERSCRIPT_DIGITS[digit] ?? char;
    })
    .join("");
  return `${superscriptMagnitude}${sign}`;
}

function isKnownElementSymbol(symbol: string): boolean {
  if (!/^[A-Z][a-z]?$/u.test(symbol)) {
    return false;
  }
  const atomicNo = MoleculeCtor.getAtomicNoFromLabel(symbol);
  return atomicNo > 0 && MoleculeCtor.cAtomLabel[atomicNo] === symbol;
}

function elementFromZeroAlias(): string {
  return "O";
}

/**
 * Builds a Unicode label from the leading symbol, optional middle stoichiometry
 * tokens, and trailing charge.
 */
function buildDisplayLabel(
  symbol: string,
  middle: string,
  charge: number,
): string {
  let label = symbol;
  let index = 0;
  while (index < middle.length) {
    const char = middle[index] ?? "";
    if (char >= "0" && char <= "9") {
      if (char === "0") {
        label += elementFromZeroAlias();
      } else {
        label += toSubscriptDigits(char);
      }
      index += 1;
      continue;
    }
    if (/[A-Z]/u.test(char)) {
      let nextSymbol = char;
      index += 1;
      const lower = middle[index];
      if (lower !== undefined && /[a-z]/u.test(lower)) {
        nextSymbol += lower;
        index += 1;
      }
      label += nextSymbol;
      continue;
    }
    index += 1;
  }
  if (charge !== 0) {
    label += toSuperscriptSignedCharge(charge);
  }
  return label;
}

function extractChargeFromTail(
  tail: string,
): { middle: string; charge: number } {
  const trimmed = tail.trim();
  if (trimmed.length === 0) {
    return { middle: "", charge: 0 };
  }

  const entireDigitSign = /^(\d+)([+-])$/u.exec(trimmed);
  if (entireDigitSign !== null) {
    const magnitude = Number.parseInt(entireDigitSign[1] ?? "", 10);
    const sign = entireDigitSign[2] === "+" ? 1 : -1;
    if (Number.isFinite(magnitude) && magnitude > 0) {
      return { middle: "", charge: sign * magnitude };
    }
  }

  const entireSignDigit = /^([+-])(\d+)$/u.exec(trimmed);
  if (entireSignDigit !== null) {
    const magnitude = Number.parseInt(entireSignDigit[2] ?? "", 10);
    const sign = entireSignDigit[1] === "+" ? 1 : -1;
    if (Number.isFinite(magnitude) && magnitude > 0) {
      return { middle: "", charge: sign * magnitude };
    }
  }

  const entireSignOnly = /^([+-])$/u.exec(trimmed);
  if (entireSignOnly !== null) {
    const sign = entireSignOnly[1] === "+" ? 1 : -1;
    return { middle: "", charge: sign };
  }

  const middleSignDigit = /^(.+)([+-])(\d+)$/u.exec(trimmed);
  if (middleSignDigit !== null) {
    const magnitude = Number.parseInt(middleSignDigit[3] ?? "", 10);
    const sign = middleSignDigit[2] === "+" ? 1 : -1;
    if (Number.isFinite(magnitude) && magnitude > 0) {
      return {
        middle: middleSignDigit[1] ?? "",
        charge: sign * magnitude,
      };
    }
  }

  const middleDigitSign = /^(.+)(\d+)([+-])$/u.exec(trimmed);
  if (middleDigitSign !== null) {
    const magnitude = Number.parseInt(middleDigitSign[2] ?? "", 10);
    const sign = middleDigitSign[3] === "+" ? 1 : -1;
    if (Number.isFinite(magnitude) && magnitude > 0) {
      return {
        middle: middleDigitSign[1] ?? "",
        charge: sign * magnitude,
      };
    }
  }

  return { middle: trimmed, charge: 0 };
}

/**
 * Formats the current atom state as editable shorthand (`Cu2+`, `N-`).
 *
 * @param symbol - Element symbol for the atom.
 * @param charge - Formal charge on the atom.
 */
export function formatAtomEditorNotation(symbol: string, charge: number): string {
  if (charge === 0) {
    return symbol;
  }
  if (charge > 0) {
    return charge === 1 ? `${symbol}+` : `${symbol}${charge}+`;
  }
  return charge === -1 ? `${symbol}-` : `${symbol}${-charge}-`;
}

/**
 * Parses atom-editor shorthand into element symbol, formal charge, and a label
 * preview. Digits before `+` or `-` are charge magnitudes (`Fe3+`). Digits
 * between symbols render as subscripts in the preview; a lone `0` token expands
 * to oxygen (`Cu20+2` → `Cu₂O²⁺`).
 *
 * @param raw - User-typed notation from the atom editor field.
 * @returns Parsed symbol and charge, or `null` when no valid element is present.
 */
export function parseAtomEditorNotation(
  raw: string,
): ParsedAtomEditorNotation | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const symbolMatch = /^([A-Z][a-z]?)(.*)$/u.exec(trimmed);
  if (symbolMatch === null) {
    return null;
  }

  const symbol = symbolMatch[1] ?? "";
  const tail = symbolMatch[2] ?? "";
  if (!isKnownElementSymbol(symbol)) {
    return null;
  }

  const chargeResult = extractChargeFromTail(tail);

  const charge = clampMoleculeDrawCharge(chargeResult.charge);
  const displayLabel = buildDisplayLabel(symbol, chargeResult.middle, charge);

  return { symbol, charge, displayLabel };
}

/**
 * Returns a live preview for partially typed notation when a full parse is not
 * yet valid.
 *
 * @param raw - Current input field contents.
 */
export function previewAtomEditorNotation(raw: string): string | null {
  const parsed = parseAtomEditorNotation(raw);
  if (parsed !== null) {
    return parsed.displayLabel;
  }

  const partial = /^([A-Z][a-z]?)(.*)$/u.exec(raw.trim());
  if (partial === null) {
    return null;
  }
  const symbol = partial[1] ?? "";
  if (!isKnownElementSymbol(symbol)) {
    return null;
  }
  const tail = partial[2] ?? "";
  const chargeResult = extractChargeFromTail(tail);
  if (chargeResult.middle.length === 0 && chargeResult.charge === 0 && tail.length > 0 && !/[+-]/u.test(tail)) {
    return symbol + tail;
  }
  return buildDisplayLabel(symbol, chargeResult.middle, chargeResult.charge);
}
