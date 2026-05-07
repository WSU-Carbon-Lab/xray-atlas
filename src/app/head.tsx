import { site } from "~/app/brand";

export default function Head() {
  return (
    <>
      <link
        rel="search"
        type="application/opensearchdescription+xml"
        title={`${site.applicationName} Molecule Search`}
        href="/opensearch.xml"
      />
    </>
  );
}
