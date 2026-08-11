package com.contentruck.hypofit.admin.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminModerationServiceTest {

    @Mock
    private AdminModerationRepository repository;

    @Test
    void hideChatMessageRecordsModerationActionAndAudit() {
        UUID actorUserId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        UUID actionId = UUID.randomUUID();

        when(repository.findChatMessage(messageId)).thenReturn(Optional.of(
                new AdminModerationRepository.ChatMessageTargetRecord(messageId, null, null)
        ));
        when(repository.createModerationAction(
                actorUserId,
                "chat_message",
                messageId,
                "hide",
                "개인정보 요구",
                null,
                Map.of("severity", "medium")
        )).thenReturn(actionRecord(actionId, actorUserId, "chat_message", messageId, "hide", "개인정보 요구", null, Map.of("severity", "medium")));

        AdminModerationService service = new AdminModerationService(repository);
        AdminModerationService.ModerationActionView result = service.createAction(
                actorUserId,
                new AdminModerationActionCommand(
                        "chat_message",
                        messageId,
                        "hide",
                        "개인정보 요구",
                        null,
                        Map.of("severity", "medium")
                )
        );

        assertThat(result.id()).isEqualTo(actionId);
        verify(repository).updateChatMessageHidden(eq(messageId), argThat(value -> value != null), eq("개인정보 요구"));
        verify(repository).recordAuditEvent(
                eq(actorUserId),
                eq("operator"),
                eq("moderation_hide"),
                eq("chat_message"),
                eq(messageId),
                argThat(before -> before != null && before.get("hidden_at") == null),
                argThat(after -> after != null && "개인정보 요구".equals(after.get("hidden_reason"))),
                eq("개인정보 요구"),
                argThat(metadata -> actionId.toString().equals(metadata.get("moderation_action_id")))
        );
    }

    @Test
    void blockUserUsesExistingDeactivatedTimestampWhenPresent() {
        UUID actorUserId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID actionId = UUID.randomUUID();
        OffsetDateTime deactivatedAt = OffsetDateTime.of(2026, 7, 31, 10, 0, 0, 0, ZoneOffset.UTC);

        when(repository.findUser(userId)).thenReturn(Optional.of(
                new AdminModerationRepository.UserTargetRecord(userId, deactivatedAt, null)
        ));
        when(repository.createModerationAction(
                actorUserId,
                "user",
                userId,
                "block",
                "반복 신고 누적",
                null,
                Map.of()
        )).thenReturn(actionRecord(actionId, actorUserId, "user", userId, "block", "반복 신고 누적", null, Map.of()));

        AdminModerationService service = new AdminModerationService(repository);
        service.createAction(
                actorUserId,
                new AdminModerationActionCommand("user", userId, "block", "반복 신고 누적", null, Map.of())
        );

        verify(repository).updateUserDeactivated(userId, deactivatedAt);
    }

    @Test
    void restoreDeletedUserRaisesConflictWithoutCreatingAction() {
        UUID actorUserId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(repository.findUser(userId)).thenReturn(Optional.of(
                new AdminModerationRepository.UserTargetRecord(
                        userId,
                        null,
                        OffsetDateTime.of(2026, 7, 31, 11, 0, 0, 0, ZoneOffset.UTC)
                )
        ));

        AdminModerationService service = new AdminModerationService(repository);

        assertThatThrownBy(() -> service.createAction(
                actorUserId,
                new AdminModerationActionCommand("user", userId, "restore", null, null, Map.of())
        )).isInstanceOf(AdminModerationConflictException.class)
                .hasMessageContaining("Deleted users cannot be restored through moderation");

        verify(repository, never()).createModerationAction(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void hideApplicationUpdatesModerationStatus() {
        UUID actorUserId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        UUID actionId = UUID.randomUUID();

        when(repository.findApplication(applicationId)).thenReturn(Optional.of(
                new AdminModerationRepository.ApplicationTargetRecord(applicationId, "selected", "visible")
        ));
        when(repository.createModerationAction(
                actorUserId,
                "application",
                applicationId,
                "hide",
                "운영 검토 중",
                null,
                Map.of()
        )).thenReturn(actionRecord(actionId, actorUserId, "application", applicationId, "hide", "운영 검토 중", null, Map.of()));

        AdminModerationService service = new AdminModerationService(repository);
        AdminModerationService.ModerationActionView result = service.createAction(
                actorUserId,
                new AdminModerationActionCommand("application", applicationId, "hide", "운영 검토 중", null, Map.of())
        );

        assertThat(result.id()).isEqualTo(actionId);
        verify(repository).updateApplicationModerationStatus(applicationId, "hidden");
    }

    @Test
    void removeInterviewSessionUpdatesModerationStatus() {
        UUID actorUserId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID actionId = UUID.randomUUID();

        when(repository.findInterviewSession(sessionId)).thenReturn(Optional.of(
                new AdminModerationRepository.InterviewSessionTargetRecord(sessionId, "scheduled", "visible")
        ));
        when(repository.createModerationAction(
                actorUserId,
                "session",
                sessionId,
                "remove",
                "운영 정책 위반",
                null,
                Map.of()
        )).thenReturn(actionRecord(actionId, actorUserId, "session", sessionId, "remove", "운영 정책 위반", null, Map.of()));

        AdminModerationService service = new AdminModerationService(repository);
        AdminModerationService.ModerationActionView result = service.createAction(
                actorUserId,
                new AdminModerationActionCommand("session", sessionId, "remove", "운영 정책 위반", null, Map.of())
        );

        assertThat(result.id()).isEqualTo(actionId);
        verify(repository).updateInterviewSessionModerationStatus(sessionId, "removed");
    }

    @Test
    void chatRoomActionWithoutEffectStillCreatesModerationAction() {
        UUID actorUserId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        UUID actionId = UUID.randomUUID();

        when(repository.createModerationAction(
                actorUserId,
                "chat_room",
                roomId,
                "warn",
                null,
                null,
                Map.of("scope", "thread")
        )).thenReturn(actionRecord(actionId, actorUserId, "chat_room", roomId, "warn", null, null, Map.of("scope", "thread")));

        AdminModerationService service = new AdminModerationService(repository);
        AdminModerationService.ModerationActionView result = service.createAction(
                actorUserId,
                new AdminModerationActionCommand("chat_room", roomId, "warn", null, null, Map.of("scope", "thread"))
        );

        assertThat(result.id()).isEqualTo(actionId);
        verify(repository).createModerationAction(actorUserId, "chat_room", roomId, "warn", null, null, Map.of("scope", "thread"));
        verify(repository, never()).findChatMessage(any());
    }

    private AdminModerationRepository.ModerationActionRecord actionRecord(
            UUID actionId,
            UUID actorUserId,
            String targetType,
            UUID targetId,
            String action,
            String reason,
            UUID sourceTicketId,
            Map<String, Object> metadata
    ) {
        return new AdminModerationRepository.ModerationActionRecord(
                actionId,
                actorUserId,
                targetType,
                targetId,
                action,
                reason,
                sourceTicketId,
                metadata,
                OffsetDateTime.of(2026, 7, 31, 12, 0, 0, 0, ZoneOffset.UTC)
        );
    }
}
