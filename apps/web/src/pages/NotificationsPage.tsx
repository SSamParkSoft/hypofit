import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../features/notifications/useNotifications";
import {
  NotificationIcon,
  formatRelativeTime,
  getNotificationCategoryLabel,
  getNotificationDestinationLabel,
  getNotificationHref,
  groupNotificationsByDate,
} from "../features/notifications/notificationPresentation";
import { useAuth } from "../features/auth/useAuth";
import type { NotificationRecord } from "../shared/api/notifications";
import { navigateTo } from "../shared/navigation/appNavigation";
import { BackLink } from "../shared/ui/back-link";
import { Button } from "../shared/ui/button";
import { cn } from "../shared/ui/cn";
import { PageLayout } from "../shared/ui/page";
import { EmptyState, ErrorState, LoadingState } from "../shared/ui/state";

export function NotificationsPage() {
  const { accessToken } = useAuth();
  const { data: notifications = [], isError, isLoading } = useNotifications(accessToken, { limit: 50 });
  const markRead = useMarkNotificationRead(accessToken);
  const markAllRead = useMarkAllNotificationsRead(accessToken);
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  const hasUnread = unreadCount > 0;
  const notificationGroups = groupNotificationsByDate(notifications);

  function handleNotificationClick(notification: NotificationRecord) {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }

    const href = getNotificationHref(notification);
    if (href) {
      navigateTo(href);
    }
  }

  return (
    <div className="min-h-full bg-hypo-bg text-hypo-text">
      <PageLayout
        className="max-w-[920px] pb-[calc(var(--app-safe-bottom)+1rem)] pt-[calc(var(--app-safe-top)+1rem)]"
        variant="document"
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <BackLink className="mt-0.5 min-[1200px]:hidden" href="/app" />
            <div className="min-w-0">
              <h1 className="ui-page-title">
                알림
              </h1>
              <p className="mt-2 text-sm leading-6 text-hypo-text-muted">
                채팅, 신청, 선정, 일정 소식을 날짜별로 모아 보고 필요한 화면으로 바로 돌아갈 수 있어요.
              </p>
            </div>
          </div>
          <div className="sm:shrink-0">
            <Button
              className="min-h-10 w-full sm:w-auto"
              disabled={!hasUnread || markAllRead.isPending}
              size="sm"
              variant="secondary"
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? "처리 중" : "모두 읽음"}
            </Button>
          </div>
        </header>

        <div className="grid gap-4">
          {isLoading ? <LoadingState live="polite" title="알림을 불러오는 중입니다." /> : null}

          {isError ? (
            <ErrorState title="알림을 불러오지 못했어요.">
              잠시 후 다시 열어 주세요.
            </ErrorState>
          ) : null}

          {!isLoading && !isError && notifications.length === 0 ? (
            <EmptyState title="새 알림이 없어요.">
              지원 상태나 채팅 소식이 생기면 이곳에서 알려드릴게요.
            </EmptyState>
          ) : null}

          {notifications.length > 0 ? (
            <section
              aria-labelledby="notifications-list-heading"
              className="overflow-hidden border-y border-hypo-border bg-hypo-surface sm:rounded-hypo-lg sm:border"
            >
              <div className="border-b border-hypo-border px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="notifications-list-heading" className="ui-section-title text-hypo-text">
                      최근 알림
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-hypo-text-muted">
                      읽지 않은 알림 {unreadCount}개, 전체 {notifications.length}개
                    </p>
                  </div>
                  {hasUnread ? (
                    <span className="rounded-hypo-pill bg-hypo-bg px-2.5 py-1 text-[11px] font-semibold text-hypo-text-soft">
                      새 알림 있음
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                {notificationGroups.map((group, groupIndex) => (
                  <section
                    key={group.label}
                    aria-labelledby={`notification-group-${groupIndex}`}
                    className={cn(groupIndex > 0 && "border-t border-hypo-border")}
                  >
                    <div className="px-4 py-2.5 sm:px-5">
                      <h3
                        id={`notification-group-${groupIndex}`}
                        className="text-xs font-bold text-hypo-text-soft"
                      >
                        {group.label}
                      </h3>
                    </div>

                    {group.notifications.map((notification) => (
                      <button
                        key={notification.id}
                        className="flex w-full items-start gap-3 border-t border-hypo-border px-4 py-3.5 text-left transition-colors hover:bg-hypo-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-5"
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="mt-0.5 shrink-0 text-hypo-text-soft">
                          <NotificationIcon notification={notification} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {!notification.read_at ? (
                                  <span className="size-2 rounded-hypo-pill bg-hypo-brand" />
                                ) : null}
                                <h4
                                  className={cn(
                                    "text-sm leading-5 text-hypo-text",
                                    notification.read_at ? "font-semibold" : "font-bold",
                                  )}
                                >
                                  {notification.title}
                                </h4>
                              </div>
                              <p
                                className={cn(
                                  "mt-1 text-sm leading-6",
                                  notification.read_at ? "text-hypo-text-muted" : "font-semibold text-hypo-text",
                                )}
                              >
                                {notification.body}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-hypo-text-soft">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5">
                            <span className="font-semibold text-hypo-text-soft">
                              {getNotificationCategoryLabel(notification)}
                            </span>
                            <span className="text-hypo-text-muted">
                              {getNotificationDestinationLabel(notification)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </PageLayout>
    </div>
  );
}
