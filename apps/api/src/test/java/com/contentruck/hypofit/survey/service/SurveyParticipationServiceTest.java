package com.contentruck.hypofit.survey.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SurveyParticipationServiceTest {

    private static final OffsetDateTime NOW = OffsetDateTime.of(2026, 8, 21, 12, 0, 0, 0, ZoneOffset.UTC);

    @Mock
    private SurveyParticipationRepository repository;

    private SurveyParticipationService service;

    @BeforeEach
    void setUp() {
        service = new SurveyParticipationService(
                repository,
                Clock.fixed(Instant.parse("2026-08-21T12:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void openCreatesOpenedParticipationWhenEligible() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        SurveyPostSummary post = surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1));
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(post));
        when(repository.findParticipationForUpdate(postId, actorUserId)).thenReturn(Optional.empty());
        when(repository.createOpenedParticipation(postId, actorUserId, NOW))
                .thenReturn(participation(postId, actorUserId, "opened"));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.open(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("opened");
        assertThat(response.externalUrl()).isEqualTo(post.externalUrl());
        verify(repository).createOpenedParticipation(postId, actorUserId, NOW);
    }

    @Test
    void openBlocksApplicationRequiredSurveyUntilApplicantIsSelected() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        SurveyPostSummary post = new SurveyPostSummary(
                postId,
                UUID.randomUUID(),
                "survey",
                "application_required",
                "open",
                NOW.plusDays(1),
                "https://forms.example.com/approved-only"
        );
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(post));
        when(repository.hasSelectedApplication(postId, actorUserId)).thenReturn(false);

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_access_not_granted");
        verify(repository, never()).createOpenedParticipation(postId, actorUserId, NOW);
    }

    @Test
    void openAllowsApplicationRequiredSurveyWhenApplicantIsSelected() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        SurveyPostSummary post = new SurveyPostSummary(
                postId,
                UUID.randomUUID(),
                "survey",
                "application_required",
                "open",
                NOW.plusDays(1),
                "https://forms.example.com/approved-only"
        );
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(post));
        when(repository.hasSelectedApplication(postId, actorUserId)).thenReturn(true);
        when(repository.findParticipationForUpdate(postId, actorUserId)).thenReturn(Optional.empty());
        when(repository.createOpenedParticipation(postId, actorUserId, NOW))
                .thenReturn(participation(postId, actorUserId, "opened"));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.open(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("opened");
        assertThat(response.externalUrl()).isEqualTo("https://forms.example.com/approved-only");
        verify(repository).createOpenedParticipation(postId, actorUserId, NOW);
    }

    @Test
    void findOwnReturnsEmptyWhenParticipantHasNotStartedSurvey() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1))));
        when(repository.findParticipation(postId, actorUserId)).thenReturn(Optional.empty());

        assertThat(service.findOwn(actorUserId, postId)).isEmpty();
    }

    @Test
    void findOwnReturnsExistingParticipationWithoutExternalUrl() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        SurveyPostSummary post = surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1));
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(post));
        when(repository.findParticipation(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "submitted")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationView response = service.findOwn(actorUserId, postId).orElseThrow();

        assertThat(response.participation().status()).isEqualTo("submitted");
    }

    @Test
    void openIsIdempotentForSubmittedParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "closed", NOW.minusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "submitted")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.open(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("submitted");
        verify(repository, never()).createOpenedParticipation(postId, actorUserId, NOW);
    }

    @Test
    void openIsIdempotentForOpenedParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "closed", NOW.minusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "opened")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.open(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("opened");
        verify(repository, never()).createOpenedParticipation(postId, actorUserId, NOW);
    }

    @Test
    void openIsIdempotentForConfirmedParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "closed", NOW.minusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "confirmed")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.open(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("confirmed");
        verify(repository, never()).createOpenedParticipation(postId, actorUserId, NOW);
    }

    @Test
    void openRejectsWithdrawnParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "withdrawn")));

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_participation_invalid_state");
    }

    @Test
    void openRejectsSelfParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, actorUserId, "open", NOW.plusDays(1))));

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("self_participation_forbidden");
    }

    @Test
    void openRejectsClosedSurvey() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "closed", NOW.plusDays(1))));

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_not_available");
    }

    @Test
    void openRejectsPastDeadline() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "open", NOW.minusMinutes(1))));

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_not_available");
    }

    @Test
    void openRejectsSurveyWithoutExternalUrl() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(new SurveyPostSummary(
                postId,
                UUID.randomUUID(),
                "survey",
                "direct",
                "open",
                NOW.plusDays(1),
                null
        )));
        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_link_unavailable");
    }

    @Test
    void submitTransitionsOpenedToSubmitted() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "opened")));
        when(repository.updateToSubmitted(postId, actorUserId, NOW))
                .thenReturn(participation(postId, actorUserId, "submitted"));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.submit(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("submitted");
        verify(repository).updateToSubmitted(postId, actorUserId, NOW);
    }

    @Test
    void submitRejectsPastDeadline() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(
                surveyPost(postId, UUID.randomUUID(), "open", NOW.minusMinutes(1))
        ));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "opened")));

        assertThatThrownBy(() -> service.submit(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_not_available");
    }

    @Test
    void submitIsIdempotentForConfirmedParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "closed", NOW.minusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "confirmed")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.submit(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("confirmed");
        verify(repository, never()).updateToSubmitted(postId, actorUserId, NOW);
    }

    @Test
    void submitIsIdempotentForSubmittedParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "closed", NOW.minusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "submitted")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.submit(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("submitted");
        verify(repository, never()).updateToSubmitted(postId, actorUserId, NOW);
    }

    @Test
    void submitRejectsMissingParticipation() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("survey_participation_invalid_state");
    }

    @Test
    void withdrawTransitionsSubmittedToWithdrawn() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, UUID.randomUUID(), "open", NOW.plusDays(1))));
        when(repository.findParticipationForUpdate(postId, actorUserId))
                .thenReturn(Optional.of(participation(postId, actorUserId, "submitted")));
        when(repository.updateToWithdrawn(postId, actorUserId, NOW))
                .thenReturn(participation(postId, actorUserId, "withdrawn"));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(actorUserId, participant(actorUserId)));

        SurveyParticipationActionView response = service.withdraw(actorUserId, postId);

        assertThat(response.participation().status()).isEqualTo("withdrawn");
        verify(repository).updateToWithdrawn(postId, actorUserId, NOW);
    }

    @Test
    void confirmRequiresOrganizer() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, founderId, "open", NOW.plusDays(1))));

        assertThatThrownBy(() -> service.confirm(actorUserId, postId, UUID.randomUUID()))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("permission_denied");
    }

    @Test
    void confirmTransitionsSubmittedToConfirmed() {
        UUID organizerId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(organizerId)).thenReturn(Optional.of(activeAccount(organizerId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, organizerId, "closed", NOW.minusDays(2))));
        when(repository.findParticipationForUpdate(postId, participantId))
                .thenReturn(Optional.of(participation(postId, participantId, "submitted")));
        when(repository.updateToConfirmed(postId, participantId, NOW))
                .thenReturn(participation(postId, participantId, "confirmed"));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(participantId, participant(participantId)));

        SurveyParticipationView response = service.confirm(organizerId, postId, participantId);

        assertThat(response.participation().status()).isEqualTo("confirmed");
        assertThat(response.participant().id()).isEqualTo(participantId);
    }

    @Test
    void confirmIsIdempotentForConfirmedParticipation() {
        UUID organizerId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(organizerId)).thenReturn(Optional.of(activeAccount(organizerId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, organizerId, "closed", NOW.minusDays(2))));
        when(repository.findParticipationForUpdate(postId, participantId))
                .thenReturn(Optional.of(participation(postId, participantId, "confirmed")));
        when(repository.findParticipantSummaries(anyCollection()))
                .thenReturn(Map.of(participantId, participant(participantId)));

        SurveyParticipationView response = service.confirm(organizerId, postId, participantId);

        assertThat(response.participation().status()).isEqualTo("confirmed");
        verify(repository, never()).updateToConfirmed(postId, participantId, NOW);
    }

    @Test
    void listParticipantsRequiresOrganizer() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, founderId, "open", NOW.plusDays(1))));

        assertThatThrownBy(() -> service.listParticipants(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("permission_denied");
    }

    @Test
    void listParticipantsResolvesParticipantProfiles() {
        UUID organizerId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(organizerId)).thenReturn(Optional.of(activeAccount(organizerId)));
        when(repository.findPost(postId)).thenReturn(Optional.of(surveyPost(postId, organizerId, "archived", NOW.minusDays(1))));
        when(repository.listParticipations(postId)).thenReturn(List.of(participation(postId, participantId, "confirmed")));
        when(repository.findParticipantSummaries(eq(List.of(participantId))))
                .thenReturn(Map.of(participantId, participant(participantId)));

        List<SurveyParticipationView> response = service.listParticipants(organizerId, postId);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().participant().name()).isEqualTo("참여자");
        assertThat(response.getFirst().participation().status()).isEqualTo("confirmed");
    }

    @Test
    void openRequiresActiveExistingAccount() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(UserProfileMissingException.class);
    }

    @Test
    void openRejectsDeletedAccount() {
        UUID actorUserId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId))
                .thenReturn(Optional.of(new SurveyActorAccount(actorUserId, true, false)));

        assertThatThrownBy(() -> service.open(actorUserId, UUID.randomUUID()))
                .isInstanceOf(UserAccountDeletedException.class);
    }

    @Test
    void openRejectsDeactivatedAccount() {
        UUID actorUserId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId))
                .thenReturn(Optional.of(new SurveyActorAccount(actorUserId, false, true)));

        assertThatThrownBy(() -> service.open(actorUserId, UUID.randomUUID()))
                .isInstanceOf(UserAccountDeactivatedException.class);
    }

    @Test
    void openRejectsNonSurveyPosts() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeAccount(actorUserId)));
        when(repository.findPost(postId))
                .thenReturn(Optional.of(new SurveyPostSummary(
                        postId,
                        UUID.randomUUID(),
                        "interview",
                        "open",
                        NOW.plusDays(1),
                        "https://docs.google.com/forms/d/example/viewform"
                )));

        assertThatThrownBy(() -> service.open(actorUserId, postId))
                .isInstanceOf(HypofitException.class)
                .extracting(error -> ((HypofitException) error).getCode())
                .isEqualTo("recruitment_type_action_not_allowed");
    }

    private SurveyActorAccount activeAccount(UUID userId) {
        return new SurveyActorAccount(userId, false, false);
    }

    private SurveyPostSummary surveyPost(
            UUID postId,
            UUID founderId,
            String status,
            OffsetDateTime deadline
    ) {
        return new SurveyPostSummary(
                postId,
                founderId,
                "survey",
                status,
                deadline,
                "https://docs.google.com/forms/d/example/viewform"
        );
    }

    private SurveyParticipationReadModel participation(UUID postId, UUID participantId, String status) {
        return new SurveyParticipationReadModel(
                UUID.randomUUID(),
                postId,
                participantId,
                status,
                OffsetDateTime.of(2026, 8, 21, 11, 0, 0, 0, ZoneOffset.UTC),
                "submitted".equals(status) || "confirmed".equals(status) || "withdrawn".equals(status)
                        ? OffsetDateTime.of(2026, 8, 21, 11, 10, 0, 0, ZoneOffset.UTC)
                        : null,
                "confirmed".equals(status)
                        ? OffsetDateTime.of(2026, 8, 21, 11, 20, 0, 0, ZoneOffset.UTC)
                        : null,
                "withdrawn".equals(status)
                        ? OffsetDateTime.of(2026, 8, 21, 11, 30, 0, 0, ZoneOffset.UTC)
                        : null,
                OffsetDateTime.of(2026, 8, 21, 11, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 8, 21, 11, 30, 0, 0, ZoneOffset.UTC)
        );
    }

    private SurveyParticipantSummary participant(UUID participantId) {
        return new SurveyParticipantSummary(
                participantId,
                "참여자",
                "https://cdn.example.com/profile.png",
                "콘텐츠럭"
        );
    }
}
