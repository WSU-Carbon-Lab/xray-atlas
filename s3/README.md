# S3 NEXAFS backlog: legacy layout and migration notes

This directory holds a **frozen export** of Carbon Lab NEXAFS molecule data (structures, spectrum JSON/CSV, and metadata) that predates the X-ray Atlas PostgreSQL schema. Use it as a **staging area**: interpret each record, reconcile errors against primary sources (including SharePoint originals), and only then insert rows through the app or controlled import scripts after **explicit approval**.

---

## Directory layout

| Path | Role |
|------|------|
| `MOLECULES/INDEX.json` | **Catalog** of all molecules: `name`, `synonyms`, `chemical_formula`, `description`, `SMILES`, `InChI`, `img` (often a GitHub raw SVG URL). Folder name under `MOLECULES/` should match `name`, but treat the catalog as the intended identity when folder metadata disagrees. |
| `MOLECULES/<NAME>/` | One folder per molecule (e.g. `ITIC`). Contains structure assets (`*.cdxml`, `IMG.svg`), **`METADATA.json`** (per-molecule index of measurements), and paired **`*.json` / `*.csv`** spectrum files. |
| `MOLECULES/<NAME>/METADATA.json` | Per-molecule **measurement index** (see below). In this repo the file is named `METADATA.json`, not `INDEX.json`. |

**Spectrum path and basename convention (S3 / export layout):**

Full pattern:

`MOLECULES/<molecule-short-name>/<absorption-atom(<edge>)>_<experiment-type>_<facility-short-name>_<instrument-short-name>_<research-group>_<vendor>.{csv,json}`

The first path segment after `MOLECULES/` is the **molecule short name** (folder name). The **file basename** is six underscore-separated tokens:

| Token | Role | Example |
|-------|------|---------|
| 1 | **Absorption atom and edge** | `C(K)`, `N(K)`, `S(K)` |
| 2 | **Experiment type** (detection mode shorthand) | `TEY`, `PEY`, `FY`, `Trans`, ... |
| 3 | **Facility short name** | `ANSTO`, `ALS`, `NSLSII`, ... |
| 4 | **Instrument short name** (beamline / endstation) | `SXR`, `BL532`, `SMI`, ... |
| 5 | **Research group** | `Collins`, ... |
| 6 | **Vendor** (or provenance label: collaborator batch, supplier, internal tag) | `1-Material`, `Sigma-Aldrich`, `Wei-You-Group`, ... |

Example (matches a file in this tree):

`MOLECULES/ITIC/C(K)_TEY_ANSTO_SXR_Collins_1-Material.csv`

The same basename appears as `.json` for the rich metadata + array export. Spelling and spacing in the vendor (and occasionally other) segments are **not normalized** across files (e.g. `Sigma Aldrich` vs `Sigma-Aldrich`).

## Approved vendor normalization set

Use the following canonical `vendors.name` values during import (optional `url` filled by `db:upsert:backlog-vendors`):

| `vendors.name` | Typical `url` |
|----------------|---------------|
| `1-Material` | https://www.1-material.com/ |
| `Sigma-Aldrich` | https://www.sigmaaldrich.com/ |
| `Nano-C, Inc.` | https://www.nano-c.com/ |
| `Wei You Group` | https://you.chem.unc.edu/ |

Raw-to-canonical mapping:

| Raw value in backlog | Canonical vendor |
|----------------------|------------------|
| `1-Material` | `1-Material` |
| `Sigma Aldrich` | `Sigma-Aldrich` |
| `Sigma-Aldrich` | `Sigma-Aldrich` |
| `Nano-C-nanostructured-carbon` | `Nano-C, Inc.` |
| `Nano-C-nanostructured-carbon-` | `Nano-C, Inc.` |
| `Wei-You-Group` | `Wei You Group` |

Molecule-by-molecule rows (METADATA vs filenames, canonical vendor): see [`MOLECULE_VENDOR_ASSIGNMENT.md`](MOLECULE_VENDOR_ASSIGNMENT.md). Regenerate with `bun run scripts/generate-molecule-vendor-assignment.ts` after backlog edits. Upsert those four `vendors.name` rows with Prisma: `bun run db:upsert:backlog-vendors`.

---

## Legacy per-molecule index: `METADATA.json`

Each `METADATA.json` wraps a single object:

- **`molecule`**: repeats catalog-like fields plus a **`data`** array.

