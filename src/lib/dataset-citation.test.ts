import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { site } from "~/app/brand";
import {
  ATLAS_COLLECTION_DOI,
  buildDatabaseCitation,
  buildDatasetBibTeX,
  buildDatasetCitation,
  buildDatasetCitationBundle,
  buildDatasetDataAvailabilityStatement,
  buildDatasetInTextCitation,
  buildDatasetInTextExample,
  buildMendeleyImportUrl,
  buildNexafsDatasetCitationTitle,
  buildZoteroSaveUrl,
  formatApaReferenceAuthor,
  formatCitationAccessDate,
  formatDatasetCitationSampleSummary,
  formatDoiCitationUrl,
  resolveCitationCreatorDisplayName,
} from "~/lib/dataset-citation";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toContain: (expected: string) => void;
  not: {
    toContain: (expected: string) => void;
  };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveCitationCreatorDisplayName", () => {
  it("prefers a display name over ORCID", () => {
    expect(
      resolveCitationCreatorDisplayName({
        name: "Jane Doe",
        orcid: "0000-0002-1825-0097",
      }),
    ).toBe("Jane Doe");
  });

  it("falls back to an ORCID label", () => {
    expect(
      resolveCitationCreatorDisplayName({
        name: null,
        orcid: "0000-0002-1825-0097",
      }),
    ).toBe("ORCID 0000-0002-1825-0097");
  });

  it("returns null when neither name nor ORCID is usable", () => {
    expect(resolveCitationCreatorDisplayName({})).toBeNull();
  });
});

describe("buildNexafsDatasetCitationTitle", () => {
  it("uses formal comma-separated title without @", () => {
    expect(
      buildNexafsDatasetCitationTitle({
        moleculeDisplayName: "Polystyrene",
        edgeLabel: "C(K)",
        instrumentName: "5.3.2.2",
        facilityName: "ALS",
        experimentTypeLabel: "TEY",
      }),
    ).toBe("X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), TEY, 5.3.2.2, ALS");
  });

  it("omits facility and type when absent", () => {
    expect(
      buildNexafsDatasetCitationTitle({
        moleculeDisplayName: "Polystyrene",
        edgeLabel: "C K",
        instrumentName: "Beamline 1",
      }),
    ).toBe("X-ray Atlas NEXAFS Dataset: Polystyrene, C K, Beamline 1");
  });
});

describe("formatDoiCitationUrl", () => {
  it("normalizes prefixed DOIs", () => {
    expect(formatDoiCitationUrl("https://doi.org/10.5281/zenodo.1")).toBe(
      "https://doi.org/10.5281/zenodo.1",
    );
  });

  it("returns null for empty input", () => {
    expect(formatDoiCitationUrl(null)).toBeNull();
    expect(formatDoiCitationUrl("  ")).toBeNull();
  });
});

describe("buildZoteroSaveUrl", () => {
  it("points at Zenodo BibTeX export so the connector imports a Dataset", () => {
    expect(
      buildZoteroSaveUrl({
        doi: "10.5281/zenodo.123",
        zenodoRecordUrl: "https://zenodo.org/records/123",
      }),
    ).toBe("https://zenodo.org/records/123/export/bibtex");
  });

  it("derives the export URL from a 10.5281/zenodo DOI", () => {
    expect(
      buildZoteroSaveUrl({ doi: "https://doi.org/10.5281/zenodo.21299145" }),
    ).toBe("https://zenodo.org/records/21299145/export/bibtex");
  });

  it("derives the export URL from a record URL alone", () => {
    expect(
      buildZoteroSaveUrl({
        zenodoRecordUrl: "https://zenodo.org/records/21299145",
      }),
    ).toBe("https://zenodo.org/records/21299145/export/bibtex");
  });

  it("returns null without a DOI or Zenodo record URL", () => {
    expect(buildZoteroSaveUrl({})).toBeNull();
    expect(buildZoteroSaveUrl({ doi: "" })).toBeNull();
  });
});

describe("buildMendeleyImportUrl", () => {
  it("passes the bare DOI to the Mendeley import endpoint", () => {
    expect(buildMendeleyImportUrl("https://doi.org/10.5281/zenodo.123")).toBe(
      `https://www.mendeley.com/import/?doi=${encodeURIComponent("10.5281/zenodo.123")}`,
    );
  });

  it("returns null without a DOI", () => {
    expect(buildMendeleyImportUrl(null)).toBeNull();
  });
});

