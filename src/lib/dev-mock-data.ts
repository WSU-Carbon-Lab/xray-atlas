export const DEV_MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

export const DEV_MOCK_USER = {
  id: DEV_MOCK_USER_ID,
  name: "Dr. Jane Smith",
  email: "jane.smith@example.edu",
  emailVerified: new Date("2024-01-15T10:30:00Z"),
  image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
  orcid: "0000-0001-2345-6789",
  role: "contributor" as const,
  contributionAgreementAccepted: true,
  contributionAgreementDate: new Date("2024-01-10T08:00:00Z"),
};

export const DEV_MOCK_LINKED_ACCOUNTS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    provider: "orcid" as const,
    providerAccountId: "0000-0001-2345-6789",
    type: "oauth" as const,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    provider: "github" as const,
    providerAccountId: "12345678",
    type: "oauth" as const,
  },
];

export const DEV_MOCK_PASSKEYS = [
  {
    id: "00000000-0000-0000-0000-000000000003",
    deviceType: "cross-platform",
    backedUp: true,
    transports: ["usb", "nfc", "ble"],
    lastUsed: 42,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    deviceType: "singleDevice",
    backedUp: false,
    transports: ["internal"],
    lastUsed: 15,
  },
];

export const DEV_MOCK_MOLECULES = [
  {
    id: "00000000-0000-0000-0000-000000000010",
    iupacname: "Ethanol",
    inchi: "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3",
    smiles: "CCO",
    chemicalformula: "C2H6O",
    casnumber: "64-17-5",
    pubchemcid: "702",
    createdat: new Date("2024-01-20T14:30:00Z"),
    updatedat: new Date("2024-01-20T14:30:00Z"),
    imageurl: null,
    createdby: DEV_MOCK_USER_ID,
    upvotes: 12,
    moleculesynonyms: [
      {
        id: "00000000-0000-0000-0000-000000000011",
        moleculeid: "00000000-0000-0000-0000-000000000010",
        synonym: "Ethanol",
        order: 0,
      },
      {
        id: "00000000-0000-0000-0000-000000000012",
        moleculeid: "00000000-0000-0000-0000-000000000010",
        synonym: "Ethyl alcohol",
        order: 1,
      },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000020",
    iupacname: "Benzene",
    inchi: "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H",
    smiles: "c1ccccc1",
    chemicalformula: "C6H6",
    casnumber: "71-43-2",
    pubchemcid: "241",
    createdat: new Date("2024-01-18T09:15:00Z"),
    updatedat: new Date("2024-01-18T09:15:00Z"),
    imageurl: null,
    createdby: DEV_MOCK_USER_ID,
    upvotes: 8,
    moleculesynonyms: [
      {
        id: "00000000-0000-0000-0000-000000000021",
        moleculeid: "00000000-0000-0000-0000-000000000020",
        synonym: "Benzene",
        order: 0,
      },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000030",
    iupacname: "Water",
    inchi: "InChI=1S/H2O/h1H2",
    smiles: "O",
    chemicalformula: "H2O",
    casnumber: "7732-18-5",
    pubchemcid: "962",
    createdat: new Date("2024-01-15T11:45:00Z"),
    updatedat: new Date("2024-01-15T11:45:00Z"),
    imageurl: null,
    createdby: DEV_MOCK_USER_ID,
    upvotes: 25,
    moleculesynonyms: [
      {
        id: "00000000-0000-0000-0000-000000000031",
        moleculeid: "00000000-0000-0000-0000-000000000030",
        synonym: "Water",
        order: 0,
      },
      {
        id: "00000000-0000-0000-0000-000000000032",
        moleculeid: "00000000-0000-0000-0000-000000000030",
        synonym: "Dihydrogen monoxide",
        order: 1,
      },
    ],
  },
];

export function isDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isDevMockUser(userId: string | undefined | null): boolean {
  return isDevMode() && userId === DEV_MOCK_USER_ID;
}
