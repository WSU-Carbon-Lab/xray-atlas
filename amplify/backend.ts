import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";

export const backend = defineBackend({
  auth,
  data,
});

export const externalDataSourcesStack = backend.createStack(
  "externalDataSources",
);
