import type { PostingType } from "@hypofit/contracts";

type CreationCapabilities = {
  enabled_recruitment_types: PostingType[];
  direct_participation_recruitment_types: PostingType[];
};

const implementedTypes: PostingType[] = ["interview", "survey", "beta_test"];

export function getCreatablePostingTypes(
  capabilities: CreationCapabilities | undefined,
): PostingType[] {
  return implementedTypes.filter((type) =>
    capabilities?.enabled_recruitment_types.includes(type),
  );
}

export function getPostingCreationCapabilityError(
  draft: { type: string; entryMode: string },
  capabilities: CreationCapabilities | undefined,
): string | null {
  if (!capabilities) return "공고 유형을 확인하지 못했어요. 다시 확인해 주세요.";
  if (!getCreatablePostingTypes(capabilities).some((type) => type === draft.type)) {
    return "현재 만들 수 없는 공고 유형이에요. 작성 내용은 유지돼요. 다른 유형을 선택해 주세요.";
  }
  if (
    draft.entryMode !== "application_required" &&
    (draft.entryMode !== "direct" ||
      draft.type !== "survey" ||
      !capabilities.direct_participation_recruitment_types.includes("survey"))
  ) {
    return "현재 지원하지 않는 참여 방식이에요. 참여 방식을 다시 선택해 주세요.";
  }
  return null;
}
