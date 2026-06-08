import { redirect } from "next/navigation";
import { ALS_5322_INSTRUMENT_SLUG } from "~/features/dashboard/connectors/registry";

export const metadata = {
  title: "ALS 5.3.2.2 STXM workspace",
};

type Als5322InstrumentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy stable route; redirects to the dynamic `[slug]` workspace page. */
export default async function Als5322InstrumentPage({
  searchParams,
}: Als5322InstrumentPageProps) {
  const params = await searchParams;
  const session = params.session;
  const sessionValue = Array.isArray(session) ? session[0] : session;
  const base = `/dashboard/instruments/${ALS_5322_INSTRUMENT_SLUG}`;
  if (sessionValue) {
    redirect(`${base}?session=${encodeURIComponent(sessionValue)}`);
  }
  redirect(base);
}
