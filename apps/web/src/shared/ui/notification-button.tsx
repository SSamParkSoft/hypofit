import {
  createContext,
  forwardRef,
  useContext,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
} from "react";

import { cn } from "./cn";
import { AppIcon } from "./icon";

interface NotificationButtonState {
  hasUnread?: boolean;
  unreadCount?: number | null;
  unreadCountCapped?: boolean;
}

interface NotificationButtonProps
  extends NotificationButtonState,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-label"> {
  href?: string;
  scope?: "page" | "shell";
}

interface NotificationTriggerButtonProps
  extends NotificationButtonState,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "type"> {
  scope?: "page" | "shell";
}

const NotificationButtonStateContext = createContext<NotificationButtonState | null>(
  null,
);

export function NotificationButtonStateProvider({
  children,
  value,
}: PropsWithChildren<{ value: NotificationButtonState }>) {
  return (
    <NotificationButtonStateContext.Provider value={value}>
      {children}
    </NotificationButtonStateContext.Provider>
  );
}

export function NotificationButton({
  className,
  hasUnread,
  href = "/notifications",
  scope = "page",
  unreadCount,
  unreadCountCapped,
  ...anchorProps
}: NotificationButtonProps) {
  const state = useResolvedNotificationButtonState({
    hasUnread,
    unreadCount,
    unreadCountCapped,
  });

  return (
    <a
      {...anchorProps}
      aria-label={state.accessibleLabel}
      className={getNotificationButtonClassName(scope, className)}
      href={href}
      title="알림"
    >
      <NotificationBellContent
        hasUnread={state.hasUnread}
        scope={scope}
      />
    </a>
  );
}

export const NotificationTriggerButton = forwardRef<
  HTMLButtonElement,
  NotificationTriggerButtonProps
>(function NotificationTriggerButton(
  {
    className,
    hasUnread,
    scope = "shell",
    unreadCount,
    unreadCountCapped,
    ...buttonProps
  },
  ref,
) {
  const state = useResolvedNotificationButtonState({
    hasUnread,
    unreadCount,
    unreadCountCapped,
  });

  return (
    <button
      {...buttonProps}
      ref={ref}
      aria-label={state.accessibleLabel}
      className={getNotificationButtonClassName(scope, className)}
      title="알림"
      type="button"
    >
      <NotificationBellContent
        hasUnread={state.hasUnread}
        scope={scope}
      />
    </button>
  );
});

function useResolvedNotificationButtonState({
  hasUnread,
  unreadCount,
  unreadCountCapped,
}: NotificationButtonState) {
  const inheritedState = useContext(NotificationButtonStateContext);
  const resolvedUnreadCount = unreadCount ?? inheritedState?.unreadCount ?? null;
  const resolvedHasUnread =
    hasUnread ??
    inheritedState?.hasUnread ??
    (typeof resolvedUnreadCount === "number" && resolvedUnreadCount > 0);
  const resolvedUnreadCountCapped =
    unreadCountCapped ?? inheritedState?.unreadCountCapped ?? false;
  const unreadLabel = resolvedUnreadCountCapped
    ? `${resolvedUnreadCount}개 이상`
    : `${resolvedUnreadCount}개`;
  const accessibleLabel =
    typeof resolvedUnreadCount === "number" && resolvedUnreadCount > 0
      ? `알림, 읽지 않은 알림 ${unreadLabel}`
      : "알림";

  return { accessibleLabel, hasUnread: resolvedHasUnread };
}

function getNotificationButtonClassName(
  scope: "page" | "shell",
  className?: string,
) {
  return cn(
    "relative shrink-0 place-items-center rounded-hypo-md transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
    scope === "shell"
      ? "hidden size-10 text-hypo-text-muted hover:bg-hypo-bg hover:text-hypo-brand md:grid"
      : "grid size-11 text-hypo-text hover:bg-hypo-surface hover:text-hypo-brand md:hidden",
    className,
  );
}

function NotificationBellContent({
  hasUnread,
  scope,
}: {
  hasUnread: boolean;
  scope: "page" | "shell";
}) {
  const isShellUtility = scope === "shell";

  return (
    <>
      <AppIcon
        aria-hidden="true"
        name="notification"
        size={isShellUtility ? 19 : 22}
      />
      {hasUnread ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute size-2 rounded-hypo-pill bg-hypo-danger",
            isShellUtility
              ? "right-2 top-2 ring-2 ring-hypo-surface"
              : "right-2.5 top-2.5 ring-2 ring-hypo-bg",
          )}
          data-unread-indicator="true"
        />
      ) : null}
    </>
  );
}
