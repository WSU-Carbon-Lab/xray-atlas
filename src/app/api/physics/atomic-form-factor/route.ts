/**
 * Proxies CXRO Henke `.nff` tables for a single element. Caches successful response bodies in module
 * memory so repeated requests for the same symbol skip upstream I/O within this Node process.
 */
import { NextResponse } from "next/server";
import { henkeLblElementNffUrl } from "~/lib/henke-nff-cxro";

const henkeLblTextByAtom = new Map<string, string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const atom = searchParams.get("atom");

  if (!atom) {
    return NextResponse.json(
      { error: "Atom parameter is required" },
      { status: 400 },
    );
  }

  // Validate atom is a single element symbol
  if (!/^[A-Z][a-z]?$/.test(atom)) {
    return NextResponse.json(
      { error: "Invalid atom symbol" },
      { status: 400 },
    );
  }

  try {
    const cached = henkeLblTextByAtom.get(atom);
    if (cached !== undefined) {
      return NextResponse.json({ data: cached });
    }

    const url = henkeLblElementNffUrl(atom);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "X-ray Atlas/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch form factor for ${atom}: ${response.statusText}` },
        { status: response.status },
      );
    }

    const text = await response.text();
    henkeLblTextByAtom.set(atom, text);
    return NextResponse.json({ data: text });
  } catch (error) {
    console.error(`Error fetching atomic form factor for ${atom}:`, error);
    return NextResponse.json(
      {
        error:
        error instanceof Error
          ? error.message
          : "Failed to fetch atomic form factor",
      },
      { status: 500 },
    );
  }
}