Each element of **`data`** describes one logical spectrum line in the old system:

| Legacy field | Meaning |
|--------------|---------|
| `edge` | Absorption edge in shorthand, e.g. `C(K)`, `N(K)`, `S(K)`. |
| `method` | Detection / mode shorthand: `TEY`, `PEY`, `FY`, `Trans`, etc. |
| `facility` | Short facility label: `ANSTO`, `ALS`, `NSLSII`, ... |
| `instrument` | Beamline or endstation short name: `SXR`, `BL532`, `SMI`, ... |
| `group` | Contributing research group; Collins-group data use `"Collins"`. |
| `source` | Vendor, collaborator batch label, or sample provenance string (maps loosely to **sample** vendor / notes in the new schema). |

**Important:** `METADATA.json` under a folder can disagree with the folder name or with `MOLECULES/INDEX.json`. Before import, resolve identity using the catalog **and** SharePoint Excel originals. A concrete example in this tree: the **`PBDB-T`** and **`PBTTT`** folders currently carry **swapped** `molecule.name` values inside their respective `METADATA.json` files; the top-level `INDEX.json` entries are internally consistent for those two molecules. Treat such cases as **data bugs** to fix during curation, not as ground truth.

---

## Legacy spectrum JSON (paired with CSV)

Each `*.json` next to a CSV is the rich export used for plotting and provenance. Top-level sections:

| Section | Content |
|---------|---------|
| `user` | `name`, `affiliation`, `group`, `email`, `doi`. Often Harlan Heilman as measurer; `group` matches `Collins` style metadata. |
| `instrument` | `facility`, `instrument`, `edge`, `normalization_method`, `technique`, `technical_details`. |
| `sample` | `vendor`, `preparation_method` (`method`, `details`), `mol_orientation_details`. |
| `dataset` | Array of measurement objects. Typical fields include `geometry` (`e_field_azimuth`, `e_field_polar`), `energy` (`signal` array and matching absorption array), and related arrays for processed curves depending on export version. |

CSV mirrors the same scan with headers such as `Energy [eV]`, `mu`, `theta`, `phi`. The contribute pipeline treats **`mu`** as the absorption column.

**Normalization:** Legacy `normalization_method` strings (e.g. `"0 - 1"`) are **not** the same as X-ray Atlas `calibrationmethods` or in-app normalization records. Map case-by-case after review.

---

## SharePoint source of truth (Excel)

For mismatched identifiers, wrong InChI/SMILES/formula pairs, or ambiguous vendors, compare against the originating workbooks under the shared library (local OneDrive path on lab machines):

`.../Carbon Lab Research Group - Documents/NEXAFS Database Project/MOLECULES(OLD)/`

Use those files to decide correct **molecule identity**, **sample provenance**, and **measurement metadata** before writing to the database.

---

## Target schema (X-ray Atlas / Prisma): mapping guide

The live backend centers on **molecules**, **samples**, **experiments**, **spectrumpoints**, **instruments**, **facilities**, **edges**, **polarizations**, **vendors**, and optional **calibrationmethods**. Key differences from the legacy export:

### Molecule

| Legacy | New (`molecules`) |
|--------|-------------------|
| `description` (long text) | Maps to **`iupacname`** (or a curated IUPAC-style title), not a separate description column. |
| `name` | Use as **common** display name in UI flows; ensure **unique** `samples.identifier` and consistent synonyms via **`moleculesynonyms`**. |
| `SMILES` / `InChI` / `chemical_formula` | **`smiles`**, **`inchi`**, **`chemicalformula`**. Validate together; several legacy rows have known inconsistencies. |
| `img` URL | **`imageurl`** if still valid. |
| `casnumber` / `pubchemcid` | Often absent in legacy JSON; leave null unless verified. |

### Sample

| Legacy | New (`samples`) |
|--------|-----------------|
| `sample.vendor` string | Resolve to **`vendors`** (unique `name`) or create after approval; link **`samples.vendorid`**. |
| `preparation_method.method` / `details` | **`processmethod`** is an enum (`DRY` \| `SOLVENT`) in the DB; free-form details may need **`solvent`**, **`substrate`**, **`thickness`**, or future notes strategy—confirm with product rules before stuffing unstructured text into typed fields. |
| (implicit: one material per folder) | **`identifier`** must be unique globally (e.g. convention including molecule + batch + source). |

