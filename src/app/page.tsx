import React from "react";
import Image from "next/image";
import { getMolecules } from "~/server/queries";
import Link from "next/link";
import { Molecule } from "@prisma/client";

export const dynamic = "force-dynamic";

async function MoleculePost(molecule: Molecule) {
  if (!molecule) {
    return null;
  }
  return (
    <div className="... h-50 flex w-full gap-2 bg-white p-1 shadow-md">
      <div className="... flex h-40 w-40 flex-col content-center bg-white shadow-md">
        <Image
          className="... h-40 w-40 rounded-sm"
          src={molecule.image}
          alt={molecule.name}
          width={160}
          height={160}
        />
      </div>
      <div className="... flex w-full flex-col gap-1 rounded-sm bg-white pl-7 pt-5">
        <div className="flex w-1/2 border-spacing-2 gap-2 border-b-2 border-gray-600 pt-2">
          <Link href={`/molecule/${molecule.name}/`}>
            <span className="... pl-5 text-lg text-blue-600">{`${molecule.name}  `}</span>
            <span className="... text-lg text-blue-600">{"·"}</span>
            <span className="... font-mono text-lg text-blue-600">{`  ${molecule.formula}`}</span>
          </Link>
        </div>
        <div className="flex gap-2">
          <span className="... pl-5 text-sm">{"Synthesized by: "}</span>
          <Link href={molecule.vendor} className="... text-sm">
            <span className="...text-sm text-blue-600">
              {`  ${
                molecule.vendor
                  .replace("https://", "")
                  .replace("www.", "")
                  .split(".")[0]
              }`}
            </span>
          </Link>
        </div>
        <div className="flex gap-2">
          <span className="... pl-5 text-sm">{"CAS Regestry: "}</span>
          <Link
            className="... text-sm"
            href={`https://commonchemistry.cas.org/detail?cas_rn=${molecule.cas}&search=${molecule.cas}`}
          >
            <span className="... text-sm text-blue-600">
              {molecule.cas || "N/A"}
            </span>
          </Link>
        </div>
        <div className="flex gap-2">
          <span className="... pl-5 text-sm">{"CID Regestry: "}</span>
          <Link
            className="... text-sm"
            href={`https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.cid}`}
          >
            <span className="... text-sm text-blue-600">
              {molecule.cid || "N/A"}
            </span>
          </Link>
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

export default function HomePage() {
  return <div className="... pl-60 pr-60">{MoleculeFeed()}</div>;
}
