import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  molecule: a
    .model({
      inchi: a.string().required(), // unique chemical identifier
      name: a.string(), // common name
      chemical_formula: a.string(),
      description: a.string(),
      img: a.url(), // image URL
      smiles: a.string(),
      synonyms: a.string().array(), // list of alternative names
    })
    // Use InChI as the primary identifier (optional; remove if you prefer the default id)
    .identifier(["inchi"])
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
