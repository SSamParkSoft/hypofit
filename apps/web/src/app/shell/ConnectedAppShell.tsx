import type { ReactNode } from "react";

import { useAuth } from "../../features/auth/useAuth";
import { NotificationPopover } from "../../features/notifications/components/NotificationPopover";
import { useNotifications } from "../../features/notifications/useNotifications";
import { ProfileAccountMenu } from "../../features/profiles/components/ProfileAccountMenu";
import { APP_DESTINATION_DEFINITIONS } from "../../shared/navigation/appRoutes";
import type { AppUser } from "../../shared/api/types";
import {
  ChatNavIcon,
  HomeNavIcon,
  InterviewsNavIcon,
  MapNavIcon,
  ProfileNavIcon,
} from "../../shared/ui/icon";
import { NotificationButtonStateProvider } from "../../shared/ui/notification-button";
import { AppShell } from "../../shared/ui/navigation/AppShell";
import type {
  AppDestination,
  AppShellActiveDestination,
  AppShellNavItem,
} from "../../shared/ui/navigation/types";

const navIconMap = {
  home: HomeNavIcon,
  interviews: InterviewsNavIcon,
  map: MapNavIcon,
  chat: ChatNavIcon,
  profile: ProfileNavIcon,
} as const;

const appShellNavItems: AppShellNavItem[] = APP_DESTINATION_DEFINITIONS.map(
  (destination) => ({
    ...destination,
    icon: navIconMap[destination.id],
  }),
);

const UNREAD_NOTIFICATION_LIMIT = 20;

interface ConnectedAppShellProps {
  activeDestination?: AppShellActiveDestination;
  appUser: AppUser | null;
  children: ReactNode;
  onNavigate: (destination: AppDestination) => void;
}

export function ConnectedAppShell({
  activeDestination,
  appUser,
  children,
  onNavigate,
}: ConnectedAppShellProps) {
  const { accessToken } = useAuth();
  const { data: unreadNotifications, isSuccess } = useNotifications(accessToken, {
    limit: UNREAD_NOTIFICATION_LIMIT,
    unreadOnly: true,
  });
  const unreadCount = isSuccess ? unreadNotifications?.length ?? 0 : null;
  const unreadCountCapped = unreadCount === UNREAD_NOTIFICATION_LIMIT;

  return (
    <NotificationButtonStateProvider
      value={{
        hasUnread: unreadCount !== null && unreadCount > 0,
        unreadCount,
        unreadCountCapped,
      }}
    >
      <AppShell
        accountMenu={<ProfileAccountMenu appUser={appUser} />}
        activeDestination={activeDestination}
        navItems={appShellNavItems}
        notificationButton={
          <NotificationPopover
            accessToken={accessToken}
            unreadCount={unreadCount}
            unreadCountCapped={unreadCountCapped}
          />
        }
        onNavigate={onNavigate}
      >
        {children}
      </AppShell>
    </NotificationButtonStateProvider>
  );
}
