import { db } from "~/server/db";
import type {
  Prisma,
  Molecule,
  Vendor,
  Instrument,
  Experiment,
  Sample,
} from "@prisma/client";

type MoleculeInput = {
  name: string;
  iupacName: string;
  synonyms: string[];
  molecularFormula: string;
  image?: string;
  smiles: string;
  inchi: string;
  inchiKey?: string;
  casNumber?: string;
  pubChemCid?: string;
};

type VendorInput = {
  name: string;
  url?: string;
};

type InstrumentInput = {
  facility: string;
  instrument: string;
  link?: string;
};

type ExperimentInput = {
  absorbingAtom: string;
  coreLevel: "K" | "L1" | "L2" | "L3" | "M1" | "M2" | "M3";
  normalization?: string;
  incidentElectricFieldPolarAngle?: number;
  incidentElectricFieldAzimuthalAngle?: number;
  energy: number[];
  intensity: number[];
  izero: number[];
  izero2: number[];
};

type UploadData = {
  molecule: MoleculeInput;
  vendor: VendorInput;
  instrument: InstrumentInput;
  experiment: ExperimentInput;
};

type UploadResult = {
  sampleId: string;
  experimentId: string;
  moleculeId: string;
  vendorId: string;
  instrumentId: string;
  created: {
    molecule: boolean;
    vendor: boolean;
    instrument: boolean;
    sample: boolean;
    experiment: boolean;
  };
};

// ============================================================================
// MOLECULE SEARCH & UPSERT
// ============================================================================

/**
 * Searches for an existing molecule using multiple identifying fields
 * Priority: InChI Key > InChI > SMILES > CAS Number > PubChem CID > Name + Formula
 * Can be used with a transaction client or the main db client
 */
export async function findExistingMolecule(
  client: Prisma.TransactionClient | typeof db,
  molecule: MoleculeInput,
): Promise<Molecule | null> {
  // Try InChI Key first (most unique identifier)
    if (molecule.inchiKey) {
      const found = await client.molecule.findFirst({
        where: { inchiKey: molecule.inchiKey },
      });
      if (found) return found;
    }

    // Try InChI (also unique)
    const foundInchi = await client.molecule.findFirst({
      where: { inchi: molecule.inchi },
    });
    if (foundInchi) return foundInchi;

    // Try SMILES (also unique for most molecules)
    const foundSmiles = await client.molecule.findFirst({
      where: { smiles: molecule.smiles },
    });
    if (foundSmiles) return foundSmiles;

    // Try CAS Number if available
    if (molecule.casNumber) {
      const foundCas = await client.molecule.findFirst({
        where: { casNumber: molecule.casNumber },
      });
      if (foundCas) return foundCas;
    }

    // Try PubChem CID if available
    if (molecule.pubChemCid) {
      const foundPubChem = await client.molecule.findFirst({
        where: { pubChemCid: molecule.pubChemCid },
      });
      if (foundPubChem) return foundPubChem;
    }

    // Fallback: try name + molecular formula combination
    const foundName = await client.molecule.findFirst({
      where: {
        name: molecule.name,
        molecularFormula: molecule.molecularFormula,
      },
    });
    if (foundName) return foundName;

  return null;
}

/**
 * Creates or updates a molecule in the database
 * Searches for existing molecules first, then creates or updates accordingly
 * Can be used with a transaction client or the main db client
 */
export async function upsertMolecule(
  client: Prisma.TransactionClient | typeof db,
  molecule: MoleculeInput,
): Promise<{ molecule: Molecule; created: boolean }> {
  const existing = await findExistingMolecule(client, molecule);

  if (existing) {
    // Update existing molecule with any new information
    const updated = await client.molecule.update({
      where: { id: existing.id },
      data: {
        // Only update fields that might have new information
        iupacName: molecule.iupacName !== existing.iupacName ? molecule.iupacName : existing.iupacName,
        synonyms: {
          // Merge synonyms, avoiding duplicates
          set: [...new Set([...existing.synonyms, ...molecule.synonyms])],
        },
        image: molecule.image || existing.image,
        inchiKey: molecule.inchiKey || existing.inchiKey,
        casNumber: molecule.casNumber || existing.casNumber,
        pubChemCid: molecule.pubChemCid || existing.pubChemCid,
      },
    });
    return { molecule: updated, created: false };
  }

  // Create new molecule
  const created = await client.molecule.create({
    data: {
      name: molecule.name,
      iupacName: molecule.iupacName,
      synonyms: molecule.synonyms,
      molecularFormula: molecule.molecularFormula,
      image: molecule.image,
      smiles: molecule.smiles,
      inchi: molecule.inchi,
      inchiKey: molecule.inchiKey,
      casNumber: molecule.casNumber,
      pubChemCid: molecule.pubChemCid,
    },
  });
  return { molecule: created, created: true };
}

