package com.contentruck.hypofit.admin.service;


import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminModerationService {

    private static final Set<String> USER_DEACTIVATION_ACTIONS = Set.of("block", "remove");
    private static final Set<String> USER_REACTIVATION_ACTIONS = Set.of("unblock", "restore");
    private static final Set<String> CHAT_MESSAGE_VISIBILITY_ACTIONS = Set.of("hide", "remove", "restore");

    private final AdminModerationRepository repository;

    public AdminModerationService(AdminModerationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ModerationActionView createAction(UUID actorUserId, AdminModerationActionCommand command) {
        EffectSnapshot effect = applyTargetEffect(command);

        AdminModerationRepository.ModerationActionRecord action = repository.createModerationAction(
                actorUserId,
                command.targetType(),
                command.targetId(),
                command.action(),
                command.reason(),
                command.sourceTicketId(),
                command.metadata()
        );

        repository.recordAuditEvent(
                actorUserId,
                "operator",
                "moderation_" + command.action(),
                command.targetType(),
                command.targetId(),
                effect.before(),
                effect.after(),
                command.reason(),
                auditMetadata(action.id(), command.sourceTicketId())
        );

        return new ModerationActionView(
                action.id(),
                action.actorUserId(),
                action.targetType(),
                action.targetId(),
                action.action(),
                action.reason(),
                action.sourceTicketId(),
                action.metadata(),
                action.createdAt()
        );
    }

    private EffectSnapshot applyTargetEffect(AdminModerationActionCommand command) {
        return switch (command.targetType()) {
            case "user" -> applyUserEffect(command);
            case "application" -> applyApplicationEffect(command);
            case "chat_message" -> applyChatMessageEffect(command);
            case "interview_post" -> applyInterviewPostEffect(command);
            case "session" -> applyInterviewSessionEffect(command);
            default -> EffectSnapshot.none();
        };
    }

    private EffectSnapshot applyUserEffect(AdminModerationActionCommand command) {
        if (!USER_DEACTIVATION_ACTIONS.contains(command.action()) && !USER_REACTIVATION_ACTIONS.contains(command.action())) {
            return EffectSnapshot.none();
        }

        AdminModerationRepository.UserTargetRecord user = repository.findUser(command.targetId())
                .orElseThrow(() -> new AdminModerationTargetNotFoundException("User not found"));

        if (user.deletedAt() != null && USER_REACTIVATION_ACTIONS.contains(command.action())) {
            throw new AdminModerationConflictException("Deleted users cannot be restored through moderation");
        }

        Map<String, Object> before = serializeUser(user.deactivatedAt(), user.deletedAt());
        OffsetDateTime nextDeactivatedAt = USER_DEACTIVATION_ACTIONS.contains(command.action())
                ? user.deactivatedAt() == null ? now() : user.deactivatedAt()
                : null;

        repository.updateUserDeactivated(command.targetId(), nextDeactivatedAt);
        return new EffectSnapshot(before, serializeUser(nextDeactivatedAt, user.deletedAt()));
    }

    private EffectSnapshot applyChatMessageEffect(AdminModerationActionCommand command) {
        if (!CHAT_MESSAGE_VISIBILITY_ACTIONS.contains(command.action())) {
            return EffectSnapshot.none();
        }

        AdminModerationRepository.ChatMessageTargetRecord message = repository.findChatMessage(command.targetId())
                .orElseThrow(() -> new AdminModerationTargetNotFoundException("Chat message not found"));

        Map<String, Object> before = serializeChatMessage(message.hiddenAt(), message.hiddenReason());
        OffsetDateTime nextHiddenAt = "restore".equals(command.action()) ? null : now();
        String nextHiddenReason = "restore".equals(command.action()) ? null : command.reason();

        repository.updateChatMessageHidden(command.targetId(), nextHiddenAt, nextHiddenReason);
        return new EffectSnapshot(before, serializeChatMessage(nextHiddenAt, nextHiddenReason));
    }

    private EffectSnapshot applyInterviewPostEffect(AdminModerationActionCommand command) {
        String nextStatus = switch (command.action()) {
            case "hide" -> "hidden";
            case "remove" -> "removed";
            case "restore" -> "open";
            default -> null;
        };
        if (nextStatus == null) {
            return EffectSnapshot.none();
        }

        AdminModerationRepository.InterviewPostTargetRecord post = repository.findInterviewPost(command.targetId())
                .orElseThrow(() -> new AdminModerationTargetNotFoundException("Interview post not found"));

        repository.updateInterviewPostStatus(command.targetId(), nextStatus);
        return new EffectSnapshot(Map.of("status", post.status()), Map.of("status", nextStatus));
    }

    private EffectSnapshot applyApplicationEffect(AdminModerationActionCommand command) {
        String nextModerationStatus = switch (command.action()) {
            case "hide" -> "hidden";
            case "remove" -> "removed";
            case "restore" -> "visible";
            default -> null;
        };
        if (nextModerationStatus == null) {
            return EffectSnapshot.none();
        }

        AdminModerationRepository.ApplicationTargetRecord application = repository.findApplication(command.targetId())
                .orElseThrow(() -> new AdminModerationTargetNotFoundException("Application not found"));

        repository.updateApplicationModerationStatus(command.targetId(), nextModerationStatus);
        return new EffectSnapshot(
                statusModerationSnapshot(application.status(), application.moderationStatus()),
                statusModerationSnapshot(application.status(), nextModerationStatus)
        );
    }

    private EffectSnapshot applyInterviewSessionEffect(AdminModerationActionCommand command) {
        String nextModerationStatus = switch (command.action()) {
            case "hide" -> "hidden";
            case "remove" -> "removed";
            case "restore" -> "visible";
            default -> null;
        };
        if (nextModerationStatus == null) {
            return EffectSnapshot.none();
        }

        AdminModerationRepository.InterviewSessionTargetRecord session = repository.findInterviewSession(command.targetId())
                .orElseThrow(() -> new AdminModerationTargetNotFoundException("Interview session not found"));

        repository.updateInterviewSessionModerationStatus(command.targetId(), nextModerationStatus);
        return new EffectSnapshot(
                statusModerationSnapshot(session.status(), session.moderationStatus()),
                statusModerationSnapshot(session.status(), nextModerationStatus)
        );
    }

    private Map<String, Object> auditMetadata(UUID moderationActionId, UUID sourceTicketId) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("moderation_action_id", moderationActionId.toString());
        metadata.put("source_ticket_id", sourceTicketId == null ? null : sourceTicketId.toString());
        return metadata;
    }

    private Map<String, Object> serializeUser(OffsetDateTime deactivatedAt, OffsetDateTime deletedAt) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("deactivated_at", deactivatedAt == null ? null : deactivatedAt.toString());
        data.put("deleted_at", deletedAt == null ? null : deletedAt.toString());
        return data;
    }

    private Map<String, Object> serializeChatMessage(OffsetDateTime hiddenAt, String hiddenReason) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("hidden_at", hiddenAt == null ? null : hiddenAt.toString());
        data.put("hidden_reason", hiddenReason);
        return data;
    }

    private Map<String, Object> statusModerationSnapshot(String status, String moderationStatus) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", status);
        data.put("moderation_status", moderationStatus);
        return data;
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private record EffectSnapshot(
            Map<String, Object> before,
            Map<String, Object> after
    ) {
        private static EffectSnapshot none() {
            return new EffectSnapshot(null, null);
        }
    }

    public record ModerationActionView(
            UUID id,
            UUID actorUserId,
            String targetType,
            UUID targetId,
            String action,
            String reason,
            UUID sourceTicketId,
            Map<String, Object> metadata,
            OffsetDateTime createdAt
    ) {
    }
}
