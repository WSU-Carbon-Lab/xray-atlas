import { NextResponse } from "next/server";

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
    // CXRO/LBL database requires lowercase element names
    const atomLower = atom.toLowerCase();
    const url = `https://henke.lbl.gov/optical_constants/sf/${atomLower}.nff`;
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
