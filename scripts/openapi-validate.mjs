import SwaggerParser from "@apidevtools/swagger-parser";
import { openApiV1Spec } from "../src/app/api/v1/openapi/spec.ts";

async function main() {
  await SwaggerParser.validate(openApiV1Spec);
  console.log("openapi:validate passed");
}

main().catch((error) => {
  console.error("openapi:validate failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
