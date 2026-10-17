/**
 * Builds `src/features/home/snapshot/home-snapshot.generated.ts` from the
 * database. Run manually after curation changes: `bun run home:snapshot`.
 * Throws (non-zero exit) if any curated record is missing or the output
 * breaks the 25 KB gzip budget, so a bad snapshot is never written.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import pg from "pg";
import {
  buildLinearScale,
  buildTracePath,
  decimateSorted,
  niceTicks,
  SPECTRUM_PAD,
  type XY,
} from "../../src/features/home/snapshot/svg-paths";
import type {
  HomeEdgeOption,
  HomeSnapshot,
  HomeSnapshotLink,
  HomeSnapshotMolecule,
  HomeSpectrumBand,
  HomeSpectrumMarker,
  HomeSpectrumTab,
} from "../../src/features/home/snapshot/types";

/** Curated molecules: P3HT plus a small-molecule dye and an N/S-edge acceptor. */
const CURATED: ReadonlyArray<{ slug: string; blurb: string }> = [
  {
    slug: "p3ht",
    blurb:
      "A benchmark conjugated polymer whose carbon edge reads out backbone orientation.",
  },
  {
    slug: "cu-phthalocyanine",
    blurb:
      "A planar metal-organic dye and a classic NEXAFS reference for how flat molecules stand or lie on a surface.",
  },
  {
    slug: "y6",
    blurb:
      "A high-performance non-fullerene acceptor whose nitrogen and sulfur edges separate its end groups from its fused core.",
  },
];
/**
 * Showcase experiment: Cu phthalocyanine, C K, TEY. Chosen over the P3HT
 * C K experiment (775e9e6a-...) because it has four geometries, finite beta
 * and delta, and parseable normalization windows, so all four tabs render.
 */
const SHOWCASE_EXPERIMENT_ID = "1de3a908-8310-427a-bff8-1722c3538ce8";
const ELEMENT_NAMES: Record<string, string> = {
  C: "Carbon",
  N: "Nitrogen",
  O: "Oxygen",
  F: "Fluorine",
  S: "Sulfur",
};
const DETECTION_LABEL: Record<string, string> = {
  TOTAL_ELECTRON_YIELD: "total electron yield",
  PARTIAL_ELECTRON_YIELD: "partial electron yield",
  FLUORESCENT_YIELD: "fluorescence yield",
  TRANSMISSION: "transmission",
};
interface ExperimentEdge {
  symbol: string;
  coreState: string;
  title: string;
}
const W = 720;
const H = 360;
const PAD = SPECTRUM_PAD;
const MAX_POINTS = 260;
const BUDGET_BYTES = 25 * 1024;
const OUT = path.resolve(
  "src/features/home/snapshot/home-snapshot.generated.ts",
);

const DETECTION: Record<string, string> = {
  TOTAL_ELECTRON_YIELD: "TEY",
  PARTIAL_ELECTRON_YIELD: "PEY",
  FLUORESCENT_YIELD: "FY",
  TRANSMISSION: "TRANS",
};

