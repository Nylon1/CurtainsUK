/** Presentation boundary only. Selection and recommendation rules remain in HCI PR #24. */
export const HCI_SOURCE_COMMIT = "c7059b0bd2949957b17d887e238dbf3c683efa67";
type Card = {
  fabricId: string;
  curtainsUkFabricId: string;
  sku: string;
  brand: string;
  design: string;
  colourway: string;
  imageUrl: string;
  reasons: string[];
  practicalNote?: string | null;
  colourEvidenceKnown: boolean;
};
export type HciPilotResponse = {
  aggregate: { revision: number; commandLog: unknown[] };
  phase: "discovery" | "calibration" | "complete";
  question: null | {
    id: string;
    prompt: string;
    answers: { id: string; label: string }[];
  };
  stimulusId: string | null;
  summary: string;
  cards: Card[];
};
export function projectHciView(input: HciPilotResponse, sessionId: string) {
  if (
    !input ||
    !["discovery", "calibration", "complete"].includes(input.phase) ||
    !Array.isArray(input.cards) ||
    input.cards.length > 5
  )
    throw new Error("HCI_CONTRACT_INVALID");
  const identities = new Set<string>();
  const shortlist = input.cards.map((card, index) => {
    if (
      !card.curtainsUkFabricId ||
      !card.sku ||
      identities.has(card.curtainsUkFabricId)
    )
      throw new Error("HCI_IDENTITY_INVALID");
    identities.add(card.curtainsUkFabricId);
    // HCI imagery is not trusted as a commerce projection. Dawn resolves the exact Master ID.
    return {
      fabricMasterId: card.curtainsUkFabricId,
      supplierSku: card.sku,
      reactionId: card.fabricId,
      rank: index + 1,
      explanation: card.reasons.slice(0, 3),
      unknowns: [
        !card.colourEvidenceKnown
          ? "Colour match needs your judgement. Check the exact shade in a sample."
          : null,
        card.practicalNote,
      ].filter(Boolean),
    };
  });
  const windowAnswer = [...input.aggregate.commandLog]
    .reverse()
    .find(
      (command) =>
        command &&
        typeof command === "object" &&
        "questionId" in command &&
        command.questionId === "window",
    ) as { answerId?: string } | undefined;
  const windowSlug =
    windowAnswer?.answerId === "bay"
      ? "bay-window"
      : windowAnswer?.answerId === "standard"
        ? "standard-window"
        : null;
  return {
    windowSlug,
    version: "curtainsuk-hci-presentation-v1",
    sourceCommit: HCI_SOURCE_COMMIT,
    internalOnly: true,
    sessionId,
    revision: input.aggregate.revision,
    phase: input.phase,
    profileSummary: input.summary,
    question: input.question
      ? {
          id: input.question.id,
          prompt: input.question.prompt,
          answers: input.question.answers.map(({ id, label }) => ({
            id,
            label,
          })),
        }
      : null,
    stimulusId: input.stimulusId,
    shortlist,
  };
}
