package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Builds durable session-notification targets consistently across lifecycle services. */
@Service
public class SessionLifecycleNotificationService {

    private final SessionWorkflowRepository repository;
    private final NotificationWriteService notificationWriteService;

    public SessionLifecycleNotificationService(
            SessionWorkflowRepository repository,
            NotificationWriteService notificationWriteService
    ) {
        this.repository = repository;
        this.notificationWriteService = notificationWriteService;
    }

    public void notifyCounterpart(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String type,
            String title,
            String body,
            Map<String, Object> metadata
    ) {
        UUID counterpartUserId = actorUserId.equals(post.founderId()) ? application.respondentId() : post.founderId();
        if (counterpartUserId.equals(actorUserId)) {
            return;
        }
        NotificationTarget target = resolveTarget(session, application, post, metadata);
        notificationWriteService.createNotification(
                counterpartUserId,
                type,
                title,
                truncate(body),
                target.targetType(),
                target.targetId(),
                target.metadata()
        );
    }

    public void notifyParticipants(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            String type,
            String title,
            String body,
            Map<String, Object> metadata
    ) {
        NotificationTarget target = resolveTarget(session, application, post, metadata);
        java.util.LinkedHashSet<UUID> userIds = new java.util.LinkedHashSet<>();
        userIds.add(post.founderId());
        userIds.add(application.respondentId());
        for (UUID userId : userIds) {
            notificationWriteService.createNotification(
                    userId,
                    type,
                    title,
                    truncate(body),
                    target.targetType(),
                    target.targetId(),
                    target.metadata()
            );
        }
    }

    private NotificationTarget resolveTarget(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            Map<String, Object> metadata
    ) {
        Map<String, Object> notificationMetadata = new LinkedHashMap<>();
        if (metadata != null) {
            notificationMetadata.putAll(metadata);
        }
        notificationMetadata.putIfAbsent("application_id", application.id().toString());
        notificationMetadata.putIfAbsent("interview_post_id", post.id().toString());
        notificationMetadata.putIfAbsent("interview_title", post.title());
        notificationMetadata.putIfAbsent("session_id", session.id().toString());
        return repository.findChatRoomIdByApplicationId(application.id())
                .map(roomId -> {
                    notificationMetadata.put("chat_room_id", roomId.toString());
                    return new NotificationTarget("chat_room", roomId, notificationMetadata);
                })
                .orElseGet(() -> new NotificationTarget("interview_session", session.id(), notificationMetadata));
    }

    private String truncate(String body) {
        return body == null || body.length() <= 120 ? body : body.substring(0, 120);
    }

    private record NotificationTarget(String targetType, UUID targetId, Map<String, Object> metadata) {
    }
}
