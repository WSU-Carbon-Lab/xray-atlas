import Link from "next/link";
import type { Molecule } from "~/server/db";
import React from "react";
import { getMolecules } from "~/server/queries";
import Image from "next/image";

export const MoleculeDisplay = (props: {
  molecule: Molecule;
  className?: string;
}) => {
  const updatedProps = {
    ...props,
    className: props.className
      ? props.className + " flex w-30 flex-col bg-white shadow-md space-y-2 p-2"
      : "flex w-30 flex-col bg-white shadow-md space-y-2",
  };

  return (
    <div className={updatedProps.className}>
      <Link href={`/molecule/${props.molecule.name}`}>
        <Image
          className="... bottom-1 mx-0 items-center rounded-sm p-2 first-letter:mx-auto"
          src={props.molecule.img}
          alt={props.molecule.name}
          width={300}
          height={300}
        />
      </Link>
      <span className="... mx-1 text-sm font-bold">{`Common Name:`}</span>
      <span className="... mx-1 text-sm">{props.molecule.name}</span>
      <span className="... mx-1 text-sm font-bold">{`Chemical Formula:`}</span>
      <span className="... mx-1 text-sm">
        {props.molecule.chemical_formula}
      </span>
    </div>
  );
};

export const MoleculeNamingInfo = (props: {
  molecule: Molecule;
  className?: string;
}) => {
  const molecule = props.molecule;
  if (!molecule) {
    return null;
  }

  const synonymElement =
    molecule.synonyms.length > 0 ? (
      <div>
        <div className="... text-sm font-bold">{`Synonyms`}</div>
        <ul className="... text-xs">
          {molecule.synonyms.map((synonym) => (
            <li key={synonym}>{synonym}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div
      className={"flex h-full w-full flex-col space-y-2 bg-white p-2 shadow-md"}
    >
      <div>
        <p className="... text-sm font-bold">{`Chemical Name:`}</p>
        <p className="... text-xs">{molecule.description}</p>
      </div>
      {synonymElement}
      <div>
        <p className="... text-sm font-bold">{`InChI:`}</p>
        <p className="... text-xs">{molecule.InChI}</p>
      </div>
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

  const className =
    props.className +
    "... flex w-full gap-2 shadow-md h-flex p-1 hover:shadow-blue-200";
  return (
    <div className={className}>
      <MoleculeDisplay molecule={molecule} className="... w-50" />
      <MoleculeNamingInfo molecule={molecule} className="... w-full" />
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
          className="hover:shadow-blue-200"
        />
      ))}
    </div>
  );
};
