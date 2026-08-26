package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionReadModels.ApplicationReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.ConfirmAttendanceReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewReviewReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.InterviewSessionReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.RewardConfirmationReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels.UserSummary;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionWorkflowService {

    private final SessionWorkflowRepository repository;
    private final SessionWorkflowAccessService accessService;
    private final SessionSchedulingService schedulingService;
    private final SessionAttendanceService attendanceService;
    private final SessionRewardService rewardService;
    private final SessionReviewService reviewService;

    public SessionWorkflowService(
            SessionWorkflowRepository repository,
            SessionWorkflowAccessService accessService,
            SessionSchedulingService schedulingService,
            SessionAttendanceService attendanceService,
            SessionRewardService rewardService,
            SessionReviewService reviewService
    ) {
        this.repository = repository;
        this.accessService = accessService;
        this.schedulingService = schedulingService;
        this.attendanceService = attendanceService;
        this.rewardService = rewardService;
        this.reviewService = reviewService;
    }

    @Transactional(readOnly = true)
    public ActiveUser requireActiveUser(UUID userId) {
        return accessService.requireActiveUser(userId);
    }

    @Transactional(readOnly = true)
    public Optional<ApplicationContext> getApplicationContext(UUID applicationId) {
        return accessService.getApplicationContext(applicationId);
    }

    @Transactional(readOnly = true)
    public Optional<SessionContext> getSessionContext(UUID sessionId) {
        return accessService.getSessionContext(sessionId);
    }

    public String authorizeParticipant(
            ActiveUser user,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        return accessService.authorizeParticipant(user, application, post);
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
        return schedulingService.createSession(actorUserId, applicationId, scheduledAt, meetingType, meetingUrl, place);
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
        return schedulingService.createSession(application, post, scheduledAt, meetingType, meetingUrl, place);
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
        return schedulingService.updateSession(
                actorUserId, sessionId, reason, scheduledAt, scheduledAtPresent,
                meetingType, meetingTypePresent, meetingUrl, meetingUrlPresent, place, placePresent
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
        return schedulingService.updateSession(
                interviewSession, application, post, actorUserId, actorRole, reason,
                scheduledAt, scheduledAtPresent, meetingType, meetingTypePresent,
                meetingUrl, meetingUrlPresent, place, placePresent
        );
    }

    @Transactional
    public InterviewSessionReadModel completeSession(
            UUID actorUserId,
            UUID sessionId
    ) {
        return attendanceService.completeSession(actorUserId, sessionId);
    }

    @Transactional
    public InterviewSessionReadModel completeSession(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        return attendanceService.completeSession(interviewSession, application, post, actorUserId, actorRole);
    }

    @Transactional
    public ConfirmAttendanceReadModel confirmAttendance(
            UUID actorUserId,
            UUID sessionId
    ) {
        return attendanceService.confirmAttendance(actorUserId, sessionId);
    }

    @Transactional
    public ConfirmAttendanceReadModel confirmAttendance(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        return attendanceService.confirmAttendance(interviewSession, application, post, actorUserId, actorRole);
    }

    @Transactional
    public RewardConfirmationReadModel markRewardPaid(
            UUID actorUserId,
            UUID sessionId
    ) {
        return rewardService.markRewardPaid(actorUserId, sessionId);
    }

    @Transactional
    public RewardConfirmationReadModel markRewardPaid(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        return rewardService.markRewardPaid(interviewSession, application, post, actorUserId, actorRole);
    }

    @Transactional
    public RewardConfirmationReadModel confirmRewardReceived(
            UUID actorUserId,
            UUID sessionId
    ) {
        return rewardService.confirmRewardReceived(actorUserId, sessionId);
    }

    @Transactional
    public RewardConfirmationReadModel confirmRewardReceived(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post,
            UUID actorUserId,
            String actorRole
    ) {
        return rewardService.confirmRewardReceived(interviewSession, application, post, actorUserId, actorRole);
    }

    @Transactional
    public RewardConfirmationReadModel disputeReward(
            UUID actorUserId,
            UUID sessionId,
            String reason
    ) {
        return rewardService.disputeReward(actorUserId, sessionId, reason);
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
        return rewardService.disputeReward(interviewSession, application, post, actorUserId, actorRole, reason);
    }

    @Transactional
    public InterviewReviewReadModel createReview(
            UUID actorUserId,
            UUID sessionId,
            int rating,
            List<String> tags,
            String comment
    ) {
        return reviewService.createReview(actorUserId, sessionId, rating, tags, comment);
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
        return reviewService.createReview(interviewSession, application, post, actorUserId, actorRole, rating, tags, comment);
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewReadModel> listReviews(UUID actorUserId, UUID sessionId) {
        return reviewService.listReviews(actorUserId, sessionId);
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewReadModel> listReviews(InterviewSessionRecord interviewSession) {
        return reviewService.listReviews(interviewSession);
    }

    @Transactional
    public InterviewSessionReadModel cancelSession(
            UUID actorUserId,
            UUID sessionId,
            String reason
    ) {
        return schedulingService.cancelSession(actorUserId, sessionId, reason);
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
        return schedulingService.cancelSession(interviewSession, application, post, actorUserId, actorRole, reason);
    }

    @Transactional
    public InterviewSessionReadModel markNoShow(
            UUID actorUserId,
            UUID sessionId,
            String noShowParty
    ) {
        return attendanceService.markNoShow(actorUserId, sessionId, noShowParty);
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
        return attendanceService.markNoShow(interviewSession, application, post, actorUserId, actorRole, noShowParty);
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

}
