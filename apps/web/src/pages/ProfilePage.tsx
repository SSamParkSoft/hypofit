import {
  Bell,
  ClipboardList,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  MessageCircle,
  Shield,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useApplications } from "../features/applications/useApplications";
import { useAuth } from "../features/auth/useAuth";
import { useChatRooms } from "../features/chat/useChatRooms";
import { ProfileAvatarUploader } from "../features/profiles/components/ProfileAvatarUploader";
import { useInterviewPosts } from "../features/interview-posts/useInterviewPosts";
import { useSessions } from "../features/sessions/useSessions";
import { uploadProfileImage } from "../shared/supabase/profileImages";
import type { AppUser, UserRole } from "../shared/api/types";
import { canUseFounderTools, getRoleLabel } from "../shared/auth/roles";
import { Badge } from "../shared/ui/badge";
import { Button } from "../shared/ui/button";
import { cn } from "../shared/ui/cn";
import { PageFrame, PageHeader } from "../shared/ui/page";
import { navigateTo } from "../shared/navigation/appNavigation";

interface ProfilePageProps {
  appUser: AppUser | null;
}

const version = "1.0.1";
const companyName = "contentruck";

export function ProfilePage({ appUser }: ProfilePageProps) {
  const {
    accessToken,
    errorMessage,
    isSyncing,
    signOut,
    syncCurrentUser,
    user,
  } = useAuth();
  const { data: applications = [], isLoading: isApplicationsLoading } = useApplications(accessToken);
  const { data: interviewPosts = [], isLoading: isInterviewPostsLoading } = useInterviewPosts(
    appUser ? { founderId: appUser.id } : undefined,
  );
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions(accessToken);
  const { data: chatRooms = [], isLoading: isChatRoomsLoading } = useChatRooms(accessToken);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const isActivityLoading =
    isApplicationsLoading || isInterviewPostsLoading || isSessionsLoading || isChatRoomsLoading;
  const avatarLabel = appUser?.name?.[0] ?? user?.email?.[0] ?? "H";
  const displayName = appUser?.name ?? user?.email?.split("@")[0] ?? "사용자";
  const roleLabel = appUser ? getRoleLabel(appUser.role) : "동기화 중";
  const roleDescription = getRoleDescription(appUser?.role);
  const activeSessionCount = sessions.filter((session) => session.status === "scheduled").length;
  const canCreatePosts = canUseFounderTools(appUser?.role);
  const statusMessage = isUploadingImage
    ? "프로필 사진을 올리는 중이에요."
    : isSyncing
      ? "계정 정보를 저장하는 중이에요."
      : errorMessage ?? localMessage;
  const statusRole =
    !isUploadingImage && !isSyncing && errorMessage ? "alert" : "status";

  async function handleProfileImageSelected(file: File) {
    if (!user) {
      return;
    }

    setIsUploadingImage(true);
    setLocalMessage(null);

    try {
      const uploaded = await uploadProfileImage(user.id, file);
      await syncCurrentUser({
        name: appUser?.name ?? user.email?.split("@")[0] ?? "Hypofit user",
        bio: appUser?.bio ?? null,
        phone: appUser?.phone ?? null,
        role: appUser?.role ?? "respondent",
        profile_image_path: uploaded.path,
        profile_image_url: uploaded.publicUrl,
      });
      setLocalMessage("프로필 사진이 저장됐어요.");
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : "프로필 사진을 저장하지 못했어요.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <PageFrame className="max-w-[920px]">
      <PageHeader
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="min-h-11" variant="secondary" onClick={() => navigateTo("/my-interviews")}>
              내 인터뷰
            </Button>
            {canCreatePosts ? (
              <Button className="min-h-11" variant="tonal" onClick={() => navigateTo("/interviews/new")}>
                모집글 만들기
              </Button>
            ) : null}
          </div>
        }
        description="계정, 알림, 문의 경로를 한곳에서 정리하고 지금 이어서 확인할 일을 바로 찾을 수 있어요."
        title="프로필"
      />

      <div className="grid gap-4">
        <ProfileSection title="내 계정">
          <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5 sm:py-5">
            <ProfileAvatarUploader
              alt={`${displayName} 프로필 사진`}
              disabled={isUploadingImage || isSyncing}
              fallback={avatarLabel}
              imageUrl={appUser?.profile_image_url}
              onFileSelected={(file) => void handleProfileImageSelected(file)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="max-w-full truncate text-lg font-bold leading-7 text-hypo-text">
                  {displayName}
                </h2>
                <Badge intent="brand">{roleLabel}</Badge>
              </div>
              <p className="mt-1 break-all text-sm text-hypo-text-muted">
                {appUser?.email ?? user?.email ?? "계정 정보를 불러오는 중"}
              </p>
              <p className="mt-2 text-sm leading-6 text-hypo-text-soft">{roleDescription}</p>
            </div>
          </div>

          <SummaryRow label="전화번호" value={appUser?.phone ?? "미등록"} />
          <SummaryRow
            label="한줄소개"
            value={appUser?.bio?.trim() || "한줄소개를 추가하면 채팅에서 나를 더 쉽게 소개할 수 있어요."}
          />

          {statusMessage ? (
            <p
              className={cn(
                "border-t border-hypo-border px-4 py-3 text-sm leading-6 sm:px-5",
                errorMessage ? "text-hypo-danger" : "text-hypo-text-muted",
              )}
              role={statusRole}
            >
              {statusMessage}
            </p>
          ) : null}
        </ProfileSection>

        <ProfileSection title="지금 확인할 일">
          <ProfileMenuItem
            badge={isActivityLoading ? undefined : `${applications.length}`}
            href="/my-interviews"
            icon={ClipboardList}
            label="신청한 인터뷰"
            helper={getApplicationTaskHelper(applications.length, activeSessionCount, isActivityLoading)}
          />
          {canCreatePosts ? (
            <ProfileMenuItem
              badge={isActivityLoading ? undefined : `${interviewPosts.length}`}
              href="/my-interviews"
              icon={FileText}
              label="내 모집글"
              helper={getOwnedPostsTaskHelper(interviewPosts.length, isActivityLoading)}
            />
          ) : null}
          <ProfileMenuItem
            badge={isActivityLoading ? undefined : `${chatRooms.length}`}
            href="/chat"
            icon={MessageCircle}
            label="채팅"
            helper={getChatTaskHelper(chatRooms.length, isActivityLoading)}
          />
        </ProfileSection>

        <ProfileSection title="계정">
          <ProfileMenuItem
            href="/profile/account"
            icon={UserRound}
            label="계정 정보"
            helper={appUser?.phone ? `${appUser.phone}까지 함께 확인하고 수정할 수 있어요.` : "이름, 이메일, 전화번호를 확인하고 수정해요."}
          />
          <ProfileMenuItem
            href="/profile/role"
            icon={Shield}
            label="역할 설정"
            helper={canCreatePosts ? "모집과 신청을 모두 사용할 수 있는 계정이에요." : "신청 중심으로 사용하는 계정이에요."}
          />
        </ProfileSection>

        <ProfileSection title="인터뷰와 알림">
          <ProfileMenuItem
            href="/profile/interviews"
            icon={MessageCircle}
            label="채팅과 인터뷰"
            helper="신청 이후 조율 흐름과 다음 행동을 한곳에서 확인해요."
          />
          <ProfileMenuItem
            href="/profile/notifications"
            icon={Bell}
            label="알림 설정"
            helper="채팅, 신청, 일정, 문의 답변 알림을 관리해요."
          />
        </ProfileSection>

        <ProfileSection title="도움말">
          <ProfileMenuItem
            href="/support/inquiries"
            icon={HelpCircle}
            label="문의하기"
            helper="계정, 신청, 모집글 문제를 남길 수 있어요."
          />
          <ProfileMenuItem
            href="/report"
            icon={ShieldAlert}
            label="신고하기"
            helper="부적절한 모집글, 채팅이나 사용자를 알려주세요."
          />
        </ProfileSection>

        <ProfileSection title="약관과 정책">
          <ProfileMenuItem href="/legal/terms" icon={FileText} label="이용약관" />
          <ProfileMenuItem href="/legal/privacy" icon={Shield} label="개인정보 처리방침" />
        </ProfileSection>

        {user ? (
          <ProfileAccountFooter
            onDeleteAccount={() => navigateTo("/profile/delete-account")}
            onSignOut={() => void signOut()}
          />
        ) : null}
      </div>
    </PageFrame>
  );
}

function ProfileSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold text-hypo-text-soft">{title}</h2>
      <div className="overflow-hidden border-y border-hypo-border bg-hypo-surface sm:rounded-hypo-lg sm:border">
        {children}
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[56px] flex-col justify-center gap-1 border-t border-hypo-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <span className="text-sm font-semibold text-hypo-text-soft">{label}</span>
      <span className="text-sm font-semibold text-hypo-text sm:max-w-[70%] sm:text-right">{value}</span>
    </div>
  );
}

