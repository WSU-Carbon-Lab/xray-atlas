import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";

export const metadata: Metadata = { title: "Python: Examples", alternates: { canonical: "/docs/python/examples" } };

const searchCode = `import xrayatlas as xa

# 1. Search the catalog for the molecule (zinc phthalocyanine)
results = xa.datasets.search(molecule_id="zinc-phthalocyanine")
for summary in results:
    print(summary.atlas_id, summary.facility, summary.edge_name, summary.version)`;

const searchOut = `193bc0c5  Australian Synchrotron  C(K)  1.4.0
a7f2c1d9  ALS 5.3.2.2  C(K)  1.2.0`;

const pullCode = `# 2. Pull molecule info and the datasets present
ds_ansto = xa.datasets.get("d/193bc0c5")          # the ANSTO dataset
ds_als   = xa.datasets.get("d/a7f2c1d9")          # the ALS dataset

print("molecule:", ds_ansto.molecule_name)
print("geometries (ANSTO):", ds_ansto.geometries())
print("geometries (ALS):", ds_als.geometries())`;

const pullOut = `molecule: zinc phthalocyanine
geometries (ANSTO): [(55, 0), (90, 0)]
geometries (ALS): [(55, 0), (90, 0), (90, 45)]`;

const plotCode = `# 3. Plot both datasets and compare
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
for label, ds in [("ANSTO", ds_ansto), ("ALS", ds_als)]:
    f = ds.spectra()
    ax.plot(f["energy_ev"], f["od"], label=label)
ax.set_xlabel("Energy (eV)")
ax.set_ylabel("Optical density")
ax.legend()
fig.tight_layout()
fig.savefig("compare.png", dpi=150)`;

const plotOut = `saved compare.png`;

const focusCode = `# 4. Focus on the ANSTO dataset
ds = ds_ansto
frame = ds.spectra()
print(frame[["energy_ev", "theta_deg", "phi_deg", "od", "beta"]].head(4).to_string(index=False))`;

const focusOut = `energy_ev  theta_deg  phi_deg  od     beta
280.0      55         0        0.0229 0.00020
280.4      55         0        0.0219 0.00020
280.8      55         0        0.0190 0.00020
281.2      55         0        0.0172 0.00019`;

const peakCode = `# 5. Peak fitting using DFT-cluster seeds (19 peaks, real locations)
import pandas as pd

# Locations/widths/heights from lr-optical-models ZnPc fit (bb/peaks.json).
peaks = xa.validate_peaks(pd.DataFrame({
    "center_ev": [284.22, 285.06, 285.51, 286.10, 286.74, 287.07,
                  287.61, 288.16, 288.57, 288.87, 289.38, 290.21,
                  291.75, 293.50, 295.37, 298.52, 303.16, 307.16, 313.50],
    "kind": ["pi-star"] * 12 + ["sigma-star"] * 7,
}))
print("peaks:", len(peaks))
print(peaks[["center_ev", "kind"]].head(6).to_string(index=False))
print("... (19 total)")`;

const peakOut = `peaks: 19
center_ev  kind
284.22     pi-star
285.06     pi-star
285.51     pi-star
286.10     pi-star
286.74     pi-star
287.07     pi-star
... (19 total)`;

const uploadCode = `# 6. Fake an upload of the model (dry run: no network write)
with xa.model(datasets=[ds], title="ZnPc model (draft)") as builder:
    builder.peaks = peaks
    builder.normalization = xa.Normalization(pre=(280.0, 283.0), post=(325.0, 340.0))
    draft = builder.save()        # saves a draft; does not publish
print("draft", draft.atlas_id, draft.version, "(not published)")`;

const uploadOut = `draft m/znpc-draft 0.1.0-draft (not published)`;

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-foreground text-3xl font-semibold">Worked example: ZnPc</h1>
        <p className="text-muted leading-7">
          A full workflow against the real dataset <code className="text-foreground">xrayatlas.wsu.edu/d/193bc0c5</code>: search, pull, plot, compare, focus, peak fit, and a dry-run upload. The plot is a real export from the pulled data. Other printed outputs are illustrative of the call shapes.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-foreground text-2xl font-semibold">1. Search for the molecule</h2>
        <DocsCodeBlock code={searchCode} />
        <p className="text-muted text-sm">Output:</p>
        <DocsCodeBlock code={searchOut} />
      </section>

      <section className="space-y-3">
        <h2 className="text-foreground text-2xl font-semibold">2. Pull molecule info and datasets</h2>
        <DocsCodeBlock code={pullCode} />
        <p className="text-muted text-sm">Output:</p>
        <DocsCodeBlock code={pullOut} />
      </section>

      <section className="space-y-3">
        <h2 className="text-foreground text-2xl font-semibold">3. Plot and compare datasets</h2>
        <DocsCodeBlock code={plotCode} />
        <p className="text-muted text-sm">Output:</p>
        <DocsCodeBlock code={plotOut} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/docs/python/znpc-real.svg" alt="Comparison plot of datasets" className="max-w-2xl rounded-md border border-border/40" />
      </section>

      <section className="space-y-3">
        <h2 className="text-foreground text-2xl font-semibold">4. Focus on the ANSTO dataset</h2>
        <DocsCodeBlock code={focusCode} />
        <p className="text-muted text-sm">Output:</p>
        <DocsCodeBlock code={focusOut} />
      </section>

      <section className="space-y-3">
        <h2 className="text-foreground text-2xl font-semibold">5. Peak fitting</h2>
        <DocsCodeBlock code={peakCode} />
        <p className="text-muted text-sm">Output:</p>
        <DocsCodeBlock code={peakOut} />
      </section>

      <section className="space-y-3">
        <h2 className="text-foreground text-2xl font-semibold">6. Fake upload (dry run)</h2>
        <DocsCodeBlock code={uploadCode} />
        <p className="text-muted text-sm">Output:</p>
        <DocsCodeBlock code={uploadOut} />
      </section>
    </article>
  );
}