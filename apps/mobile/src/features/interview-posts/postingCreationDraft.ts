import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type {
  Compensation,
  InterviewMode,
  LocationPrecision,
  LocationSource,
  ParticipationEntryMode,
  PostingType,
} from "@hypofit/contracts";
import {
  durationToMinutes,
  requiresLocation,
  serializePostingCreationDraft,
} from "./postingCreationPayload";

export {
  durationToMinutes,
  requiresLocation,
  serializePostingCreationDraft,
} from "./postingCreationPayload";

export type CreationStep = 1 | 2 | 3 | 4 | 5;
export type DurationUnit = "minutes" | "hours" | "days" | "weeks";
export type RecruitmentLimitMode = "unlimited" | "limited";
export type ScheduleMode = "fixed" | "recurring" | "negotiated" | "none";

export interface PostingCreationDraft {
  schemaVersion: number;
  clientSubmissionId: string;
  type: PostingType;
  entryMode: ParticipationEntryMode;
  title: string;
  description: string;
  targetParticipant: string;
  interviewMode: InterviewMode;
  durationValue: string;
  durationUnit: DurationUnit;
  scheduleMode: ScheduleMode;
  fixedSlots: string[];
  recurringWindows: string[];
  scheduleNote: string;
  location: string;
  locationAddress: string;
  locationPlaceName: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationPrecision: LocationPrecision;
  locationSource: LocationSource | null;
  externalProvider: "google_forms";
  externalUrl: string;
  externalDataNotice: string;
  betaPlatforms: string[];
  betaStartsAt: string;
  betaEndsAt: string;
  environment: string;
  workflowNote: string;
  recruitmentLimitMode: RecruitmentLimitMode;
  recruitmentCount: string;
  deadlineEnabled: boolean;
  deadline: string;
  compensations: Compensation[];
}

const storageKey = "hypofit:posting-creation-draft:v1";

export const initialPostingCreationDraft: PostingCreationDraft = {
  schemaVersion: 1,
  clientSubmissionId: Crypto.randomUUID(),
  type: "interview",
  entryMode: "application_required",
  title: "",
  description: "",
  targetParticipant: "",
  interviewMode: "online",
  durationValue: "30",
  durationUnit: "minutes",
  scheduleMode: "negotiated",
  fixedSlots: [],
  recurringWindows: [],
  scheduleNote: "",
  location: "",
  locationAddress: "",
  locationPlaceName: "",
  locationLatitude: null,
  locationLongitude: null,
  locationPrecision: "nearby",
  locationSource: null,
  externalProvider: "google_forms",
  externalUrl: "",
  externalDataNotice: "외부 설문 서비스에서 응답을 처리해요.",
  betaPlatforms: [],
  betaStartsAt: "",
  betaEndsAt: "",
  environment: "",
  workflowNote: "",
  recruitmentLimitMode: "limited",
  recruitmentCount: "10",
  deadlineEnabled: false,
  deadline: "",
  compensations: [{ type: "none" }],
};

export function createInitialPostingCreationDraft(): PostingCreationDraft {
  return {
    ...initialPostingCreationDraft,
    clientSubmissionId: Crypto.randomUUID(),
    fixedSlots: [],
    recurringWindows: [],
    betaPlatforms: [],
    compensations: [{ type: "none" }],
  };
}

export async function loadPostingCreationDraft(): Promise<PostingCreationDraft | null> {
  const value = await AsyncStorage.getItem(storageKey);
  if (!value) return null;

  try {
    return normalizeDraft(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function savePostingCreationDraft(
  draft: PostingCreationDraft,
): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(draft));
}

export async function clearPostingCreationDraft(): Promise<void> {
  await AsyncStorage.removeItem(storageKey);
}

export function hasDraftContent(draft: PostingCreationDraft): boolean {
  return Boolean(
    draft.title.trim() ||
    draft.description.trim() ||
    draft.targetParticipant.trim() ||
    draft.externalUrl.trim(),
  );
}

function normalizeDraft(value: unknown): PostingCreationDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PostingCreationDraft>;
  if (!candidate.type || !candidate.entryMode) return null;

  return {
    ...initialPostingCreationDraft,
    ...candidate,
    schemaVersion: 1,
    clientSubmissionId:
      typeof candidate.clientSubmissionId === "string" && candidate.clientSubmissionId
        ? candidate.clientSubmissionId
        : Crypto.randomUUID(),
    betaPlatforms: Array.isArray(candidate.betaPlatforms)
      ? candidate.betaPlatforms
      : [],
    compensations:
      Array.isArray(candidate.compensations) && candidate.compensations.length
        ? candidate.compensations
        : [{ type: "none" }],
    fixedSlots: Array.isArray(candidate.fixedSlots) ? candidate.fixedSlots : [],
    recurringWindows: Array.isArray(candidate.recurringWindows)
      ? candidate.recurringWindows
      : [],
  };
}
