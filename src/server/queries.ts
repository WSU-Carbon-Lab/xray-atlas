import {
  Experiment,
  Molecule,
  Preparation,
  PVD,
  SpinCoat,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
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

// --- Sample Prep Queries ---
export type SamplePrep = {
  preparation: Preparation;
  spinCoat?: SpinCoat;
  PVD?: PVD;
};

export const getSamplePrepById = async (id: string) => {
  let prep = await db.preparation.findFirst({
    where: {
      id: id,
    },
  });
  if (!prep) {
    return null;
  }
  let samplePrep = await getMethod(prep);
  return samplePrep;
};

export const getSamplePrep = async (molecule: Molecule) => {
  let prep = await db.preparation.findMany({
    where: {
      molecule: molecule.id,
    },
  });
  let samplePreps = await Promise.all(prep.map((p) => getMethod(p)));
  return samplePreps;
};

export const getMethod = async (prep: Preparation) => {
  if (prep.spin_id) {
    let spinProcess = await db.spinCoat.findFirst({
      where: {
        id: prep.spin_id,
      },
    });
    return { preparation: prep, spinCoat: spinProcess };
  } else if (prep.pvd_id) {
    let pvdProcess = await db.pVD.findFirst({
      where: {
        id: prep.pvd_id,
      },
    });
    return { preparation: prep, PVD: pvdProcess };
  } else {
    return { preparation: prep };
  }
};

// --- Experiment Queries ---
export const getExperiments = async (molecule: Molecule) => {
  let exp = await db.experiment.findMany({
    where: {
      molecule: molecule.id,
    },
  });
  return exp;
};

export const getExpById = async (id: string) => {
  let exp = await db.experiment.findFirst({
    where: {
      id: id,
    },
  });
  return exp;
};

// --- Nexafs Queries ---
export type NexafsSimplified = {
  id: number[] | null[];
  e: Decimal[] | null[];
  mu: Decimal[] | null[];
  deg: (Decimal | null)[];
};

export type CompleateData = {
  molecule: Molecule;
  experiment: Experiment;
  samplePrep: SamplePrep;
  nexafs: NexafsSimplified;
};

export const getNexafs = async (exp_id: string) => {
  const nexafs = await db.nexafs.findMany({
    where: {
      exp_id,
    },
  });
  const id = nexafs.map((n) => n.id);
  const e = nexafs.map((n) => n.e);
  const mu = nexafs.map((n) => n.mu);
  const deg = nexafs.map((n) => n.deg);
  const simplified: NexafsSimplified = { id, e, mu, deg };
  return simplified;
};

export const getNexafsData = async (experiment: Experiment) => {
  let molecule = await db.molecule.findFirst({
    where: { id: experiment.molecule },
  });
  let samplePrep = await getSamplePrepById(experiment.prep);
  let simpleNexafs = await getNexafs(experiment.id);

  return { molecule, experiment, samplePrep, simpleNexafs };
};
