export type InterviewMode = "offline" | "online" | "both";

export const interviewModeLabels: Record<InterviewMode, string> = {
  online: "화상",
  offline: "대면",
  both: "대면/화상",
};