interface PointRow {
  energyev: number;
  rawabs: number;
  od: number | null;
  beta: number | null;
  delta: number | null;
  polardeg: number | null;
  azimuthdeg: number | null;
}

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL required");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const molecules = [] as HomeSnapshotMolecule[];
    for (const c of CURATED) {
      const m = await client.query<{
        id: string;
        synonym: string;
        chemicalformula: string;
        imageurl: string | null;
        favorite_count: number;
      }>(
        `select m.id, s.synonym, m.chemicalformula, m.imageurl, m.favorite_count
           from moleculesynonyms s join molecules m on m.id = s.moleculeid
          where s.slug = $1 order by s."order" limit 1`,
        [c.slug],
      );
      const row = m.rows[0];
      if (!row) throw new Error(`curated molecule not found: ${c.slug}`);
      const links = await client.query<{
        id: string;
        targetatom: string;
        corestate: string;
        experimenttype: string | null;
        instrument: string;
        facility: string;
      }>(
        `select e.id, ed.targetatom, ed.corestate, e.experimenttype,
                i.name as instrument, f.name as facility
           from experiments e
           join samples sa on sa.id = e.sampleid
           join edges ed on ed.id = e.edgeid
           join instruments i on i.id = e.instrumentid
           join facilities f on f.id = i.facilityid
          where sa.moleculeid = $1
          order by e.createdat desc`,
        [row.id],
      );
      molecules.push({
        id: row.id,
        slug: c.slug,
        name: row.synonym,
        formula: row.chemicalformula,
        imageUrl: row.imageurl,
        blurb: c.blurb,
        datasetCount: links.rowCount ?? 0,
        favoriteCount: row.favorite_count,
        links: links.rows.slice(0, 4).map((l): HomeSnapshotLink => ({
          experimentId: l.id,
          edge: `${l.targetatom} ${l.corestate}`,
          detection: DETECTION[l.experimenttype ?? ""] ?? "NEXAFS",
          instrument: l.instrument,
          facility: l.facility,
        })),
      });
    }
    if (molecules.length !== 3) throw new Error("expected 3 molecules");

    const edgeRows = await client.query<{
      id: string;
      targetatom: string;
      corestate: string;
    }>(
      `select distinct ed.id, ed.targetatom, ed.corestate
         from edges ed join experiments e on e.edgeid = ed.id
        order by ed.targetatom, ed.corestate`,
    );
    const edges: HomeEdgeOption[] = edgeRows.rows.map((r) => ({
      symbol: r.targetatom,
      edgeId: r.id,
      label: `${r.targetatom} ${r.corestate}`,
    }));

    const exp = await client.query<{
      normalization_ranges: unknown;
      slug: string;
      targetatom: string;
      corestate: string;
      experimenttype: string | null;
    }>(
      `select e.normalization_ranges, ed.targetatom, ed.corestate, e.experimenttype,
              (select s.slug from samples sa join moleculesynonyms s
                 on s.moleculeid = sa.moleculeid
                where sa.id = e.sampleid order by s."order" limit 1) as slug
         from experiments e join edges ed on ed.id = e.edgeid where e.id = $1`,
      [SHOWCASE_EXPERIMENT_ID],
    );
    const expRow = exp.rows[0];
    if (!expRow) throw new Error("showcase experiment not found");
    const pts = await client.query<PointRow>(
      `select sp.energyev, sp.rawabs, sp.od, sp.beta, sp.delta,
              p.polardeg::float8 as polardeg, p.azimuthdeg::float8 as azimuthdeg
         from spectrumpoints sp
         join experiments ex on ex.id = sp.experimentid
         left join polarizations p on p.id = coalesce(sp.polarizationid, ex.polarizationid)
        where sp.experimentid = $1
        order by sp.energyev`,
      [SHOWCASE_EXPERIMENT_ID],
    );
    const peaks = await client.query<{
      energyev: number;
      transition: string | null;
    }>(
      `select energyev, transition from peaksets where experimentid = $1 order by energyev`,
      [SHOWCASE_EXPERIMENT_ID],
    );

    const snapshot: HomeSnapshot = {
      generatedAt: new Date().toISOString(),
      molecules: [molecules[0]!, molecules[1]!, molecules[2]!],
      spectrum: buildSpectrum(
        expRow.slug,
        {
          symbol: expRow.targetatom,
          coreState: expRow.corestate,
          title: `${ELEMENT_NAMES[expRow.targetatom] ?? expRow.targetatom} ${expRow.corestate}-edge, ${DETECTION_LABEL[expRow.experimenttype ?? ""] ?? "NEXAFS"}`,
        },
        pts.rows,
        peaks.rows,
        expRow.normalization_ranges,
      ),
      edges,
    };
    const body = `/* Generated by scripts/home/build-home-snapshot.ts. Do not edit. */\nimport type { HomeSnapshot } from "./types";\n\nexport const HOME_SNAPSHOT: HomeSnapshot = ${JSON.stringify(snapshot)};\n`;
    const gz = gzipSync(body).byteLength;
    console.log(`snapshot ${body.length} B raw, ${gz} B gzip`);
    if (gz > BUDGET_BYTES) {
      throw new Error(`snapshot ${gz} B gzip exceeds ${BUDGET_BYTES} B budget`);
    }
    await writeFile(OUT, body, "utf8");
    const fmt = spawnSync("bunx", ["oxfmt", OUT], { stdio: "inherit" });
    if (fmt.status !== 0) throw new Error("oxfmt failed on generated snapshot");
  } finally {
    await client.end();
  }
}

