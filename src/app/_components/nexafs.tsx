import React from "react";
import Image from "next/image";
import { Data, Experiment, Molecule, MoleculeFile, data } from "~/server/db";
import download from "public/Icons-Temp_icon-download.svg";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const downloadData = (molecule: MoleculeFile, i: number) => {
  // Slice the Molecule File to include everything in the header, and the idx experiment
  let data = {
    header: molecule.header,
    experiments: [molecule.experiments[i]],
  } as MoleculeFile;
  return `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 4))}`;
};

export const NexafsTable = async (props: {
  molecule: MoleculeFile;
  className?: string;
  headClass?: string;
  bodyClass?: string;
}) => {
  const mol = props.molecule;
  if (!mol) {
    return <div>404</div>;
  }
  const classNeame = props.className + " p1 shadow-sm";
  const headClass = props.headClass + " h-10";
  const bodyClass = props.bodyClass + " rounded-sm shadow-sm";
  const experiments = mol.experiments;
  return (
    <div className={classNeame}>
      <table className="... w-full table-auto border-separate border-spacing-2 rounded-sm bg-white shadow-sm">
        <thead className={headClass}>
          <tr className="... p-2">
            <th className="... shadow-sm">Edge</th>
            <th className="... shadow-sm">Type</th>
            <th className="... shadow-sm">Synchrotron</th>
            <th className="... shadow-sm">Endstation</th>
            <th className="... shadow-sm">Group</th>
            <th className="..."></th>
          </tr>
        </thead>
        <tbody className={bodyClass}>
          {experiments.map((experiment, index) => (
            <tr className="..." key={experiment.edge}>
              <td className="... text-center">{`${experiment.edge}`}</td>
              <td className="... text-center">{experiment.type}</td>
              <td className="... text-center">{experiment.synchrotron}</td>
              <td className="... text-center">{experiment.endstation}</td>
              <td className="... text-center">{"Not yet recorded"}</td>
              <td className="...">
                <Link
                  className="...text-center mx-auto"
                  href={`${downloadData(mol, index)}`}
                  download={`${mol.header.name}_${experiment.edge}_${experiment.synchrotron}.json`}
                >
                  <Image
                    src={download}
                    alt="download"
                    width={24}
                    height={24}
                    className="mx-auto justify-center"
                  />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
