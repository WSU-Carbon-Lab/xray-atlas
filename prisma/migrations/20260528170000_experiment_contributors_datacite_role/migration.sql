-- Store DataCite 4.7 contributorType values in experiment_contributors.role (PascalCase).

ALTER TABLE public.experiment_contributors
  DROP CONSTRAINT IF EXISTS experiment_contributors_role_check;

UPDATE public.experiment_contributors
SET role = 'DataCurator'
WHERE role = 'owner';

UPDATE public.experiment_contributors
SET role = 'DataCollector'
WHERE role = 'collector';

ALTER TABLE public.experiment_contributors
  ADD CONSTRAINT experiment_contributors_role_check
  CHECK (
    role IN (
      'ContactPerson',
      'DataCollector',
      'DataCurator',
      'DataManager',
      'Distributor',
      'Editor',
      'HostingInstitution',
      'Producer',
      'ProjectLeader',
      'ProjectManager',
      'ProjectMember',
      'RegistrationAgency',
      'RegistrationAuthority',
      'RelatedPerson',
      'Researcher',
      'ResearchGroup',
      'RightsHolder',
      'Sponsor',
      'Supervisor',
      'Translator',
      'WorkPackageLeader',
      'Other'
    )
  );
