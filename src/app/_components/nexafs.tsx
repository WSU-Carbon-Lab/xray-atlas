import React from "react";
import Image from "next/image";
import { Experiment, Molecule } from "@prisma/client";
import { getExperiments, getNexafsData } from "~/server/queries";
import download from "public/Icons-Temp_icon-download.svg";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const NexafsTable = async (props: {
  molecule: Molecule;
  className?: string;
  headClass?: string;
  bodyClass?: string;
}) => {
  const experiments = await getExperiments(props.molecule);
  if (!experiments) {
    return <div>404</div>;
  }
  const classNeame = props.className + " p1 shadow-sm";
  const headClass = props.headClass + " h-10";
  const bodyClass = props.bodyClass + " rounded-sm shadow-sm";

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
          {experiments.map((experiment) => (
            <tr className="..." key={experiment.id}>
              <td className="... text-center">{`${experiment.atom} (${experiment.edge})`}</td>
              <td className="... text-center">{experiment.method}</td>
              <td className="... text-center">{experiment.source}</td>
              <td className="... text-center">{experiment.endstation}</td>
              <td className="... text-center">{experiment.experimentalist}</td>
              <td className="...">
                <Link
                  className="...text-center mx-auto"
                  href={`/molecule/${experiment.molecule}/nexafs/${experiment.id}/`}
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
