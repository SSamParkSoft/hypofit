package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewSessionReadModel;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates and reschedules interview sessions without changing their public workflow contract. */
@Service
public class SessionSchedulingService {

    private final SessionWorkflowRepository repository;
    private final SessionWorkflowAccessService accessService;
    private final AuditWriteService auditWriteService;
    private final SessionLifecycleNotificationService notificationService;

    public SessionSchedulingService(
            SessionWorkflowRepository repository,
            SessionWorkflowAccessService accessService,
            AuditWriteService auditWriteService,
            SessionLifecycleNotificationService notificationService
    ) {
        this.repository = repository;
        this.accessService = accessService;
        this.auditWriteService = auditWriteService;
        this.notificationService = notificationService;
    }

    @Transactional
    public InterviewSessionReadModel createSession(
            UUID actorUserId,
            UUID applicationId,
            OffsetDateTime scheduledAt,
            String meetingType,
            String meetingUrl,
            String place
    ) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        ApplicationContext context = requireApplicationContext(applicationId);
        if (!context.post().founderId().equals(user.id())) {
            throw forbidden("Forbidden");
        }
        if (!"selected".equals(context.application().status())) {
            throw badRequest("Only selected applications can be scheduled");
        }
        return createSession(context.application(), context.post(), scheduledAt, meetingType, meetingUrl, place);
    }

    @Transactional
    public InterviewSessionReadModel createSession(
            ApplicationRecord application,
            InterviewPostRecord post,
            OffsetDateTime scheduledAt,
            String meetingType,
            String meetingUrl,
            String place
    ) {
        ensureInterviewRecruitmentType(post, "session scheduling");
        ApplicationContext locked = repository.lockApplicationContext(application.id())
                .orElseThrow(() -> notFound("Application not found"));
        if (!"selected".equals(locked.application().status())) {
            throw conflict("Only selected applications can be scheduled");
        }
        if (repository.hasScheduledVisibleSessionForApplication(locked.application().id())) {
            throw conflict("A scheduled session already exists for this application");
        }

        InterviewSessionRecord saved = repository.saveSession(new InterviewSessionRecord(
                UUID.randomUUID(),
                locked.application().id(),
                scheduledAt,
                meetingType,
                meetingUrl,
                place,
                "scheduled",
                "visible"
        ));
        return toReadModel(saved);
    }

    @Transactional
    public InterviewSessionReadModel updateSession(
            UUID actorUserId,
            UUID sessionId,
            String reason,
            OffsetDateTime scheduledAt,
            boolean scheduledAtPresent,
            String meetingType,
            boolean meetingTypePresent,
            String meetingUrl,
            boolean meetingUrlPresent,
            String place,
            boolean placePresent
    ) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        if (!context.post().founderId().equals(user.id())) {
            throw forbidden("Only the post owner can update a session");
        }
        return updateSession(
                context.session(), context.application(), context.post(), user.id(), "founder", reason,
                scheduledAt, scheduledAtPresent, meetingType, meetingTypePresent,
                meetingUrl, meetingUrlPresent, place, placePresent
        );
    }

    @Transactional
    public InterviewSessionReadModel updateSession(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            String reason,
            OffsetDateTime scheduledAt,
            boolean scheduledAtPresent,
            String meetingType,
            boolean meetingTypePresent,
            String meetingUrl,
            boolean meetingUrlPresent,
            String place,
            boolean placePresent
    ) {
        ensureInterviewRecruitmentType(post, "session updates");
        if (!"scheduled".equals(interviewSession.status())) {
            throw badRequest("Only scheduled sessions can be updated");
        }

        OffsetDateTime nextScheduledAt = scheduledAtPresent ? scheduledAt : interviewSession.scheduledAt();
        String nextMeetingType = meetingTypePresent ? meetingType : interviewSession.meetingType();
        String nextMeetingUrl = meetingUrlPresent ? normalizeOptionalText(meetingUrl) : interviewSession.meetingUrl();
        String nextPlace = placePresent ? normalizeOptionalText(place) : interviewSession.place();
        if (meetingTypePresent && "online".equals(nextMeetingType) && !placePresent) {
            nextPlace = null;
        }
        if (meetingTypePresent && "offline".equals(nextMeetingType) && !meetingUrlPresent) {
            nextMeetingUrl = null;
        }

        String normalizedReason = normalizeOptionalText(reason);
        Map<String, Object> before = serializeSession(interviewSession);
        InterviewSessionRecord saved = repository.saveSession(new InterviewSessionRecord(
                interviewSession.id(), interviewSession.applicationId(), nextScheduledAt, nextMeetingType,
                nextMeetingUrl, nextPlace, interviewSession.status(), interviewSession.moderationStatus()
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId, "user", "interview_session_rescheduled", "interview_session", saved.id(),
                before, serializeSession(saved), normalizedReason,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "actor_role", actorRole
                )
        ));
        notificationService.notifyCounterpart(
                saved, application, post, actorUserId, "session_rescheduled", "인터뷰 일정이 변경됐어요",
                "상대방이 인터뷰 일정을 변경했어요. 새 일정을 확인해보세요.", Map.of("actor_role", actorRole)
        );
        return toReadModel(saved);
    }

    @Transactional
    public InterviewSessionReadModel cancelSession(UUID actorUserId, UUID sessionId, String reason) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return cancelSession(context.session(), context.application(), context.post(), user.id(), actorRole, reason);
    }

    @Transactional
    public InterviewSessionReadModel cancelSession(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            String reason
    ) {
        ensureInterviewRecruitmentType(post, "session cancellation");
        if (!"scheduled".equals(interviewSession.status())) {
            throw badRequest("Only scheduled sessions can be canceled");
        }
        Map<String, Object> before = serializeSession(interviewSession);
        if (!repository.updateScheduledSessionStatus(interviewSession.id(), "canceled")) {
            throw conflict("Interview session status has already changed");
        }
        InterviewSessionRecord refreshed = repository.findSessionContext(interviewSession.id())
                .map(SessionContext::session)
                .orElseThrow(() -> notFound("Session not found"));
        String normalizedReason = normalizeOptionalText(reason);
        auditWriteService.record(new AuditEventCommand(
                actorUserId, "user", "interview_session_canceled", "interview_session", refreshed.id(),
                before, serializeSession(refreshed), normalizedReason,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "actor_role", actorRole
                )
        ));
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("actor_role", actorRole);
        metadata.put("reason", normalizedReason);
        notificationService.notifyCounterpart(
                refreshed, application, post, actorUserId, "session_canceled", "인터뷰 일정이 취소됐어요",
                normalizedReason == null ? "상대방이 인터뷰 일정을 취소했어요." : normalizedReason, metadata
        );
        return toReadModel(refreshed);
    }

    private ApplicationContext requireApplicationContext(UUID applicationId) {
        ApplicationContext context = accessService.getApplicationContext(applicationId)
                .orElseThrow(() -> notFound("Application not found"));
        ensureInterviewRecruitmentType(context.post(), "session scheduling");
        return context;
    }

    private SessionContext requireSessionContext(UUID sessionId) {
        SessionContext context = accessService.getSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post(), "session workflow");
        return context;
    }

    private Map<String, Object> serializeSession(InterviewSessionRecord session) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("status", session.status());
        metadata.put("scheduled_at", session.scheduledAt().toString());
        metadata.put("meeting_type", session.meetingType());
        metadata.put("meeting_url", session.meetingUrl());
        metadata.put("place", session.place());
        return metadata;
    }

    private InterviewSessionReadModel toReadModel(InterviewSessionRecord session) {
        return new InterviewSessionReadModel(
                session.id(), session.applicationId(), session.scheduledAt(), session.meetingType(),
                session.meetingUrl(), session.place(), session.status(), null
        );
    }

    private void ensureInterviewRecruitmentType(InterviewPostRecord post, String action) {
        if (!"interview".equals(post.recruitmentType())) {
            throw new HypofitException(
                    "recruitment_type_action_not_allowed",
                    "이 모집 형식에서는 사용할 수 없는 기능이에요.",
                    HttpStatus.BAD_REQUEST.value(),
                    "Only interview recruitment supports " + action + ": " + post.recruitmentType()
            );
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private HypofitException badRequest(String detail) {
        return new HypofitException(detailToCode(detail), detail, HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException forbidden(String detail) {
        return new HypofitException("permission_denied", "권한이 없어요.", HttpStatus.FORBIDDEN.value(), detail);
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private String detailToCode(String detail) {
        String normalized = detail.chars()
                .mapToObj(character -> Character.isLetterOrDigit(character)
                        ? String.valueOf(Character.toLowerCase((char) character))
                        : "_")
                .reduce("", String::concat)
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
        return normalized.isBlank() ? "error" : normalized;
    }
}