function buildSpectrum(
  slug: string,
  edge: ExperimentEdge,
  rows: readonly PointRow[],
  peaks: ReadonlyArray<{ energyev: number; transition: string | null }>,
  normalizationRaw: unknown,
): HomeSnapshot["spectrum"] {
  if (rows.length < 20) throw new Error("showcase spectrum has too few points");
  const eMin = rows[0]!.energyev;
  const eMax = rows[rows.length - 1]!.energyev;
  const sx = buildLinearScale([eMin, eMax], [PAD.l, W - PAD.r]);
  interface Geometry {
    theta: number;
    phi: number;
    rows: PointRow[];
  }
  const groups = new Map<string, Geometry>();
  for (const r of rows) {
    const theta = r.polardeg ?? 0;
    const phi = r.azimuthdeg ?? 0;
    const k = `${theta}|${phi}`;
    const g = groups.get(k) ?? { theta, phi, rows: [] };
    g.rows.push(r);
    groups.set(k, g);
  }
  const geoms = [...groups.values()].sort(
    (a, b) => a.theta - b.theta || a.phi - b.phi,
  );
  const multiPhi = new Set(geoms.map((g) => g.phi)).size > 1;
  const geomLabel = (g: Geometry): string =>
    multiPhi ? `θ = ${g.theta}°, φ = ${g.phi}°` : `θ = ${g.theta}°`;
  const primaryGeom = geoms.reduce((best, g) =>
    Math.abs(g.theta - 55) < Math.abs(best.theta - 55) ? g : best,
  );
  const primary = primaryGeom.rows;

  const series = (
    list: readonly PointRow[],
    pick: (r: PointRow) => number | null,
    yDomain: readonly [number, number],
  ): string => {
    const sy = buildLinearScale(yDomain, [H - PAD.b, PAD.t]);
    const xy: XY[] = [];
    for (const r of list) {
      const v = pick(r);
      if (v != null && Number.isFinite(v))
        xy.push({ x: sx(r.energyev), y: sy(v) });
    }
    return buildTracePath(decimateSorted(xy, MAX_POINTS));
  };
  const extent = (
    lists: ReadonlyArray<readonly PointRow[]>,
    pick: (r: PointRow) => number | null,
  ): [number, number] | null => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const l of lists)
      for (const r of l) {
        const v = pick(r);
        if (v != null && Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    if (!Number.isFinite(lo)) return null;
    const pad = (hi - lo) * 0.06;
    return [lo - pad, hi + pad];
  };

  const tabs: HomeSpectrumTab[] = [];
  const odExt = extent([primary], (r) => r.od);
  if (odExt) {
    const pi = peaks.filter(
      (p) =>
        /pi/i.test(p.transition ?? "") && !/sigma/i.test(p.transition ?? ""),
    );
    const bands: HomeSpectrumBand[] = [];
    if (edge.symbol === "C" && edge.coreState === "K") {
      const sigmaStart = 288;
      let piStart = pi[0]?.energyev;
      let piEnd = pi.at(-1)?.energyev;
      if (piStart === undefined || piEnd === undefined) {
        console.warn(
          "no pi* peaks in peaksets; using default 284-288 eV pi* window",
        );
        piStart = 284;
        piEnd = sigmaStart;
      }
      const piStop = Math.min(piEnd + 1, sigmaStart - 0.25);
      bands.push(
        {
          x0: sx(piStart),
          x1: sx(Math.max(piStart, piStop)),
          kind: "pi",
          label: "π*",
        },
        {
          x0: sx(sigmaStart),
          x1: sx(Math.min(eMax, 310)),
          kind: "sigma",
          label: "σ*",
        },
      );
    } else {
      console.warn(
        `skipping pi*/sigma* bands: only defined for C K, got ${edge.symbol} ${edge.coreState}`,
      );
    }
    tabs.push({
      id: "absorption",
      label: "Absorption",
      caption:
        "Sharp π* resonances below the edge, broad σ* shape resonances above it. The fingerprint of the local bonding at this edge.",
      wikiHref: "/wiki/nexafs/quantities",
      yLabel: "Optical density",
      traces: [
        {
          key: "od",
          label: geomLabel(primaryGeom),
          d: series(primary, (r) => r.od, odExt),
          tone: "primary",
        },
      ],
      bands,
      markers: [],
    });
  }
  if (geoms.length >= 2) {
    const ext = extent(
      geoms.map((g) => g.rows),
      (r) => r.od,
    );
    if (ext) {
      tabs.push({
        id: "polarization",
        label: "Polarization",
        caption:
          "Rotating the X-ray polarization relative to the film reweights π* and σ* intensity. That is how NEXAFS reads molecular orientation.",
        wikiHref: "/wiki/nexafs/orientation",
        yLabel: "Optical density",
        traces: geoms.map((g, i) => ({
          key: `geom-${g.theta}-${g.phi}`,
          label: geomLabel(g),
          d: series(g.rows, (r) => r.od, ext),
          tone: { ramp: i / (geoms.length - 1) },
        })),
        bands: [],
        markers: isosbestic(
          geoms.map((g) => g.rows),
          sx,
          ext,
        ),
      });
    }
  }
  const windows = parseWindows(normalizationRaw);
  const rawExt = extent([primary], (r) => r.rawabs);
  if (windows && rawExt && odExt) {
    tabs.push({
      id: "normalization",
      label: "Normalization",
      caption:
        "Pre- and post-edge windows pin the signal to zero below the edge and to the atomic step above it, turning detector counts into a comparable spectrum.",
      wikiHref: "/wiki/nexafs/normalization",
      yLabel: "Signal (scaled)",
      traces: [
        {
          key: "raw",
          label: "Raw signal",
          d: series(primary, (r) => r.rawabs, rawExt),
          tone: "muted",
          dashed: true,
        },
        {
          key: "od",
          label: "Normalized",
          d: series(primary, (r) => r.od, odExt),
          tone: "primary",
        },
      ],
      bands: [
        {
          x0: sx(windows.pre[0]),
          x1: sx(windows.pre[1]),
          kind: "pre",
          label: "pre-edge",
        },
        {
          x0: sx(windows.post[0]),
          x1: sx(windows.post[1]),
          kind: "post",
          label: "post-edge",
        },
      ],
      markers: [],
    });
  }
  const betaExt = extent([primary], (r) => r.beta);
  const deltaExt = extent([primary], (r) => r.delta);
  if (betaExt && deltaExt) {
    const joint: [number, number] = [
      Math.min(betaExt[0], deltaExt[0]),
      Math.max(betaExt[1], deltaExt[1]),
    ];
    tabs.push({
      id: "optical",
      label: "Optical constants",
      caption:
        "β is the absorptive part of the refractive index; δ follows from it by a Kramers-Kronig transform (kkcalc lineage, Ben Watts).",
      wikiHref: "/wiki/nexafs/optical-constants",
      yLabel: "β, δ (dimensionless)",
      traces: [
        {
          key: "beta",
          label: "β",
          d: series(primary, (r) => r.beta, joint),
          tone: "primary",
        },
        {
          key: "delta",
          label: "δ",
          d: series(primary, (r) => r.delta, joint),
          tone: "muted",
        },
      ],
      bands: [],
      markers: [],
    });
  }
  if (tabs.length === 0) throw new Error("showcase spectrum produced no tabs");
  return {
    moleculeSlug: slug,
    experimentId: SHOWCASE_EXPERIMENT_ID,
    title: edge.title,
    width: W,
    height: H,
    xTicks: niceTicks([eMin, eMax], 6).map((e) => ({
      x: sx(e),
      label: String(e),
    })),
    tabs,
  };
}

