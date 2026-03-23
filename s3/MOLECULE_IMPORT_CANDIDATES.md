# Molecule import candidates (cleanup pass)

This is the curated set of molecule metadata to stage for database insertion, based on:

- `s3/MOLECULES/INDEX.json`
- PubChem/CAS consistency pass
- follow-up synonym and vendor-web checks

No database writes are performed by this document.

---

## Image upload requirement

Every molecule folder has a local image file named `IMG.svg`, and each should be uploaded before or during molecule creation.

| Molecule folder | Local image file | Action |
|---|---|---|
| `D18` | `s3/MOLECULES/D18/IMG.svg` | Upload |
| `ITIC` | `s3/MOLECULES/ITIC/IMG.svg` | Upload |
| `N2200` | `s3/MOLECULES/N2200/IMG.svg` | Upload |
| `P3HT` | `s3/MOLECULES/P3HT/IMG.svg` | Upload |
| `PBDB-T` | `s3/MOLECULES/PBDB-T/IMG.svg` | Upload |
| `PBTTT` | `s3/MOLECULES/PBTTT/IMG.svg` | Upload |
| `PC61BM` | `s3/MOLECULES/PC61BM/IMG.svg` | Upload |
| `PC71BM` | `s3/MOLECULES/PC71BM/IMG.svg` | Upload |
| `Y11` | `s3/MOLECULES/Y11/IMG.svg` | Upload |
| `Y6` | `s3/MOLECULES/Y6/IMG.svg` | Upload |

---

## Comprehensive molecule set for DB insertion

Recommended fields align with Prisma `molecules`: `iupacname`, `inchi`, `smiles`, `chemicalformula`, `casnumber`, `pubchemcid`, `imageurl` (or uploaded storage URL).