// ============================================================================
// VENDOR SEARCH & UPSERT
// ============================================================================

/**
 * Searches for an existing vendor by name
 */
async function findExistingVendor(
  tx: Prisma.TransactionClient,
  vendor: VendorInput,
): Promise<Vendor | null> {
  return tx.vendor.findUnique({
    where: { name: vendor.name },
  });
}

/**
 * Creates or updates a vendor in the database
 */
async function upsertVendor(
  tx: Prisma.TransactionClient,
  vendor: VendorInput,
): Promise<{ vendor: Vendor; created: boolean }> {
  const existing = await findExistingVendor(tx, vendor);

  if (existing) {
    // Update URL if provided and different
    if (vendor.url && vendor.url !== existing.url) {
      const updated = await tx.vendor.update({
        where: { id: existing.id },
        data: { url: vendor.url },
      });
      return { vendor: updated, created: false };
    }
    return { vendor: existing, created: false };
  }

  const created = await tx.vendor.create({ data: vendor });
  return { vendor: created, created: true };
}

// ============================================================================
// INSTRUMENT SEARCH & UPSERT
// ============================================================================

/**
 * Searches for an existing instrument by facility and instrument name
 */
async function findExistingInstrument(
  tx: Prisma.TransactionClient,
  instrument: InstrumentInput,
): Promise<Instrument | null> {
  return tx.instrument.findFirst({
    where: {
      facility: instrument.facility,
      instrument: instrument.instrument,
    },
  });
}

/**
 * Creates or updates an instrument in the database
 * Uses facility + instrument name as a composite natural key
 */
async function upsertInstrument(
  tx: Prisma.TransactionClient,
  instrument: InstrumentInput,
): Promise<{ instrument: Instrument; created: boolean }> {
  const existing = await findExistingInstrument(tx, instrument);

  if (existing) {
    // Update link if provided and different
    if (instrument.link && instrument.link !== existing.link) {
      const updated = await tx.instrument.update({
        where: { id: existing.id },
        data: { link: instrument.link },
      });
      return { instrument: updated, created: false };
    }
    return { instrument: existing, created: false };
  }

  const created = await tx.instrument.create({ data: instrument });
  return { instrument: created, created: true };
}

// ============================================================================
// SAMPLE SEARCH & UPSERT
// ============================================================================

/**
 * Searches for an existing sample with the same user, molecules, and vendors
 */
async function findExistingSample(
  tx: Prisma.TransactionClient,
  userId: string,
  moleculeIds: string[],
  vendorIds: string[],
): Promise<Sample | null> {
  // Find samples for this user
  const userSamples = await tx.sample.findMany({
    where: {
      user: { clerkId: userId },
    },
    include: {
      molecules: true,
      vendors: true,
    },
  });

  // Check each sample to see if it has the same molecules and vendors
  for (const sample of userSamples) {
    const sampleMoleculeIds = sample.molecules.map((m) => m.id).sort();
    const sampleVendorIds = sample.vendors.map((v) => v.id).sort();

    const moleculeIdsSorted = [...moleculeIds].sort();
    const vendorIdsSorted = [...vendorIds].sort();

    // Check if molecules match (same count and same IDs)
    if (
      sampleMoleculeIds.length === moleculeIdsSorted.length &&
      sampleMoleculeIds.every((id, idx) => id === moleculeIdsSorted[idx]) &&
      // Check if vendors match
      sampleVendorIds.length === vendorIdsSorted.length &&
      sampleVendorIds.every((id, idx) => id === vendorIdsSorted[idx])
    ) {
      return sample;
    }
  }

  return null;
}

/**
 * Creates or gets an existing sample for the given user, molecules, and vendors
 */
async function upsertSample(
  tx: Prisma.TransactionClient,
  userId: string,
  moleculeIds: string[],
  vendorIds: string[],
): Promise<{ sample: Sample; created: boolean }> {
  const existing = await findExistingSample(tx, userId, moleculeIds, vendorIds);

  if (existing) {
    return { sample: existing, created: false };
  }

  // Get the user's database ID
  const user = await tx.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    throw new Error(`User with clerkId ${userId} not found`);
  }

  const created = await tx.sample.create({
    data: {
      userId: user.id,
      molecules: { connect: moleculeIds.map((id) => ({ id })) },
      vendors: { connect: vendorIds.map((id) => ({ id })) },
    },
  });

  return { sample: created, created: true };
}

// ============================================================================
// EXPERIMENT UPLOAD
// ============================================================================

