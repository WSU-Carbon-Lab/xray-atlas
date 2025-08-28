/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateMoleculesInput = {
  inchi: string,
  name: string,
  chemical_formula: string,
  description: string,
  img: string,
  smiles: string,
  synonyms?: Array< string | null > | null,
};

export type Molecules = {
  __typename: "Molecules",
  inchi: string,
  name: string,
  chemical_formula: string,
  description: string,
  img: string,
  smiles: string,
  synonyms?: Array< string | null > | null,
};

export type UpdateMoleculesInput = {
  inchi: string,
  name: string,
  chemical_formula?: string | null,
  description?: string | null,
  img?: string | null,
  smiles?: string | null,
  synonyms?: Array< string | null > | null,
};

export type DeleteMoleculesInput = {
  inchi: string,
  name: string,
};

export type CreateUsersInput = {
  orcid_id: string,
};

export type Users = {
  __typename: "Users",
  orcid_id: string,
};

export type UpdateUsersInput = {
  orcid_id: string,
};

export type DeleteUsersInput = {
  orcid_id: string,
};

export type TableMoleculesFilterInput = {
  inchi?: TableStringFilterInput | null,
  name?: TableStringFilterInput | null,
  chemical_formula?: TableStringFilterInput | null,
  description?: TableStringFilterInput | null,
  img?: TableStringFilterInput | null,
  smiles?: TableStringFilterInput | null,
  synonyms?: TableStringFilterInput | null,
};

export type TableStringFilterInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  size?: ModelSizeInput | null,
};

export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type MoleculesConnection = {
  __typename: "MoleculesConnection",
  items?:  Array<Molecules | null > | null,
  nextToken?: string | null,
};

export type TableUsersFilterInput = {
  orcid_id?: TableStringFilterInput | null,
};

export type UsersConnection = {
  __typename: "UsersConnection",
  items?:  Array<Users | null > | null,
  nextToken?: string | null,
};

export type CreateMoleculesMutationVariables = {
  input: CreateMoleculesInput,
};

export type CreateMoleculesMutation = {
  createMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type UpdateMoleculesMutationVariables = {
  input: UpdateMoleculesInput,
};

export type UpdateMoleculesMutation = {
  updateMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type DeleteMoleculesMutationVariables = {
  input: DeleteMoleculesInput,
};

export type DeleteMoleculesMutation = {
  deleteMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type CreateUsersMutationVariables = {
  input: CreateUsersInput,
};

export type CreateUsersMutation = {
  createUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};

export type UpdateUsersMutationVariables = {
  input: UpdateUsersInput,
};

export type UpdateUsersMutation = {
  updateUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};

export type DeleteUsersMutationVariables = {
  input: DeleteUsersInput,
};

export type DeleteUsersMutation = {
  deleteUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};

export type GetMoleculesQueryVariables = {
  inchi: string,
  name: string,
};

export type GetMoleculesQuery = {
  getMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type ListMoleculesQueryVariables = {
  filter?: TableMoleculesFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListMoleculesQuery = {
  listMolecules?:  {
    __typename: "MoleculesConnection",
    items?:  Array< {
      __typename: "Molecules",
      inchi: string,
      name: string,
      chemical_formula: string,
      description: string,
      img: string,
      smiles: string,
      synonyms?: Array< string | null > | null,
    } | null > | null,
    nextToken?: string | null,
  } | null,
};

export type GetUsersQueryVariables = {
  orcid_id: string,
};

export type GetUsersQuery = {
  getUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};

export type ListUsersQueryVariables = {
  filter?: TableUsersFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListUsersQuery = {
  listUsers?:  {
    __typename: "UsersConnection",
    items?:  Array< {
      __typename: "Users",
      orcid_id: string,
    } | null > | null,
    nextToken?: string | null,
  } | null,
};

export type OnCreateMoleculesSubscriptionVariables = {
  inchi?: string | null,
  name?: string | null,
  chemical_formula?: string | null,
  description?: string | null,
  img?: string | null,
};

export type OnCreateMoleculesSubscription = {
  onCreateMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type OnUpdateMoleculesSubscriptionVariables = {
  inchi?: string | null,
  name?: string | null,
  chemical_formula?: string | null,
  description?: string | null,
  img?: string | null,
};

export type OnUpdateMoleculesSubscription = {
  onUpdateMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type OnDeleteMoleculesSubscriptionVariables = {
  inchi?: string | null,
  name?: string | null,
  chemical_formula?: string | null,
  description?: string | null,
  img?: string | null,
};

export type OnDeleteMoleculesSubscription = {
  onDeleteMolecules?:  {
    __typename: "Molecules",
    inchi: string,
    name: string,
    chemical_formula: string,
    description: string,
    img: string,
    smiles: string,
    synonyms?: Array< string | null > | null,
  } | null,
};

export type OnCreateUsersSubscriptionVariables = {
  orcid_id?: string | null,
};

export type OnCreateUsersSubscription = {
  onCreateUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};

export type OnUpdateUsersSubscriptionVariables = {
  orcid_id?: string | null,
};

export type OnUpdateUsersSubscription = {
  onUpdateUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};

export type OnDeleteUsersSubscriptionVariables = {
  orcid_id?: string | null,
};

export type OnDeleteUsersSubscription = {
  onDeleteUsers?:  {
    __typename: "Users",
    orcid_id: string,
  } | null,
};
