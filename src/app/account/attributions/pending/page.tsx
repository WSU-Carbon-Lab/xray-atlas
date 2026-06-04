import { PendingAttributionsPage } from "~/features/account/attributions/pending-attributions-page";

export const metadata = {
  title: "Dataset attributions",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPendingAttributionsRoute() {
  return <PendingAttributionsPage />;
}