/**
 * Creates a complete experiment upload with all related entities
 * This includes molecule, vendor, instrument, sample, and experiment records
 * All operations are performed within a transaction for data consistency
 *
 * The function intelligently searches for and reuses existing:
 * - Molecules (by InChI Key, InChI, SMILES, CAS Number, PubChem CID, or name+formula)
 * - Vendors (by name)
 * - Instruments (by facility + instrument name)
 * - Samples (by user + molecules + vendors combination)
 *
 * @param userId - The Clerk user ID of the uploader
 * @param data - The upload data containing molecule, vendor, instrument, and experiment information
 * @returns A result object containing IDs of created entities and flags indicating what was created vs. found
 */
export async function createExperimentUpload(
  userId: string,
  data: UploadData,
): Promise<UploadResult> {
  const result = await db.$transaction(async (tx) => {
    // Step 1: Find or create molecule
    const { molecule, created: moleculeCreated } = await upsertMolecule(
      tx,
      data.molecule,
    );

    // Step 2: Find or create vendor
    const { vendor, created: vendorCreated } = await upsertVendor(
      tx,
      data.vendor,
    );

    // Step 3: Find or create instrument
    const { instrument, created: instrumentCreated } = await upsertInstrument(
      tx,
      data.instrument,
    );

    // Step 4: Find or create sample
    const { sample, created: sampleCreated } = await upsertSample(
      tx,
      userId,
      [molecule.id],
      [vendor.id],
    );

    // Step 5: Create experiment (experiments are always unique)
    // Get the user's database ID
    const user = await tx.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error(`User with clerkId ${userId} not found`);
    }

    const experiment = await tx.experiment.create({
      data: {
        userId: user.id,
        sampleId: sample.id,
        instrumentId: instrument.id,
        absorbingAtom: data.experiment.absorbingAtom,
        coreLevel: data.experiment.coreLevel,
        normalization: data.experiment.normalization,
        incidentElectricFieldPolarAngle:
          data.experiment.incidentElectricFieldPolarAngle,
        incidentElectricFieldAzimuthalAngle:
          data.experiment.incidentElectricFieldAzimuthalAngle,
        energy: data.experiment.energy,
        intensity: data.experiment.intensity,
        izero: data.experiment.izero,
        izero2: data.experiment.izero2,
      },
    });

    return {
      sampleId: sample.id,
      experimentId: experiment.id,
      moleculeId: molecule.id,
      vendorId: vendor.id,
      instrumentId: instrument.id,
      created: {
        molecule: moleculeCreated,
        vendor: vendorCreated,
        instrument: instrumentCreated,
        sample: sampleCreated,
        experiment: true, // Experiments are always newly created
      },
    };
  });

  return result;
}

/**
 * Creates an experiment using existing entity IDs
 * This is used when molecules, vendors, and instruments have already been created
 */
export async function createExperimentFromIds(
  userId: string,
  data: {
    moleculeId: string;
    vendorId: string;
    instrumentId: string;
    experiment: ExperimentInput;
  },
): Promise<UploadResult> {
  const result = await db.$transaction(async (tx) => {
    // Get the user's database ID
    const user = await tx.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error(`User with clerkId ${userId} not found`);
    }

    // Verify entities exist
    const molecule = await tx.molecule.findUnique({
      where: { id: data.moleculeId },
    });
    if (!molecule) {
      throw new Error(`Molecule with id ${data.moleculeId} not found`);
    }

    const vendor = await tx.vendor.findUnique({
      where: { id: data.vendorId },
    });
    if (!vendor) {
      throw new Error(`Vendor with id ${data.vendorId} not found`);
    }

    const instrument = await tx.instrument.findUnique({
      where: { id: data.instrumentId },
    });
    if (!instrument) {
      throw new Error(`Instrument with id ${data.instrumentId} not found`);
    }

    // Find or create sample
    const { sample, created: sampleCreated } = await upsertSample(
      tx,
      userId,
      [molecule.id],
      [vendor.id],
    );

    // Create experiment
    const experiment = await tx.experiment.create({
      data: {
        userId: user.id,
        sampleId: sample.id,
        instrumentId: instrument.id,
        absorbingAtom: data.experiment.absorbingAtom,
        coreLevel: data.experiment.coreLevel,
        normalization: data.experiment.normalization,
        incidentElectricFieldPolarAngle:
          data.experiment.incidentElectricFieldPolarAngle,
        incidentElectricFieldAzimuthalAngle:
          data.experiment.incidentElectricFieldAzimuthalAngle,
        energy: data.experiment.energy,
        intensity: data.experiment.intensity,
        izero: data.experiment.izero,
        izero2: data.experiment.izero2,
      },
    });

    return {
      sampleId: sample.id,
      experimentId: experiment.id,
      moleculeId: molecule.id,
      vendorId: vendor.id,
      instrumentId: instrument.id,
      created: {
        molecule: false, // Already existed
        vendor: false, // Already existed
        instrument: false, // Already existed
        sample: sampleCreated,
        experiment: true,
      },
    };
  });

  return result;
}
