export const exampleBase =
  "https://github.com/WSU-Carbon-Lab/atlas-python/blob/main/examples";

export const quickstart = `import xrayatlas as xa

ds = xa.datasets.get("d/abcd2345")  # current version, pinned and cached
frame = ds.spectra()  # derived channels where the dataset has them
frame.to_csv("abcd2345.csv", index=False)

model = xa.models.get("m/k7m2xq4n")  # latest published version
peaks = model.peaks  # one row per stored peak`;

export const explicitClient = `import xrayatlas as xa

with xa.Client(host="https://xrayatlas.wsu.edu") as client:
    ds = xa.datasets.get("d/abcd2345", client=client)`;

export const datasetReads = `ds = xa.datasets.get("d/abcd2345")
old = xa.datasets.get("d/abcd2345", "1.0.2")

derived = ds.spectra()  # energy_ev, theta_deg, phi_deg, raw_abs, i0, od, mass_absorption, beta, delta
raw = ds.spectra(raw=True)  # energy_ev, theta_deg, phi_deg, raw_abs, i0
geometries = ds.geometries()  # distinct ordered (theta_deg, phi_deg) pairs
files = ds.aux_files.download("aux/", kind="sample")
bibtex = ds.bibtex()
linked_models = ds.models(scope="all")`;

export const datasetSearch = `for summary in xa.datasets.search(molecule_id="<molecule-uuid>", page_size=50):
    dataset = summary.load()
    print(dataset.atlas_id, dataset.molecule_name, len(dataset.spectra()))`;

export const modelReads = `m = xa.models.get("m/k7m2xq4n")  # latest published version
v2 = xa.models.get("m/k7m2xq4n", 2)  # one published version
draft = xa.models.get("m/k7m2xq4n", "draft")  # owner only

m.peaks  # DataFrame: ordinal, center_ev, kind, ..., params, fit_provenance
m.normalization  # the version's server-side normalization
source = m.datasets[0].load()  # the linked dataset at exactly its pinned version
channels = m.normalized(source)  # recomputed by the server under this version
lineage = m.lineage()  # visible ancestors, newest first
bibtex = m.cite()  # published versions only`;

export const tensorRead = `tensor = m.tensor
if tensor is not None and tensor.manifest is not None:
    values = tensor.load()  # float64 or complex128
    labels = tensor.manifest.components  # for example ["delta", "beta"]
    grid = tensor.manifest.energy_ev  # min, max, and count only`;

export const buildModel = `import numpy as np
import pandas as pd
import xrayatlas as xa

ds = xa.datasets.get("d/abcd2345")
energy = np.linspace(280.0, 340.0, 61)  # strictly increasing, at least 2 points
delta = np.linspace(0.0010, 0.0030, 61)
beta = np.linspace(0.0000, 0.0020, 61)

with xa.model(datasets=[ds], title="My model") as builder:
    builder.normalization = xa.Normalization(pre=(280.0, 283.0), post=(325.0, 340.0))
    builder.peaks = pd.DataFrame(
        {"center_ev": [285.4, 288.2], "kind": ["pi-star", "sigma-star"], "chi2": [1.1, 1.3]}
    )
    builder.tensor = xa.Tensor.from_array(
        np.stack([delta, beta], axis=1),
        energy_ev=energy,
        components=["delta", "beta"],
        frame="lab",
        units="1",
    )

published = builder.publish()  # explicit, never retried`;

export const perChannel = `builder.normalization = xa.Normalization(
    scope="per_channel",
    od=xa.WindowPair(pre=(280.0, 283.0), post=(325.0, 340.0)),
    massabsorption=xa.WindowPair(pre=(280.0, 283.0), post=(325.0, 340.0)),
    beta=xa.WindowPair(pre=(280.0, 283.0), post=(325.0, 340.0)),
)`;

export const afterPublish = `published.set_visibility("public")  # owner only
published.share(["0000-0002-1825-0097"])
published.review(ds, "approved", note="Checked against the reference spectrum.")

with published.fork(title="My model v2") as builder:
    builder.description = "Narrower post-edge window."
published_v2 = builder.publish()`;

export const compareModels = `m1 = xa.models.get("m/k7m2xq4n")
m2 = xa.models.get("m/p8q9r2s3")
comparison = xa.compare([m1, m2], tolerance_ev=0.2)

aligned = comparison.peaks  # center_ev, count, then one column per label
frames = comparison.spectra(ds, channel="mass_absorption")  # differences from m1`;

export const reproduce = `import xrayatlas as xa

xa.datasets.get("d/abcd2345")
xa.models.get("m/k7m2xq4n")
xa.lock("analysis.lock")  # pins the host, dataset versions, model versions, and checksums

xa.restore("analysis.lock")  # re-fetches exactly those revisions`;
