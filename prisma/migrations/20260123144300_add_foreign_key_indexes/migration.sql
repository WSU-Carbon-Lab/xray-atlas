-- Add indexes on foreign key columns to improve query performance
-- These indexes optimize JOIN operations and foreign key constraint checks

CREATE INDEX IF NOT EXISTS idx_experimentpublications_publicationid 
  ON experimentpublications(publicationid);

CREATE INDEX IF NOT EXISTS idx_experiments_calibrationid 
  ON experiments(calibrationid);

CREATE INDEX IF NOT EXISTS idx_experiments_createdby 
  ON experiments(createdby);

CREATE INDEX IF NOT EXISTS idx_experiments_edgeid 
  ON experiments(edgeid);

CREATE INDEX IF NOT EXISTS idx_experiments_instrumentid 
  ON experiments(instrumentid);

CREATE INDEX IF NOT EXISTS idx_experiments_polarizationid 
  ON experiments(polarizationid);

CREATE INDEX IF NOT EXISTS idx_instruments_facilityid 
  ON instruments(facilityid);

CREATE INDEX IF NOT EXISTS idx_molecules_createdby 
  ON molecules(createdby);

CREATE INDEX IF NOT EXISTS idx_samples_moleculeid 
  ON samples(moleculeid);

CREATE INDEX IF NOT EXISTS idx_samples_vendorid 
  ON samples(vendorid);
