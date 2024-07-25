import React from "react";
import { getExpById, getNexafsData } from "~/server/queries";

export default async function Page({ params }: { params: { exp_id: string } }) {
  const experiment = await getExpById(params.exp_id);
  if (!experiment) {
    return <div>404</div>;
  }
  const CompleateData = await getNexafsData(experiment);
  return JSON.stringify(CompleateData);
}
