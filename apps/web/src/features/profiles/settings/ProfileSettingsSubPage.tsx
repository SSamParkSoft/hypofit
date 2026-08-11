import { Button } from "../../../shared/ui/button";
import { PageLayout } from "../../../shared/ui/page";
import { navigateTo } from "../../../shared/navigation/appNavigation";
import type { AppUser } from "../../../shared/api/types";
import { ProfileAccountSettingsSubPage } from "./ProfileAccountSettingsSubPage";
import { ProfileDeleteAccountSettingsSubPage } from "./ProfileDeleteAccountSettingsSubPage";
import { ProfileInterviewSettingsSubPage } from "./ProfileInterviewSettingsSubPage";
import { ProfileNotificationSettingsSubPage } from "./ProfileNotificationSettingsSubPage";
import { ProfileRoleSettingsSubPage } from "./ProfileRoleSettingsSubPage";
import { type SettingsSubPageType, profileSettingsPageMeta } from "./settingsMeta";
import { ProfileSettingsHeader } from "./settingsPrimitives";

export type { SettingsSubPageType };

export function ProfileSettingsSubPage({
  appUser,
  type,
}: {
  appUser: AppUser | null;
  type: SettingsSubPageType;
}) {
  if (type === "account") {
    return <ProfileAccountSettingsSubPage appUser={appUser} />;
  }

  const meta = profileSettingsPageMeta[type];
  const actionHref = meta.actionHref;
  const actionLabel = meta.actionLabel;

  return (
    <PageLayout className="max-w-[880px]" variant="settings-form">
      <div className="grid min-w-0 gap-4">
        <ProfileSettingsHeader
          action={
            actionHref && actionLabel ? (
              <Button
                className="min-h-10"
                size="sm"
                variant={type === "delete-account" ? "outlineDanger" : "secondary"}
                onClick={() => navigateTo(actionHref)}
              >
                {actionLabel}
              </Button>
            ) : undefined
          }
          description={meta.description}
          title={meta.title}
        />

        {renderSubPageBody(type, appUser)}
      </div>
    </PageLayout>
  );
}

function renderSubPageBody(type: Exclude<SettingsSubPageType, "account">, appUser: AppUser | null) {
  switch (type) {
    case "role":
      return <ProfileRoleSettingsSubPage appUser={appUser} />;
    case "notifications":
      return <ProfileNotificationSettingsSubPage />;
    case "interview-settings":
      return <ProfileInterviewSettingsSubPage />;
    case "delete-account":
      return <ProfileDeleteAccountSettingsSubPage />;
    default:
      return null;
  }
}