describe("formatApaReferenceAuthor", () => {
  it("converts Given Family to Family, G.", () => {
    expect(formatApaReferenceAuthor("Jane Doe")).toBe("Doe, J.");
  });

  it("preserves Family, Given input", () => {
    expect(formatApaReferenceAuthor("Doe, Jane")).toBe("Doe, J.");
  });

  it("leaves ORCID creator labels unsplit", () => {
    expect(formatApaReferenceAuthor("ORCID 0000-0002-1825-0097")).toBe(
      "ORCID 0000-0002-1825-0097",
    );
  });
});

describe("buildDatasetInTextCitation", () => {
  it("uses et al. for three or more authors", () => {
    expect(
      buildDatasetInTextCitation(["Jane Doe", "John Smith", "Ada Lee"], 2026),
    ).toBe("(Doe et al., 2026)");
  });

  it("joins two authors with ampersand", () => {
    expect(buildDatasetInTextCitation(["Jane Doe", "John Smith"], 2026)).toBe(
      "(Doe & Smith, 2026)",
    );
  });
});

describe("buildDatasetInTextExample", () => {
  it("embeds molecule, host, and parenthetical citation", () => {
    expect(buildDatasetInTextExample("PC61BM", "(Collins et al., 2026)")).toBe(
      "NEXAFS spectra for PC61BM were obtained from the X-ray Atlas (Collins et al., 2026).",
    );
  });
});

describe("buildDatasetCitation", () => {
  it("builds APA-like dataset reference with DOI and adapted-from", () => {
    const text = buildDatasetCitation({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      experimentTypeLabel: "TEY",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe", "John Smith"],
      year: 2026,
      sourcePublications: [{ doi: "10.1021/example", title: "Example Paper" }],
    });
    expect(text).toBe(
      "Doe, J., & Smith, J. (2026). X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), TEY, 5.3.2.2, ALS [Dataset]. X-ray Atlas. https://doi.org/10.5281/zenodo.99 (DOI minted via Zenodo). Adapted from Example Paper (https://doi.org/10.1021/example).",
    );
  });

  it("omits DOI and adapted-from when missing", () => {
    const text = buildDatasetCitation({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: null,
      creators: ["Jane Doe"],
      year: 2026,
    });
    expect(text).toBe(
      "Doe, J. (2026). X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), 5.3.2.2 [Dataset]. X-ray Atlas.",
    );
  });
});

describe("buildDatasetDataAvailabilityStatement", () => {
  it("frames Atlas as primary home and Zenodo as DOI mint", () => {
    const text = buildDatasetDataAvailabilityStatement({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: "10.5281/zenodo.99",
    });
    expect(text).toBe(
      "NEXAFS datasets are openly available on X-ray Atlas. Persistent DOIs for Atlas datasets are minted via Zenodo. X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), 5.3.2.2 is available at https://doi.org/10.5281/zenodo.99 (CC BY 4.0).",
    );
    expect(text).not.toContain('NEXAFS dataset "X-ray Atlas NEXAFS Dataset:');
  });

  it("notes pending DOI mint without doubled title wrapper", () => {
    const text = buildDatasetDataAvailabilityStatement({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: null,
    });
    expect(text).toBe(
      "NEXAFS datasets are openly available on X-ray Atlas. A persistent DOI for X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), 5.3.2.2 is pending minting via Zenodo.",
    );
    expect(text).not.toContain('NEXAFS dataset "X-ray Atlas NEXAFS Dataset:');
  });
});

describe("formatDatasetCitationSampleSummary", () => {
  it("joins populated sample fields into a Sample clause", () => {
    expect(
      formatDatasetCitationSampleSummary({
        processMethod: "Solvent",
        substrate: "Si",
        patterningLayer: "photoresist",
        solvent: "chloroform",
        thicknessNm: 50,
        molecularWeightGPerMol: 10000.5,
        vendorName: "Sigma-Aldrich",
      }),
    ).toBe(
      "Sample: process Solvent; substrate Si; patterning layer photoresist; solvent chloroform; thickness 50 nm; molecular weight 10000.5 g/mol; vendor Sigma-Aldrich",
    );
  });

  it("returns null when no sample fields are present", () => {
    expect(formatDatasetCitationSampleSummary({})).toBeNull();
    expect(formatDatasetCitationSampleSummary(null)).toBeNull();
  });
});

