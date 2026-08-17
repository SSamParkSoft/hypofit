package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.AttendanceRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewReviewRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.RewardConfirmationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionContexts.StoredUser;
import com.contentruck.hypofit.session.service.SessionReadModels.ApplicationReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.AttendanceRecordReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.ConfirmAttendanceReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewReviewReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewSessionReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.RewardConfirmationReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.UserSummary;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionWorkflowService {

    private final SessionWorkflowRepository repository;
    private final AuditWriteService auditWriteService;
    private final NotificationWriteService notificationWriteService;

    public SessionWorkflowService(
            SessionWorkflowRepository repository,
            AuditWriteService auditWriteService,
            NotificationWriteService notificationWriteService
    ) {
        this.repository = repository;
        this.auditWriteService = auditWriteService;
        this.notificationWriteService = notificationWriteService;
    }

    @Transactional(readOnly = true)
    public ActiveUser requireActiveUser(UUID userId) {
        StoredUser user = repository.findUserById(userId)
                .orElseThrow(() -> forbidden("profile_missing", "프로필 설정이 필요해요.", "Hypofit profile is required"));

        if (user.deletedAt() != null) {
            throw forbidden("account_deleted", "삭제된 계정이에요.", "Account is inactive");
        }
        if (user.deactivatedAt() != null) {
            throw forbidden("account_deactivated", "비활성화된 계정이에요.", "Account is inactive");
        }

        return new ActiveUser(user.id(), user.role());
    }

    @Transactional(readOnly = true)
    public Optional<ApplicationContext> getApplicationContext(UUID applicationId) {
        return repository.findApplicationContext(applicationId);
    }

    @Transactional(readOnly = true)
    public Optional<SessionContext> getSessionContext(UUID sessionId) {
        return repository.findSessionContext(sessionId);
    }

    public void requireFounderRole(ActiveUser user) {
        if (!Set.of("founder", "both").contains(user.role())) {
            throw forbiddenDetail("Founder role required");
        }
    }

    public String authorizeParticipant(
            ActiveUser user,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        if (post.founderId().equals(user.id())) {
            requireFounderRole(user);
            return "founder";
        }
        if (application.respondentId().equals(user.id())) {
            if (!Set.of("founder", "respondent", "both").contains(user.role())) {
                throw forbiddenDetail("Interview participant role required");
            }
            return "respondent";
        }
        throw forbiddenDetail("Forbidden");
    }

    @Transactional(readOnly = true)
    public List<InterviewSessionReadModel> listSessions(UUID userId) {
        ActiveUser user = requireActiveUser(userId);
        return repository.listSessionRows(user.id())
                .stream()
                .map(row -> toSessionReadModel(row.session(), toApplicationReadModel(row.application(), row.respondent())))
                .toList();
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
        ActiveUser user = requireActiveUser(actorUserId);
        requireFounderRole(user);

        ApplicationContext context = requireApplicationContext(applicationId);
        if (!context.post().founderId().equals(user.id())) {
            throw forbiddenDetail("Forbidden");
        }
        if (!"selected".equals(context.application().status())) {
            throw badRequestDetail("Only selected applications can be scheduled");
        }

        return createSession(
                context.application(),
                context.post(),
                scheduledAt,
                meetingType,
                meetingUrl,
                place
        );
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
        ApplicationContext locked = repository.lockApplicationContext(application.id())
                .orElseThrow(() -> notFound("Application not found"));

        if (!"selected".equals(locked.application().status())) {
            throw conflictDetail("Only selected applications can be scheduled");
        }
        if (repository.hasScheduledVisibleSessionForApplication(locked.application().id())) {
            throw conflictDetail("A scheduled session already exists for this application");
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
        return toSessionReadModel(saved, null);
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
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return updateSession(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole,
                reason,
                scheduledAt,
                scheduledAtPresent,
                meetingType,
                meetingTypePresent,
                meetingUrl,
                meetingUrlPresent,
                place,
                placePresent
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
        ensureScheduled(interviewSession, "updated");

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
                interviewSession.id(),
                interviewSession.applicationId(),
                nextScheduledAt,
                nextMeetingType,
                nextMeetingUrl,
                nextPlace,
                interviewSession.status(),
                interviewSession.moderationStatus()
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_session_rescheduled",
                "interview_session",
                saved.id(),
                before,
                serializeSession(saved),
                normalizedReason,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "actor_role", actorRole
                )
        ));
        notifyCounterpart(
                saved,
                application,
                post,
                actorUserId,
                "session_rescheduled",
                "인터뷰 일정이 변경됐어요",
                "상대방이 인터뷰 일정을 변경했어요. 새 일정을 확인해보세요.",
                Map.of("actor_role", actorRole)
        );
        return toSessionReadModel(saved, null);
    }

    @Transactional
    public InterviewSessionReadModel completeSession(
            UUID actorUserId,
            UUID sessionId
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return completeSession(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole
        );
    }

    @Transactional
    public InterviewSessionReadModel completeSession(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        return confirmAttendance(interviewSession, application, post, actorUserId, actorRole).session();
    }

    @Transactional
    public ConfirmAttendanceReadModel confirmAttendance(
            UUID actorUserId,
            UUID sessionId
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return confirmAttendance(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole
        );
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
                        UUID.randomUUID(),
                        interviewSession.id(),
                        false,
                        false,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
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
                attendance.id(),
                attendance.sessionId(),
                founderConfirmed,
                respondentConfirmed,
                founderConfirmedAt,
                respondentConfirmedAt,
                completedNow ? actorUserId : attendance.completedBy(),
                completedNow ? "mutual_confirmation" : attendance.completionSource(),
                attendance.noShowParty(),
                completedNow ? (attendance.completedAt() == null ? now : attendance.completedAt()) : attendance.completedAt()
        ));

        InterviewSessionRecord savedSession = interviewSession;
        if (completedNow) {
            savedSession = repository.saveSession(withStatus(interviewSession, "completed"));
            boolean updated = repository.updateApplicationStatusIfCurrent(
                    application.id(),
                    "completed",
                    Set.of("selected")
            );
            if (!updated) {
                throw conflictDetail("Application status has already changed");
            }
            getOrCreateRewardConfirmation(savedSession, application, post);
            notifySessionParticipants(
                    savedSession,
                    application,
                    post,
                    "session_completed",
                    "인터뷰가 완료됐어요",
                    "이제 사례비 지급 확인과 후기를 이어갈 수 있어요.",
                    Map.of("actor_role", actorRole)
            );
        } else {
            notifyCounterpart(
                    savedSession,
                    application,
                    post,
                    actorUserId,
                    "attendance_confirmation_requested",
                    "만남 확인이 필요해요",
                    "상대가 인터뷰 진행을 확인했어요. 만남 여부를 확인해 주세요.",
                    Map.of("actor_role", actorRole)
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

        return new ConfirmAttendanceReadModel(
                toSessionReadModel(savedSession, null),
                toAttendanceReadModel(savedAttendance)
        );
    }

    @Transactional
    public RewardConfirmationReadModel markRewardPaid(
            UUID actorUserId,
            UUID sessionId
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return markRewardPaid(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole
        );
    }

    @Transactional
    public RewardConfirmationReadModel markRewardPaid(
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

        ensureFounderActor(actorRole);
        ensureCompleted(interviewSession, "mark reward paid");

        RewardConfirmationRecord reward = getOrCreateRewardConfirmation(interviewSession, application, post);
        if (!Set.of("pending", "founder_marked_paid").contains(reward.status())) {
            throw conflictDetail("Reward status has already changed");
        }
        Map<String, Object> before = serializeReward(reward);
        if ("pending".equals(reward.status())) {
            reward = repository.saveRewardConfirmation(new RewardConfirmationRecord(
                    reward.id(),
                    reward.sessionId(),
                    reward.applicationId(),
                    reward.founderId(),
                    reward.respondentId(),
                    reward.amount(),
                    "founder_marked_paid",
                    OffsetDateTime.now(ZoneOffset.UTC),
                    reward.respondentConfirmedAt(),
                    reward.disputedAt(),
                    reward.disputeReason(),
                    reward.createdAt(),
                    reward.updatedAt()
            ));
        }
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "reward_marked_paid",
                "reward_confirmation",
                reward.id(),
                before,
                serializeReward(reward),
                null,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "session_id", interviewSession.id().toString(),
                        "actor_role", actorRole
                )
        ));
        notifyCounterpart(
                interviewSession,
                application,
                post,
                post.founderId(),
                "reward_marked_paid",
                "사례비 지급 확인이 필요해요",
                "창업자가 사례비 지급을 완료했다고 표시했어요. 수령 여부를 확인해 주세요.",
                Map.of("reward_id", reward.id().toString(), "actor_role", actorRole)
        );

        return toRewardReadModel(reward);
    }

    @Transactional
    public RewardConfirmationReadModel confirmRewardReceived(
            UUID actorUserId,
            UUID sessionId
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return confirmRewardReceived(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole
        );
    }

    @Transactional
    public RewardConfirmationReadModel confirmRewardReceived(
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

        ensureRespondentActor(actorRole);
        ensureCompleted(interviewSession, "confirm reward");

        RewardConfirmationRecord reward = repository.findRewardConfirmation(interviewSession.id())
                .orElseThrow(() -> conflictDetail("Reward is not ready for confirmation"));
        if (!"founder_marked_paid".equals(reward.status())) {
            throw conflictDetail("Reward is not ready for confirmation");
        }
        Map<String, Object> before = serializeReward(reward);

        RewardConfirmationRecord saved = repository.saveRewardConfirmation(new RewardConfirmationRecord(
                reward.id(),
                reward.sessionId(),
                reward.applicationId(),
                reward.founderId(),
                reward.respondentId(),
                reward.amount(),
                "respondent_confirmed",
                reward.founderMarkedPaidAt(),
                OffsetDateTime.now(ZoneOffset.UTC),
                reward.disputedAt(),
                reward.disputeReason(),
                reward.createdAt(),
                reward.updatedAt()
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "reward_received_confirmed",
                "reward_confirmation",
                saved.id(),
                before,
                serializeReward(saved),
                null,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "session_id", interviewSession.id().toString(),
                        "actor_role", actorRole
                )
        ));
        notifyCounterpart(
                interviewSession,
                application,
                post,
                actorUserId,
                "reward_confirmed",
                "사례비 수령이 확인됐어요",
                "상대가 사례비 수령을 확인했어요. 후기를 남겨주세요.",
                Map.of("reward_id", saved.id().toString(), "actor_role", actorRole)
        );
        return toRewardReadModel(saved);
    }

    @Transactional
    public RewardConfirmationReadModel disputeReward(
            UUID actorUserId,
            UUID sessionId,
            String reason
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return disputeReward(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole,
                reason
        );
    }

    @Transactional
    public RewardConfirmationReadModel disputeReward(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            String reason
    ) {
        SessionContext locked = requireLockedSessionContext(interviewSession.id());
        interviewSession = locked.session();
        application = locked.application();
        post = locked.post();

        ensureRespondentActor(actorRole);
        ensureCompleted(interviewSession, "dispute reward");

        RewardConfirmationRecord reward = repository.findRewardConfirmation(interviewSession.id())
                .orElseThrow(() -> conflictDetail("Reward is not ready for dispute"));
        if (!"founder_marked_paid".equals(reward.status())) {
            throw conflictDetail("Reward is not ready for dispute");
        }
        String normalizedReason = normalizeOptionalText(reason);
        Map<String, Object> before = serializeReward(reward);

        RewardConfirmationRecord saved = repository.saveRewardConfirmation(new RewardConfirmationRecord(
                reward.id(),
                reward.sessionId(),
                reward.applicationId(),
                reward.founderId(),
                reward.respondentId(),
                reward.amount(),
                "disputed",
                reward.founderMarkedPaidAt(),
                reward.respondentConfirmedAt(),
                OffsetDateTime.now(ZoneOffset.UTC),
                normalizedReason,
                reward.createdAt(),
                reward.updatedAt()
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "reward_disputed",
                "reward_confirmation",
                saved.id(),
                before,
                serializeReward(saved),
                normalizedReason,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "session_id", interviewSession.id().toString(),
                        "actor_role", actorRole
                )
        ));
        notifyCounterpart(
                interviewSession,
                application,
                post,
                actorUserId,
                "reward_disputed",
                "사례비 확인 문제가 접수됐어요",
                "상대가 사례비 수령에 문제가 있다고 표시했어요. 채팅에서 확인해 주세요.",
                Map.of("reward_id", saved.id().toString(), "actor_role", actorRole)
        );
        return toRewardReadModel(saved);
    }

    @Transactional
    public InterviewReviewReadModel createReview(
            UUID actorUserId,
            UUID sessionId,
            int rating,
            List<String> tags,
            String comment
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return createReview(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole,
                rating,
                tags,
                comment
        );
    }

    @Transactional
    public InterviewReviewReadModel createReview(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole,
            int rating,
            List<String> tags,
            String comment
    ) {
        SessionContext locked = requireLockedSessionContext(interviewSession.id());
        interviewSession = locked.session();
        application = locked.application();
        post = locked.post();

        ensureCompleted(interviewSession, "review");

        if (repository.findReview(interviewSession.id(), actorUserId).isPresent()) {
            throw conflictDetail("Review already exists");
        }

        InterviewReviewRecord saved = repository.saveReview(new InterviewReviewRecord(
                UUID.randomUUID(),
                interviewSession.id(),
                actorUserId,
                "founder".equals(actorRole) ? application.respondentId() : post.founderId(),
                actorRole,
                rating,
                normalizeTags(tags),
                normalizeOptionalText(comment),
                "private",
                null,
                null
        ));
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_review_created",
                "interview_review",
                saved.id(),
                null,
                Map.of(
                        "session_id", interviewSession.id().toString(),
                        "reviewer_role", actorRole,
                        "rating", rating,
                        "tags", saved.tags() == null ? List.of() : saved.tags()
                ),
                null,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString()
                )
        ));
        notifyCounterpart(
                interviewSession,
                application,
                post,
                actorUserId,
                "review_received",
                "후기가 등록됐어요",
                "상대가 인터뷰 후기를 남겼어요.",
                Map.of("review_id", saved.id().toString(), "actor_role", actorRole)
        );
        return toReviewReadModel(saved);
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewReadModel> listReviews(UUID actorUserId, UUID sessionId) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        authorizeParticipant(user, context.application(), context.post());
        return listReviews(context.session());
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewReadModel> listReviews(InterviewSessionRecord interviewSession) {
        return repository.listReviews(interviewSession.id())
                .stream()
                .map(this::toReviewReadModel)
                .toList();
    }

    @Transactional
    public InterviewSessionReadModel cancelSession(
            UUID actorUserId,
            UUID sessionId,
            String reason
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return cancelSession(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole,
                reason
        );
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
        ensureScheduled(interviewSession, "canceled");
        Map<String, Object> before = serializeSession(interviewSession);
        boolean updated = repository.updateScheduledSessionStatus(interviewSession.id(), "canceled");
        if (!updated) {
            throw conflictDetail("Interview session status has already changed");
        }
        InterviewSessionRecord refreshed = repository.findSessionContext(interviewSession.id())
                .map(SessionContext::session)
                .orElseThrow(() -> notFound("Session not found"));
        String normalizedReason = normalizeOptionalText(reason);
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_session_canceled",
                "interview_session",
                refreshed.id(),
                before,
                serializeSession(refreshed),
                normalizedReason,
                Map.of(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "actor_role", actorRole
                )
        ));
        notifyCounterpart(
                refreshed,
                application,
                post,
                actorUserId,
                "session_canceled",
                "인터뷰 일정이 취소됐어요",
                normalizedReason == null ? "상대방이 인터뷰 일정을 취소했어요." : normalizedReason,
                auditMetadata(
                        "actor_role", actorRole,
                        "reason", normalizedReason
                )
        );
        return toSessionReadModel(refreshed, null);
    }

    @Transactional
    public InterviewSessionReadModel markNoShow(
            UUID actorUserId,
            UUID sessionId,
            String noShowParty
    ) {
        ActiveUser user = requireActiveUser(actorUserId);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = authorizeParticipant(user, context.application(), context.post());
        return markNoShow(
                context.session(),
                context.application(),
                context.post(),
                user.id(),
                actorRole,
                noShowParty
        );
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
        ensureScheduled(interviewSession, "marked as no-show");
        Map<String, Object> before = serializeSession(interviewSession);
        boolean updated = repository.updateScheduledSessionStatus(interviewSession.id(), "no_show");
        if (!updated) {
            throw conflictDetail("Interview session status has already changed");
        }
        boolean applicationUpdated = repository.updateApplicationStatusIfCurrent(
                application.id(),
                "no_show",
                Set.of("selected")
        );
        if (!applicationUpdated) {
            throw conflictDetail("Application status has already changed");
        }

        AttendanceRecord attendance = repository.findAttendanceRecord(interviewSession.id())
                .orElse(new AttendanceRecord(
                        UUID.randomUUID(),
                        interviewSession.id(),
                        false,
                        false,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ));
        repository.saveAttendanceRecord(new AttendanceRecord(
                attendance.id(),
                attendance.sessionId(),
                attendance.founderConfirmed(),
                attendance.respondentConfirmed(),
                attendance.founderConfirmedAt(),
                attendance.respondentConfirmedAt(),
                attendance.completedBy(),
                attendance.completionSource(),
                noShowParty,
                attendance.completedAt()
        ));

        InterviewSessionRecord refreshed = repository.findSessionContext(interviewSession.id())
                .map(SessionContext::session)
                .orElseThrow(() -> notFound("Session not found"));
        SessionContext context = repository.findSessionContext(interviewSession.id())
                .orElseThrow(() -> notFound("Session not found"));
        auditWriteService.record(new AuditEventCommand(
                actorUserId,
                "user",
                "interview_session_no_show_marked",
                "interview_session",
                refreshed.id(),
                before,
                serializeSession(refreshed),
                null,
                auditMetadata(
                        "application_id", application.id().toString(),
                        "interview_post_id", post.id().toString(),
                        "actor_role", actorRole,
                        "no_show_party", noShowParty
                )
        ));
        notifySessionParticipants(
                refreshed,
                context.application(),
                context.post(),
                "no_show_marked",
                "노쇼 상태가 기록됐어요",
                buildNoShowNotificationBody(noShowParty),
                Map.of(
                        "actor_role", actorRole,
                        "no_show_party", noShowParty == null ? "" : noShowParty
                )
        );
        return toSessionReadModel(refreshed, null);
    }

    private void notifyCounterpart(
            InterviewSessionRecord interviewSession,
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
        NotificationTarget target = resolveNotificationTarget(
                application,
                post,
                application.id(),
                interviewSession.id(),
                metadata
        );
        notificationWriteService.createNotification(
                counterpartUserId,
                type,
                title,
                truncateNotificationBody(body),
                target.targetType(),
                target.targetId(),
                target.metadata()
        );
    }

    private void notifySessionParticipants(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            String type,
            String title,
            String body,
            Map<String, Object> metadata
    ) {
        java.util.LinkedHashSet<UUID> userIds = new java.util.LinkedHashSet<>();
        userIds.add(post.founderId());
        userIds.add(application.respondentId());
        NotificationTarget target = resolveNotificationTarget(
                application,
                post,
                application.id(),
                interviewSession.id(),
                metadata
        );
        for (UUID userId : userIds) {
            notificationWriteService.createNotification(
                    userId,
                    type,
                    title,
                    truncateNotificationBody(body),
                    target.targetType(),
                    target.targetId(),
                    target.metadata()
            );
        }
    }

    private NotificationTarget resolveNotificationTarget(
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID applicationId,
            UUID sessionId,
            Map<String, Object> metadata
    ) {
        Map<String, Object> notificationMetadata = new java.util.LinkedHashMap<>();
        if (metadata != null) {
            notificationMetadata.putAll(metadata);
        }
        notificationMetadata.putIfAbsent("application_id", applicationId.toString());
        notificationMetadata.putIfAbsent("interview_post_id", post.id().toString());
        notificationMetadata.putIfAbsent("interview_title", post.title());
        notificationMetadata.putIfAbsent("session_id", sessionId.toString());
        return repository.findChatRoomIdByApplicationId(applicationId)
                .map(chatRoomId -> {
                    notificationMetadata.put("chat_room_id", chatRoomId.toString());
                    return new NotificationTarget("chat_room", chatRoomId, notificationMetadata);
                })
                .orElseGet(() -> new NotificationTarget("interview_session", sessionId, notificationMetadata));
    }

    private String truncateNotificationBody(String body) {
        if (body == null) {
            return null;
        }
        return body.length() <= 120 ? body : body.substring(0, 120);
    }

    private String buildNoShowNotificationBody(String noShowParty) {
        if ("founder".equals(noShowParty)) {
            return "상대방이 창업자를 노쇼로 기록했어요.";
        }
        if ("respondent".equals(noShowParty)) {
            return "상대방이 참여자를 노쇼로 기록했어요.";
        }
        return "상대방이 인터뷰를 노쇼로 기록했어요.";
    }

    private record NotificationTarget(
            String targetType,
            UUID targetId,
            Map<String, Object> metadata
    ) {
    }

    private ApplicationContext requireApplicationContext(UUID applicationId) {
        return repository.findApplicationContext(applicationId)
                .orElseThrow(() -> notFound("Application not found"));
    }

    private SessionContext requireSessionContext(UUID sessionId) {
        return repository.findSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
    }

    private SessionContext requireLockedSessionContext(UUID sessionId) {
        return repository.lockSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
    }

    private RewardConfirmationRecord getOrCreateRewardConfirmation(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        return repository.findRewardConfirmation(interviewSession.id())
                .orElseGet(() -> repository.saveRewardConfirmation(new RewardConfirmationRecord(
                        UUID.randomUUID(),
                        interviewSession.id(),
                        application.id(),
                        post.founderId(),
                        application.respondentId(),
                        post.rewardAmount(),
                        "pending",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )));
    }

    private InterviewSessionRecord withStatus(InterviewSessionRecord session, String status) {
        return new InterviewSessionRecord(
                session.id(),
                session.applicationId(),
                session.scheduledAt(),
                session.meetingType(),
                session.meetingUrl(),
                session.place(),
                status,
                session.moderationStatus()
        );
    }

    private Map<String, Object> serializeSession(InterviewSessionRecord session) {
        return auditMetadata(
                "status", session.status(),
                "scheduled_at", session.scheduledAt().toString(),
                "meeting_type", session.meetingType(),
                "meeting_url", session.meetingUrl(),
                "place", session.place()
        );
    }

    private Map<String, Object> mergeSessionAudit(
            InterviewSessionRecord session,
            AttendanceRecord attendance
    ) {
        java.util.LinkedHashMap<String, Object> merged = new java.util.LinkedHashMap<>(serializeSession(session));
        merged.put("founder_confirmed", attendance.founderConfirmed());
        merged.put("respondent_confirmed", attendance.respondentConfirmed());
        return merged;
    }

    private Map<String, Object> serializeReward(RewardConfirmationRecord reward) {
        return auditMetadata(
                "status", reward.status(),
                "amount", reward.amount(),
                "founder_marked_paid_at", reward.founderMarkedPaidAt() == null ? null : reward.founderMarkedPaidAt().toString(),
                "respondent_confirmed_at", reward.respondentConfirmedAt() == null ? null : reward.respondentConfirmedAt().toString(),
                "disputed_at", reward.disputedAt() == null ? null : reward.disputedAt().toString()
        );
    }

    private Map<String, Object> auditMetadata(Object... keyValues) {
        java.util.LinkedHashMap<String, Object> metadata = new java.util.LinkedHashMap<>();
        for (int index = 0; index < keyValues.length; index += 2) {
            metadata.put((String) keyValues[index], keyValues[index + 1]);
        }
        return metadata;
    }

    private void ensureScheduled(InterviewSessionRecord interviewSession, String action) {
        if (!"scheduled".equals(interviewSession.status())) {
            throw badRequestDetail("Only scheduled sessions can be " + action);
        }
    }

    private void ensureCompleted(InterviewSessionRecord interviewSession, String action) {
        if (!"completed".equals(interviewSession.status())) {
            throw badRequestDetail("Only completed sessions can " + action);
        }
    }

    private void ensureFounderActor(String actorRole) {
        if (!"founder".equals(actorRole)) {
            throw forbiddenDetail("Founder role required");
        }
    }

    private void ensureRespondentActor(String actorRole) {
        if (!"respondent".equals(actorRole)) {
            throw forbiddenDetail("Respondent role required");
        }
    }

    private HypofitException badRequestDetail(String detail) {
        return new HypofitException(slug(detail), detail, HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException forbiddenDetail(String detail) {
        return new HypofitException("permission_denied", "권한이 없어요.", HttpStatus.FORBIDDEN.value(), detail);
    }

    private HypofitException conflictDetail(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private HypofitException forbidden(String code, String message, String detail) {
        return new HypofitException(code, message, HttpStatus.FORBIDDEN.value(), detail);
    }

    private String slug(String detail) {
        String normalized = detail.chars()
                .mapToObj(character -> Character.isLetterOrDigit(character)
                        ? String.valueOf(Character.toLowerCase((char) character))
                        : "_")
                .reduce("", String::concat)
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
        return normalized.isBlank() ? "error" : normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.trim();
        return stripped.isEmpty() ? null : stripped;
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        return tags.stream()
                .map(tag -> tag == null ? "" : tag.trim())
                .filter(tag -> !tag.isEmpty())
                .limit(6)
                .toList();
    }

    private InterviewSessionReadModel toSessionReadModel(
            InterviewSessionRecord session,
            ApplicationReadModel application
    ) {
        return new InterviewSessionReadModel(
                session.id(),
                session.applicationId(),
                session.scheduledAt(),
                session.meetingType(),
                session.meetingUrl(),
                session.place(),
                session.status(),
                application
        );
    }

    private ApplicationReadModel toApplicationReadModel(
            ApplicationRecord application,
            UserSummary respondent
    ) {
        return new ApplicationReadModel(
                application.id(),
                application.interviewPostId(),
                application.answers() == null ? Map.of() : application.answers(),
                application.availableTimes() == null ? List.of() : application.availableTimes(),
                application.respondentId(),
                application.status(),
                application.rejectionReason(),
                respondent
        );
    }

    private AttendanceRecordReadModel toAttendanceReadModel(AttendanceRecord attendance) {
        return new AttendanceRecordReadModel(
                attendance.sessionId(),
                attendance.founderConfirmed(),
                attendance.respondentConfirmed(),
                attendance.founderConfirmedAt(),
                attendance.respondentConfirmedAt(),
                attendance.completedAt(),
                attendance.noShowParty()
        );
    }

    private RewardConfirmationReadModel toRewardReadModel(RewardConfirmationRecord reward) {
        return new RewardConfirmationReadModel(
                reward.id(),
                reward.sessionId(),
                reward.applicationId(),
                reward.founderId(),
                reward.respondentId(),
                reward.amount(),
                reward.status(),
                reward.founderMarkedPaidAt(),
                reward.respondentConfirmedAt(),
                reward.disputedAt(),
                reward.disputeReason(),
                reward.createdAt(),
                reward.updatedAt()
        );
    }

    private InterviewReviewReadModel toReviewReadModel(InterviewReviewRecord review) {
        return new InterviewReviewReadModel(
                review.id(),
                review.sessionId(),
                review.reviewerId(),
                review.revieweeId(),
                review.reviewerRole(),
                review.rating(),
                review.tags() == null ? List.of() : review.tags(),
                review.comment(),
                review.visibility(),
                review.createdAt(),
                review.updatedAt()
        );
    }
}
