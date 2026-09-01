import {
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  LogOut,
  MessageCircle,
  Pencil,
  Shield,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useSignOutToLanding } from "../../auth/useSignOutToLanding";
import { ProfileAvatarUploader } from "../components/ProfileAvatarUploader";
import { useProfileWorkspace } from "../useProfileWorkspace";
import type { AppUser } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { PageHeader, PageLayout } from "../../../shared/ui/page";
import { navigateTo } from "../../../shared/navigation/appNavigation";

export function ProfileSettingsIndexContent({
  appUser,
}: {
  appUser: AppUser | null;
}) {
  const signOutToLanding = useSignOutToLanding();
  const workspace = useProfileWorkspace(appUser);
  const displayName =
    appUser?.name ?? workspace.user?.email?.split("@")[0] ?? "사용자";
  const email =
    appUser?.email ?? workspace.user?.email ?? "계정 정보를 불러오는 중";
  const avatarLabel = appUser?.name?.[0] ?? workspace.user?.email?.[0] ?? "H";

  return (
    <PageLayout className="max-w-[1200px]" variant="settings-form">
      <div className="grid gap-8 min-[1200px]:gap-10">
        <PageHeader
          action={
            workspace.canCreatePosts ? (
              <Button size="sm" onClick={() => navigateTo("/interviews/new")}>
                공고 만들기
              </Button>
            ) : undefined
          }
          title="프로필"
        />

        <div className="grid items-start gap-10 min-[1200px]:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] min-[1200px]:gap-12">
          <ProfileIdentity
            appUser={appUser}
            avatarLabel={avatarLabel}
            displayName={displayName}
            email={email}
            isSyncing={workspace.isSyncing}
            isUploadingImage={workspace.isUploadingImage}
            message={workspace.statusMessage}
            messageTone={workspace.errorMessage ? "danger" : "default"}
            onFileSelected={workspace.handleProfileImageSelected}
          />

          <div className="grid gap-9 min-[1200px]:gap-10">
            <WorkspaceSection title="내 활동">
              <WorkspaceRow
                count={
                  workspace.isActivityLoading
                    ? undefined
                    : workspace.applications.length
                }
                href="/my-interviews"
                icon={ClipboardList}
                label="내 참여"
              />
              {workspace.canCreatePosts ? (
                <WorkspaceRow
                  count={
                    workspace.isActivityLoading
                      ? undefined
                      : workspace.interviewPosts.length
                  }
                  href="/my-interviews"
                  icon={FileText}
                  label="내 공고"
                />
              ) : null}
              <WorkspaceRow
                count={
                  workspace.isActivityLoading
                    ? undefined
                    : workspace.chatRooms.length
                }
                href="/chat"
                icon={MessageCircle}
                label="채팅"
              />
            </WorkspaceSection>

            <WorkspaceSection title="계정">
              <WorkspaceRow
                href="/profile/account"
                icon={UserRound}
                label="계정 정보"
              />
              <WorkspaceRow
                href="/profile/notifications"
                icon={Bell}
                label="알림 설정"
              />
            </WorkspaceSection>

            <WorkspaceSection title="도움">
              <WorkspaceRow
                href="/support/inquiries"
                icon={HelpCircle}
                label="문의하기"
              />
              <WorkspaceRow
                href="/report"
                icon={ShieldAlert}
                label="신고하기"
              />
            </WorkspaceSection>

            <WorkspaceSection title="서비스">
              <WorkspaceRow
                href="/legal/privacy"
                icon={Shield}
                label="개인정보처리방침"
              />
              <WorkspaceRow
                href="/legal/terms"
                icon={FileText}
                label="이용약관"
              />
            </WorkspaceSection>

            {workspace.user ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                <button
                  className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-hypo-text-muted transition-colors hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
                  type="button"
                  onClick={() => void signOutToLanding()}
                >
                  <LogOut aria-hidden="true" size={16} />
                  로그아웃
                </button>
                <a
                  className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-hypo-danger transition-colors hover:bg-hypo-danger-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-danger/20"
                  href="/profile/delete-account"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  계정 삭제
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function ProfileIdentity({
  appUser,
  avatarLabel,
  displayName,
  email,
  isSyncing,
  isUploadingImage,
  message,
  messageTone,
  onFileSelected,
}: {
  appUser: AppUser | null;
  avatarLabel: string;
  displayName: string;
  email: string;
  isSyncing: boolean;
  isUploadingImage: boolean;
  message: string | null;
  messageTone: "default" | "danger";
  onFileSelected: (file: File) => Promise<void>;
}) {
  return (
    <section
      aria-label="내 계정 요약"
      className="rounded-hypo-xl bg-hypo-surface p-6 shadow-[0_1px_2px_rgb(20_31_28_/_0.03)] min-[1200px]:sticky min-[1200px]:top-8"
    >
      <ProfileAvatarUploader
        alt={`${displayName} 프로필 사진`}
        className="size-20"
        disabled={isUploadingImage || isSyncing}
        fallback={avatarLabel}
        imageUrl={appUser?.profile_image_url}
        uploadButtonClassName="size-7"
        onFileSelected={(file) => void onFileSelected(file)}
      />
      <h2 className="mt-5 text-xl font-bold leading-7 text-hypo-text">
        {displayName}
      </h2>
      <p className="mt-1.5 break-all text-sm leading-5 text-hypo-text-muted">
        {email}
      </p>
      {appUser?.organization_name ? (
        <p className="mt-5 text-sm font-medium leading-6 text-hypo-text-muted">
          {appUser.organization_name}
        </p>
      ) : null}
      {appUser?.bio?.trim() ? (
        <p className="mt-4 text-sm leading-6 text-hypo-text-muted">
          {appUser.bio.trim()}
        </p>
      ) : null}
      <a
        className="mt-6 inline-flex min-h-10 items-center gap-1.5 px-1 text-sm font-semibold text-hypo-text-muted transition-colors hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        href="/profile/account"
      >
        <Pencil aria-hidden="true" size={15} />
        프로필 편집
      </a>
      {message ? (
        <p
          className={cn(
            "mt-4 border-t border-hypo-border/75 pt-4 text-sm leading-6",
            messageTone === "danger"
              ? "text-hypo-danger"
              : "text-hypo-text-muted",
          )}
          role={messageTone === "danger" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

function WorkspaceSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold leading-5 text-hypo-text-muted">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function WorkspaceRow({
  count,
  href,
  icon: Icon,
  label,
}: {
  count?: number;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <a
      className="group flex min-h-[56px] items-center gap-3 border-t border-hypo-border/80 px-1 text-left transition-colors first:border-t-0 hover:bg-hypo-surface-muted/70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20"
      href={href}
    >
      <Icon
        aria-hidden="true"
        className="shrink-0 text-hypo-icon-muted transition-colors group-hover:text-hypo-brand"
        size={17}
      />
      <span className="min-w-0 flex-1 text-sm font-medium text-hypo-text">
        {label}
      </span>
      {count !== undefined ? (
        <span className="text-sm font-semibold tabular-nums text-hypo-text-muted">
          {count}
        </span>
      ) : null}
      <ChevronRight
        aria-hidden="true"
        className="shrink-0 text-hypo-text-soft transition-transform group-hover:translate-x-0.5"
        size={16}
      />
    </a>
  );
}
