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
  return `${experiment.edge}_${experiment.method}_${experiment.facility}_${experiment.instrument}_${experiment.group}_${experiment.source}`;
}
