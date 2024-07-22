import { Molecule } from "@prisma/client";
import Image from "next/image";
import { db } from "~/server/db";
import { getMolecule } from "~/server/queries";

const getExpInfo = async (molecule_id: string) => {
  // Gets all experimental data related to this molecule
  const molecule = await db.molecule.findFirst({
    where: {
      id: molecule_id,
    },
  });

  const experiments = await db.experiment.findMany({
    where: {
      molecule: molecule_id,
    },
  });

  const expInfo = await experiments.map((experiment) => {
    return {
      molecule: molecule,
      experiment: experiment,
    };
  });
};

function ImageCard({ molecule }: { molecule: Molecule }) {
  if (!molecule.cid) {
    return (
      <div className="... flex h-full w-full flex-col items-center bg-black pt-10">
        <Image
          src={molecule.image}
          alt={molecule.name}
          width={500}
          height={500}
        />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center bg-black pt-0">
      <iframe
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        src={`https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.name}#section=2D-Structure&embed=true&hide_title=true`}
      ></iframe>
    </div>
  );
}

function SideBar({ molecule }: { molecule: Molecule }) {
  return (
    <div className="h-screen w-1/4 bg-gray-800 pt-3">
      <table className="w-full table-auto border-separate border-spacing-2 pb-3">
        <thead>
          <tr>
            <th className="w-1/3 border-none bg-gray-700 py-2">Name</th>
            <th className="border-none bg-inherit px-4 py-2">
              {molecule.name}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-none bg-gray-700 py-2">Source</td>
            <td className="border-none bg-inherit px-4 py-2">
              {
                molecule.vendor
                  .replace("https://", "")
                  .replace("www.", "")
                  .split("/")[0]
              }
            </td>
          </tr>
          <tr>
            <td className="border-none bg-gray-700 py-2">Formula</td>
            <td className="border-none bg-inherit px-4 py-2">
              {molecule.formula}
            </td>
          </tr>
          <tr>
            <td className="border-none bg-gray-700 py-2">CID</td>
            <td className="border-none bg-inherit px-4 py-2">{molecule.cid}</td>
          </tr>
          <tr>
            <td className="border-none bg-gray-700 py-2">CAS</td>
            <td className="border-none bg-inherit px-4 py-2">{molecule.cas}</td>
          </tr>
        </tbody>
      </table>
      <ImageCard molecule={molecule} />
    </div>
  );
}

async function Page({ params }: { params: { name: string } }) {
  const molecule = await getMolecule(params.name);
  if (!molecule) {
    return <div>Not Found</div>;
  }
  if (molecule.length === 0) {
    return <div>Not Found</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <SideBar molecule={molecule[0]} />
    </div>
  );
}

export default Page;