| Molecule | Recommended iupacname | InChI (normalized) | SMILES | Chemical formula | CAS | PubChem CID | Synonyms to store | Status |
|---|---|---|---|---|---|---:|---|---|
| D18 | Poly[(2,6-(4,8-bis(5-(2-ethylhexyl-3-fluoro)thiophen-2-yl)-benzo[1,2-b:4,5-b']dithiophene))-alt-5,5'-(5,8-bis(4-(2-butyloctyl)thiophen-2-yl)dithieno[3',2':3,4;2'',3'':5,6]benzo[1,2-c][1,2,5]thiadiazole)] | `InChI=1S/C69H80F2O2S7/c1-9-17-22-40(13-5)32-44-36-45(37-48(44)70)58-46-29-31-75-66(46)59(57-39-49(71)53(77-57)33-41(14-6)23-18-10-2)47-38-54(79-67(47)58)50-27-28-52(76-50)69-63-62(68(80-69)51-26-21-30-74-51)64(72)60-55(34-42(15-7)24-19-11-3)78-56(61(60)65(63)73)35-43(16-8)25-20-12-4/h21,26-31,37-43H,9-20,22-25,32-36H2,1-8H3` | from INDEX | `C76H92F2N2S7` | `2433725-54-1` (vendor-sourced) | (none) | `PCE18` | Review (no confident PubChem CID) |
| ITIC | 3,9-bis(2-methylene-(3-(1,1-dicyanomethylene)-indanone))-5,5,11,11-tetrakis(4-hexylphenyl)-dithieno[2,3-d:2',3'-d']-s-indaceno[1,2-b:5,6-b']dithiophene | from INDEX | from INDEX | `C94H82N4O2S4` | `1664293-06-4` | 126843541 | (none) | Ready |
| N2200 | Poly{[N,N'-bis(2-octyldodecyl)naphthalene-1,4,5,8-bis(dicarboximide)-2,6-diyl]-alt-5,5'-(2,2'-bithiophene)} | from INDEX | from INDEX | `C62H90N2O4S2` | `1100243-40-0` (vendor-sourced) | 102164850 | `PNDI(2OD)2T`, `PNDI-2T`, `P(NDI2OD-T2)` | Ready (formula corrected) |
| P3HT | Poly(3-hexylthiophene-2,5-diyl) | from INDEX | from INDEX | `C10H14S` | `104934-50-1` | 566849 | (none) | Review (polymer vs monomer formula mismatch in PubChem) |
| PBDB-T | Poly[(2,6-(4,8-bis(5-(2-ethylhexyl)thiophen-2-yl)-benzo[1,2-b:4,5-b']dithiophene))-alt-(5,5-(1',3'-di-2-thienyl-5',7'-bis(2-ethylhexyl)benzo[1',2'-c:4',5'-c']dithiophene-4,8-dione)] | from INDEX | from INDEX | `C68H78O2S8` | `1415929-80-4` (vendor-sourced) | (none) | `PCE12`, `PBDTBDD` | Ready (CAS-only; no confident CID) |
| PBTTT | Poly[2,5-bis(3-tetradecylthiophen-2-yl)thieno[3,2-b]thiophene] | from INDEX | from INDEX | `C42H62S4` | `888491-18-7` (vendor-sourced) | 57473786 | `PBTTT-C12` | Review (repeat-unit ambiguity vs C12/C14 variants) |
| PC61BM | [6,6]-Phenyl-C61-butyric acid methyl ester | from INDEX | from INDEX | `C72H14O2` | `160848-21-5` | 53384373 | `C60PCBM`, `C61PCBM`, `[60]PCBM` | Ready |
| PC71BM | [6,6]-Phenyl-C71-butyric acid methyl ester | from INDEX | from INDEX (replace with corrected C71-specific InChI/SMILES if available from source docs) | `C82H14O2` | `609771-63-3` | 71777692 | `C70 PCBM`, `[70]PCBM` | Review (existing InChI appears copied from PC61BM) |
| Y11 | 2,2'-((2Z,2'Z)-((6,12,13-tris(2-ethylhexyl)-3,9-diundecyl-12,13-dihydro-6H-thieno[2'',3'':4',5']thieno[2',3':4,5]pyrrolo[3,2-g]thieno[2',3':4,5]thieno[3,2b][1,2,3] triazolo [4,5-e]indole-2,10-diyl)bis(methanylylidene))bis(5,6-difluoro-3-oxo-2,3-dihydro-1H-indene-2,1-diylidene)) dimalononitrile | from INDEX | from INDEX | `C90H103F4N9O2S4` | (none) | (none) | (none) | Ready (no known CAS/PubChem; use provided chemical name as iupacname) |
| Y6 | 2,2'-((2Z,2'Z)-((12,13-bis(2-ethylhexyl)-3,9-diundecyl-12,13-dihydro-[1,2,5]thiadiazolo[3,4-e]thieno[2'',3'':4',5']thieno[2',3':4,5]pyrrolo[3,2-g]thieno[2',3':4,5]thieno[3,2-b]indole-2,10-diyl)bis(methanylylidene))bis(5,6-difluoro-3-oxo-2,3-dihydro-1H-indene-2,1-diylidene))dimalononitrile | from INDEX | from INDEX | `C82H86F4N8O2S5` | `2304444-49-1` | 145705715 | `BTP-4F`, `TTPTTI-4F`, `BTPTT-4F`, `Y6F`, `BTP-4F-8` | Ready |

---

## Cleanup passes applied

1. InChI normalization pass
   - Added `InChI=` prefix where missing (`D18`).

2. Synonym expansion pass
   - Added vendor-validated synonyms for polymer lookups:
     - `D18` <-> `PCE18`
     - `PBDB-T` <-> `PCE12` / `PBDTBDD`
     - `N2200` <-> `PNDI-2T` / `P(NDI2OD-T2)`
     - `PBTTT` <-> `PBTTT-C12`

3. External identifier pass (PubChem + CAS-like values)
   - Populated `pubchemcid` when confidence is acceptable.
   - Populated `casnumber` from PubChem RN or vendor evidence where PubChem was missing/weak.

4. Y11 fallback policy
   - Left `casnumber` and `pubchemcid` null.
   - Set `iupacname` to provided chemical name string exactly as requested.

---

## Notes before insertion

- `PC71BM` requires a structure sanity check: current InChI in backlog appears duplicated from `PC61BM`.
- `PBTTT` has naming/formula ambiguity across C12/C14 variants; keep current record unless source Excel/COA confirms switch.
- For each inserted molecule, upload `IMG.svg` from its folder and store the resulting URL in `imageurl`.

---

## CAS and PubChem upload solution per molecule

This section defines exactly what to upload into `casnumber` and `pubchemcid` for each molecule during insert.

| Molecule | `casnumber` upload | `pubchemcid` upload | Solution rationale |
|---|---|---|---|
| D18 | `2433725-54-1` | `null` | CAS is vendor-supported (`D18/PCE18`), no confident PubChem structure match from current identifiers. |
| ITIC | `1664293-06-4` | `126843541` | PubChem formula match and stable CID/CAS-like RN. |
| N2200 | `1100243-40-0` | `102164850` | CID resolved by structure; CAS taken from vendor synonym listing `PNDI-2T / P(NDI2OD-T2)`. |
| P3HT | `104934-50-1` | `566849` | Use known identifier pair with note that PubChem often reflects monomer-level record. |
| PBDB-T | `1415929-80-4` | `null` | Strong vendor CAS signal (`PBDB-T/PCE12`), no robust CID from current structure payload. |
| PBTTT | `888491-18-7` | `57473786` | CAS supported in supplier catalogs; CID retained with variant caution (C12/C14 naming drift). |
| PC61BM | `160848-21-5` | `53384373` | Widely used fullerene-acceptor mapping. |
| PC71BM | `609771-63-3` | `71777692` | Use CID/CAS pair, but revalidate structure fields (InChI/SMILES) before final load. |
| Y11 | `null` | `null` | No trusted CAS/PubChem match; keep nulls by design and use provided chemical name as `iupacname`. |
| Y6 | `2304444-49-1` | `145705715` | High-confidence NFA identity using known synonym family. |

`null` means intentionally unset in DB. This is valid because both fields are nullable in `molecules`.

---

## Synonyms list for insert pass

Store synonyms in `moleculesynonyms` after molecule creation.

| Molecule | Synonyms to insert |
|---|---|
| D18 | `PCE18` |
| ITIC | (none) |
| N2200 | `PNDI(2OD)2T`, `PNDI-2T`, `P(NDI2OD-T2)` |
| P3HT | (none) |
| PBDB-T | `PCE12`, `PBDTBDD` |
| PBTTT | `PBTTT-C12` |
| PC61BM | `C60PCBM`, `C61PCBM`, `[60]PCBM`, `3'H-cyclopropa[1,9][5,6]fullerene-C60-Ih-3'-butanoic acid 3'-phenyl methyl ester` |
| PC71BM | `C70 PCBM`, `[70]PCBM` |
| Y11 | (none) |
| Y6 | `BTP-4F`, `TTPTTI-4F`, `BTPTT-4F`, `Y6F`, `BTP-4F-8` |

---

## Three-tag recommendation per molecule

Tag choices are constrained to existing DB tags:

- `acceptor` (`4bf58f79-e2ba-489a-a8f8-f5b781064a9a`)
- `donor` (`e01f9cb5-e9f5-47dd-93f2-ef70e1184a98`)
- `ofet` (`8c444387-b852-4964-a455-c0c2b56b9aa0`)
- `opv` (`05620eda-aa30-4314-b644-fa3043064dc7`)
- `osc` (`4ded8289-085a-43d9-a7b3-423e5d6f13fb`)
- `polymer` (`6cd77688-21c8-4a49-a5a7-f051a57a4366`)
- `small-molecule` (`2eeecbdc-4cde-4940-935e-79b39456ae51`)

Recommended 3-tag set per molecule (based on current materials literature/vendor positioning):

| Molecule | Tag 1 | Tag 2 | Tag 3 |
|---|---|---|---|
| D18 | `donor` | `polymer` | `opv` |
| ITIC | `acceptor` | `small-molecule` | `opv` |
| N2200 | `acceptor` | `polymer` | `opv` |
| P3HT | `donor` | `polymer` | `opv` |
| PBDB-T | `donor` | `polymer` | `opv` |
| PBTTT | `donor` | `polymer` | `ofet` |
| PC61BM | `acceptor` | `small-molecule` | `opv` |
| PC71BM | `acceptor` | `small-molecule` | `opv` |
| Y11 | `acceptor` | `small-molecule` | `opv` |
| Y6 | `acceptor` | `small-molecule` | `opv` |

If you prefer OSC framing across the board, swap `opv` with `osc` for any row.
