import type { Molecule, Experiment, DataSet } from "./db";
import { Uid } from "./db";
import { z } from "zod";

//  This uses the API from .env to fetch data from the s3 bucket

const invokeUrl = "https://bfsd0tdg6f.execute-api.us-west-2.amazonaws.com/prod";

enum Verb {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

interface ApiRequest {
  verb: Verb;
  path: string;
}

const headers: Headers = new Headers();
headers.set("Content-Type", "application/json");
headers.set("Accept", "application/json");

const fetchApi = async (request: ApiRequest) => {
  const path = `${invokeUrl}/${request.path}`;
  const response = await fetch(path, {
    method: request.verb,
    headers: headers,
  }).then((res) => res.json());
  return response;
};

export const getMolecules = async (): Promise<Molecule[]> => {
  const request: ApiRequest = {
    verb: Verb.GET,
    path: "bucket/molecules",
  };
  const response = await fetchApi(request);
  return response?.molecules as Molecule[];
};

export const getImages = async (): Promise<string[]> => {
  const molecules = await getMolecules();
  const images = molecules.map((m) => m.img);
  return images;
};

export const getMolecule = async (name: string): Promise<Molecule> => {
  const request: ApiRequest = {
    verb: Verb.GET,
    path: `bucket/molecules/${name.toUpperCase().replace(" ", "")}/metadata`,
  };
  const response = await fetchApi(request);
  return response?.molecule as Molecule;
};

export const getDataSet = async (
  name: string,
  exp: Experiment,
): Promise<DataSet> => {
  const uid = Uid(exp);
  const request: ApiRequest = {
    verb: Verb.GET,
    path: `bucket/molecules/${name}/${uid}`,
  };
  return (await fetchApi(request)) as DataSet;
};

export const getAzimuthValues = (dataSet: DataSet): string[] => {
  return Array.from(
    new Set(dataSet.dataset.map((d) => d.geometry.e_field_azimuth.toString())),
  );
};

export const getPolarValues = (dataSet: DataSet): string[] => {
  return Array.from(
    new Set(dataSet.dataset.map((d) => d.geometry.e_field_polar.toString())),
  );
};

export const downloadData = (
  name: string,
  exp: Experiment,
  kind: "csv" | "json" = "csv",
) => {
  const root = `https://bfsd0tdg6f.execute-api.us-west-2.amazonaws.com/prod/bucket/molecules/${name.toUpperCase().replace(" ", "")}/${Uid(exp)}`;
  if (kind === "csv") {
    return `${root}/csv`;
  }
  return `${root}`;
};
