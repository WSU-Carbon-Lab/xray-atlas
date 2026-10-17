/**
 * Proxies CXRO Henke `.nff` tables for a single element. Caches successful response bodies in module
 * memory so repeated requests for the same symbol skip upstream I/O within this Node process.
 */
import { NextResponse } from "next/server";
import { henkeLblElementNffUrl } from "~/lib/henke-nff-cxro";

const henkeLblTextByAtom = new Map<string, string>();

type HenkeLblLoadResult =
  | { readonly ok: true; readonly text: string }
  | {
      readonly ok: false;
      readonly status: number;
      readonly statusText: string;
    };

const henkeLblInflightByAtom = new Map<string, Promise<HenkeLblLoadResult>>();

/**
 * Loads one Henke `.nff` body for `atom`, sharing a single upstream fetch across overlapping callers.
 *
 * Successful bodies stay in the module cache. Upstream HTTP failures are not cached, so a later
 * request retries. Network failures reject and also leave the cache empty.
 */
function loadHenkeLblText(atom: string): Promise<HenkeLblLoadResult> {
  const cached = henkeLblTextByAtom.get(atom);
  if (cached !== undefined) {
    return Promise.resolve({ ok: true, text: cached });
  }
  const existing = henkeLblInflightByAtom.get(atom);
  if (existing) {
    return existing;
  }
  const pending = fetchHenkeLblText(atom);
  henkeLblInflightByAtom.set(atom, pending);
  return pending;
}

async function fetchHenkeLblText(atom: string): Promise<HenkeLblLoadResult> {
  try {
    const response = await fetch(henkeLblElementNffUrl(atom), {
      headers: {
        "User-Agent": "X-ray Atlas/1.0",
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }
    const text = await response.text();
    henkeLblTextByAtom.set(atom, text);
    return { ok: true, text };
  } finally {
    henkeLblInflightByAtom.delete(atom);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const atom = searchParams.get("atom");

  if (!atom) {
    return NextResponse.json(
      {
        error: "Atom parameter is required.",
        example: "/api/physics/atomic-form-factor?atom=C",
      },
      { status: 400 },
    );
  }

  if (!/^[A-Z][a-z]?$/.test(atom)) {
    return NextResponse.json({ error: "Invalid atom symbol" }, { status: 400 });
  }

  try {
    const loaded = await loadHenkeLblText(atom);
    if (!loaded.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch form factor for ${atom}: ${loaded.statusText}`,
        },
        { status: loaded.status },
      );
    }
    return NextResponse.json({ data: loaded.text });
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
