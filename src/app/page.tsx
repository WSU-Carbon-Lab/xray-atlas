import React from "react";
import Image from "next/image";
import { getImageFromCID, getMolecules } from "~/server/queries";
import Link from "next/link";
import { Molecule } from "@prisma/client";

export const dynamic = "force-dynamic";

async function MoleculePost(molecule: Molecule) {
  if (!molecule) {
    return null;
  }
  return (
    <div className="... flex h-40 w-full gap-10">
      <div className="... h-40 w-40 content-center rounded-lg bg-white">
        <Image
          className="... h-40 w-40 rounded-lg"
          src={molecule.image}
          alt={molecule.name}
          width={160}
          height={160}
        />
      </div>
      <div className="... flex w-full flex-col gap-1 rounded-xl bg-gray-700 pl-7 pt-5">
        <div className="flex gap-2">
          <Link href={`/molecule/${molecule.name}`}>
            <span className="...">{`${molecule.name} ` + " "}</span>
            <span className="... font-mono font-thin text-gray-200">{`·`}</span>
            <span className="... font-mono font-thin text-gray-200">{`${molecule.formula}`}</span>
          </Link>
        </div>
        <div className="... font-mono font-thin text-gray-200">
          {molecule.vendor}
        </div>
      </div>
    </div>
  );
}

async function MoleculeFeed() {
  const molecules = await getMolecules();

  return (
    <div className="... flex flex-wrap justify-center">
      {molecules.map((molecule) => (
        <div key={molecule.id} className="... m-4 h-40 w-full">
          <MoleculePost {...molecule} />
        </div>
      ))}
    </div>
  );
}

export function StructureCard(molecule: Molecule, size: number = 400) {
  if (!molecule.cid) {
    return (
      <Image
        className="... rounded-lg border border-slate-700 bg-gray-700 text-center"
        src={molecule.image}
        alt={molecule.name}
        width={size}
        height={size}
      />
    );
  }
  return (
    <Image
      className="... rounded-lg border border-slate-700 bg-gray-700 text-center"
      src={
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
        molecule.cid +
        `/PNG?image_size=${size}x${size}`
      }
      alt={molecule.name}
      width={size}
      height={size}
    />
  );
}

async function MoleculeList() {
  const molecules = await getMaterials();

  const moleculeTable = (
    <table className="... mx-auto w-full border-separate border-spacing-2 justify-items-center border border-slate-500">
      <thead>
        <tr>
          <th className="...">Common Material Name</th>
          <th className="...">Source</th>
          <th className="...">Chemical Formula</th>
          <th className="...">CID</th>
          <th className="...">CAS</th>
          <th className="...">Structure</th>
        </tr>
      </thead>
      <tbody>
        {molecules.map((molecule) => (
          <tr key={molecule.id}>
            <td className="...">
              <Link href={`/molecule/${molecule.name}`}>{molecule.name}</Link>
            </td>
            <td className="...">
              <Link href={`${molecule.vendor}`}>
                {
                  molecule.vendor
                    .replace("https://", "")
                    .replace("www.", "")
                    .split("/")[0]
                }
              </Link>
            </td>
            <td className="...">{molecule.formula}</td>
            <td className="...">{molecule.cid || "N/A"}</td>
            <td className="...">{molecule.cas || "N/A"}</td>
            <td className="..." width={400}>
              <StructureCard {...molecule} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return moleculeTable;
}

export default function HomePage() {
  return <div className="... pl-60 pr-60">{MoleculeFeed()}</div>;
}
