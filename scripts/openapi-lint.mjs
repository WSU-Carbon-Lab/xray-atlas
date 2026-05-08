import { openApiV1Spec } from "../src/app/api/v1/openapi/spec.ts";

function fail(message) {
  throw new Error(message);
}

function checkInfo() {
  if (!openApiV1Spec.info?.title) fail("OpenAPI info.title is required.");
  if (!openApiV1Spec.info?.version) fail("OpenAPI info.version is required.");
  if (!openApiV1Spec.info?.description) fail("OpenAPI info.description is required.");
}

function checkServers() {
  if (!Array.isArray(openApiV1Spec.servers) || openApiV1Spec.servers.length === 0) {
    fail("At least one server entry is required.");
  }
}

function checkPaths() {
  const pathEntries = Object.entries(openApiV1Spec.paths ?? {});
  if (pathEntries.length === 0) fail("At least one path is required.");

  for (const [path, pathItem] of pathEntries) {
    const operationEntries = Object.entries(pathItem ?? {});
    if (operationEntries.length === 0) {
      fail(`Path ${path} must define at least one operation.`);
    }
    for (const [method, operation] of operationEntries) {
      if (!operation.summary) fail(`${method.toUpperCase()} ${path} missing summary.`);
      if (!operation.responses) fail(`${method.toUpperCase()} ${path} missing responses.`);
      if (!operation.responses["200"] && !operation.responses["201"] && !operation.responses["307"]) {
        fail(`${method.toUpperCase()} ${path} missing success response.`);
      }
      if (!Array.isArray(operation.tags) || operation.tags.length === 0) {
        fail(`${method.toUpperCase()} ${path} must include at least one tag.`);
      }
      for (const parameter of operation.parameters ?? []) {
        if (!parameter.name || !parameter.in || !parameter.schema) {
          fail(`${method.toUpperCase()} ${path} has malformed parameter definition.`);
        }
      }
    }
  }
}

try {
  checkInfo();
  checkServers();
  checkPaths();
  console.log("openapi:lint passed");
} catch (error) {
  console.error("openapi:lint failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
