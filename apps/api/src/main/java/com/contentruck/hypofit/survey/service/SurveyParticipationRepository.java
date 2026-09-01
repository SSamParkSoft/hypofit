package com.contentruck.hypofit.survey.service;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface SurveyParticipationRepository {

    Optional<SurveyActorAccount> findUserAccount(UUID userId);

    Optional<SurveyPostSummary> findPost(UUID postId);

    Optional<SurveyParticipationReadModel> findParticipationForUpdate(UUID postId, UUID participantId);

    Optional<SurveyParticipationReadModel> findParticipation(UUID postId, UUID participantId);

    boolean hasSelectedApplication(UUID postId, UUID participantId);

    SurveyParticipationReadModel createOpenedParticipation(UUID postId, UUID participantId, OffsetDateTime openedAt);

    SurveyParticipationReadModel updateToSubmitted(UUID postId, UUID participantId, OffsetDateTime submittedAt);

    SurveyParticipationReadModel updateToWithdrawn(UUID postId, UUID participantId, OffsetDateTime withdrawnAt);

    SurveyParticipationReadModel updateToConfirmed(UUID postId, UUID participantId, OffsetDateTime confirmedAt);

    List<SurveyParticipationReadModel> listParticipations(UUID postId);

    Map<UUID, SurveyParticipantSummary> findParticipantSummaries(Collection<UUID> participantIds);
}
