import type { ReactElement } from "react";
import { HomePage as HomePageView } from "~/features/home/home-page";

/** Home route: static Atlas Stage rendered from the committed snapshot; no database read at paint. */
export default function HomePage(): ReactElement {
  return <HomePageView />;
}
