import React from "react";
import Image from "next/image";
import type { Molecule } from "~/server/db";
import download from "public/Icons-Temp_icon-download.svg";
import { downloadData } from "~/server/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const NexafsTable = async (props: {
  molecule: Molecule;
  className?: string;
  headClass?: string;
  bodyClass?: string;
}) => {
  const mol = props.molecule;
  if (!mol) {
    return <div>404</div>;
  }
  const className = props.className + " p1 h-flex";
  const headClass = props.headClass + " h-10";
  const bodyClass = props.bodyClass + " rounded-sm shadow-sm";

  if (!mol.data) {
    return <div>404</div>;
  }
  const experiments = mol.data;

  return (
    <div className={className}>
      <table className="w-full table-auto border-separate border-spacing-2 rounded-sm bg-white ...">
        <thead className={headClass}>
          <tr className="p-2 ...">
            <th className="shadow-sm ...">Edge</th>
            <th className="shadow-sm ...">Method</th>
            <th className="shadow-sm ...">Facility</th>
            <th className="shadow-sm ...">Instrument</th>
            <th className="shadow-sm ...">Source</th>
            <th className="shadow-sm ...">Collected By</th>
            <th className="shadow-sm ..."></th>
          </tr>
        </thead>
        <tbody className={bodyClass}>
          {experiments.map((experiment) => (
            <tr
              className="h-10 p-2 shadow-md hover:shadow-blue-200 ..."
              key={experiment.edge}
            >
              <td className="text-center ...">{`${experiment.edge}`}</td>
              <td className="text-center ...">{experiment.method}</td>
              <td className="text-center ...">{experiment.facility}</td>
              <td className="text-center ...">{experiment.instrument}</td>
              <td className="text-center ...">{experiment.source}</td>
              <td className="text-center ...">{experiment.group}</td>
              <td className="text-center ..."></td>
              <td className="text-center ...">
                <Link href={downloadData(mol.name, experiment)}>
                  <Image src={download} alt="download" width={30} height={30} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
