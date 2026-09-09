import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type {
  Compensation,
  InterviewMode,
  LocationPrecision,
  LocationSource,
  ParticipationEntryMode,
  PostingDurationUnit,
  PostingType,
  PostingScheduleMode,
  RecruitmentLimitMode,
} from "@hypofit/contracts";
import {
  durationToMinutes,
  requiresLocation,
  serializePostingCreationDraft,
} from "./postingCreationPayload";
import { normalizePostingCreationDraft } from "./postingCreationDraftMigration";

export {
  durationToMinutes,
  requiresLocation,
  serializePostingCreationDraft,
} from "./postingCreationPayload";

export type CreationStep = 1 | 2 | 3 | 4 | 5;
export type DurationUnit = PostingDurationUnit;
export type { RecruitmentLimitMode } from "@hypofit/contracts";
export type ScheduleMode = PostingScheduleMode;


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
const currentDraftSchemaVersion = 2;

export interface PostingEditDraft {
  baseline: PostingCreationDraft;
  draft: PostingCreationDraft;
}

function editStorageKey(userId: string, postId: string) {
  return `hypofit:posting-edit-draft:v1:${userId}:${postId}`;
}

export async function loadPostingEditDraft(userId: string, postId: string): Promise<PostingEditDraft | null> {
  const raw = await AsyncStorage.getItem(editStorageKey(userId, postId));
  if (!raw) return null;
  const stored = JSON.parse(raw);
  const baseline = normalizePostingCreationDraft(stored.baseline, initialPostingCreationDraft, Crypto.randomUUID);
  const draft = normalizePostingCreationDraft(stored.draft, initialPostingCreationDraft, Crypto.randomUUID);
  return baseline && draft ? { baseline, draft } : null;
}

export async function savePostingEditDraft(userId: string, postId: string, value: PostingEditDraft) {
  await AsyncStorage.setItem(editStorageKey(userId, postId), JSON.stringify(value));
}

export async function clearPostingEditDraft(userId: string, postId: string) {
  await AsyncStorage.removeItem(editStorageKey(userId, postId));
}

export const initialPostingCreationDraft: PostingCreationDraft = {
  schemaVersion: currentDraftSchemaVersion,
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
    return normalizePostingCreationDraft(
      JSON.parse(value),
      initialPostingCreationDraft,
      Crypto.randomUUID,
    );
  } catch {
    return null;
  }
}

export async function savePostingCreationDraft(
  draft: PostingCreationDraft,
): Promise<void> {
  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify({ ...draft, schemaVersion: currentDraftSchemaVersion }),
  );
}

export async function clearPostingCreationDraft(): Promise<void> {
  await AsyncStorage.removeItem(storageKey);
}

export function hasDraftContent(draft: PostingCreationDraft): boolean {
  return Boolean(
    draft.title.trim() ||
    draft.description.trim() ||
    draft.targetParticipant.trim() ||
    draft.externalUrl.trim() ||
    draft.scheduleNote.trim() ||
    draft.environment.trim() ||
    draft.workflowNote.trim() ||
    draft.fixedSlots.length ||
    draft.recurringWindows.length ||
    draft.betaPlatforms.length,
  );
}
