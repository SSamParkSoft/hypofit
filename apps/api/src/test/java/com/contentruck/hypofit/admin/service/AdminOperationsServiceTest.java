package com.contentruck.hypofit.admin.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.notification.service.NotificationReadModel;
import com.contentruck.hypofit.push.service.PushDispatchService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminOperationsServiceTest {

    @Mock
    private AdminOperationsRepository repository;

    @Mock
    private NotificationWriteService notificationWriteService;

    @Mock
    private PushDispatchService pushDispatchService;

    @Test
    void getSummaryAggregatesCountsAndHealth() {
        when(repository.summarizeSupportStatuses()).thenReturn(List.of(
                new AdminOperationsRepository.SupportStatusCount("inquiry", "open", 2),
                new AdminOperationsRepository.SupportStatusCount("report", "in_review", 3)
        ));
        when(repository.countOpenAccountDeletionRequests()).thenReturn(4L);
        when(repository.isDatabaseAvailable()).thenReturn(false);

        AdminOperationsService service = new AdminOperationsService(repository, notificationWriteService, pushDispatchService);
        AdminOperationsService.AdminSummaryView summary = service.getSummary();

        assertThat(summary.support().open()).isEqualTo(2);
        assertThat(summary.support().inReview()).isEqualTo(3);
        assertThat(summary.support().reportsOpen()).isEqualTo(3);
        assertThat(summary.support().accountDeletionOpen()).isEqualTo(4);
        assertThat(summary.health().database()).isEqualTo("unavailable");
        assertThat(summary.health().push()).isEqualTo("check_ready_endpoint");
    }

    @Test
    void createTestNotificationDispatchesPendingDeliveriesWhenRequested() {
        UUID userId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        NotificationReadModel notification = new NotificationReadModel(
                UUID.randomUUID(),
                userId,
                "support_replied",
                "문의 답변 테스트예요",
                "문의 답변 알림 라우팅을 확인해 주세요.",
                "support_ticket",
                targetId,
                Map.of("source", "admin_test_notification"),
                null,
                OffsetDateTime.of(2026, 7, 31, 10, 0, 0, 0, ZoneOffset.UTC)
        );
        when(repository.findUserByEmail("admin@example.com")).thenReturn(Optional.of(
                new AdminOperationsRepository.UserPreviewRecord(
                        userId,
                        "admin@example.com",
                        "운영자",
                        "both",
                        "01012345678",
                        null,
                        null
                )
        ));
        when(notificationWriteService.createNotification(
                eq(userId),
                eq("support_replied"),
                eq("문의 답변 테스트예요"),
                eq("문의 답변 알림 라우팅을 확인해 주세요."),
                eq("support_ticket"),
                eq(targetId),
                anyMap()
        )).thenReturn(notification);
        when(pushDispatchService.dispatchPendingDeliveries(null))
                .thenReturn(new PushDispatchService.PushDispatchResult(2, 1, 0, 0, 1));

        AdminOperationsService service = new AdminOperationsService(repository, notificationWriteService, pushDispatchService);
        AdminOperationsService.AdminTestNotificationView result = service.createTestNotification(
                new AdminOperationsService.AdminTestNotificationCommand(
                        "admin@example.com",
                        "support_replied",
                        "support_ticket",
                        targetId,
                        true
                )
        );

        assertThat(result.notification()).isEqualTo(notification);
        assertThat(result.dispatchResult()).isNotNull();
        assertThat(result.dispatchResult().processed()).isEqualTo(2);
        assertThat(result.dispatchResult().sent()).isEqualTo(1);
        assertThat(result.dispatchResult().skipped()).isEqualTo(1);
    }

    @Test
    void dispatchPendingPushDeliveriesMapsPushServiceResult() {
        when(pushDispatchService.dispatchPendingDeliveries(null))
                .thenReturn(new PushDispatchService.PushDispatchResult(3, 1, 1, 0, 1));

        AdminOperationsService service = new AdminOperationsService(repository, notificationWriteService, pushDispatchService);
        AdminOperationsService.PushDispatchResultView result = service.dispatchPendingPushDeliveries();

        assertThat(result.processed()).isEqualTo(3);
        assertThat(result.sent()).isEqualTo(1);
        assertThat(result.failed()).isEqualTo(1);
        assertThat(result.skipped()).isEqualTo(1);
    }
}
