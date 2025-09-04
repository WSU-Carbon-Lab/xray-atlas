/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../server/api";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createMolecules = /* GraphQL */ `mutation CreateMolecules($input: CreateMoleculesInput!) {
  createMolecules(input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateMoleculesMutationVariables,
  APITypes.CreateMoleculesMutation
>;
export const updateMolecules = /* GraphQL */ `mutation UpdateMolecules($input: UpdateMoleculesInput!) {
  updateMolecules(input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateMoleculesMutationVariables,
  APITypes.UpdateMoleculesMutation
>;
export const deleteMolecules = /* GraphQL */ `mutation DeleteMolecules($input: DeleteMoleculesInput!) {
  deleteMolecules(input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteMoleculesMutationVariables,
  APITypes.DeleteMoleculesMutation
>;
export const createUsers = /* GraphQL */ `mutation CreateUsers($input: CreateUsersInput!) {
  createUsers(input: $input) {
    orcid_id
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateUsersMutationVariables,
  APITypes.CreateUsersMutation
>;
export const updateUsers = /* GraphQL */ `mutation UpdateUsers($input: UpdateUsersInput!) {
  updateUsers(input: $input) {
    orcid_id
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateUsersMutationVariables,
  APITypes.UpdateUsersMutation
>;
export const deleteUsers = /* GraphQL */ `mutation DeleteUsers($input: DeleteUsersInput!) {
  deleteUsers(input: $input) {
    orcid_id
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteUsersMutationVariables,
  APITypes.DeleteUsersMutation
>;
