/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../server/api";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getMolecules = /* GraphQL */ `query GetMolecules($inchi: String!, $name: String!) {
  getMolecules(inchi: $inchi, name: $name) {
    inchi
    name
    chemical_formula
    description
    img
    smiles
    synonyms
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetMoleculesQueryVariables,
  APITypes.GetMoleculesQuery
>;
export const listMolecules = /* GraphQL */ `query ListMolecules(
  $filter: TableMoleculesFilterInput
  $limit: Int
  $nextToken: String
) {
  listMolecules(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      inchi
      name
      chemical_formula
      description
      img
      smiles
      synonyms
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMoleculesQueryVariables,
  APITypes.ListMoleculesQuery
>;
export const getUsers = /* GraphQL */ `query GetUsers($orcid_id: String!) {
  getUsers(orcid_id: $orcid_id) {
    orcid_id
    __typename
  }
}
` as GeneratedQuery<APITypes.GetUsersQueryVariables, APITypes.GetUsersQuery>;
export const listUsers = /* GraphQL */ `query ListUsers(
  $filter: TableUsersFilterInput
  $limit: Int
  $nextToken: String
) {
  listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      orcid_id
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListUsersQueryVariables, APITypes.ListUsersQuery>;
