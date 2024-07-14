import { db } from "~/server/db";

// Get all wrapper functions
export const getMolecules = async () => {
  return db.molecules.findMany();
};

export const getExperiments = async () => {
  return db.experiment.findMany();
};

export const getPreps = async () => {
  return db.preparation.findMany();
};

export const getAllNEXAFS = async () => {
  return db.nEXAFS.findMany();
};

export const getMolById = async (id: any) => {
  return db.molecules.findUnique({ where: { MoleculeID: id } });
};

export const getExpById = async (id: any) => {
  return db.experiment.findUnique({ where: { ExperimentID: id } });
};

export const getNEXAFSByExpId = async (id: any) => {
  return db.nEXAFS.findMany({ where: { ExperimentID: id } });
};

export const getPreparationById = async (id: any) => {
  return await db.preparation.findUnique({
    where: { PrepID: id },
    include: {
      Molecules_Preparation_PrimaryMolIDToMolecules: true,
      Molecules_Preparation_SecondaryMolIDToMolecules: true,
      Experiment: true,
    },
  });
};

export const searchMoleculesByName = async (name: any) => {
  return await db.molecules.findMany({
    where: {
      Name: {
        contains: name, // This makes the search case-insensitive and allows partial matches
      },
    },
    include: {
      Preparation_Preparation_PrimaryMolIDToMolecules: true,
      Preparation_Preparation_SecondaryMolIDToMolecules: true,
    },
  });
};

export const getExperimentsByMoleculeName = async (name: any) => {
  const molecules = await db.molecules.findMany({
    where: {
      Name: {
        contains: name,
      },
    },
    include: {
      Preparation_Preparation_PrimaryMolIDToMolecules: {
        include: {
          Experiment: true,
        },
      },
      Preparation_Preparation_SecondaryMolIDToMolecules: {
        include: {
          Experiment: true,
        },
      },
    },
  });

  const experiments = molecules.flatMap((molecule) => [
    ...molecule.Preparation_Preparation_PrimaryMolIDToMolecules.flatMap(
      (prep) => prep.Experiment,
    ),
    ...molecule.Preparation_Preparation_SecondaryMolIDToMolecules.flatMap(
      (prep) => prep.Experiment,
    ),
  ]);

  return experiments;
};
