import {
  Signal,
  MoleculeList,
  Molecule,
  Experiment,
  DataSet,
  Data,
  Uid,
} from "./db";

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
  queryParams?: { [key: string]: string };
  body?: any;
}

const fetchApi = async (request: ApiRequest) => {
  const response = await fetch(`${invokeUrl}/${request.path}`, {
    method: request.verb,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.body),
  });
  return await response.json();
};

export const getMolecules = async (): Promise<MoleculeList> => {
  const request: ApiRequest = {
    verb: Verb.GET,
    path: "bucket/molecules",
  };
  return (await fetchApi(request)) as MoleculeList;
};

export const getMolecule = async (name: string): Promise<Molecule> => {
  const request: ApiRequest = {
    verb: Verb.GET,
    path: `bucket/molecule/${name.toUpperCase().replace(" ", "")}`,
  };
  return (await fetchApi(request)) as Molecule;
};

export const getDataSet = async (
  name: string,
  exp: Experiment,
): Promise<DataSet> => {
  const uid = Uid(exp);
  const request: ApiRequest = {
    verb: Verb.GET,
    path: `bucket/data/${name.toUpperCase().replace(" ", "")}/${uid}`,
  };
  return (await fetchApi(request)) as DataSet;
};

export const downloadData = async (name: string, exp: Experiment) => {
  const dataSet = await getDataSet(name, exp);
  return `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(dataSet, null, 4),
  )}`;
};