describe("buildDatasetBibTeX", () => {
  it("emits @dataset with author title year publisher doi and Atlas note", () => {
    const text = buildDatasetBibTeX({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe"],
      year: 2026,
    });
    expect(text).toContain("@dataset{");
    expect(text).toContain("author    = {Doe, Jane}");
    expect(text).toContain(
      "title     = {X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), 5.3.2.2, ALS}",
    );
    expect(text).toContain("year      = {2026}");
    expect(text).toContain("publisher = {X-ray Atlas}");
    expect(text).toContain("doi       = {10.5281/zenodo.99}");
    expect(text).toContain(
      "note      = {X-ray Atlas NEXAFS experiment; edge C(K); instrument 5.3.2.2; facility ALS}",
    );
    expect(text).toContain(
      "addendum  = {DOI 10.5281/zenodo.99 (minted via Zenodo)}",
    );
  });

  it("keeps ORCID creator labels intact in the author field", () => {
    const text = buildDatasetBibTeX({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe", "ORCID 0000-0002-1825-0097"],
      year: 2026,
    });
    expect(text).toContain(
      "author    = {Doe, Jane and ORCID 0000-0002-1825-0097}",
    );
  });

  it("splits experiment, sample, and identifier notes across note/annote/addendum", () => {
    const text = buildDatasetBibTeX({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      experimentTypeLabel: "TEY",
      datasetDoi: "10.5281/zenodo.99",
      atlasCitationUrl: "https://xrayatlas.wsu.edu/d/k7m2xq4n",
      creators: ["Jane Doe"],
      year: 2026,
      sample: {
        processMethod: "Solvent",
        substrate: "Si wafer",
        patterningLayer: "photoresist",
        thicknessNm: 40,
        vendorName: "Sigma-Aldrich",
      },
    });
    expect(text).toContain("doi       = {10.5281/zenodo.99}");
    expect(text).toContain(
      "url       = {https://xrayatlas.wsu.edu/d/k7m2xq4n}",
    );
    expect(text).toContain(
      "note      = {X-ray Atlas NEXAFS experiment; edge C(K); instrument 5.3.2.2; facility ALS; experiment type TEY}",
    );
    expect(text).toContain(
      "annote    = {Sample: process Solvent; substrate Si wafer; patterning layer photoresist; thickness 40 nm; vendor Sigma-Aldrich}",
    );
    expect(text).toContain(
      "addendum  = {Atlas https://xrayatlas.wsu.edu/d/k7m2xq4n; DOI 10.5281/zenodo.99 (minted via Zenodo)}",
    );
  });
});

describe("buildDatasetCitationBundle", () => {
  it("returns all cite popover fragments including in-text example", () => {
    const bundle = buildDatasetCitationBundle({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe", "John Smith", "Ada Lee"],
      year: 2026,
    });
    expect(bundle.inText).toBe("(Doe et al., 2026)");
    expect(bundle.inTextExample).toBe(
      "NEXAFS spectra for Polystyrene were obtained from the X-ray Atlas (Doe et al., 2026).",
    );
    expect(bundle.reference).toContain("[Dataset]");
    expect(bundle.reference).toContain("DOI minted via Zenodo");
    expect(bundle.dataAvailability).toContain("doi.org");
    expect(bundle.dataAvailability).toContain(site.name);
    expect(bundle.bibtex).toContain("@dataset{");
  });
});

describe("buildDatabaseCitation", () => {
  it("omits collection DOI when none is configured", () => {
    expect(ATLAS_COLLECTION_DOI).toBeNull();
    const text = buildDatabaseCitation({
      accessedAt: new Date(Date.UTC(2026, 6, 10)),
    });
    expect(text).toBe(`${site.name}. Accessed 2026-07-10.`);
  });

  it("includes collection DOI when provided", () => {
    const text = buildDatabaseCitation({
      accessedAt: new Date(Date.UTC(2026, 6, 10)),
      collectionDoi: "10.5281/zenodo.collection",
    });
    expect(text).toBe(
      `${site.name} https://doi.org/10.5281/zenodo.collection. Accessed 2026-07-10.`,
    );
  });
});

describe("formatCitationAccessDate", () => {
  it("formats UTC calendar date", () => {
    expect(formatCitationAccessDate(new Date(Date.UTC(2026, 0, 5)))).toBe(
      "2026-01-05",
    );
  });
});
