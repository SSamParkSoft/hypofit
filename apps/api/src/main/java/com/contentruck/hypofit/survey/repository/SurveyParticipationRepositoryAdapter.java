package com.contentruck.hypofit.survey.repository;

import com.contentruck.hypofit.survey.entity.SurveyInterviewPostEntity;
import com.contentruck.hypofit.survey.entity.SurveyParticipationEntity;
import com.contentruck.hypofit.survey.entity.SurveyUserAccountEntity;
import com.contentruck.hypofit.survey.service.SurveyActorAccount;
import com.contentruck.hypofit.survey.service.SurveyParticipationReadModel;
import com.contentruck.hypofit.survey.service.SurveyParticipationRepository;
import com.contentruck.hypofit.survey.service.SurveyParticipantSummary;
import com.contentruck.hypofit.survey.service.SurveyPostSummary;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import jakarta.persistence.EntityManager;

@Repository
public class SurveyParticipationRepositoryAdapter implements SurveyParticipationRepository {

    private static final String STATUS_OPENED = "opened";
    private static final String STATUS_SUBMITTED = "submitted";
    private static final String STATUS_CONFIRMED = "confirmed";
    private static final String STATUS_WITHDRAWN = "withdrawn";

    private final SurveyUserAccountJpaRepository userAccountJpaRepository;
    private final SurveyInterviewPostJpaRepository interviewPostJpaRepository;
    private final SurveyParticipationJpaRepository participationJpaRepository;
    private final EntityManager entityManager;

    public SurveyParticipationRepositoryAdapter(
            SurveyUserAccountJpaRepository userAccountJpaRepository,
            SurveyInterviewPostJpaRepository interviewPostJpaRepository,
            SurveyParticipationJpaRepository participationJpaRepository,
            EntityManager entityManager
    ) {
        this.userAccountJpaRepository = userAccountJpaRepository;
        this.interviewPostJpaRepository = interviewPostJpaRepository;
        this.participationJpaRepository = participationJpaRepository;
        this.entityManager = entityManager;
    }

    @Override
    public Optional<SurveyActorAccount> findUserAccount(UUID userId) {
        return userAccountJpaRepository.findById(userId)
                .map(entity -> new SurveyActorAccount(
                        entity.getId(),
                        entity.getDeletedAt() != null,
                        entity.getDeactivatedAt() != null
                ));
    }

    @Override
    public Optional<SurveyPostSummary> findPost(UUID postId) {
        return interviewPostJpaRepository.findById(postId)
                .map(this::toPostSummary);
    }

    @Override
    public Optional<SurveyParticipationReadModel> findParticipationForUpdate(UUID postId, UUID participantId) {
        return participationJpaRepository.findForUpdate(postId, participantId)
                .map(this::toReadModel);
    }

    @Override
    public Optional<SurveyParticipationReadModel> findParticipation(UUID postId, UUID participantId) {
        return participationJpaRepository.findByPostIdAndParticipantId(postId, participantId)
                .map(this::toReadModel);
    }

    @Override
    public boolean hasSelectedApplication(UUID postId, UUID participantId) {
        Number count = (Number) entityManager.createNativeQuery("""
                        select count(*)
                        from applications
                        where interview_post_id = :postId
                          and respondent_id = :participantId
                          and status = 'selected'
                        """)
                .setParameter("postId", postId)
                .setParameter("participantId", participantId)
                .getSingleResult();
        return count.longValue() > 0;
    }

    @Override
    public SurveyParticipationReadModel createOpenedParticipation(UUID postId, UUID participantId, OffsetDateTime openedAt) {
        participationJpaRepository.insertOpenedIfAbsent(postId, participantId, openedAt);
        return participationJpaRepository.findForUpdate(postId, participantId)
                .map(this::toReadModel)
                .orElseThrow(() -> new IllegalStateException(
                        "Survey participation was not available after idempotent insert"
                ));
    }

    @Override
    public SurveyParticipationReadModel updateToSubmitted(UUID postId, UUID participantId, OffsetDateTime submittedAt) {
        SurveyParticipationEntity entity = requireParticipation(postId, participantId);
        entity.setStatus(STATUS_SUBMITTED);
        entity.setSubmittedAt(submittedAt);
        return toReadModel(participationJpaRepository.saveAndFlush(entity));
    }

    @Override
    public SurveyParticipationReadModel updateToWithdrawn(UUID postId, UUID participantId, OffsetDateTime withdrawnAt) {
        SurveyParticipationEntity entity = requireParticipation(postId, participantId);
        entity.setStatus(STATUS_WITHDRAWN);
        entity.setWithdrawnAt(withdrawnAt);
        return toReadModel(participationJpaRepository.saveAndFlush(entity));
    }

    @Override
    public SurveyParticipationReadModel updateToConfirmed(UUID postId, UUID participantId, OffsetDateTime confirmedAt) {
        SurveyParticipationEntity entity = requireParticipation(postId, participantId);
        entity.setStatus(STATUS_CONFIRMED);
        entity.setConfirmedAt(confirmedAt);
        return toReadModel(participationJpaRepository.saveAndFlush(entity));
    }

    @Override
    public List<SurveyParticipationReadModel> listParticipations(UUID postId) {
        return participationJpaRepository.findAllByPostIdOrderByCreatedAtDesc(postId)
                .stream()
                .map(this::toReadModel)
                .toList();
    }

    @Override
    public Map<UUID, SurveyParticipantSummary> findParticipantSummaries(Collection<UUID> participantIds) {
        Map<UUID, SurveyParticipantSummary> summaries = new LinkedHashMap<>();
        userAccountJpaRepository.findAllByIdIn(participantIds)
                .forEach(entity -> summaries.put(entity.getId(), toParticipantSummary(entity)));
        return summaries;
    }

    private SurveyParticipationEntity requireParticipation(UUID postId, UUID participantId) {
        return participationJpaRepository.findForUpdate(postId, participantId)
                .orElseThrow(() -> new IllegalStateException(
                        "Survey participation disappeared during transactional update"
                ));
    }

    private SurveyPostSummary toPostSummary(SurveyInterviewPostEntity entity) {
        return new SurveyPostSummary(
                entity.getId(),
                entity.getFounderId(),
                entity.getRecruitmentType(),
                entity.getEntryMode(),
                entity.getStatus(),
                entity.getParticipationDeadlineAt(),
                entity.getExternalUrl()
        );
    }

    private SurveyParticipationReadModel toReadModel(SurveyParticipationEntity entity) {
        return new SurveyParticipationReadModel(
                entity.getId(),
                entity.getPostId(),
                entity.getParticipantId(),
                entity.getStatus(),
                entity.getOpenedAt(),
                entity.getSubmittedAt(),
                entity.getConfirmedAt(),
                entity.getWithdrawnAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private SurveyParticipantSummary toParticipantSummary(SurveyUserAccountEntity entity) {
        return new SurveyParticipantSummary(
                entity.getId(),
                entity.getName(),
                entity.getProfileImageUrl(),
                entity.getOrganizationName()
        );
    }
}
