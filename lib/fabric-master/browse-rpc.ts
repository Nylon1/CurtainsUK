/** The prepared Browse read model is opt-in until database parity and load gates pass. */
export function browseSearchRpcName(flag: string | undefined) {
  return flag === "enabled" ? "search_retail_fabrics_prepared_v1" : "search_retail_fabrics";
}
