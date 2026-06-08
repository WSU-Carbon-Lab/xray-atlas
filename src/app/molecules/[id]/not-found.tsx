import { BeamDumpErrorPage } from "~/components/feedback/beam-dump-error-page";

export default function MoleculeNotFound() {
  return (
    <BeamDumpErrorPage
      variant="not-found"
      statusLabel="Molecule not found"
      headline="Oh no, the beam dumped"
      subcopy="This molecule is not in the catalog yet. We are investigating whether the link is stale or the structure was never uploaded."
      issueTitle="404: molecule not found"
    />
  );
}
