import Image from "next/image";
import Link from "next/link";
import { getMolecules } from "~/server/queries";
import { Molecule } from "@prisma/client";
import React from "react";

export const TextLink = (props: {
  label: string;
  value: string;
  link: string;
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
      <Link href={props.link} className={linkClass} passHref>
        {props.value}
      </Link>
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
        src={props.molecule.image}
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
            {`${molecule.name}  ` + "·" + `  ${molecule.formula}`}
          </h1>
        </Link>
        <TextLink
          label="Sourced from: "
          value={
            molecule.vendor
              .replace("https://", "")
              .replace("www.", "")
              .split(".")[0] || "Unknown Vendor"
          }
          link={molecule.vendor}
        />
        <TextLink
          label="CAS Registry : "
          value={molecule.cas || "Unknown"}
          link={`https://commonchemistry.cas.org/detail?cas_rn=${molecule.cas}&search=${molecule.cas}`}
        />
        <TextLink
          label="CID Registry : "
          value={molecule.cid || "Unknown"}
          link={`https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.cid}`}
        />
      </div>
    </div>
  );
};

export const MoleculeRegistry = async () => {
  const molecules = await getMolecules();
  return (
    <div className="... flex h-full w-full flex-col justify-center gap-2">
      {molecules.map((molecule) => (
        <MoleculeInfoCard molecule={molecule} key={molecule.id} />
      ))}
    </div>
  );
};