/** Energy in 285-295 eV minimizing spread across theta traces (nearest-sample lookup). */
function isosbestic(
  lists: ReadonlyArray<readonly PointRow[]>,
  sx: (v: number) => number,
  yDomain: readonly [number, number],
): HomeSpectrumMarker[] {
  const sy = buildLinearScale(yDomain, [H - PAD.b, PAD.t]);
  const base = lists[0]!.filter(
    (r) => r.energyev >= 285 && r.energyev <= 295 && r.od != null,
  );
  let best: { e: number; y: number; spread: number } | null = null;
  for (const r of base) {
    const vals = lists
      .map((l) => nearest(l, r.energyev)?.od)
      .filter((v): v is number => v != null);
    if (vals.length !== lists.length) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const spread = Math.max(...vals) - Math.min(...vals);
    if (!best || spread < best.spread)
      best = { e: r.energyev, y: mean, spread };
  }
  return best
    ? [
        {
          x: sx(best.e),
          y: sy(best.y),
          label: `isosbestic ~${best.e.toFixed(1)} eV`,
        },
      ]
    : [];
}

function nearest(list: readonly PointRow[], e: number): PointRow | undefined {
  let best: PointRow | undefined;
  for (const r of list)
    if (!best || Math.abs(r.energyev - e) < Math.abs(best.energyev - e))
      best = r;
  return best;
}

function parseWindows(
  raw: unknown,
): { pre: [number, number]; post: [number, number] } | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as {
    pre?: unknown;
    post?: unknown;
    od?: { pre?: unknown; post?: unknown };
  };
  const src = o.od ?? o;
  const isPair = (v: unknown): v is [number, number] =>
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => typeof n === "number" && Number.isFinite(n));
  return isPair(src.pre) && isPair(src.post)
    ? { pre: src.pre, post: src.post }
    : null;
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
