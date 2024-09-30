import { fromSSO } from "@aws-sdk/credential-providers";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const createS3Client = async () =>
  new S3Client({
    region: process.env.AWS_REGION,
    credentials: await fromSSO({ profile: process.env.AWS_PROFILE }),
  });

export const get = (key: string) =>
  new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  });

export const list = () =>
  new ListObjectsV2Command({ Bucket: process.env.AWS_BUCKET });

const getJson = async <S3Object>(
  s3: S3Client,
  key: string,
): Promise<S3Object> => {
  const { Body } = await s3.send(get(key));
  if (!Body || !Body.transformToString) {
    throw new Error("Invalid query response");
  }

  const bodyString = await Body.transformToString();
  return JSON.parse(bodyString) as S3Object;
};

const listS3 = async (s3: S3Client) => {
  const response = await s3.send(list());
  return response.Contents;
};

// Initialize S3 client
export const s3 = await createS3Client();
export const s3List = await listS3(s3);
export const registry = (await getJson(s3, "registry.json")) as MoleculeList;
export const data = (mol: string) =>
  getJson(s3, `${mol}.json`) as unknown as MoleculeFile;

// db types
export enum NexafsType {
  TEY = "TEY",
  PsTEY = "Ps-TEY",
  FY = "FY",
  ABS = "Abs",
}

export type Molecule = {
  name: string;
  formula: string;
  image: string;
  vendor: string;
  cid?: string;
  cas?: string;
};

export type Experiment = {
  edge: string;
  type: NexafsType;
  synchrotron: string;
  endstation: string;
  data: { theta: Data };
};

export type Data = {
  en: number[];
  mu: number[];
};

export type MoleculeList = { molecule: Molecule[] };
export type MoleculeFile = {
  header: Molecule;
  experiments: Experiment[];
};

export enum S3Object {
  registry,
  molecule,
}