### Experiment

| Legacy | New (`experiments`) |
|--------|---------------------|
| `edge` e.g. `C(K)` | Resolve **`edges`** row: **`targetatom`** + **`corestate`** (e.g. C + K). |
| `facility` + `instrument` | Resolve **`instruments.id`** (string PK) belonging to **`facilities`**. IDs in DB are **not** the short labels in filenames; look up by facility name + instrument name in the live catalog. |
| `method` / `technique` | Map to **`experimenttype`**: `TEY` ~ **`TOTAL_ELECTRON_YIELD`**; `PEY` ~ **`PARTIAL_ELECTRON_YIELD`**; `FY` ~ **`FLUORESCENT_YIELD`**; `Trans` / transmission ~ **`TRANSMISSION`**. Confirm edge cases (mixed modes, custom labels). |
| Geometry | **`polarizations`**: **`polardeg`**, **`azimuthdeg`** from `e_field_polar` / `e_field_azimuth` (or CSV `theta`/`phi`—verify convention matches app expectations). |
| Measurement date | **`measurementdate`** (**required** `Date`); legacy JSON may omit it—must be recovered from Excel or lab logs. |
| Who uploaded / owns row | **`createdby`** on experiments (and related rows) should align with authenticated **`next_auth.user.id`** where applicable. |

### Spectrum

| Legacy | New (`spectrumpoints`) |
|--------|------------------------|
| Energy + mu arrays | One row per point: **`energyev`**, **`rawabs`** (and **`processedabs`** / **`i0`** if applicable). |
| Duplicate energies | DB enforces **unique (`experimentid`, `energyev`)**; deduplicate on import. |

### Uniqueness

`experiments` has **`@@unique([sampleid, edgeid, instrumentid, measurementdate])`**. Legacy exports can produce multiple geometries or scans on the same day on the same beamline: those may require **distinct samples**, **distinct measurement dates** (if accurate), or **multiple experiments** only if the uniqueness rule is satisfied—plan each insert accordingly.

---

## Collins group and database users

Legacy metadata uses **`group: "Collins"`** for the experimentalist group. In the production **`next_auth.user`** table, the following accounts exist (all **`role`**: `contributor`). **Emails are currently unset** in the database; use **`id`** for `createdby` / attribution when linking actions to accounts:

| Name | User id (UUID) | ORCID |
|------|----------------|-------|
| Harlan Heilman | `26387067-f1bc-4a2e-92c8-c475d0112095` | `0000-0002-6371-2123` |
| Obaid Alqahtani | `05f4c269-2d65-41f1-a8e1-db19fbb87e4b` | (none) |
| Brian A. Collins | `438a9ce0-cd5c-41b2-951d-33252a4a164b` | `0000-0003-2047-8418` |

**Attribution policy:** Many JSON files list Harlan Heilman under `user`. That reflects **measurement / file authorship** in the export, not necessarily the sole **`createdby`** for every Atlas row. For **molecule**-level credit, the app also supports **`moleculecontributors`** (`contribution_type`, `user_id`). Decide per dataset whether to attach contributors, experiment creators, or both, and document the choice in the import ticket.

---

## Recommended curation workflow

1. Pick a molecule folder; read **`MOLECULES/INDEX.json`** and **`METADATA.json`**; flag any mismatch with folder name or paired spectrum filenames.
2. Open matching Excel in **`MOLECULES(OLD)`** on SharePoint to fix identity, dates, and vendors.
3. Build a **mapping sheet** (edge, instrument id, experiment type, polarization, sample id, measurement date, contributor ids) for human review.
4. After approval, insert **facility/instrument/edge/vendor** references only as already defined in Atlas, or follow the contribute flows to register missing entities first.
5. Bulk-load spectrum points only after the parent **experiment** row exists and passes uniqueness checks.

---

## Related code in this repo

- Prisma models: `prisma/schema.prisma` (`molecules`, `samples`, `experiments`, `spectrumpoints`, `instruments`, `facilities`, `edges`, etc.).
- Contribute NEXAFS typing and enums: `src/features/process-nexafs/` (`ExperimentType`, column expectations for CSV).
- Molecule JSON parsing (upload): `src/app/contribute/molecule/utils/parseMoleculeJson.ts` (field names differ from legacy `METADATA.json`; adapters are required).

This README is descriptive only; it does not perform imports. All database writes should follow project review and validation practices.
