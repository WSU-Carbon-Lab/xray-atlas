# Molecule metadata consistency check

Generated at: `2026-03-23T07:18:42.859Z`

Source file: `s3/MOLECULES/INDEX.json`

Molecules analyzed: **10**

Flagged for review: **10**

Checks compare local INDEX metadata against PubChem lookup by normalized InChI, then SMILES, then name/synonyms.

| Molecule | Lookup | CID | Formula (local -> PubChem) | CAS from PubChem RN | Flags |
|---|---|---:|---|---|---|
| D18 | none |  | C76H92F2N2S7 -> (none) | (none) | No PubChem match found by InChI/SMILES/name; Input InChI was missing InChI= prefix |
| ITIC | name | 126843541 | C94H82N4O2S4 -> C94H82N4O2S4 | 1664293-06-4 | Lookup succeeded by name only; InChI mismatch with PubChem |
| N2200 | smiles | 102164850 | C62H88N2O4S2 -> C62H90N2O4S2 | (none) | Formula mismatch with PubChem |
| P3HT | smiles | 566849 | C10H14S -> C10H16S | 104934-50-1 | Formula mismatch with PubChem |
| PBDB-T | none |  | C68H78O2S8 -> (none) | (none) | No PubChem match found by InChI/SMILES/name |
| PBTTT | smiles | 57473786 | C42H62S4 -> C38H56S4 | (none) | Formula mismatch with PubChem |
| PC61BM | name | 53384373 | C72H14O2 -> C72H14O2 | 160848-21-5 | Lookup succeeded by name only; InChI mismatch with PubChem |
| PC71BM | name | 71777692 | C82H14O2 -> C82H14O2 | 609771-63-3 | Lookup succeeded by name only; InChI mismatch with PubChem |
| Y11 | none |  | C90H103F4N9O2S4 -> (none) | (none) | No PubChem match found by InChI/SMILES/name |
| Y6 | name | 145705715 | C82H86F4N8O2S5 -> C82H86F4N8O2S5 | 2304444-49-1 | Lookup succeeded by name only; InChI mismatch with PubChem |

## Detailed per-molecule notes

### D18

- Lookup: failed (none)
- CID: (none)
- Synonyms: `PCE18`
- Local formula: C76H92F2N2S7
- PubChem formula: (none)
- Local InChI raw: 1S/C69H80F2O2S7/c1-9-17-22-40(13-5)32-44-36-45(37-48(44)70)58-46-29-31-75-66(46)59(57-39-49(71)53(77-57)33-41(14-6)23-18-10-2)47-38-54(79-67(47)58)50-27-28-52(76-50)69-63-62(68(80-69)51-26-21-30-74-51)64(72)60-55(34-42(15-7)24-19-11-3)78-56(61(60)65(63)73)35-43(16-8)25-20-12-4/h21,26-31,37-43H,9-20,22-25,32-36H2,1-8H3
- Local InChI normalized: InChI=1S/C69H80F2O2S7/c1-9-17-22-40(13-5)32-44-36-45(37-48(44)70)58-46-29-31-75-66(46)59(57-39-49(71)53(77-57)33-41(14-6)23-18-10-2)47-38-54(79-67(47)58)50-27-28-52(76-50)69-63-62(68(80-69)51-26-21-30-74-51)64(72)60-55(34-42(15-7)24-19-11-3)78-56(61(60)65(63)73)35-43(16-8)25-20-12-4/h21,26-31,37-43H,9-20,22-25,32-36H2,1-8H3
- PubChem InChI: (none)
- Local SMILES: CCCCCCC(CCCC)Cc1c[s]c(-c2cc(c3n[s]nc3c3c4[s]c(-c5cc(CC(CCCC)CCCCCC)c(-c6cc(c(-c7cc(F)c(CC(CC)CCCC)[s]7)c7[s]ccc7c7-c8cc(F)c(CC(CC)CCCC)[s]8)c7[s]6)[s]5)c3)c4[s]2)c1
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: (none)
- PubChem RN values: (none)
- Suggested CAS: (none)
- Checks: formula=null, inchi=null, smiles=null
- Review notes: No PubChem match found by InChI/SMILES/name; Input InChI was missing InChI= prefix