function ProfileMenuItem({
  badge,
  className,
  helper,
  href,
  icon: Icon,
  label,
  onClick,
  showChevron = true,
  tone = "default",
}: {
  badge?: string;
  className?: string;
  helper?: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  showChevron?: boolean;
  tone?: "default" | "danger";
}) {
  const content = (
    <>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-hypo-md",
          tone === "danger"
            ? "bg-hypo-danger/10 text-hypo-danger"
            : "bg-hypo-bg text-hypo-text-soft",
        )}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold leading-5",
            tone === "danger" ? "text-hypo-danger" : "text-hypo-text",
          )}
        >
          {label}
        </span>
        {helper ? (
          <span className="mt-0.5 block text-xs leading-5 text-hypo-text-muted">
            {helper}
          </span>
        ) : null}
      </span>
      {badge ? (
        <span className="shrink-0 rounded-hypo-pill bg-hypo-bg px-2 py-0.5 text-[11px] font-semibold text-hypo-text-soft">
          {badge}
        </span>
      ) : null}
      {showChevron ? <ChevronRight size={16} className="shrink-0 text-hypo-text-soft" /> : null}
    </>
  );
  const itemClassName = cn(
    "flex min-h-[58px] w-full items-start gap-3 border-t border-hypo-border px-4 py-3 text-left first:border-t-0 transition-colors hover:bg-hypo-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-5",
    className,
  );

  if (href) {
    return (
      <a className={itemClassName} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={itemClassName} type="button" onClick={onClick}>
      {content}
    </button>
  );
}

