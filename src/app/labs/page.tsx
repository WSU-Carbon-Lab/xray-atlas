import { redirect } from "next/navigation";

/**
 * Legacy route: Labs and Sandbox are combined under `/sandbox`.
 */
export default function LabsRedirectPage() {
  redirect("/sandbox");
}
