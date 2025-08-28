/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../server/api";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateMolecules = /* GraphQL */ `subscription OnCreateMolecules(
  $inchi: String
  $name: String
  $chemical_formula: String
  $description: String
  $img: AWSURL
) {
  onCreateMolecules(
    inchi: $inchi
    name: $name
    chemical_formula: $chemical_formula
    description: $description
    img: $img
  ) {
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
` as GeneratedSubscription<
  APITypes.OnCreateMoleculesSubscriptionVariables,
  APITypes.OnCreateMoleculesSubscription
>;
export const onUpdateMolecules = /* GraphQL */ `subscription OnUpdateMolecules(
  $inchi: String
  $name: String
  $chemical_formula: String
  $description: String
  $img: AWSURL
) {
  onUpdateMolecules(
    inchi: $inchi
    name: $name
    chemical_formula: $chemical_formula
    description: $description
    img: $img
  ) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateMoleculesSubscriptionVariables,
  APITypes.OnUpdateMoleculesSubscription
>;
export const onDeleteMolecules = /* GraphQL */ `subscription OnDeleteMolecules(
  $inchi: String
  $name: String
  $chemical_formula: String
  $description: String
  $img: AWSURL
) {
  onDeleteMolecules(
    inchi: $inchi
    name: $name
    chemical_formula: $chemical_formula
    description: $description
    img: $img
  ) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteMoleculesSubscriptionVariables,
  APITypes.OnDeleteMoleculesSubscription
>;
export const onCreateUsers = /* GraphQL */ `subscription OnCreateUsers($orcid_id: String) {
  onCreateUsers(orcid_id: $orcid_id) {
    orcid_id
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateUsersSubscriptionVariables,
  APITypes.OnCreateUsersSubscription
>;
export const onUpdateUsers = /* GraphQL */ `subscription OnUpdateUsers($orcid_id: String) {
  onUpdateUsers(orcid_id: $orcid_id) {
    orcid_id
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateUsersSubscriptionVariables,
  APITypes.OnUpdateUsersSubscription
>;
export const onDeleteUsers = /* GraphQL */ `subscription OnDeleteUsers($orcid_id: String) {
  onDeleteUsers(orcid_id: $orcid_id) {
    orcid_id
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteUsersSubscriptionVariables,
  APITypes.OnDeleteUsersSubscription
>;