function ProfileAccountFooter({
  className,
  onDeleteAccount,
  onSignOut,
}: {
  className?: string;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}) {
  return (
    <footer
      className={cn(
        "grid gap-3 border-y border-hypo-border bg-hypo-surface px-4 py-4 text-center sm:rounded-hypo-lg sm:border sm:px-5",
        className,
      )}
    >
      <div className="grid gap-0.5 text-[11px] font-bold leading-5 text-hypo-text-soft">
        <span>Hypofit v{version}</span>
        <span>© 2026 {companyName}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="min-h-10" size="sm" variant="secondary" onClick={onSignOut}>
          <LogOut size={16} />
          로그아웃
        </Button>
        <Button className="min-h-10" size="sm" variant="outlineDanger" onClick={onDeleteAccount}>
          <Trash2 size={16} />
          계정 삭제
        </Button>
      </div>
    </footer>
  );
}

function getRoleDescription(role?: UserRole | null) {
  if (role === "founder") {
    return "모집글을 만들고 신청자를 검토할 수 있어요.";
  }

  if (role === "both") {
    return "모집과 신청을 모두 이어갈 수 있어요.";
  }

  return "조건에 맞는 인터뷰를 찾고 신청할 수 있어요.";
}

function getApplicationTaskHelper(
  applicationCount: number,
  activeSessionCount: number,
  isLoading: boolean,
) {
  if (isLoading) {
    return "신청 상태와 다음 조율 단계를 불러오는 중이에요.";
  }

  if (!applicationCount) {
    return "아직 신청한 인터뷰가 없어요. 조건에 맞는 모집글을 찾으면 여기서 상태를 이어서 확인할 수 있어요.";
  }

  if (!activeSessionCount) {
    return `신청 ${applicationCount}건의 상태와 다음 조율 단계를 확인해요.`;
  }

  return `신청 ${applicationCount}건과 예정된 인터뷰 ${activeSessionCount}건을 이어서 확인해요.`;
}

function getOwnedPostsTaskHelper(postCount: number, isLoading: boolean) {
  if (isLoading) {
    return "내 모집글과 지원자 진행 상태를 불러오는 중이에요.";
  }

  if (!postCount) {
    return "아직 만든 모집글이 없어요. 모집글을 열면 지원자 확인과 일정 생성을 여기서 이어갈 수 있어요.";
  }

  return `내 모집글 ${postCount}건의 지원자 상태와 다음 일정을 관리해요.`;
}

function getChatTaskHelper(chatCount: number, isLoading: boolean) {
  if (isLoading) {
    return "채팅 진행 상황을 불러오는 중이에요.";
  }

  if (!chatCount) {
    return "아직 진행 중인 채팅이 없어요. 신청이 이어지면 여기서 조율 대화를 확인할 수 있어요.";
  }

  return `진행 중인 채팅 ${chatCount}개에서 일정과 세부 내용을 조율해요.`;
}
