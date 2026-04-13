function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildOpenSearchXml(origin: string): string {
  const shortName = "Xray Atlas";
  const description = "Search molecules in Xray Atlas by name, synonym, and identifiers.";
  const searchTemplate = `${origin}/api/molecules/search?q={searchTerms}`;
  const selfTemplate = `${origin}/opensearch.xml`;
  const iconUrl = "https://repo.wsu.edu/favicon/icon.svg";

  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${xmlEscape(shortName)}</ShortName>
  <Description>${xmlEscape(description)}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/svg+xml">${xmlEscape(iconUrl)}</Image>
  <Url type="text/html" method="get" template="${xmlEscape(searchTemplate)}" />
  <Url type="application/opensearchdescription+xml" rel="self" template="${xmlEscape(selfTemplate)}" />
</OpenSearchDescription>
`;
}

/**
 * Serves an OpenSearch descriptor so browsers can install Xray Atlas molecule search.
 *
 * The descriptor points search requests to `/api/molecules/search?q={searchTerms}`,
 * which supports unified matching and redirect behavior for molecule discovery.
 */
export async function GET(request: Request): Promise<Response> {
  const { origin } = new URL(request.url);
  const xml = buildOpenSearchXml(origin);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/opensearchdescription+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
