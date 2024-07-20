import React from "react";

export function pubChemLookup(cid: string | null) {
  // Uses the pubChem API to look up the molecule
  // https://pubchem.ncbi.nlm.nih.gov/rest/pug/
  //      <input specification>/
  //      <operation specification>/
  //      [<output specification>]
  //      [?<operation_options>]
  if (cid === null) {
    return;
  }
  const baseURL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/";

  // Remove space from the Identifier
  const outputSpec = `cid/${cid.replace(/\s/g, "")}`;
  const urlSearch = `${baseURL}name/${outputSpec}/JSON`;
  console.log(urlSearch);
  // fetch(urlSearch)
  //   .then((response) => response.json())
  //   .then((data) => {
  //     console.log(data);
  //   });
}
