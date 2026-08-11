package com.contentruck.hypofit.admin.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.notification.application.NotificationWriteService;
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
class AdminSupportServiceTest {

    @Mock
    private AdminSupportRepository repository;

    @Mock
    private NotificationWriteService notificationWriteService;

    @Test
    void updateStatusRecordsAuditAndReturnsHydratedView() {
        UUID actorUserId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        AdminSupportRepository.SupportTicketRecord current = ticket(ticketId, "open");
        AdminSupportRepository.SupportTicketRecord updated = ticket(ticketId, "resolved");
        AdminSupportRepository.SupportTicketEventRecord event = event(ticketId, actorUserId, "status_changed", "resolved");

        when(repository.findTicket(ticketId)).thenReturn(Optional.of(current));
        when(repository.updateStatus(ticketId, actorUserId, "open", "resolved", "처리 완료"))
                .thenReturn(updated);
        when(repository.listTicketEvents(List.of(ticketId))).thenReturn(Map.of(ticketId, List.of(event)));

        AdminSupportService service = new AdminSupportService(repository, notificationWriteService);
        AdminSupportService.AdminSupportTicketView view = service.updateStatus(
                actorUserId,
                ticketId,
                new AdminSupportService.AdminSupportStatusUpdateCommand("resolved", "처리 완료")
        );

        assertThat(view.ticket().status()).isEqualTo("resolved");
        assertThat(view.events()).containsExactly(event);
        verify(repository).recordAuditEvent(
                eq(actorUserId),
                eq("operator"),
                eq("support_ticket_status_changed"),
                eq("support_ticket"),
                eq(ticketId),
                eq("처리 완료"),
                anyMap()
        );
    }

    @Test
    void addReplyCreatesVisibleNotificationWhenRequested() {
        UUID actorUserId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        AdminSupportRepository.SupportTicketRecord current = ticket(ticketId, "in_review");
        AdminSupportRepository.SupportTicketEventRecord replyEvent = event(ticketId, actorUserId, "operator_replied", "in_review");

        when(repository.findTicket(ticketId)).thenReturn(Optional.of(current));
        when(repository.addReply(ticketId, actorUserId, "확인 후 답변드릴게요.", true, "in_review"))
                .thenReturn(replyEvent);

        AdminSupportService service = new AdminSupportService(repository, notificationWriteService);
        AdminSupportRepository.SupportTicketEventRecord result = service.addReply(
                actorUserId,
                ticketId,
                new AdminSupportService.AdminSupportReplyCommand("확인 후 답변드릴게요.", true)
        );

        assertThat(result).isEqualTo(replyEvent);
        verify(notificationWriteService).createNotification(
                eq(current.userId()),
                eq("support_replied"),
                eq("문의 답변이 도착했어요"),
                eq("확인 후 답변드릴게요."),
                eq("support_ticket"),
                eq(ticketId),
                eq(Map.of())
        );
        verify(repository).recordAuditEvent(
                eq(actorUserId),
                eq("operator"),
                eq("support_ticket_replied"),
                eq("support_ticket"),
                eq(ticketId),
                eq(null),
                anyMap()
        );
    }

    private AdminSupportRepository.SupportTicketRecord ticket(UUID ticketId, String status) {
        return new AdminSupportRepository.SupportTicketRecord(
                ticketId,
                UUID.randomUUID(),
                "inquiry",
                "account",
                "로그인 문의",
                "로그인이 실패해요.",
                "user@example.com",
                null,
                null,
                status,
                null,
                Map.of(),
                OffsetDateTime.of(2026, 7, 31, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 7, 31, 12, 5, 0, 0, ZoneOffset.UTC)
        );
    }

    private AdminSupportRepository.SupportTicketEventRecord event(
            UUID ticketId,
            UUID actorUserId,
            String eventType,
            String toStatus
    ) {
        return new AdminSupportRepository.SupportTicketEventRecord(
                UUID.randomUUID(),
                ticketId,
                actorUserId,
                "operator",
                eventType,
                "open",
                toStatus,
                "확인 후 답변드릴게요.",
                Map.of("visible_to_user", true),
                OffsetDateTime.of(2026, 7, 31, 12, 10, 0, 0, ZoneOffset.UTC)
        );
    }
}
