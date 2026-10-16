import type { PostingType } from "@hypofit/contracts";
import { postingTypeLabels } from "@hypofit/contracts";
import { type CreationStep } from "@/features/postings/postingCreationDraft";

export function stepTitle(step: CreationStep, type: PostingType) {
  if (step === 1)
    return {
      heading: "어떤 참여자를 모집하나요?",
      description: "공고 유형과 참여 방식을 먼저 정해요.",
    };
  if (step === 2)
    return {
      heading: "공고 내용을 알려주세요",
      description: "참여자가 무엇을 하는지, 누구를 찾는지 적어 주세요.",
    };
  if (step === 3)
    return {
      heading: "진행 방법을 정해주세요",
      description: type === "survey" ? null : `${postingTypeLabels[type]}에 필요한 방식과 일정만 입력해요.`,
    };
  if (step === 4)
    return {
      heading: "모집 조건을 설정하세요",
      description: "보상, 인원, 마감일을 정해요.",
    };
  return {
    heading: "작성한 공고를 확인하세요",
    description: "게시하면 참여자가 공고를 볼 수 있어요.",
  };
}
