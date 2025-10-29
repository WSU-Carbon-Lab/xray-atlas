import { defineBackend, secret } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({ auth, data });

// Define secrets for ORCID authentication
// These will be available as environment variables at runtime
const orcidClientId = secret("AUTH_ORCID_ID");
const orcidClientSecret = secret("AUTH_ORCID_SECRET");
const orcidUseSandbox = secret("ORCID_USE_SANDBOX");
const authSecret = secret("AUTH_SECRET");
