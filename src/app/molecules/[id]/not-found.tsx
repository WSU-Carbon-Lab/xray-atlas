import Link from "next/link";
import { NotFoundState } from "@/components/feedback/error-state";

export default function MoleculeNotFound() {
  return (
    <div className="py-8">
      <NotFoundState
        title="Molecule Not Found"
        message="The molecule you're looking for doesn't exist in our database."
      />
      <div className="mt-6 text-center">
        <Link
          href="/browse/molecules"
          className="hover:text-accent dark:hover:text-accent-light text-sm font-medium text-gray-600 dark:text-gray-400"
        >
          Browse molecules
        </Link>
      </div>
    </div>
  );
}
