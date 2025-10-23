import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  User: a
    .model({
      orcid_id: a.string().required(),
      email: a.string().required(),
      auxiliary_emails: a.string().array(),
      contact_info: a.string(),
      profile_picture_url: a.string(),
      name: a.string(),
      created_at: a.datetime(),
      updated_at: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Organization: a
    .model({
      name: a.string().required(),
      description: a.string(),
      created_at: a.datetime(),
      updated_at: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  OrganizationMember: a
    .model({
      user_id: a.string().required(),
      organization_id: a.string().required(),
      role: a.enum(["OWNER", "ADMIN", "MEMBER"]),
      joined_at: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  // Relationship between User and Organization through OrganizationMember
  UserOrganizations: a
    .model({
      user: a.belongsTo("User", "user_id"),
      organization: a.belongsTo("Organization", "organization_id"),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
