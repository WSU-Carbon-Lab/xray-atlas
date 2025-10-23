import { defineAuth, secret } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      oidc: [
        {
          name: "ORCID",
          issuerUrl: "https://orcid.org",
          clientId: secret("ORCID_CLIENT_ID"),
          clientSecret: secret("ORCID_CLIENT_SECRET"),
          scopes: ["openid", "email", "profile"],
          attributeMapping: {
            email: "email",
          },
        },
      ],
      callbackUrls: [
        "http://localhost:3000/sign-in",
        "https://xrayatlas.wsu.edu/sign-in", // Update with your production domain
      ],
      logoutUrls: [
        "http://localhost:3000/",
        "https://xrayatlas.wsu.edu/", // Update with your production domain
      ],
    },
  },
  userAttributes: {
    email: {
      required: true,
    },
  },
});
