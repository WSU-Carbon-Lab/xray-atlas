/**
 * Canonical brand and mission strings for X-ray Atlas.
 *
 * Usage convention mirrors CSS custom properties or i18n key paths:
 *   brand.mission.heroShort  -> "mission.hero-short"
 *   brand.mission.canonical  -> "mission.canonical"
 *
 * All copy here is the single source of truth. Consume these strings
 * in page components, metadata, OG tags, and documentation rather than
 * duplicating copy across files.
 *
 * tmp/ status: pending promotion to src/lib/brand.ts
 */

// ---------------------------------------------------------------------------
// Site identity
// ---------------------------------------------------------------------------

export const site = {
    name: "X-ray Atlas",
    url: "https://xrayatlas.wsu.edu",
    applicationName: "Xray Atlas",
  } as const;
  
  // ---------------------------------------------------------------------------
  // Attribution
  // WSU Carbon Lab hosts and maintains the database. The platform serves the
  // broader synchrotron community but attribution to the originating lab is
  // preserved throughout.
  // ---------------------------------------------------------------------------
  
  export const attribution = {
    lab: "WSU Carbon Lab",
    labFull: "Washington State University Carbon Lab",
    labUrl: "https://labs.wsu.edu/carbon/",
    pi: "Brian Collins",
    piTitle: "Prof. Brian Collins",
    institution: "Washington State University",
    institutionAbbr: "WSU",
  } as const;
  
  // ---------------------------------------------------------------------------
  // Mission strings
  // Organized by context and audience. Prefer the shortest variant that is
  // still accurate for the given surface area.
  // ---------------------------------------------------------------------------
  
  export const mission = {
    /**
     * Hero short — homepage subheading, README tagline, social card fallback.
     * Three declarative statements. No elaboration.
     */
    heroShort: "Search spectra. Trace provenance. Cite with confidence.",
  
    /**
     * Hero long — homepage hero when space allows a second line, or any
     * surface that benefits from a framing sentence before the call to action.
     */
    heroLong:
      "X-ray spectroscopy data that belongs to the community that made it. Search spectra. Trace provenance. Cite with confidence.",
  
    /**
     * Canonical — the definitive mission statement for the platform.
     * Audience: any reader. Tone: clear, institutional, community-oriented.
     * Use on the about page opening, grant language, and press materials.
     */
    canonical:
      "X-ray Atlas is an open database for NEXAFS and X-ray absorption spectroscopy, built to make high-quality spectroscopy data findable, attributable, and reusable at the scale the field requires. Hosted by the WSU Carbon Lab and developed in collaboration with the synchrotron science community, the platform grounds every contributed spectrum in its experimental context and preserves contributor attribution across the full data lifecycle.",
  
    /**
     * Technical — for API docs, developer onboarding, and methods sections
     * in publications. Audience: researchers and engineers who want to know
     * what the system actually does before using it.
     */
    technical:
      "X-ray Atlas provides a queryable, API-accessible repository for NEXAFS and X-ray absorption spectroscopy datasets. Each record links molecular identifiers, spectral traces, experimental conditions, facility provenance, and contributor attribution in a structured schema aligned with FAIR data principles. The platform assigns persistent identifiers to contributed records and exposes machine-readable endpoints designed for integration into analysis pipelines, reference databases, and AI-assisted discovery workflows.",
  
    /**
     * Stewardship — for grant applications, data management plans, and
     * institutional communications. Emphasizes obligation, community
     * infrastructure, and long-term data integrity.
     */
    stewardship:
      "X-ray Atlas operates as community infrastructure for the synchrotron science community, with an explicit commitment to preserving experimental context and contributor attribution across the full data lifecycle. Every spectrum in the database carries its provenance forward — edge selection, sample geometry, instrument, facility, and originating researcher — because scientific reproducibility depends on that context remaining accessible alongside the data itself. The platform is maintained by the WSU Carbon Lab and developed in ongoing collaboration with researchers at ALS, NSLS-II, SSRL, and affiliated institutions, under open data licensing that treats publicly funded measurements as a shared community resource.",
  
    /**
     * SEO description — used in <meta name="description"> and OG/Twitter
     * description tags. ~155 characters, keyword-dense, no truncation risk.
     */
    seoDescription:
      "Open NEXAFS and X-ray absorption spectroscopy database. Search molecules, compare spectra, and cite data with full experimental provenance. Hosted by the WSU Carbon Lab.",
  
    /**
     * OG title — used in OpenGraph and Twitter card titles.
     */
    ogTitle: "X-ray Atlas | WSU Carbon Lab",
  } as const;
  
  // ---------------------------------------------------------------------------
  // Composite export for convenience
  // ---------------------------------------------------------------------------
  
  export const brand = {
    site,
    attribution,
    mission,
  } as const;
  
  export default brand;
  