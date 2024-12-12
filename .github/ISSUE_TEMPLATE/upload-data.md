---
name: Upload Data
about: Molecule Name
title: ''
labels: new data
assignees: HarlanHeilman

---

- [ ] Upload METADATA.json file
```json
{
  "name": "(STR) Primary/short molecule name as it appears in literature",
  "synonyms": [
    "(STR) synonym1",
    "synonym2"
  ],
  "chemical_formula": "(STR) Alphabetical chemical formula for the molecule or a single monomer unit",
  "description": "(STR) Chemical name of the molecule as it appears in literature",
  "image": "(URL) URL link to the SVG file that is stored on https://github.com/WSU-Carbon-Lab/molecules",
  "SMILES": "(STR) Simplified Molecular Input Line Entry System - may be a SMILES string for a single monomer unit",
  "InChI": "(STR) International Chemical Identifier -May be InChI string for a single monomer unit"
  "data": [
            {
                "edge": "(STR) Absorption edge the data was intended to be collected at - example: C(K) N(L1)",
                "method": "(STR) Data collection method - example: TEY",
                "facility": "(STR) Synchrotron facility",
                "instrument": "(STR) Endstation/Instrument",
                "group": "(STR) Group that collected the data",
                "source": "(STR) Vendor/source of the material"
            }
        ]
}
```
- [ ] Upload DATA.json file
```json
{
      "user": {
        "name": "(STR) Name of the user who should be contacted about the data",
        "affiliation": "(STR) Current affiliation of the user - ideally the institution the user was at when the data was collected",
        "group": "(STR) Research group the user was a part of when the data was collected",
        "email": "(STR) Email address of the user",
        "doi": "(STR) DOI of the publication associated with the data - leave blank if not applicable"
      },
      "instrument": {
        "facility": "(STR ENUM) Facility where the data was collected - options are: ANSTO, NSLSII, ALS - contact the data team if you need to add a facility",
        "instrument": "(STR ENUM) Instrument used to collect the data - options are: SXR, SMI, 11.0.1.2, 5.3.3 - contact the data team if you need to add an instrument",
        "edge": "(STR) Edge the data was intended to be collected over - data may intersect multiple edges, but this should be the primary edge",
        "normalization_method": "(STR) Method used to normalize the data - example: (0 - 1) Pre edge normalized to zero, post edge normalized to one",
        "technique": "(STR) Technique used to collect the data - options are: TEY, PET, FY, TRANS - contact the data team if you need to add a technique",
        "technical_details": "(STR) Optional field for any additional details about the data collection"
      },
      "sample_details": {
        "vendor": "(URL) URL to the vendor's website, or the store page for the molecule",
        "preparation_method": {
          "method": "(STR) Method used to prepare the sample - example: drop cast, spin coated, pvd, cvd, spray coated, etc.",
          "details": "(STR) Details on the preparation method include rates, concentrations, temperatures, etc. - example: 1000 rpm, 1:1 ratio, annealed at 300C"
        },
        "mol_orientation_details": "(STR) Details on the orientation of the molecule - example: strong pi-pi stacking with molecular plane parallel to the substrate (face on) resolved with GIWAXS"
      },
      "data": [
        {
          "geometry": {
            "e_field_azimuth": "(FLOAT) Azimuthal angle of the electric field in degrees, if not applicable, use 0",
            "e_field_polar": "(FLOAT) Polar angle of the electric field in degrees, 0 is parallel to the surface, 90 is perpendicular to the surface"
          },
          "energy": {
            "signal": "(FLOAT[...]) Energy values for the data",
            "unit": "(STR) Unit for the energy values - example: eV, keV, meV"
          },
          "intensity": {
            "signal": "(FLOAT[...]) Intensity values for the data - should be the same length as the energy values",
            "unit": "(STR) Unit for the intensity values - example: arb. u., counts, a.u."
          },
          "error": {
            "signal": "(FLOAT[...]) Error values for the data - should be the same length as the energy values",
            "unit": "(STR) Unit for the error values - example: arb. u., counts, a.u."
          },
          "i0": {
            "signal": "(FLOAT[...]) I0 values for the data - should be the same length as the energy values",
            "unit": "(STR) Unit for the I0 values - example: arb. u., counts, a.u."
          }      
        }
       ]
    }
```
- [ ] Upload IMG.svg file
