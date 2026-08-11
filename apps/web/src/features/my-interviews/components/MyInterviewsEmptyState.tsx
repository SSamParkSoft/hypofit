import { EmptyState } from "../../../shared/ui/state";

type MyInterviewsEmptyStateVariant =
  | "applications"
  | "posts"
  | "selected-application"
  | "selected-post";

interface MyInterviewsEmptyStateProps {
  onAction?: () => void;
  variant: MyInterviewsEmptyStateVariant;
}

const emptyStateContent: Record<
  MyInterviewsEmptyStateVariant,
  {
    actionLabel?: string;
    description: string;
    title: string;
  }
> = {
  applications: {
    actionLabel: "인터뷰 찾기",
    description:
      "조건에 맞는 모집글을 찾고 신청하면 이곳에서 진행 상태를 볼 수 있어요.",
    title: "아직 신청한 인터뷰가 없습니다.",
  },
  posts: {
    actionLabel: "모집글 만들기",
    description:
      "인터뷰 조건과 사례비를 정리해 모집글을 열면 지원자와 진행 상태를 여기서 관리할 수 있어요.",
    title: "아직 만든 모집글이 없습니다.",
  },
  "selected-application": {
    description: "왼쪽 목록에서 확인할 인터뷰를 선택하세요.",
    title: "선택한 신청이 없습니다.",
  },
  "selected-post": {
    description: "왼쪽 목록에서 관리할 모집글을 선택하세요.",
    title: "선택한 모집글이 없습니다.",
  },
};

export function MyInterviewsEmptyState({
  onAction,
  variant,
}: MyInterviewsEmptyStateProps) {
  const content = emptyStateContent[variant];

  return (
    <EmptyState
      action={
        content.actionLabel && onAction
          ? {
              label: content.actionLabel,
              onClick: onAction,
            }
          : undefined
      }
      title={content.title}
    >
      {content.description}
    </EmptyState>
  );
}
