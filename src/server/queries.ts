import { Molecule } from "@prisma/client";
import { db } from "~/server/db";

// --- CID Queries ---
export const getImageFromCID = (molecule: Molecule) => {
  if (!molecule.cid) {
    return molecule.image;
  }
  let url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${molecule.cid}/PNG?image_size=160x160`;
  molecule.image = url;
};

// --- Molecule Queries ---
export const getMolecule = async (name: string) => {
  let mol = await db.molecule.findFirst({
    where: {
      name: name,
    },
  });
  if (!mol) {
    return null;
  }
  getImageFromCID(mol);
  return mol;
};

export const getMolecules = async () => {
  let mol = await db.molecule.findMany();
  mol = mol.filter((molecule) => molecule.class === "public");
  // Apply getImageFromCID to each molecule
  mol.map((molecule) => getImageFromCID(molecule));
  return mol;
};

// --- Preparation Queries ---
export const getSpinParams = async (id: string) => {
  return db.spinCoat.findMany({
    where: {
      id: id,
    },
  });
};

export const getPrep = async (id: string) => {
  return db.preparation.findMany({
    where: {
      id: id,
    },
  });
};

export const getPrepsFromMolecule = async (mol_id: string) => {
  return db.preparation.findMany({
    where: {
      id: mol_id,
    },
  });
};

// --- Experiment Queries ---
export const getExperimentByMolecule = async (molecule: string) => {
  let mol = await db.molecule.findFirst({
    where: {
      name: molecule,
    },
  });
  if (!mol) {
    return [];
  }
  return db.experiment.findMany({
    where: {
      molecule: mol.id,
    },
  });
};

export const getExperimentById = async (id: string) => {
  return db.experiment.findMany({
    where: {
      id: id,
    },
  });
};

export const getExperiments = async () => {
  return db.experiment.findMany();
};

// --- Nexafs Queries ---
export const getNexafsByExperiment = async (experiment: string) => {
  let exp = await db.experiment.findFirst({
    where: {
      id: experiment,
    },
  });
  if (!exp) {
    return [];
  }
  let nexafs = await db.nexafs.findMany({
    where: {
      exp_id: exp.id,
    },
  });
  // Create an empty dataframe
  let dataframe: { [key: string]: any }[] = [];
  for (let i = 0; i < nexafs.length; i++) {
    let record = nexafs[i];
    for (let column in record) {
      if (column !== "id" && column !== "exp_id") {
        if (!dataframe.some((row) => row[column] !== undefined)) {
          dataframe.forEach((row) => (row[column] = undefined));
        }
        (dataframe[i] as { [key: string]: any })[
          column as keyof typeof record
        ] = record[column as keyof typeof record];
      }
    }
  }
  return dataframe;
};
