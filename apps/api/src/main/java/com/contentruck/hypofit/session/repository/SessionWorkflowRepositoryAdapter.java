package com.contentruck.hypofit.session.repository;

import com.contentruck.hypofit.session.entity.SessionApplicationEntity;
import com.contentruck.hypofit.session.entity.SessionAttendanceRecordEntity;
import com.contentruck.hypofit.session.entity.SessionInterviewPostEntity;
import com.contentruck.hypofit.session.entity.SessionInterviewReviewEntity;
import com.contentruck.hypofit.session.entity.SessionInterviewSessionEntity;
import com.contentruck.hypofit.session.entity.SessionRewardConfirmationEntity;
import com.contentruck.hypofit.session.entity.SessionUserEntity;

import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.AttendanceRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewReviewRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.RewardConfirmationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionContexts.StoredUser;
import com.contentruck.hypofit.session.service.SessionReadModels.UserSummary;
import com.contentruck.hypofit.session.service.SessionWorkflowRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public class SessionWorkflowRepositoryAdapter implements SessionWorkflowRepository {

    private final EntityManager entityManager;
    private final SessionUserJpaRepository sessionUserJpaRepository;

    public SessionWorkflowRepositoryAdapter(
            EntityManager entityManager,
            SessionUserJpaRepository sessionUserJpaRepository
    ) {
        this.entityManager = entityManager;
        this.sessionUserJpaRepository = sessionUserJpaRepository;
    }

    @Override
    public Optional<StoredUser> findUserById(UUID userId) {
        return sessionUserJpaRepository.findById(userId).map(this::toStoredUser);
    }

    @Override
    public List<SessionListRow> listSessionRows(UUID userId) {
        List<Object[]> rows = entityManager.createQuery("""
                select s, a, u
                from SessionInterviewSessionEntity s
                join SessionApplicationEntity a on a.id = s.applicationId
                join SessionInterviewPostEntity p on p.id = a.interviewPostId
                left join SessionUserEntity u on u.id = a.respondentId
                where (a.respondentId = :userId or p.founderId = :userId)
                  and a.moderationStatus = 'visible'
                  and s.moderationStatus = 'visible'
                order by s.scheduledAt desc
                """, Object[].class)
                .setParameter("userId", userId)
                .setMaxResults(100)
                .getResultList();

        return rows.stream()
                .map(row -> new SessionListRow(
                        toSessionRecord((SessionInterviewSessionEntity) row[0]),
                        toApplicationRecord((SessionApplicationEntity) row[1]),
                        toUserSummary((SessionUserEntity) row[2])
                ))
                .toList();
    }

    @Override
    public Optional<ApplicationContext> findApplicationContext(UUID applicationId) {
        List<Object[]> rows = entityManager.createQuery("""
                select a, p
                from SessionApplicationEntity a
                join SessionInterviewPostEntity p on p.id = a.interviewPostId
                where a.id = :applicationId
                  and a.moderationStatus = 'visible'
                """, Object[].class)
                .setParameter("applicationId", applicationId)
                .getResultList();
        return rows.stream()
                .findFirst()
                .map(row -> new ApplicationContext(
                        toApplicationRecord((SessionApplicationEntity) row[0]),
                        toInterviewPostRecord((SessionInterviewPostEntity) row[1])
                ));
    }

    @Override
    public Optional<ApplicationContext> lockApplicationContext(UUID applicationId) {
        List<SessionApplicationEntity> applications = entityManager.createQuery("""
                select a
                from SessionApplicationEntity a
                where a.id = :applicationId
                  and a.moderationStatus = 'visible'
                """, SessionApplicationEntity.class)
                .setParameter("applicationId", applicationId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultList();
        if (applications.isEmpty()) {
            return Optional.empty();
        }

        SessionApplicationEntity application = applications.getFirst();
        SessionInterviewPostEntity post = entityManager.find(SessionInterviewPostEntity.class, application.getInterviewPostId());
        if (post == null) {
            return Optional.empty();
        }
        return Optional.of(new ApplicationContext(
                toApplicationRecord(application),
                toInterviewPostRecord(post)
        ));
    }

    @Override
    public boolean hasScheduledVisibleSessionForApplication(UUID applicationId) {
        return !entityManager.createQuery("""
                select s.id
                from SessionInterviewSessionEntity s
                where s.applicationId = :applicationId
                  and s.status = 'scheduled'
                  and s.moderationStatus = 'visible'
                """, UUID.class)
                .setParameter("applicationId", applicationId)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public Optional<SessionContext> findSessionContext(UUID sessionId) {
        List<Object[]> rows = entityManager.createQuery("""
                select s, a, p
                from SessionInterviewSessionEntity s
                join SessionApplicationEntity a on a.id = s.applicationId
                join SessionInterviewPostEntity p on p.id = a.interviewPostId
                where s.id = :sessionId
                  and a.moderationStatus = 'visible'
                  and s.moderationStatus = 'visible'
                """, Object[].class)
                .setParameter("sessionId", sessionId)
                .getResultList();

        return rows.stream()
                .findFirst()
                .map(row -> new SessionContext(
                        toSessionRecord((SessionInterviewSessionEntity) row[0]),
                        toApplicationRecord((SessionApplicationEntity) row[1]),
                        toInterviewPostRecord((SessionInterviewPostEntity) row[2])
                ));
    }

    @Override
    public Optional<SessionContext> lockSessionContext(UUID sessionId) {
        List<SessionInterviewSessionEntity> sessions = entityManager.createQuery("""
                select s
                from SessionInterviewSessionEntity s
                where s.id = :sessionId
                  and s.moderationStatus = 'visible'
                """, SessionInterviewSessionEntity.class)
                .setParameter("sessionId", sessionId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultList();
        if (sessions.isEmpty()) {
            return Optional.empty();
        }

        SessionInterviewSessionEntity session = sessions.getFirst();
        SessionApplicationEntity application = entityManager.find(SessionApplicationEntity.class, session.getApplicationId());
        if (application == null || !"visible".equals(application.getModerationStatus())) {
            return Optional.empty();
        }
        SessionInterviewPostEntity post = entityManager.find(SessionInterviewPostEntity.class, application.getInterviewPostId());
        if (post == null) {
            return Optional.empty();
        }

        return Optional.of(new SessionContext(
                toSessionRecord(session),
                toApplicationRecord(application),
                toInterviewPostRecord(post)
        ));
    }

    @Override
    public Optional<UUID> findChatRoomIdByApplicationId(UUID applicationId) {
        List<?> roomIds = entityManager.createNativeQuery("""
                select id
                from chat_rooms
                where application_id = :applicationId
                order by created_at desc
                """)
                .setParameter("applicationId", applicationId)
                .setMaxResults(1)
                .getResultList();
        return roomIds.stream()
                .map(UUID.class::cast)
                .findFirst();
    }

    @Override
    public Optional<AttendanceRecord> findAttendanceRecord(UUID sessionId) {
        return entityManager.createQuery("""
                select a
                from SessionAttendanceRecordEntity a
                where a.sessionId = :sessionId
                """, SessionAttendanceRecordEntity.class)
                .setParameter("sessionId", sessionId)
                .getResultList()
                .stream()
                .findFirst()
                .map(this::toAttendanceRecord);
    }

    @Override
    public Optional<RewardConfirmationRecord> findRewardConfirmation(UUID sessionId) {
        return entityManager.createQuery("""
                select r
                from SessionRewardConfirmationEntity r
                where r.sessionId = :sessionId
                """, SessionRewardConfirmationEntity.class)
                .setParameter("sessionId", sessionId)
                .getResultList()
                .stream()
                .findFirst()
                .map(this::toRewardConfirmationRecord);
    }

    @Override
    public Optional<InterviewReviewRecord> findReview(UUID sessionId, UUID reviewerId) {
        return entityManager.createQuery("""
                select r
                from SessionInterviewReviewEntity r
                where r.sessionId = :sessionId
                  and r.reviewerId = :reviewerId
                """, SessionInterviewReviewEntity.class)
                .setParameter("sessionId", sessionId)
                .setParameter("reviewerId", reviewerId)
                .getResultList()
                .stream()
                .findFirst()
                .map(this::toInterviewReviewRecord);
    }

    @Override
    public List<InterviewReviewRecord> listReviews(UUID sessionId) {
        return entityManager.createQuery("""
                select r
                from SessionInterviewReviewEntity r
                where r.sessionId = :sessionId
                order by r.createdAt asc
                """, SessionInterviewReviewEntity.class)
                .setParameter("sessionId", sessionId)
                .getResultList()
                .stream()
                .map(this::toInterviewReviewRecord)
                .toList();
    }

    @Override
    public InterviewSessionRecord saveSession(InterviewSessionRecord session) {
        SessionInterviewSessionEntity entity = entityManager.find(SessionInterviewSessionEntity.class, session.id());
        boolean created = entity == null;
        if (created) {
            entity = new SessionInterviewSessionEntity();
            entity.setId(session.id());
        }
        entity.setApplicationId(session.applicationId());
        entity.setScheduledAt(session.scheduledAt());
        entity.setMeetingType(session.meetingType());
        entity.setMeetingUrl(session.meetingUrl());
        entity.setPlace(session.place());
        entity.setStatus(session.status());
        entity.setModerationStatus(session.moderationStatus());
        if (created) {
            entityManager.persist(entity);
        }
        entityManager.flush();
        entityManager.refresh(entity);
        return toSessionRecord(entity);
    }

    @Override
    public AttendanceRecord saveAttendanceRecord(AttendanceRecord attendance) {
        SessionAttendanceRecordEntity entity = entityManager.find(SessionAttendanceRecordEntity.class, attendance.id());
        boolean created = entity == null;
        if (created) {
            entity = new SessionAttendanceRecordEntity();
            entity.setId(attendance.id());
        }
        entity.setSessionId(attendance.sessionId());
        entity.setFounderConfirmed(attendance.founderConfirmed());
        entity.setRespondentConfirmed(attendance.respondentConfirmed());
        entity.setFounderConfirmedAt(attendance.founderConfirmedAt());
        entity.setRespondentConfirmedAt(attendance.respondentConfirmedAt());
        entity.setCompletedBy(attendance.completedBy());
        entity.setCompletionSource(attendance.completionSource());
        entity.setNoShowParty(attendance.noShowParty());
        entity.setCompletedAt(attendance.completedAt());
        if (created) {
            entityManager.persist(entity);
        }
        entityManager.flush();
        entityManager.refresh(entity);
        return toAttendanceRecord(entity);
    }

    @Override
    public RewardConfirmationRecord saveRewardConfirmation(RewardConfirmationRecord rewardConfirmation) {
        SessionRewardConfirmationEntity entity = entityManager.find(SessionRewardConfirmationEntity.class, rewardConfirmation.id());
        boolean created = entity == null;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (created) {
            entity = new SessionRewardConfirmationEntity();
            entity.setId(rewardConfirmation.id());
            entity.setCreatedAt(rewardConfirmation.createdAt() == null ? now : rewardConfirmation.createdAt());
        }
        entity.setSessionId(rewardConfirmation.sessionId());
        entity.setApplicationId(rewardConfirmation.applicationId());
        entity.setFounderId(rewardConfirmation.founderId());
        entity.setRespondentId(rewardConfirmation.respondentId());
        entity.setAmount(rewardConfirmation.amount());
        entity.setStatus(rewardConfirmation.status());
        entity.setFounderMarkedPaidAt(rewardConfirmation.founderMarkedPaidAt());
        entity.setRespondentConfirmedAt(rewardConfirmation.respondentConfirmedAt());
        entity.setDisputedAt(rewardConfirmation.disputedAt());
        entity.setDisputeReason(rewardConfirmation.disputeReason());
        entity.setUpdatedAt(now);
        if (created) {
            entityManager.persist(entity);
        }
        entityManager.flush();
        entityManager.refresh(entity);
        return toRewardConfirmationRecord(entity);
    }

    @Override
    public InterviewReviewRecord saveReview(InterviewReviewRecord review) {
        SessionInterviewReviewEntity entity = entityManager.find(SessionInterviewReviewEntity.class, review.id());
        boolean created = entity == null;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (created) {
            entity = new SessionInterviewReviewEntity();
            entity.setId(review.id());
            entity.setCreatedAt(review.createdAt() == null ? now : review.createdAt());
        }
        entity.setSessionId(review.sessionId());
        entity.setReviewerId(review.reviewerId());
        entity.setRevieweeId(review.revieweeId());
        entity.setReviewerRole(review.reviewerRole());
        entity.setRating(review.rating());
        entity.setTags(review.tags());
        entity.setComment(review.comment());
        entity.setVisibility(review.visibility());
        entity.setUpdatedAt(now);
        if (created) {
            entityManager.persist(entity);
        }
        entityManager.flush();
        entityManager.refresh(entity);
        return toInterviewReviewRecord(entity);
    }

    @Override
    public boolean updateScheduledSessionStatus(UUID sessionId, String nextStatus) {
        int updated = entityManager.createQuery("""
                update SessionInterviewSessionEntity s
                set s.status = :nextStatus
                where s.id = :sessionId
                  and s.status = 'scheduled'
                  and s.moderationStatus = 'visible'
                """)
                .setParameter("nextStatus", nextStatus)
                .setParameter("sessionId", sessionId)
                .executeUpdate();
        if (updated > 0) {
            entityManager.clear();
        }
        return updated > 0;
    }

    @Override
    public boolean updateApplicationStatusIfCurrent(UUID applicationId, String nextStatus, Set<String> allowedStatuses) {
        int updated = entityManager.createQuery("""
                update SessionApplicationEntity a
                set a.status = :nextStatus, a.rejectionReason = null
                where a.id = :applicationId
                  and a.status in :allowedStatuses
                  and a.moderationStatus = 'visible'
                """)
                .setParameter("nextStatus", nextStatus)
                .setParameter("applicationId", applicationId)
                .setParameter("allowedStatuses", allowedStatuses)
                .executeUpdate();
        if (updated > 0) {
            entityManager.clear();
        }
        return updated > 0;
    }

    private StoredUser toStoredUser(SessionUserEntity entity) {
        return new StoredUser(
                entity.getId(),
                entity.getName(),
                entity.getBio(),
                entity.getRole(),
                entity.getProfileImageUrl(),
                entity.getDeletedAt(),
                entity.getDeactivatedAt()
        );
    }

    private UserSummary toUserSummary(SessionUserEntity entity) {
        if (entity == null) {
            return null;
        }
        return new UserSummary(
                entity.getId(),
                entity.getName(),
                entity.getBio(),
                entity.getRole(),
                entity.getProfileImageUrl()
        );
    }

    private ApplicationRecord toApplicationRecord(SessionApplicationEntity entity) {
        return new ApplicationRecord(
                entity.getId(),
                entity.getInterviewPostId(),
                entity.getRespondentId(),
                entity.getAnswers(),
                entity.getAvailableTimes(),
                entity.getStatus(),
                entity.getModerationStatus(),
                entity.getRejectionReason()
        );
    }

    private InterviewPostRecord toInterviewPostRecord(SessionInterviewPostEntity entity) {
        return new InterviewPostRecord(
                entity.getId(),
                entity.getFounderId(),
                entity.getTitle(),
                entity.getRewardAmount(),
                entity.getRecruitmentType()
        );
    }

    private InterviewSessionRecord toSessionRecord(SessionInterviewSessionEntity entity) {
        return new InterviewSessionRecord(
                entity.getId(),
                entity.getApplicationId(),
                entity.getScheduledAt(),
                entity.getMeetingType(),
                entity.getMeetingUrl(),
                entity.getPlace(),
                entity.getStatus(),
                entity.getModerationStatus()
        );
    }

    private AttendanceRecord toAttendanceRecord(SessionAttendanceRecordEntity entity) {
        return new AttendanceRecord(
                entity.getId(),
                entity.getSessionId(),
                entity.isFounderConfirmed(),
                entity.isRespondentConfirmed(),
                entity.getFounderConfirmedAt(),
                entity.getRespondentConfirmedAt(),
                entity.getCompletedBy(),
                entity.getCompletionSource(),
                entity.getNoShowParty(),
                entity.getCompletedAt()
        );
    }

    private RewardConfirmationRecord toRewardConfirmationRecord(SessionRewardConfirmationEntity entity) {
        return new RewardConfirmationRecord(
                entity.getId(),
                entity.getSessionId(),
                entity.getApplicationId(),
                entity.getFounderId(),
                entity.getRespondentId(),
                entity.getAmount(),
                entity.getStatus(),
                entity.getFounderMarkedPaidAt(),
                entity.getRespondentConfirmedAt(),
                entity.getDisputedAt(),
                entity.getDisputeReason(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private InterviewReviewRecord toInterviewReviewRecord(SessionInterviewReviewEntity entity) {
        return new InterviewReviewRecord(
                entity.getId(),
                entity.getSessionId(),
                entity.getReviewerId(),
                entity.getRevieweeId(),
                entity.getReviewerRole(),
                entity.getRating(),
                entity.getTags(),
                entity.getComment(),
                entity.getVisibility(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

interface SessionUserJpaRepository extends JpaRepository<SessionUserEntity, UUID> {
}
