import React from "react";
import { getMolecules } from "~/server/queries";

async function MoleculeList() {
  const molecules = await getMolecules();
  const moleculeList = molecules.map((molecule) => (
    <li key={molecule.MoleculeID}>{molecule.Name}</li>
  ));
  return <ul>{moleculeList}</ul>;
}

export default function HomePage() {
  return (
    <main className="...">
      <h1 className="...">Welcome to the Xray Atlas</h1>
      <p className="...">
        This is a database for Xray spectroscopy data collected by the WSU
        Collins Lab.
      </p>
      <MoleculeList />
    </main>
  );
}
