import { ClipboardList, MapPin, MessagesSquare, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { PostCreationForm } from "../features/interview-posts/components/PostCreationForm";
import { toCreateInterviewPostInput } from "../features/interview-posts/components/postCreationValidation";
import { useCreateInterviewPost } from "../features/interview-posts/useCreateInterviewPost";
import type { AppUser } from "../shared/api/types";
import { navigateBack, navigateTo } from "../shared/navigation/appNavigation";
import { BackLink } from "../shared/ui/back-link";
import { Button } from "../shared/ui/button";
import { PageHeader, PageLayout } from "../shared/ui/page";
import { ContextPanel } from "../shared/ui/workspace";

interface NewInterviewPageProps {
  accessToken?: string | null;
  appUser: AppUser | null;
}

export function NewInterviewPage({ accessToken }: NewInterviewPageProps) {
  const createInterviewPost = useCreateInterviewPost(accessToken);
  const goBack = () => navigateBack("/my-interviews");

  return (
    <PageLayout className="gap-5" variant="form">
      <div className="flex items-start gap-3">
        <BackLink
          ariaLabel="내 인터뷰로 돌아가기"
          className="mt-1"
          href="/my-interviews"
        />
        <div className="min-w-0 flex-1">
          <PageHeader
            action={
              <Button
                className="w-full sm:w-auto"
                size="sm"
                variant="secondary"
                onClick={() => navigateTo("/my-interviews")}
              >
                내 모집글 보기
              </Button>
            }
            description="응답자가 참여 여부를 판단하는 데 필요한 정보만 분명하게 적어 주세요."
            title="모집글 만들기"
          />
        </div>
      </div>

      <section className="grid gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <PostCreationForm
            errorMessage={
              createInterviewPost.error instanceof Error ? createInterviewPost.error.message : null
            }
            hideCancelAction
            hideHeader
            isSubmitting={createInterviewPost.isPending}
            onCancel={goBack}
            onSubmit={(values) => {
              createInterviewPost.mutate(toCreateInterviewPostInput(values), {
                onSuccess: () => navigateTo("/my-interviews"),
              });
            }}
          />
        </div>

        <ContextPanel className="hidden border-none bg-transparent shadow-none min-[1200px]:block">
          <div className="grid gap-6 border-l border-hypo-border pl-6">
            <SidebarSection
              description="응답자는 제목, 서비스 설명, 응답자 조건을 먼저 읽고 참여 여부를 판단해요."
              title="먼저 보이는 정보"
            >
              <SidebarChecklist
                items={[
                  {
                    icon: <MessagesSquare size={15} />,
                    label: "제목은 문제와 대상이 바로 읽히게 적어요.",
                  },
                  {
                    icon: <UsersRound size={15} />,
                    label: "응답자 조건은 최근 경험 기준으로 구체적으로 적어요.",
                  },
                  {
                    icon: <ClipboardList size={15} />,
                    label: "가능한 시간은 바로 연락할 수 있을 만큼 현실적으로 적어요.",
                  },
                ]}
              />
            </SidebarSection>

            <SidebarSection
              description="대면이 포함되면 장소 검색과 주소, 공개 범위를 같은 흐름에서 확인해 주세요."
              title="대면 인터뷰 체크"
            >
              <SidebarChecklist
                items={[
                  {
                    icon: <MapPin size={15} />,
                    label: "역, 학교, 동네 이름으로 장소를 먼저 찾고 선택해요.",
                  },
                  {
                    icon: <UsersRound size={15} />,
                    label: "정확한 주소 대신 근처 공개가 필요한지 함께 확인해요.",
                  },
                ]}
              />
            </SidebarSection>

            <SidebarSection
              description={
                createInterviewPost.isPending
                  ? "모집글을 저장하고 있어요. 완료되면 내 인터뷰로 이동합니다."
                  : "저장 후에는 내 모집글 탭에서 지원자 검토와 일정 생성을 이어갈 수 있어요."
              }
              title={createInterviewPost.isPending ? "저장 중" : "저장 후 흐름"}
            />
          </div>
        </ContextPanel>
      </section>
    </PageLayout>
  );
}

function SidebarSection({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-3 border-b border-hypo-border pb-5 last:border-b-0 last:pb-0">
      <div className="grid gap-1">
        <h2 className="text-sm font-bold leading-5 text-hypo-text">{title}</h2>
        <p className="text-sm leading-6 text-hypo-text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SidebarChecklist({
  items,
}: {
  items: Array<{ icon: ReactNode; label: string }>;
}) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="inline-flex items-start gap-2 text-sm leading-6 text-hypo-text-muted"
        >
          <span className="mt-0.5 shrink-0 text-hypo-brand">{item.icon}</span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
