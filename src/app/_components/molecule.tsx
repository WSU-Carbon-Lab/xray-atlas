import Image from "next/image";
import Link from "next/link";
import { Molecule } from "~/server/db";
import React from "react";
import { getMolecules } from "~/server/queries";

export const Text = (props: {
  label: string;
  value: string;
  textColor?: string;
  linkColor?: string;
}) => {
  const linkClass = "text-sm " + (props.linkColor || "text-blue-600");
  const textClass = "text-sm " + (props.textColor || "text-black");
  if (props.value === "Unknown") {
    return (
      <div className="...">
        <span className={textClass}>{props.label}</span>
        <span className={textClass}>{props.value}</span>
      </div>
    );
  }

  return (
    <div className="...">
      <span className={textClass}>{props.label}</span>
      <span className={linkClass}>{props.value}</span>
    </div>
  );
};

export const MoleculeDisplay = (props: {
  molecule: Molecule;
  className?: string;
}) => {
  const updatedProps = {
    ...props,
    className: props.className
      ? props.className +
        " flex h-40 w-40 flex-col content-center bg-white shadow-md"
      : "flex h-40 w-40 flex-col content-center bg-white shadow-md",
  };

  return (
    <div className={updatedProps.className}>
      <Image
        className="... h-40 w-40 rounded-sm"
        src={props.molecule.img}
        alt={props.molecule.name}
        width={160}
        height={160}
      />
    </div>
  );
};

export const MoleculeInfoCard = (props: {
  molecule: Molecule;
  className?: string;
}) => {
  const molecule = props.molecule;
  if (!molecule) {
    return null;
  }

  const className = props.className + " flex w-full gap-2  p-1 shadow-md";
  return (
    <div className={className}>
      <MoleculeDisplay molecule={molecule} className="... h-40 w-40" />
      <div className="... flex w-full flex-col gap-1 rounded-sm bg-white pl-7 pt-5">
        <Link
          href={`/molecule/${molecule.name}/`}
          className="flex w-1/2 border-spacing-2 gap-2 border-b-2 border-gray-600 pt-1"
          passHref
        >
          <h1 className="... text-lg text-blue-600">
            {`${molecule.name}  ` + "·" + `  ${molecule.chemicalFormula}`}
          </h1>
        </Link>
        <Text label="Chemical Name : " value={molecule.description} />
        <Text label="Synonyms : " value={molecule.synonims.join(", ")} />
        <Text label="InChI : " value={molecule.inchi} />
        <Text label="SMILES : " value={molecule.smiles} />
      </div>
    </div>
  );
};

export const MoleculeRegistry = async () => {
  const molecules = await getMolecules();
  return (
    <div className="... flex h-full w-full flex-col justify-center gap-2">
      {molecules.map((molecule) => (
        <MoleculeInfoCard
          molecule={molecule}
          key={molecule.name}
          className="hover:shadow-blue-100"
        />
      ))}
    </div>
  );
};
