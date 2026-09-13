/** Reviewed source evidence, not a deployment environment override or a CI verdict. */
export const HCI_HOSTED_RELEASE: {
  sourceCommit: string;
  humanQuality: "BLOCKED" | "READY";
  serviceContractReady: boolean;
  evidence: string;
} = {
  sourceCommit: "8efc9ce0f8d27775d4be2aff81ff39b682901d80",
  humanQuality: "BLOCKED",
  serviceContractReady: false,
  evidence:
    "Hybrid-Curtain-Intelligence/docs/INTERNAL_RECOMMENDATION_QUALITY_REVIEW_2026.md: human internal pilot not yet completed; not quality-ready for a CurtainsUK integration trial",
};
