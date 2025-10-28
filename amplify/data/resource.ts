import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*
==============================================================
Define schemas for each molecule and one made for each experiment record input
==============================================================
Molecule schema:
==============================================================
- name: string
- image: url
- synonyms: string[]
- chemicalFormula: string
- description: string
- smiles: string
- inchi: string

Instrument schema:
==============================================================
- facility: string
- instrument: string
- link: url

Experiment schema:
==============================================================
- molecule: Molecule
- instrument: Instrument
- experimentData: string
- user: User
- createdAt: date
- updatedAt: date
- data: Data

Data schema:
==============================================================
- data: string
- energy: number[]
- intensity: number[]
- polarization_azimuth: number[]
- polarization_polar: number[]
- izero: number[]
- izero_2: number[]

User schema:
==============================================================
- ORCID: string
- name: (use ORCID api to get name)
- email: (use ORCID api to get email)
- affiliation: (use ORCID api to get affiliation)
==============================================================
*/

const schema = a.schema({
  Molecule: a
    .model({
      name: a.string().required(),
      image: a.url(),
      synonyms: a.string().array(),
      chemicalFormula: a.string(),
      description: a.string(),
      smiles: a.string(),
      inchi: a.string(),
      experiments: a.hasMany("Experiment", "moleculeId"),
    })
    .authorization((allow) => [allow.guest()]),

  Instrument: a
    .model({
      facility: a.string().required(),
      instrument: a.string().required(),
      link: a.url(),
      experiments: a.hasMany("Experiment", "instrumentId"),
    })
    .authorization((allow) => [allow.guest()]),

  User: a
    .model({
      orcid: a.string().required(),
      name: a.string(),
      email: a.string(),
      affiliation: a.string(),
      experiments: a.hasMany("Experiment", "userId"),
    })
    .authorization((allow) => [allow.guest()]),

  Experiment: a
    .model({
      description: a.string(),
      experimentData: a.string(),
      moleculeId: a.id(),
      molecule: a.belongsTo("Molecule", "moleculeId"),
      instrumentId: a.id(),
      instrument: a.belongsTo("Instrument", "instrumentId"),
      userId: a.id(),
      user: a.belongsTo("User", "userId"),
      dataId: a.id(),
      data: a.belongsTo("Data", "dataId"),
    })
    .authorization((allow) => [allow.guest()]),

  Data: a
    .model({
      data: a.string(),
      energy: a.float().array(),
      intensity: a.float().array(),
      polarization_azimuth: a.float().array(),
      polarization_polar: a.float().array(),
      izero: a.float().array(),
      izero_2: a.float().array(),
      experiment: a.hasOne("Experiment", "dataId"),
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
