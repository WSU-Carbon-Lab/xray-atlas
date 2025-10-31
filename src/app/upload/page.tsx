import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UploadFormTabs from "./UploadFormTabs";

export default async function UploadPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return (
    <div className="px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Upload Experiment</h1>
      <UploadFormTabs />
    </div>
  );
}
