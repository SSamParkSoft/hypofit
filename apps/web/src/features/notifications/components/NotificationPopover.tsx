import { ArrowRight, Bell } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { navigateTo } from "../../../shared/navigation/appNavigation";
import { cn } from "../../../shared/ui/cn";
import { NotificationTriggerButton } from "../../../shared/ui/notification-button";
import {
  NotificationIcon,
  formatRelativeTime,
  getNotificationHref,
} from "../notificationPresentation";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../useNotifications";
import type { NotificationRecord } from "../../../shared/api/notifications";

const NOTIFICATION_PREVIEW_LIMIT = 6;
const POPOVER_GAP = 8;
const POPOVER_MARGIN = 16;
const POPOVER_MAX_WIDTH = 380;

interface PopoverPosition {
  left: number;
  top: number;
  width: number;
}

interface NotificationPopoverProps {
  accessToken?: string | null;
  unreadCount: number | null;
  unreadCountCapped?: boolean;
}

export function NotificationPopover({
  accessToken,
  unreadCount,
  unreadCountCapped = false,
}: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const titleId = useId();
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    data: notifications = [],
    isError,
    isLoading,
    refetch,
  } = useNotifications(
    accessToken,
    { limit: NOTIFICATION_PREVIEW_LIMIT },
    { enabled: isOpen },
  );
  const markRead = useMarkNotificationRead(accessToken);
  const markAllRead = useMarkAllNotificationsRead(accessToken);
  const visibleUnreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const resolvedUnreadCount = unreadCount ?? visibleUnreadCount;
  const hasUnread = resolvedUnreadCount > 0;
  const unreadLabel = unreadCountCapped
    ? `${resolvedUnreadCount}개 이상`
    : `${resolvedUnreadCount}개`;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content) {
      return;
    }
    if (!isElementVisible(trigger)) {
      setIsOpen(false);
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      POPOVER_MAX_WIDTH,
      Math.max(0, viewportWidth - POPOVER_MARGIN * 2),
    );
    const left = Math.min(
      Math.max(triggerRect.right - width, POPOVER_MARGIN),
      Math.max(POPOVER_MARGIN, viewportWidth - width - POPOVER_MARGIN),
    );
    const contentHeight = Math.min(
      contentRect.height,
      Math.max(0, viewportHeight - POPOVER_MARGIN * 2),
    );
    const availableBelow =
      viewportHeight - triggerRect.bottom - POPOVER_GAP - POPOVER_MARGIN;
    const availableAbove =
      triggerRect.top - POPOVER_GAP - POPOVER_MARGIN;
    const shouldPlaceAbove =
      availableBelow < Math.min(contentHeight, 260) &&
      availableAbove > availableBelow;
    const preferredTop = shouldPlaceAbove
      ? triggerRect.top - POPOVER_GAP - contentHeight
      : triggerRect.bottom + POPOVER_GAP;
    const top = Math.min(
      Math.max(preferredTop, POPOVER_MARGIN),
      Math.max(POPOVER_MARGIN, viewportHeight - contentHeight - POPOVER_MARGIN),
    );

    setPosition({ left, top, width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();
  }, [isError, isLoading, isOpen, notifications.length, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      contentRef.current?.focus({ preventScroll: true });
      updatePosition();
    });
    let positionFrame = 0;
    const schedulePositionUpdate = () => {
      window.cancelAnimationFrame(positionFrame);
      positionFrame = window.requestAnimationFrame(updatePosition);
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        contentRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };
    const closeOnFocusOutside = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        contentRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    window.addEventListener("pointerdown", closeOnPointerDown, true);
    window.addEventListener("focusin", closeOnFocusOutside);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.cancelAnimationFrame(positionFrame);
      window.removeEventListener("pointerdown", closeOnPointerDown, true);
      window.removeEventListener("focusin", closeOnFocusOutside);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [isOpen, updatePosition]);

  const markNotificationRead = (notification: NotificationRecord) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
  };

  const handleNotificationLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    notification: NotificationRecord,
    href: string,
  ) => {
    markNotificationRead(notification);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setIsOpen(false);
    navigateTo(href);
  };

  const handleAllNotificationsClick = (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setIsOpen(false);
    navigateTo("/notifications");
  };

  const popoverStyle: CSSProperties | undefined = position
    ? { left: position.left, top: position.top, width: position.width }
    : undefined;

  return (
    <>
      <NotificationTriggerButton
        ref={triggerRef}
        aria-controls={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="shrink-0 data-[state=open]:bg-hypo-bg data-[state=open]:text-hypo-brand"
        data-state={isOpen ? "open" : "closed"}
        hasUnread={hasUnread}
        scope="shell"
        unreadCount={resolvedUnreadCount}
        unreadCountCapped={unreadCountCapped}
        onClick={() => setIsOpen((open) => !open)}
      />

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              id={popoverId}
              aria-labelledby={titleId}
              className={cn(
                "fixed z-[80] flex max-h-[calc(100dvh-2rem)] origin-top-right flex-col overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-floating outline-none",
                position ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              role="dialog"
              style={popoverStyle}
              tabIndex={-1}
            >
              <header className="flex min-h-16 items-center justify-between gap-4 border-b border-hypo-border px-4">
                <div className="min-w-0">
                  <h2
                    id={titleId}
                    className="text-sm font-bold text-hypo-text"
                  >
                    알림
                  </h2>
                  <p className="mt-0.5 text-xs leading-4 text-hypo-text-soft">
                    읽지 않은 알림 {unreadLabel}
                  </p>
                </div>
                {hasUnread ? (
                  <button
                    className="min-h-9 shrink-0 rounded-hypo-md px-2.5 text-xs font-medium text-hypo-brand transition-colors hover:bg-hypo-brand-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 disabled:cursor-wait disabled:opacity-50"
                    disabled={markAllRead.isPending}
                    type="button"
                    onClick={() => markAllRead.mutate()}
                  >
                    {markAllRead.isPending ? "처리 중" : "모두 읽음"}
                  </button>
                ) : null}
              </header>

              <div
                aria-busy={isLoading}
                className="min-h-0 max-h-[420px] overflow-y-auto"
              >
                {isLoading ? <NotificationPopoverSkeleton /> : null}

                {isError ? (
                  <div className="grid min-h-40 place-items-center px-6 py-8 text-center">
                    <div>
                      <p className="text-sm font-semibold text-hypo-text">
                        알림을 불러오지 못했어요
                      </p>
                      <button
                        className="mt-3 min-h-9 rounded-hypo-md px-3 text-xs font-medium text-hypo-brand transition-colors hover:bg-hypo-brand-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
                        type="button"
                        onClick={() => void refetch()}
                      >
                        다시 불러오기
                      </button>
                    </div>
                  </div>
                ) : null}

                {!isLoading && !isError && notifications.length === 0 ? (
                  <div className="grid min-h-40 place-items-center px-6 py-8 text-center">
                    <div>
                      <Bell
                        aria-hidden="true"
                        className="mx-auto text-hypo-text-soft"
                        size={22}
                      />
                      <p className="mt-3 text-sm font-semibold text-hypo-text">
                        새 알림이 없어요
                      </p>
                      <p className="mt-1 text-xs leading-5 text-hypo-text-muted">
                        새로운 신청이나 채팅 소식이 생기면 알려드릴게요.
                      </p>
                    </div>
                  </div>
                ) : null}

                {!isLoading && !isError && notifications.length > 0 ? (
                  <div aria-label="최근 알림" role="list">
                    {notifications.map((notification) => (
                      <NotificationPopoverItem
                        key={notification.id}
                        notification={notification}
                        onAction={markNotificationRead}
                        onNavigate={handleNotificationLinkClick}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <a
                className="flex min-h-11 items-center justify-center gap-1.5 border-t border-hypo-border px-4 text-xs font-semibold text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20"
                href="/notifications"
                onClick={handleAllNotificationsClick}
              >
                알림 전체 보기
                <ArrowRight aria-hidden="true" size={14} />
              </a>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function NotificationPopoverItem({
  notification,
  onAction,
  onNavigate,
}: {
  notification: NotificationRecord;
  onAction: (notification: NotificationRecord) => void;
  onNavigate: (
    event: MouseEvent<HTMLAnchorElement>,
    notification: NotificationRecord,
    href: string,
  ) => void;
}) {
  const isUnread = !notification.read_at;
  const href = getNotificationHref(notification);
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
          isUnread
            ? "bg-hypo-brand-soft text-hypo-brand"
            : "bg-hypo-bg text-hypo-text-soft",
        )}
      >
        <NotificationIcon notification={notification} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-5 text-hypo-text",
              isUnread ? "font-bold" : "font-medium",
            )}
          >
            {isUnread ? <span className="sr-only">읽지 않은 알림: </span> : null}
            {notification.title}
          </span>
          <span className="shrink-0 text-[11px] font-medium leading-5 text-hypo-text-soft">
            {formatRelativeTime(notification.created_at)}
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 line-clamp-2 text-xs leading-5",
            isUnread ? "text-hypo-text-muted" : "text-hypo-text-soft",
          )}
        >
          {notification.body}
        </span>
      </span>
      {isUnread ? (
        <span
          aria-hidden="true"
          className="mt-2 size-2 shrink-0 rounded-full bg-hypo-brand"
        />
      ) : null}
    </>
  );
  const itemClassName =
    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-hypo-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20";

  return (
    <div
      className="border-b border-hypo-border last:border-b-0"
      role="listitem"
    >
      {href ? (
        <a
          className={itemClassName}
          href={href}
          onClick={(event) => onNavigate(event, notification, href)}
        >
          {content}
        </a>
      ) : (
        <button
          className={itemClassName}
          type="button"
          onClick={() => onAction(notification)}
        >
          {content}
        </button>
      )}
    </div>
  );
}

function isElementVisible(element: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

function NotificationPopoverSkeleton() {
  return (
    <div aria-label="알림을 불러오는 중입니다." role="status">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="flex min-h-[76px] animate-pulse items-start gap-3 border-b border-hypo-border px-4 py-3 last:border-b-0"
        >
          <div className="size-8 shrink-0 rounded-full bg-hypo-bg" />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="h-3 w-2/3 rounded bg-hypo-bg" />
            <div className="mt-2 h-3 w-full rounded bg-hypo-bg" />
          </div>
        </div>
      ))}
    </div>
  );
}
