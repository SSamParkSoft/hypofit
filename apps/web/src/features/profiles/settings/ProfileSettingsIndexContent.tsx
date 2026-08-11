import { Mail } from "lucide-react";

import { useAuth } from "../../auth/useAuth";
import type { AppUser } from "../../../shared/api/types";
import { getRoleLabel } from "../../../shared/auth/roles";
import { Badge } from "../../../shared/ui/badge";
import { Avatar } from "../../../shared/ui/avatar";
import { cn } from "../../../shared/ui/cn";
import { PageHeader, PageLayout } from "../../../shared/ui/page";
import { profileSettingsSections } from "./settingsMeta";
import { ProfileSettingsIndexRow } from "./settingsPrimitives";

export function ProfileSettingsIndexContent({ appUser }: { appUser: AppUser | null }) {
  const { user } = useAuth();
  const displayName = appUser?.name ?? user?.email?.split("@")[0] ?? "사용자";
  const bio = appUser?.bio?.trim() || "한줄소개가 아직 없어요.";
  const email = appUser?.email ?? user?.email ?? "계정 정보를 불러오는 중";
  const roleLabel = appUser ? getRoleLabel(appUser.role) : "동기화 중";

  return (
    <PageLayout className="max-w-[1120px]" variant="settings-form">
      <div className="grid gap-6">
        <PageHeader description="계정과 인터뷰 설정, 문의와 정책 경로를 한곳에서 확인해요." title="설정" />

        <section
          aria-label="내 계정 요약"
          className="flex items-start gap-4 rounded-hypo-lg border border-hypo-border bg-hypo-surface px-4 py-4 sm:px-5"
        >
          <Avatar alt={`${displayName} 프로필 사진`} className="size-16 rounded-hypo-lg" src={appUser?.profile_image_url} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 max-w-full truncate text-lg font-bold leading-7 text-hypo-text">{displayName}</h2>
              <Badge intent="brand">{roleLabel}</Badge>
            </div>
            <p className="mt-2 truncate border-l-2 border-hypo-brand/55 pl-2.5 text-sm font-semibold leading-5 text-hypo-text-muted">
              {bio}
            </p>
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-hypo-text-soft">
              <Mail aria-hidden="true" className="shrink-0" size={13} strokeWidth={2} />
              <span className="truncate">{email}</span>
            </p>
          </div>
        </section>

        <nav aria-label="프로필 설정 목록" className="overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface">
          {profileSettingsSections.map((section, sectionIndex) => (
            <section key={section.title} className={cn(sectionIndex > 0 && "border-t border-hypo-border")}>
              <h2 className="px-4 pb-2 pt-4 text-xs font-bold text-hypo-text-soft sm:px-5">{section.title}</h2>
              <div className="grid">
                {section.items.map((item) => (
                  <ProfileSettingsIndexRow key={item.href} {...item} />
                ))}
              </div>
            </section>
          ))}
        </nav>
      </div>
    </PageLayout>
  );
}
