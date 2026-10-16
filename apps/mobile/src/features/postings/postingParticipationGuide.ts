import type { InterviewPost } from "@hypofit/contracts";

type GuidePost = Pick<InterviewPost, "recruitment_type" | "entry_mode" | "schedule_mode">;

export function getParticipationGuideSteps(post: GuidePost): string[] {
  switch (post.recruitment_type ?? "interview") {
    case "survey":
      return post.entry_mode === "direct"
        ? [
            "외부 설문을 열어 작성하고 제출해요.",
            "Hypofit으로 돌아와 '제출했어요'를 눌러요.",
          ]
        : [
            "공고에 신청해요.",
            "모집자가 신청 내용을 확인해요.",
            "승인되면 외부 설문을 작성하고 제출해요.",
            "Hypofit으로 돌아와 '제출했어요'를 눌러요.",
          ];
    case "beta_test":
      return [
        "공고에 신청해요.",
        "모집자가 신청 내용을 확인해요.",
        "선정되면 채팅에서 테스트 안내를 받아요.",
        "모집자가 안내한 방식으로 테스트에 참여해요.",
      ];
    case "research_experiment":
      return [
        "공고의 연구 내용과 참여 조건을 확인하고 신청해요.",
        "모집자가 신청 내용을 확인해요.",
        "선정되면 채팅에서 일정과 준비 사항을 확인해요.",
        "모집자가 안내한 연구 절차에 따라 참여해요.",
      ];
    case "interview":
      return [
        "공고에 신청해요.",
        "모집자가 신청 내용을 확인해요.",
        post.schedule_mode === "fixed"
          ? "선정되면 채팅에서 참여 일정을 확인해요."
          : "선정되면 채팅에서 일정을 조율해요.",
        "확정된 일정에 참여해요.",
      ];
    default:
      return ["공고에 신청해요.", "모집자가 신청 내용을 확인해요.", "필요한 다음 단계를 안내받아요."];
  }
}
