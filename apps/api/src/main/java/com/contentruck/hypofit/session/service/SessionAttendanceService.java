package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.AttendanceRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.RewardConfirmationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionReadModels.AttendanceRecordReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.ConfirmAttendanceReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewSessionReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Completes interviews through mutual attendance confirmation. */
@Service
public class SessionAttendanceService {

    private final SessionWorkflowRepository repository;
    private final SessionWorkflowAccessService accessService;
    private final AuditWriteService auditWriteService;
    private final SessionLifecycleNotificationService notificationService;

    public SessionAttendanceService(
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
    public InterviewSessionReadModel completeSession(UUID actorUserId, UUID sessionId) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return completeSession(context.session(), context.application(), context.post(), user.id(), actorRole);
    }

    @Transactional
    public InterviewSessionReadModel completeSession(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        return confirmAttendance(session, application, post, actorUserId, actorRole).session();
    }

    @Transactional
    public ConfirmAttendanceReadModel confirmAttendance(UUID actorUserId, UUID sessionId) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return confirmAttendance(context.session(), context.application(), context.post(), user.id(), actorRole);
    }

    @Transactional
    public ConfirmAttendanceReadModel confirmAttendance(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        SessionContext locked = requireLockedSessionContext(interviewSession.id());
        interviewSession = locked.session();
        application = locked.application();
        post = locked.post();
        ensureScheduled(interviewSession, "confirmed");
        Map<String, Object> before = serializeSession(interviewSession);

        AttendanceRecord attendance = repository.findAttendanceRecord(interviewSession.id())
                .orElse(new AttendanceRecord(
                        UUID.randomUUID(), interviewSession.id(), false, false,
                        null, null, null, null, null, null
                ));
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        boolean founderConfirmed = attendance.founderConfirmed();
        boolean respondentConfirmed = attendance.respondentConfirmed();
        OffsetDateTime founderConfirmedAt = attendance.founderConfirmedAt();
        OffsetDateTime respondentConfirmedAt = attendance.respondentConfirmedAt();
        if ("founder".equals(actorRole)) {
            founderConfirmed = true;
            if (founderConfirmedAt == null) {
                founderConfirmedAt = now;
            }
        } else {
            respondentConfirmed = true;
            if (respondentConfirmedAt == null) {
                respondentConfirmedAt = now;
            }
        }

        boolean completedNow = founderConfirmed && respondentConfirmed && "scheduled".equals(interviewSession.status());
        AttendanceRecord savedAttendance = repository.saveAttendanceRecord(new AttendanceRecord(
                attendance.id(), attendance.sessionId(), founderConfirmed, respondentConfirmed,
                founderConfirmedAt, respondentConfirmedAt,
                completedNow ? actorUserId : attendance.completedBy(),
                completedNow ? "mutual_confirmation" : attendance.completionSource(),
                attendance.noShowParty(),
                completedNow ? (attendance.completedAt() == null ? now : attendance.completedAt()) : attendance.completedAt()
        ));

        InterviewSessionRecord savedSession = interviewSession;
        if (completedNow) {
            savedSession = repository.saveSession(withStatus(interviewSession, "completed"));
            if (!repository.updateApplicationStatusIfCurrent(application.id(), "completed", Set.of("selected"))) {
                throw conflict("Application status has already changed");
            }
            getOrCreateRewardConfirmation(savedSession, application, post);
            notificationService.notifyParticipants(
                    savedSession, application, post, "session_completed", "인터뷰가 완료됐어요",
                    "이제 사례비 지급 확인과 후기를 이어갈 수 있어요.", Map.of("actor_role", actorRole)
            );
        } else {
            notificationService.notifyCounterpart(
                    savedSession, application, post, actorUserId, "attendance_confirmation_requested", "만남 확인이 필요해요",
                    "상대가 인터뷰 진행을 확인했어요. 만남 여부를 확인해 주세요.", Map.of("actor_role", actorRole)
            );
        }

        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_session_attendance_confirmed",
                "interview_session",
                savedSession.id(),
                before,
                mergeSessionAudit(savedSession, savedAttendance),
                null,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "actor_role", actorRole,
                        "completed_now", completedNow
                )
        ));
        return new ConfirmAttendanceReadModel(toSessionReadModel(savedSession), toAttendanceReadModel(savedAttendance));
    }

    @Transactional
    public InterviewSessionReadModel markNoShow(UUID actorUserId, UUID sessionId, String noShowParty) {
        ActiveUser user = accessService.requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = accessService.authorizeParticipant(user, context.application(), context.post());
        return markNoShow(context.session(), context.application(), context.post(), user.id(), actorRole, noShowParty);
    }

    @Transactional
    public InterviewSessionReadModel markNoShow(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            String noShowParty
    ) {
        ensureInterviewRecruitmentType(post, "no-show handling");
        ensureScheduled(interviewSession, "marked as no-show");
        Map<String, Object> before = serializeSession(interviewSession);
        if (!repository.updateScheduledSessionStatus(interviewSession.id(), "no_show")) {
            throw conflict("Interview session status has already changed");
        }
        if (!repository.updateApplicationStatusIfCurrent(application.id(), "no_show", Set.of("selected"))) {
            throw conflict("Application status has already changed");
        }

        AttendanceRecord attendance = repository.findAttendanceRecord(interviewSession.id())
                .orElse(new AttendanceRecord(
                        UUID.randomUUID(), interviewSession.id(), false, false,
                        null, null, null, null, null, null
                ));
        repository.saveAttendanceRecord(new AttendanceRecord(
                attendance.id(), attendance.sessionId(), attendance.founderConfirmed(), attendance.respondentConfirmed(),
                attendance.founderConfirmedAt(), attendance.respondentConfirmedAt(), attendance.completedBy(),
                attendance.completionSource(), noShowParty, attendance.completedAt()
        ));

        SessionContext refreshedContext = repository.findSessionContext(interviewSession.id())
                .orElseThrow(() -> notFound("Session not found"));
        InterviewSessionRecord refreshed = refreshedContext.session();
        Map<String, Object> auditMetadata = new LinkedHashMap<>();
        auditMetadata.put("application_id", application.id().toString());
        auditMetadata.put("interview_post_id", post.id().toString());
        auditMetadata.put("actor_role", actorRole);
        auditMetadata.put("no_show_party", noShowParty);
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_session_no_show_marked",
                "interview_session",
                refreshed.id(),
                before,
                serializeSession(refreshed),
                null,
                auditMetadata
        ));
        notificationService.notifyParticipants(
                refreshed,
                refreshedContext.application(),
                refreshedContext.post(),
                "no_show_marked",
                "노쇼 상태가 기록됐어요",
                noShowNotificationBody(noShowParty),
                Map.of(
                        "actor_role", actorRole,
                        "no_show_party", noShowParty == null ? "" : noShowParty
                )
        );
        return toSessionReadModel(refreshed);
    }

    private SessionContext requireSessionContext(UUID sessionId) {
        SessionContext context = accessService.getSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post(), "session workflow");
        return context;
    }

    private SessionContext requireLockedSessionContext(UUID sessionId) {
        SessionContext context = repository.lockSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
        ensureInterviewRecruitmentType(context.post(), "session workflow");
        return context;
    }

    private RewardConfirmationRecord getOrCreateRewardConfirmation(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        return repository.findRewardConfirmation(session.id())
                .orElseGet(() -> repository.saveRewardConfirmation(new RewardConfirmationRecord(
                        UUID.randomUUID(), session.id(), application.id(), post.founderId(), application.respondentId(),
                        post.rewardAmount(), "pending", null, null, null, null, null, null
                )));
    }

    private InterviewSessionRecord withStatus(InterviewSessionRecord session, String status) {
        return new InterviewSessionRecord(
                session.id(), session.applicationId(), session.scheduledAt(), session.meetingType(), session.meetingUrl(),
                session.place(), status, session.moderationStatus()
        );
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

    private Map<String, Object> mergeSessionAudit(InterviewSessionRecord session, AttendanceRecord attendance) {
        Map<String, Object> metadata = new LinkedHashMap<>(serializeSession(session));
        metadata.put("founder_confirmed", attendance.founderConfirmed());
        metadata.put("respondent_confirmed", attendance.respondentConfirmed());
        return metadata;
    }

    private InterviewSessionReadModel toSessionReadModel(InterviewSessionRecord session) {
        return new InterviewSessionReadModel(
                session.id(), session.applicationId(), session.scheduledAt(), session.meetingType(), session.meetingUrl(),
                session.place(), session.status(), null
        );
    }

    private AttendanceRecordReadModel toAttendanceReadModel(AttendanceRecord attendance) {
        return new AttendanceRecordReadModel(
                attendance.sessionId(), attendance.founderConfirmed(), attendance.respondentConfirmed(),
                attendance.founderConfirmedAt(), attendance.respondentConfirmedAt(), attendance.completedAt(), attendance.noShowParty()
        );
    }

    private void ensureScheduled(InterviewSessionRecord session, String action) {
        if (!"scheduled".equals(session.status())) {
            throw badRequest("Only scheduled sessions can be " + action);
        }
    }

    private String noShowNotificationBody(String noShowParty) {
        if ("founder".equals(noShowParty)) {
            return "상대방이 창업자를 노쇼로 기록했어요.";
        }
        if ("respondent".equals(noShowParty)) {
            return "상대방이 참여자를 노쇼로 기록했어요.";
        }
        return "상대방이 인터뷰를 노쇼로 기록했어요.";
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

    private HypofitException badRequest(String detail) {
        return new HypofitException(toCode(detail), detail, HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private String toCode(String detail) {
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
