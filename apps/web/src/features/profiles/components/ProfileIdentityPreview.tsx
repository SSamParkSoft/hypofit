import type { AppUser } from "../../../shared/api/types";
import { getRoleLabel } from "../../../shared/auth/roles";
import { Avatar } from "../../../shared/ui/avatar";
import { Badge } from "../../../shared/ui/badge";

interface ProfileIdentityPreviewProps {
  appUser: AppUser | null;
  fallbackEmail?: string | null;
}

export function ProfileIdentityPreview({
  appUser,
  fallbackEmail,
}: ProfileIdentityPreviewProps) {
  const displayName = appUser?.name ?? fallbackEmail?.split("@")[0] ?? "사용자";
  const bio = appUser?.bio?.trim() || "한줄소개가 아직 없어요.";
  const roleLabel = appUser ? getRoleLabel(appUser.role) : "프로필 준비 중";

  return (
    <section aria-label="공개 프로필 미리보기">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h2 className="text-sm font-bold text-hypo-text">다른 사람에게 보이는 프로필</h2>
          <p className="mt-1 text-xs text-hypo-text-soft">
            사진, 이름, 역할과 한줄소개만 보여요.
          </p>
        </div>
        <span className="text-[11px] font-bold text-hypo-brand">미리보기</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-panel">
        <div aria-hidden="true" className="h-1 bg-hypo-brand" />
        <div className="flex min-h-[132px] items-center gap-4 px-5 py-5 sm:gap-5 sm:px-6">
          <Avatar
            alt={`${displayName} 프로필 사진`}
            borderTone="strong"
            className="size-16 sm:size-18"
            shape="circle"
            src={appUser?.profile_image_url}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <strong className="truncate text-lg font-bold leading-7 text-hypo-text">
                {displayName}
              </strong>
              <Badge intent="brand">{roleLabel}</Badge>
            </div>
            <p className="mt-2 line-clamp-2 max-w-xl text-sm font-medium leading-6 text-hypo-text-muted">
              {bio}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
