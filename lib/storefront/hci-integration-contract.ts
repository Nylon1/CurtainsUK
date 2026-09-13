/** Presentation-only staging boundary. No engine imports or browser-supplied state. */
export const HCI_INTEGRATION_BASELINE = "41a9f3f";
/** Translate an explicit consultation answer only; this is a commerce handoff hint, not ranking logic. */
export function integrationWindowContext(state: unknown): string | null {
  const commands = (state as { commands?: unknown[] } | null)?.commands;
  if (!Array.isArray(commands)) return null;
  const answer = commands.filter((c): c is { type: string; questionId: string; answerId: string } =>
    !!c && typeof c === "object" && (c as { type?: string }).type === "answer-discovery" &&
    (c as { questionId?: string }).questionId === "window").at(-1)?.answerId;
  return answer === "standard" ? "standard-window" : answer === "bay" ? "bay-window" : null;
}
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const reactions = ["LOVE", "LIKE", "NOT_SURE", "DISLIKE"];
const names = [
  "Based on your taste",
  "Tonal & calm",
  "Complementary",
  "Pattern & character",
  "Designer choice",
];
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("HCI_CONTRACT_INVALID");
  return v as Record<string, unknown>;
}
function str(v: unknown, max = 200): string {
  if (typeof v !== "string" || !v.length || v.length > max)
    throw Error("HCI_CONTRACT_INVALID");
  return v;
}
function keys(v: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(v).some((k) => !allowed.includes(k)))
    throw Error("HCI_CONTRACT_INVALID");
}
export function integrationCommand(value: unknown) {
  const b = obj(value);
  keys(b, ["sessionId", "requestId", "revision", "action"]);
  const requestId = str(b.requestId),
    sessionId = b.sessionId == null ? requestId : str(b.sessionId);
  if (
    !uuid.test(requestId) ||
    !uuid.test(sessionId) ||
    (b.revision != null &&
      (!Number.isSafeInteger(b.revision) || Number(b.revision) < 0))
  )
    throw Error("HCI_CONTRACT_INVALID");
  let action: Record<string, unknown> | undefined;
  if (b.action != null) {
    const a = obj(b.action),
      type = str(a.type);
    action = { type };
    if (type === "answer") {
      keys(a, ["type", "answerId"]);
      action.answerId = str(a.answerId);
    } else if (type === "calibrate") {
      keys(a, ["type", "reaction"]);
      if (!reactions.includes(String(a.reaction)))
        throw Error("HCI_CONTRACT_INVALID");
      action.reaction = a.reaction;
    } else if (type === "recommend") {
      keys(a, ["type"]);
    } else if (type === "image") {
      keys(a, ["type", "mime", "bytes", "referenceType"]);
      action = {
        type,
        mime: str(a.mime),
        bytes: str(a.bytes, 2_800_000),
        referenceType: str(a.referenceType),
      };
    } else if (type === "palette") {
      keys(a, ["type", "edit"]);
      const e = obj(a.edit);
      keys(e, ["type", "id", "revision", "colour", "category"]);
      action.edit = e;
    } else if (type === "refine") {
      keys(a, ["type", "feedback"]);
      if (!Array.isArray(a.feedback) || a.feedback.length > 5)
        throw Error("HCI_CONTRACT_INVALID");
      action.feedback = a.feedback.map((v) => {
        const r = obj(v);
        keys(r, [
          "strategyId",
          "fabricId",
          "strategyReaction",
          "fabricReaction",
        ]);
        for (const k of ["strategyReaction", "fabricReaction"])
          if (r[k] !== null && !reactions.includes(String(r[k])))
            throw Error("HCI_CONTRACT_INVALID");
        return {
          strategyId: str(r.strategyId),
          fabricId: str(r.fabricId),
          strategyReaction: r.strategyReaction,
          fabricReaction: r.fabricReaction,
        };
      });
    } else throw Error("HCI_CONTRACT_INVALID");
  }
  return {
    requestId,
    sessionId,
    revision: b.revision == null ? null : Number(b.revision),
    action,
  };
}
export function integrationView(value: unknown) {
  const v = obj(value);
  if (
    v.version !== "curtainsuk-hci-presentation-v2" ||
    v.sourceCommit !== HCI_INTEGRATION_BASELINE ||
    !uuid.test(String(v.sessionId)) ||
    !["discovery", "calibration", "complete", "directions", "final"].includes(
      String(v.phase),
    )
  )
    throw Error("HCI_CONTRACT_INVALID");
  const palette = v.palette == null ? null : obj(v.palette);
  let safePalette = null;
  if (palette) {
    const c = obj(palette.colours);
    keys(c, ["primary", "secondary", "accent"]);
    const colours = {} as Record<string, string[]>;
    for (const k of ["primary", "secondary", "accent"]) {
      if (!Array.isArray(c[k]) || (c[k] as unknown[]).length > 3)
        throw Error("HCI_CONTRACT_INVALID");
      colours[k] = (c[k] as unknown[]).map((x) => str(x, 30));
    }
    safePalette = {
      revision: palette.revision,
      colours,
      confirmed: palette.confirmed === true,
    };
  }
  const q = v.question == null ? null : obj(v.question);
  if (q && (!Array.isArray(q.answers) || q.answers.length > 24))
    throw Error("HCI_CONTRACT_INVALID");
  if (!Array.isArray(v.directions) || v.directions.length > 5)
    throw Error("HCI_CONTRACT_INVALID");
  const seen = new Set<string>();
  const directions = v.directions.map((x) => {
    const d = obj(x);
    if (
      !names.includes(String(d.label)) ||
      seen.has(String(d.id)) ||
      !Array.isArray(d.cards) ||
      d.cards.length > 1
    )
      throw Error("HCI_CONTRACT_INVALID");
    seen.add(String(d.id));
    return {
      id: str(d.id),
      label: str(d.label),
      purpose: str(d.purpose, 500),
      status: str(d.status),
      cards: d.cards.map((x) => {
        const c = obj(x);
        if (!Array.isArray(c.explanation) || c.explanation.length > 3)
          throw Error("HCI_CONTRACT_INVALID");
        return {
          fabricMasterId: str(c.fabricMasterId),
          supplierSku: str(c.supplierSku),
          reactionId: str(c.reactionId),
          explanation: c.explanation.map((x) => str(x, 1000)),
        };
      }),
    };
  });
  return {
    version: v.version,
    sourceCommit: HCI_INTEGRATION_BASELINE,
    internalOnly: true,
    sessionId: str(v.sessionId),
    phase: String(v.phase),
    profileSummary:
      typeof v.profileSummary === "string"
        ? v.profileSummary.slice(0, 4000)
        : "",
    question: q
      ? {
          id: str(q.id),
          prompt: str(q.prompt, 1000),
          answers: (q.answers as unknown[]).map((a) => {
            const b = obj(a);
            return { id: str(b.id), label: str(b.label, 300) };
          }),
        }
      : null,
    stimulusId: v.stimulusId == null ? null : str(v.stimulusId),
    palette: safePalette,
    directions,
    refinementDigest:
      v.refinementDigest == null ? null : str(v.refinementDigest),
  };
}
