import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

/* S3 Database types*/
export type Signal = { signal: number[]; units: string };

export interface Molecule {
  name: string;
  synonyms: string[];
  chemical_formula: string;
  description: string;
  SMILES: string;
  InChI: string;
  img: string;
  data?: Experiment[];
}
export interface Experiment {
  edge: string;
  method: string;
  facility: string;
  instrument: string;
  group: string;
  source: string;
}

export interface User {
  name: string;
  affiliation: string;
  group: string;
  email: string;
  doi?: string;
}
export interface Instrument {
  facility: string;
  instrument: string;
  edge: string;
  normalization_method: string;
  technique: string;
  technical_details: string;
}

export interface Sample {
  vendor: string;
  preparation_method: {
    method: string;
    details: string;
  };
  mol_orientation_details: string;
}
export interface Data {
  geometry: {
    e_field_azimuth: number;
    e_field_polar: number;
  };
  energy: Signal;
  intensity: Signal;
  error?: Signal;
  io?: Signal;
}

export interface DataSet {
  user: User;
  instrument: Instrument;
  sample: Sample;
  dataset: Data[];
}

export function Uid(experiment: Experiment): string {
  return `${experiment.edge}_${experiment.method}_${experiment.facility}_${experiment.instrument}_${experiment.group}_${experiment.source}`;
}

/* DynamoDB Client Setup */
const USERS_TABLE = process.env.USERS_TABLE_NAME ?? "users";
const MOLECULES_TABLE = process.env.MOLECULES_TABLE_NAME ?? "molecules";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
  if (!USERS_TABLE) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not set.");
  }

  const userOrcidId = "some-user-id"; // Get this from the request body or session

  const command = new PutCommand({
    TableName: USERS_TABLE, // Uses the environment variable
    Item: {
      userId: userOrcidId,
      createdAt: new Date().toISOString(),
    },
  });

  await docClient.send(command);

  return Response.json({ message: "Success" });
}
