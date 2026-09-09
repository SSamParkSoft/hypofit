type DraftRecord = {
  schemaVersion: number;
  clientSubmissionId: string;
  type: string;
  entryMode: string;
  scheduleNote: string;
  workflowNote: string;
  environment: string;
  betaPlatforms: unknown[];
  compensations: unknown[];
  fixedSlots: unknown[];
  recurringWindows: unknown[];
};

export function normalizePostingCreationDraft<T extends DraftRecord>(
  value: unknown,
  initialDraft: T,
  createClientSubmissionId: () => string,
): T | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<T>;
  if (!candidate.type || !candidate.entryMode) return null;

  const sourceSchemaVersion =
    typeof candidate.schemaVersion === "number" ? candidate.schemaVersion : 1;

  const normalized = {
    ...initialDraft,
    ...candidate,
    schemaVersion: initialDraft.schemaVersion,
    clientSubmissionId:
      typeof candidate.clientSubmissionId === "string" && candidate.clientSubmissionId
        ? candidate.clientSubmissionId
        : createClientSubmissionId(),
    betaPlatforms: Array.isArray(candidate.betaPlatforms)
      ? candidate.betaPlatforms
      : [],
    compensations:
      Array.isArray(candidate.compensations) && candidate.compensations.length
        ? candidate.compensations
        : initialDraft.compensations,
    fixedSlots: Array.isArray(candidate.fixedSlots) ? candidate.fixedSlots : [],
    recurringWindows: Array.isArray(candidate.recurringWindows)
      ? candidate.recurringWindows
      : [],
  } as T;

  if (sourceSchemaVersion >= initialDraft.schemaVersion) return normalized;

  // v1 used the same semantic fields. Keep all recoverable input and fill only
  // values absent from the old persisted shape.
  return {
    ...normalized,
    scheduleNote:
      typeof normalized.scheduleNote === "string" ? normalized.scheduleNote : "",
    workflowNote:
      typeof normalized.workflowNote === "string" ? normalized.workflowNote : "",
    environment:
      typeof normalized.environment === "string" ? normalized.environment : "",
  };
}
