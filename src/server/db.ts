import { string } from "zod";

export type Signal = { signal: number[]; units: string };

export type MoleculeList = Molecule[];
export interface Molecule {
  name: string;
  synonims: string[];
  chemicalFormula: string;
  description: string;
  smiles: string;
  inchi: string;
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
  normalizationMethod: string;
  technique: string;
  techniqueDescription: string;
}

export interface Sample {
  vendor: string;
  preparationMethod: {
    method: string;
    details: string;
  };
  molOirientationMethod: string;
}
export interface Data {
  geometry: {
    eFieldAzimuth: number;
    eFieldPolar: number;
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
  data: Data[];
}

export function Uid(experiment: Experiment): string {
  return `${experiment.edge}_${experiment.method}_${experiment.facility}_${experiment.instrument}`;
}