### ITIC

- Lookup: success (name)
- CID: 126843541
- Synonyms: (none)
- Local formula: C94H82N4O2S4
- PubChem formula: C94H82N4O2S4
- Local InChI raw: InChI=1S/C94H82N4O2S4/c1-7-11-15-19-27-59-35-43-63(44-36-59)93(64-45-37-60(38-46-64)28-20-16-12-8-2)77-55-74-78(56-73(77)89-85(93)91-81(103-89)53-67(101-91)51-75-83(79(57-95)97-5)69-31-23-25-33-71(69)87(75)99)94(65-47-39-61(40-48-65)29-21-17-13-9-3,66-49-41-62(42-50-66)30-22-18-14-10-4)86-90(74)104-82-54-68(102-92(82)86)52-76-84(80(58-96)98-6)70-32-24-26-34-72(70)88(76)100/h23-26,31-56H,7-22,27-30H2,1-4H3/b75-51-,76-52-,83-79-,84-80+
- Local InChI normalized: InChI=1S/C94H82N4O2S4/c1-7-11-15-19-27-59-35-43-63(44-36-59)93(64-45-37-60(38-46-64)28-20-16-12-8-2)77-55-74-78(56-73(77)89-85(93)91-81(103-89)53-67(101-91)51-75-83(79(57-95)97-5)69-31-23-25-33-71(69)87(75)99)94(65-47-39-61(40-48-65)29-21-17-13-9-3,66-49-41-62(42-50-66)30-22-18-14-10-4)86-90(74)104-82-54-68(102-92(82)86)52-76-84(80(58-96)98-6)70-32-24-26-34-72(70)88(76)100/h23-26,31-56H,7-22,27-30H2,1-4H3/b75-51-,76-52-,83-79-,84-80+
- PubChem InChI: InChI=1S/C94H82N4O2S4/c1-5-9-13-17-25-59-33-41-65(42-34-59)93(66-43-35-60(36-44-66)26-18-14-10-6-2)79-53-76-80(54-75(79)89-85(93)91-81(103-89)51-69(101-91)49-77-83(63(55-95)56-96)71-29-21-23-31-73(71)87(77)99)94(67-45-37-61(38-46-67)27-19-15-11-7-3,68-47-39-62(40-48-68)28-20-16-12-8-4)86-90(76)104-82-52-70(102-92(82)86)50-78-84(64(57-97)58-98)72-30-22-24-32-74(72)88(78)100/h21-24,29-54H,5-20,25-28H2,1-4H3/b77-49-,78-50?
- Local SMILES: O=C(C1=C(C/2=C(C#N)\[N+]#[C-])C=CC=C1)C2=C/C3=CC(SC4=C5C(C6=CC=C(CCCCCC)C=C6)(C7=CC=C(CCCCCC)C=C7)C8=C4C=C(C(C9=CC=C(CCCCCC)C=C9)(C%10=CC=C(CCCCCC)C=C%10)C%11=C%12SC%13=C%11SC(/C=C%14C(C(C=CC=C%15)=C%15C\%14=C([N+]#[C-])/C#N)=O)=C%13)C%12=C8)=C5S3
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: 2-[(2Z)-2-[[20-[[1-(dicyanomethylidene)-3-oxoinden-2-ylidene]methyl]-12,12,24,24-tetrakis(4-hexylphenyl)-5,9,17,21-tetrathiaheptacyclo[13.9.0.03,13.04,11.06,10.016,23.018,22]tetracosa-1(15),2,4(11),6(10),7,13,16(23),18(22),19-nonaen-8-yl]methylidene]-3-oxoinden-1-ylidene]propanedinitrile
- PubChem RN values: `1664293-06-4`
- Suggested CAS: 1664293-06-4
- Checks: formula=true, inchi=false, smiles=null
- Review notes: Lookup succeeded by name only; InChI mismatch with PubChem

## Confirmed PubChem and CAS-style identifiers

The table below captures molecules where a PubChem CID was found in this pass. CAS-style values come from PubChem `xrefs/RN` and web vendor confirmation where noted.

| Molecule | PubChem CID | CAS-like value | Source confidence |
|---|---:|---|---|
| ITIC | 126843541 | 1664293-06-4 | High (PubChem formula match) |
| N2200 | 102164850 | 1100243-40-0 | High for CAS from vendor, medium for CID due formula mismatch in local record |
| P3HT | 566849 | 104934-50-1 | Medium (small-molecule monomer-level record likely) |
| PBTTT | 57473786 | 888491-18-7 | High for CAS from vendor catalogs, medium for CID due local formula mismatch |
| PC61BM | 53384373 | 160848-21-5 | Medium (name-based CID match; formula matched) |
| PC71BM | 71777692 | 609771-63-3 | Medium (name-based CID match; InChI mismatch) |
| Y6 | 145705715 | 2304444-49-1 | Medium-high (formula matched, name-based lookup) |

## Targeted synonym and vendor-web research for unresolved polymers

This section covers the four backlog polymers requested for deeper web lookup (`D18`, `PBDB-T`, `N2200`, `PBTTT`).

### D18

- Alternate names found: `PCE18`.
- Vendor evidence: 1-Material product page lists `D18, PCE18` with CAS `2433725-54-1`.
- Web references:
  - https://www.1-material.com/d18-pce18/
  - https://www.ossila.com/products/d18
- Interpretation: use `D18` as primary name with synonym `PCE18`; current local InChI/formula set should be reviewed against vendor COA or original Excel because PubChem direct structure match was not found.

### PBDB-T

- Alternate names found: `PCE12`, `PBDTBDD`.
- Vendor evidence: Sigma-Aldrich and Ossila list PBDB-T with CAS `1415929-80-4`, repeat-unit formula `(C68H78O2S8)n`, and synonym `PCE12`.
- Web references:
  - https://www.sigmaaldrich.com/GB/en/product/aldrich/901099
  - https://www.ossila.com/products/pbdb-t-pce12
- Interpretation: local formula is consistent with vendor repeat-unit formula; keep `PBDB-T` primary and include `PCE12`/`PBDTBDD` synonyms.

### N2200

- Alternate names found: `PNDI-2T`, `P(NDI2OD-T2)`, `PNDI(2OD)2T`, naphthalene diimide-bithiophene polymer naming variants.
- Vendor evidence: 1-Material page lists N2200/PNDI-2T/P(NDI2OD-T2) with CAS `1100243-40-0`.
- Web reference:
  - https://www.1-material.com/n2200-os0400-pndi-2t-pndi2od-t2/
- Interpretation: local InChI matches PubChem record used by SMILES lookup, but local formula should be corrected from `C62H88N2O4S2` to `C62H90N2O4S2`.

### PBTTT

- Alternate names found: `PBTTT-C12`; explicit polymer name `poly[2,5-bis(3-dodecylthiophen-2-yl)thieno[3,2-b]thiophene]`.
- Vendor/catalog evidence: CAS `888491-18-7` is consistently reported for PBTTT-C12 in multiple supplier listings.
- Web references:
  - https://www.biosynth.com/p/NKB49118/888491-18-7-pbttt-c12
  - https://www.chemicalbook.com/ChemicalProductProperty_DE_CB52602957.htm
- Interpretation: local synonym should include `PBTTT-C12`; local formula likely needs review (`C42H62S4` vs commonly listed repeat-unit `C38H56S4`).

## Proposed normalization candidates for approval

| Molecule | Primary name | Synonyms to keep/add | Candidate CAS |
|---|---|---|---|
| D18 | D18 | PCE18 | 2433725-54-1 |
| PBDB-T | PBDB-T | PCE12, PBDTBDD | 1415929-80-4 |
| N2200 | N2200 | PNDI-2T, P(NDI2OD-T2), PNDI(2OD)2T | 1100243-40-0 |
| PBTTT | PBTTT | PBTTT-C12 | 888491-18-7 |

These are documented candidates only. No molecule rows were changed in the database.

### N2200

- Lookup: success (smiles)
- CID: 102164850
- Synonyms: `PNDI(2OD)2T`, `PNDI-2T`, `Polynaphtalene-bithiophene`
- Local formula: C62H88N2O4S2
- PubChem formula: C62H90N2O4S2
- Local InChI raw: InChI=1S/C62H90N2O4S2/c1-5-9-13-17-21-23-27-31-35-47(34-29-25-19-15-11-7-3)45-63-59(65)49-39-40-50-57-56(49)52(61(63)67)44-51(53-41-42-55(70-53)54-38-33-43-69-54)58(57)62(68)64(60(50)66)46-48(36-30-26-20-16-12-8-4)37-32-28-24-22-18-14-10-6-2/h33,38-44,47-48H,5-32,34-37,45-46H2,1-4H3
- Local InChI normalized: InChI=1S/C62H90N2O4S2/c1-5-9-13-17-21-23-27-31-35-47(34-29-25-19-15-11-7-3)45-63-59(65)49-39-40-50-57-56(49)52(61(63)67)44-51(53-41-42-55(70-53)54-38-33-43-69-54)58(57)62(68)64(60(50)66)46-48(36-30-26-20-16-12-8-4)37-32-28-24-22-18-14-10-6-2/h33,38-44,47-48H,5-32,34-37,45-46H2,1-4H3
- PubChem InChI: InChI=1S/C62H90N2O4S2/c1-5-9-13-17-21-23-27-31-35-47(34-29-25-19-15-11-7-3)45-63-59(65)49-39-40-50-57-56(49)52(61(63)67)44-51(53-41-42-55(70-53)54-38-33-43-69-54)58(57)62(68)64(60(50)66)46-48(36-30-26-20-16-12-8-4)37-32-28-24-22-18-14-10-6-2/h33,38-44,47-48H,5-32,34-37,45-46H2,1-4H3
- Local SMILES: O=C(N1CC(CCCCCCCCCC)CCCCCCCC)C2=C(C3=CC=C(C4=CC=CS4)S3)C=C5C6=C2C(C1=O)=CC=C6C(N(CC(CCCCCCCCCC)CCCCCCCC)C5=O)=O
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: 6,13-bis(2-octyldodecyl)-2-(5-thiophen-2-ylthiophen-2-yl)-6,13-diazatetracyclo[6.6.2.04,16.011,15]hexadeca-1,3,8(16),9,11(15)-pentaene-5,7,12,14-tetrone
- PubChem RN values: (none)
- Suggested CAS: (none)
- Checks: formula=false, inchi=true, smiles=null
- Review notes: Formula mismatch with PubChem

### P3HT

- Lookup: success (smiles)
- CID: 566849
- Synonyms: (none)
- Local formula: C10H14S
- PubChem formula: C10H16S
- Local InChI raw: InChI=1S/C10H16S/c1-2-3-4-5-6-10-7-8-11-9-10/h7-9H,2-6H2,1H3
- Local InChI normalized: InChI=1S/C10H16S/c1-2-3-4-5-6-10-7-8-11-9-10/h7-9H,2-6H2,1H3
- PubChem InChI: InChI=1S/C10H16S/c1-2-3-4-5-6-10-7-8-11-9-10/h7-9H,2-6H2,1H3
- Local SMILES: CCCCCCC1=CSC=C1
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: 3-hexylthiophene
- PubChem RN values: `104934-50-1`, `1693-86-3`, `17010-70-7`, `629-237-3`
- Suggested CAS: 104934-50-1
- Checks: formula=false, inchi=true, smiles=null
- Review notes: Formula mismatch with PubChem

### PBDB-T

- Lookup: failed (none)
- CID: (none)
- Synonyms: `PCE12`, `PBDTBDD`
- Local formula: C68H78O2S8
- PubChem formula: (none)
- Local InChI raw: InChI=1S/C68H80O2S8/c1-9-17-22-41(13-5)34-45-38-54(73-40-45)57-47-31-33-72-65(47)58(50-28-27-46(74-50)35-42(14-6)23-18-10-2)48-39-53(77-66(48)57)49-29-30-52(75-49)68-62-61(67(78-68)51-26-21-32-71-51)63(69)59-55(36-43(15-7)24-19-11-3)76-56(60(59)64(62)70)37-44(16-8)25-20-12-4/h21,26-33,38-44H,9-20,22-25,34-37H2,1-8H3
- Local InChI normalized: InChI=1S/C68H80O2S8/c1-9-17-22-41(13-5)34-45-38-54(73-40-45)57-47-31-33-72-65(47)58(50-28-27-46(74-50)35-42(14-6)23-18-10-2)48-39-53(77-66(48)57)49-29-30-52(75-49)68-62-61(67(78-68)51-26-21-32-71-51)63(69)59-55(36-43(15-7)24-19-11-3)76-56(60(59)64(62)70)37-44(16-8)25-20-12-4/h21,26-33,38-44H,9-20,22-25,34-37H2,1-8H3
- PubChem InChI: (none)
- Local SMILES: O=C1C2=C(CC(CCCC)CC)SC(CC(CC)CCCC)=C2C(C3=C(C4=CC=CS4)SC(C(S5)=CC=C5C6=CC7=C(S6)C(C8=CC(CC(CC)CCCC)=CS8)=C9C=CSC9=C7C%10=CC=C(CC(CCCC)CC)S%10)=C31)=O
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: (none)
- PubChem RN values: (none)
- Suggested CAS: (none)
- Checks: formula=null, inchi=null, smiles=null
- Review notes: No PubChem match found by InChI/SMILES/name

### PBTTT

- Lookup: success (smiles)
- CID: 57473786
- Synonyms: `PBTTT-C12`
- Local formula: C42H62S4
- PubChem formula: C38H56S4
- Local InChI raw: InChI=1S/C38H56S4/c1-3-5-7-9-11-13-15-17-19-21-23-31-25-27-39-37(31)35-29-33-34(41-35)30-36(42-33)38-32(26-28-40-38)24-22-20-18-16-14-12-10-8-6-4-2/h25-30H,3-24H2,1-2H3
- Local InChI normalized: InChI=1S/C38H56S4/c1-3-5-7-9-11-13-15-17-19-21-23-31-25-27-39-37(31)35-29-33-34(41-35)30-36(42-33)38-32(26-28-40-38)24-22-20-18-16-14-12-10-8-6-4-2/h25-30H,3-24H2,1-2H3
- PubChem InChI: InChI=1S/C38H56S4/c1-3-5-7-9-11-13-15-17-19-21-23-31-25-27-39-37(31)35-29-33-34(41-35)30-36(42-33)38-32(26-28-40-38)24-22-20-18-16-14-12-10-8-6-4-2/h25-30H,3-24H2,1-2H3
- Local SMILES: CCCCCCCCCCCCC(C=CS1)=C1C2=CC(SC(C3=C(CCCCCCCCCCCC)C=CS3)=C4)=C4S2
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: 2,5-bis(3-dodecylthiophen-2-yl)thieno[3,2-b]thiophene
- PubChem RN values: (none)
- Suggested CAS: (none)
- Checks: formula=false, inchi=true, smiles=null
- Review notes: Formula mismatch with PubChem

### PC61BM

- Lookup: success (name)
- CID: 53384373
- Synonyms: `C60PCBM`, `C61PCBM`, `[60]PCBM`, `3'H-cyclopropa[1,9][5,6]fullerene-C60-Ih-3'-butanoic acid 3'-phenyl methyl ester`
- Local formula: C72H14O2
- PubChem formula: C72H14O2
- Local InChI raw: InChI=1S/C51H30O2/c1-53-27(52)8-5-9-50(25-6-3-2-4-7-25)49-26-16-23-14-20-12-21-11-18-10-19-13-22-15-24-17-51(49,50)48-34(24)39-33(22)38-29(19)28(18)36-32(21)37-30(20)31(23)40-35(26)47(48)46-44(39)42(38)41(36)43(37)45(40)46/h2-4,6-7,10,12-13,15-17,23,31,46-49H,5,8-9,11,14H2,1H3
- Local InChI normalized: InChI=1S/C51H30O2/c1-53-27(52)8-5-9-50(25-6-3-2-4-7-25)49-26-16-23-14-20-12-21-11-18-10-19-13-22-15-24-17-51(49,50)48-34(24)39-33(22)38-29(19)28(18)36-32(21)37-30(20)31(23)40-35(26)47(48)46-44(39)42(38)41(36)43(37)45(40)46/h2-4,6-7,10,12-13,15-17,23,31,46-49H,5,8-9,11,14H2,1H3
- PubChem InChI: InChI=1S/C72H14O2/c1-74-11(73)8-5-9-70(10-6-3-2-4-7-10)71-66-59-52-40-32-23-14-12-13-15-18(14)27-34(32)42-43-35(27)33-24(15)26-22-17(13)20-19-16(12)21-25(23)38(40)46-44-30(21)28(19)36-37-29(20)31(22)45-47-39(26)41(33)53-55(43)64(63(66)54(42)52)67-60(53)58(47)62-51(45)49(37)56-48(36)50(44)61(57(46)59)68(71)65(56)69(62)72(67,70)71/h2-4,6-7H,5,8-9H2,1H3
- Local SMILES: O=C(OC)CCCC1(C2=CC=CC=C2)C3C4=CC(C56)CC(C5=C78)=CC9=C7C%10=C%11C8=C(C%12C%13=C%14%11)C6=C4C%12C%15C31C=C%16C=C%17C=C%18C=C(C%10=C%18C%14=C%17C%13=C%16%15)C9
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: (none)
- PubChem RN values: `160848-21-5`, `160848-22-6`, `801-278-3`
- Suggested CAS: 160848-21-5
- Checks: formula=true, inchi=false, smiles=null
- Review notes: Lookup succeeded by name only; InChI mismatch with PubChem

### PC71BM

- Lookup: success (name)
- CID: 71777692
- Synonyms: `C70 PCBM`, `[70]PCBM`
- Local formula: C82H14O2
- PubChem formula: C82H14O2
- Local InChI raw: InChI=1S/C51H30O2/c1-53-27(52)8-5-9-50(25-6-3-2-4-7-25)49-26-16-23-14-20-12-21-11-18-10-19-13-22-15-24-17-51(49,50)48-34(24)39-33(22)38-29(19)28(18)36-32(21)37-30(20)31(23)40-35(26)47(48)46-44(39)42(38)41(36)43(37)45(40)46/h2-4,6-7,10,12-13,15-17,23,31,46-49H,5,8-9,11,14H2,1H3
- Local InChI normalized: InChI=1S/C51H30O2/c1-53-27(52)8-5-9-50(25-6-3-2-4-7-25)49-26-16-23-14-20-12-21-11-18-10-19-13-22-15-24-17-51(49,50)48-34(24)39-33(22)38-29(19)28(18)36-32(21)37-30(20)31(23)40-35(26)47(48)46-44(39)42(38)41(36)43(37)45(40)46/h2-4,6-7,10,12-13,15-17,23,31,46-49H,5,8-9,11,14H2,1H3
- PubChem InChI: InChI=1S/C82H14O2/c1-84-11(83)8-5-9-80(10-6-3-2-4-7-10)81-76-68-60-50-40-33-24-18-12-13-15-17-16-14(12)20-27-22(16)31-32-23(17)28-21(15)30-26(19(13)24)35-41(33)51(50)61-55-45(35)37(30)47-39(28)49-43(32)53-52-42(31)48-38(27)46-36-29(20)25(18)34(40)44(36)54(60)64-58(46)66-56(48)62(52)70-71-63(53)57(49)67-59(47)65(55)73(77(81)69(61)68)75(67)79(71)82(80,81)78(70)74(66)72(64)76/h2-4,6-7H,5,8-9H2,1H3
- Local SMILES: O=C(OC)CCCC1(C2=CC=CC=C2)C3C4=CC(C56)CC(C5=C78)=CC9=C7C%10=C%11C8=C(C%12C%13=C%14%11)C6=C4C%12C%15C31C=C%16C=C%17C=C%18C=C(C%10=C%18C%14=C%17C%13=C%16%15)C9
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: (none)
- PubChem RN values: `609771-63-3`
- Suggested CAS: 609771-63-3
- Checks: formula=true, inchi=false, smiles=null
- Review notes: Lookup succeeded by name only; InChI mismatch with PubChem

### Y11

- Lookup: failed (none)
- CID: (none)
- Synonyms: (none)
- Local formula: C90H103F4N9O2S4
- PubChem formula: (none)
- Local InChI raw: InChI=1S/C88H99F4N9O2S4/c1-13-19-24-26-28-30-32-34-36-41-55-67(47-61-69(87(93-9)94-10)57-43-63(89)65(91)45-59(57)79(61)102)104-85-77-83(106-81(55)85)71-73-74(98-101(97-73)51-54(18-6)40-23-17-5)72-76(75(71)99(77)49-52(7)38-21-15-3)100(50-53(8)39-22-16-4)78-84(72)107-82-56(42-37-35-33-31-29-27-25-20-14-2)68(105-86(78)82)48-62-70(88(95-11)96-12)58-44-64(90)66(92)46-60(58)80(62)103/h43-48,52-54H,13-42,49-51H2,1-8H3/b61-47-,62-48-
- Local InChI normalized: InChI=1S/C88H99F4N9O2S4/c1-13-19-24-26-28-30-32-34-36-41-55-67(47-61-69(87(93-9)94-10)57-43-63(89)65(91)45-59(57)79(61)102)104-85-77-83(106-81(55)85)71-73-74(98-101(97-73)51-54(18-6)40-23-17-5)72-76(75(71)99(77)49-52(7)38-21-15-3)100(50-53(8)39-22-16-4)78-84(72)107-82-56(42-37-35-33-31-29-27-25-20-14-2)68(105-86(78)82)48-62-70(88(95-11)96-12)58-44-64(90)66(92)46-60(58)80(62)103/h43-48,52-54H,13-42,49-51H2,1-8H3/b61-47-,62-48-
- PubChem InChI: (none)
- Local SMILES: FC1=C(F)C=C(C(C2=O)=C1)C(/C2=C/C(S3)=C(CCCCCCCCCCC)C4=C3C(N5CC(C)CCCC)=C(S4)C6=C5C(N(CC(C)CCCC)C7=C8SC9=C7SC(/C=C%10C(C%11=CC(F)=C(F)C=C%11C\%10=C([N+]#[C-])\[N+]#[C-])=O)=C9CCCCCCCCCCC)=C8C%12=NN(CC(CC)CCCC)N=C%126)=C([N+]#[C-])\[N+]#[C-]
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: (none)
- PubChem RN values: (none)
- Suggested CAS: (none)
- Checks: formula=null, inchi=null, smiles=null
- Review notes: No PubChem match found by InChI/SMILES/name

### Y6

- Lookup: success (name)
- CID: 145705715
- Synonyms: `BTP-4F`, `TTPTTI-4F`, `BTPTT-4F`, `Y6F`, `BTP-4F-8`
- Local formula: C82H86F4N8O2S5
- PubChem formula: C82H86F4N8O2S5
- Local InChI raw: InChI=1S/C80H82F4N8O2S5/c1-11-15-19-21-23-25-27-29-31-35-47-59(41-53-61(79(85-7)86-8)49-37-55(81)57(83)39-51(49)71(53)93)95-77-69-75(97-73(47)77)63-65-66(90-99-89-65)64-68(67(63)91(69)43-45(5)33-17-13-3)92(44-46(6)34-18-14-4)70-76(64)98-74-48(36-32-30-28-26-24-22-20-16-12-2)60(96-78(70)74)42-54-62(80(87-9)88-10)50-38-56(82)58(84)40-52(50)72(54)94/h37-42,45-46H,11-36,43-44H2,1-6H3/b53-41-,54-42-
- Local InChI normalized: InChI=1S/C80H82F4N8O2S5/c1-11-15-19-21-23-25-27-29-31-35-47-59(41-53-61(79(85-7)86-8)49-37-55(81)57(83)39-51(49)71(53)93)95-77-69-75(97-73(47)77)63-65-66(90-99-89-65)64-68(67(63)91(69)43-45(5)33-17-13-3)92(44-46(6)34-18-14-4)70-76(64)98-74-48(36-32-30-28-26-24-22-20-16-12-2)60(96-78(70)74)42-54-62(80(87-9)88-10)50-38-56(82)58(84)40-52(50)72(54)94/h37-42,45-46H,11-36,43-44H2,1-6H3/b53-41-,54-42-
- PubChem InChI: InChI=1S/C82H86F4N8O2S5/c1-7-13-17-19-21-23-25-27-29-33-51-63(39-57-65(49(41-87)42-88)53-35-59(83)61(85)37-55(53)75(57)95)97-81-73-79(99-77(51)81)67-69-70(92-101-91-69)68-72(71(67)93(73)45-47(11-5)31-15-9-3)94(46-48(12-6)32-16-10-4)74-80(68)100-78-52(34-30-28-26-24-22-20-18-14-8-2)64(98-82(74)78)40-58-66(50(43-89)44-90)54-36-60(84)62(86)38-56(54)76(58)96/h35-40,47-48H,7-34,45-46H2,1-6H3
- Local SMILES: FC1=C(F)C=C(C(C2=O)=C1)C(/C2=C/C(S3)=C(CCCCCCCCCCC)C4=C3C(N5CC(C)CCCC)=C(S4)C6=C5C(N(CC(C)CCCC)C7=C8SC9=C7SC(/C=C%10C(C%11=CC(F)=C(F)C=C%11C\%10=C([N+]#[C-])\[N+]#[C-])=O)=C9CCCCCCCCCCC)=C8C%12=NSN=C%126)=C([N+]#[C-])\[N+]#[C-]
- PubChem canonical SMILES: (none)
- PubChem IUPAC name: 2-[2-[[23-[[1-(dicyanomethylidene)-5,6-difluoro-3-oxoinden-2-ylidene]methyl]-3,27-bis(2-ethylhexyl)-8,22-di(undecyl)-6,10,15,20,24-pentathia-3,14,16,27-tetrazaoctacyclo[16.9.0.02,12.04,11.05,9.013,17.019,26.021,25]heptacosa-1(18),2(12),4(11),5(9),7,13,16,19(26),21(25),22-decaen-7-yl]methylidene]-5,6-difluoro-3-oxoinden-1-ylidene]propanedinitrile
- PubChem RN values: `2304444-49-1`
- Suggested CAS: 2304444-49-1
- Checks: formula=true, inchi=false, smiles=null
- Review notes: Lookup succeeded by name only; InChI mismatch with PubChem

