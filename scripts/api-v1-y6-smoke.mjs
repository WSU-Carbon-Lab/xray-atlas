const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";

async function fetchJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json();
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const molecules = await fetchJson(
    "/api/v1/molecules?q=Y6&hasCas=true&synonymsLimit=5&limit=20&offset=0",
  );
  const y6 = molecules.data?.[0];
  ensure(Boolean(y6?.id), "Expected at least one Y6 molecule result.");

  const edges = await fetchJson(`/api/v1/molecules/${y6.id}/edges`);
  ensure(Array.isArray(edges.data) && edges.data.length > 0, "Expected Y6 edges.");

  const carbonEdge = edges.data.find((edge) => edge.label === "C(K)") ?? edges.data[0];
  ensure(Boolean(carbonEdge?.edgeId), "Expected edgeId for Y6 edge.");

  const datasets = await fetchJson(
    `/api/v1/datasets?moleculeId=${y6.id}&edgeId=${carbonEdge.edgeId}&limit=20&offset=0`,
  );
  ensure(Array.isArray(datasets.data) && datasets.data.length > 0, "Expected dataset summaries.");

  const exportJson = await fetchJson(
    `/api/v1/datasets/export?moleculeId=${y6.id}&edgeId=${carbonEdge.edgeId}&format=json&limit=5`,
  );
  ensure(Array.isArray(exportJson.columns), "Expected export columns.");
  ensure(Array.isArray(exportJson.rows), "Expected export rows.");
  ensure(exportJson.rows.length > 0, "Expected non-empty export rows.");

  console.log("api:v1:y6-smoke passed");
}

main().catch((error) => {
  console.error("api:v1:y6-smoke failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
