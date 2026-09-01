import { useAuth } from "../features/auth/useAuth";
import { HomeDashboard } from "../features/home";

interface ExplorePageProps {
  canApply: boolean;
}

export function ExplorePage({ canApply }: ExplorePageProps) {
  const { accessToken, appUser, user } = useAuth();
  const displayName =
    appUser?.name?.trim() || user?.email?.split("@")[0]?.trim() || "사용자";

  return (
    <HomeDashboard
      accessToken={accessToken}
      appUserId={appUser?.id ?? user?.id ?? null}
      canApply={canApply}
      displayName={displayName}
    />
  );
}
