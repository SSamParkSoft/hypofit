package com.contentruck.hypofit.survey.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.survey.dto.SurveyParticipationActionResponse;
import com.contentruck.hypofit.survey.dto.SurveyParticipationConfirmRequest;
import com.contentruck.hypofit.survey.dto.SurveyParticipationResponse;
import com.contentruck.hypofit.survey.service.SurveyParticipationActionView;
import com.contentruck.hypofit.survey.service.SurveyParticipationReadModel;
import com.contentruck.hypofit.survey.service.SurveyParticipationService;
import com.contentruck.hypofit.survey.service.SurveyParticipationView;
import com.contentruck.hypofit.survey.service.SurveyParticipantSummary;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class SurveyParticipationControllerTest {

    @Mock
    private SurveyParticipationService surveyParticipationService;

    @Test
    void openDelegatesToServiceAndReturnsExternalUrl() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Jwt jwt = jwt(actorUserId);
        when(surveyParticipationService.open(eq(actorUserId), eq(postId)))
                .thenReturn(actionView(postId, actorUserId, "opened"));

        SurveyParticipationController controller = new SurveyParticipationController(surveyParticipationService);

        SurveyParticipationActionResponse response = controller.open(postId, jwt);

        assertThat(response.postId()).isEqualTo(postId);
        assertThat(response.status()).isEqualTo("opened");
        assertThat(response.externalUrl()).isEqualTo("https://docs.google.com/forms/d/example/viewform");
        assertThat(response.participant().id()).isEqualTo(actorUserId);
    }

    @Test
    void ownParticipationReturnsNoContentWhenNotStarted() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(surveyParticipationService.findOwn(eq(actorUserId), eq(postId))).thenReturn(Optional.empty());

        SurveyParticipationController controller = new SurveyParticipationController(surveyParticipationService);

        assertThat(controller.ownParticipation(postId, jwt(actorUserId)).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void confirmDelegatesParticipantIdFromRequestBody() {
        UUID actorUserId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(surveyParticipationService.confirm(eq(actorUserId), eq(postId), eq(participantId)))
                .thenReturn(view(postId, participantId, "confirmed"));

        SurveyParticipationController controller = new SurveyParticipationController(surveyParticipationService);

        SurveyParticipationResponse response = controller.confirm(
                postId,
                jwt(actorUserId),
                new SurveyParticipationConfirmRequest(participantId)
        );

        assertThat(response.status()).isEqualTo("confirmed");
        assertThat(response.participant().id()).isEqualTo(participantId);
    }

    @Test
    void participantsReturnsSummaryResponsesWithoutExternalUrl() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        when(surveyParticipationService.listParticipants(eq(actorUserId), eq(postId)))
                .thenReturn(List.of(view(postId, participantId, "submitted")));

        SurveyParticipationController controller = new SurveyParticipationController(surveyParticipationService);

        List<SurveyParticipationResponse> response = controller.participants(postId, jwt(actorUserId));

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().status()).isEqualTo("submitted");
        assertThat(response.getFirst().participant().id()).isEqualTo(participantId);
    }

    private Jwt jwt(UUID actorUserId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(actorUserId.toString())
                .build();
    }

    private SurveyParticipationActionView actionView(UUID postId, UUID participantId, String status) {
        return new SurveyParticipationActionView(
                participation(postId, participantId, status),
                participant(participantId),
                "https://docs.google.com/forms/d/example/viewform"
        );
    }

    private SurveyParticipationView view(UUID postId, UUID participantId, String status) {
        return new SurveyParticipationView(participation(postId, participantId, status), participant(participantId));
    }

    private SurveyParticipationReadModel participation(UUID postId, UUID participantId, String status) {
        return new SurveyParticipationReadModel(
                UUID.randomUUID(),
                postId,
                participantId,
                status,
                OffsetDateTime.of(2026, 8, 21, 9, 0, 0, 0, ZoneOffset.UTC),
                "submitted".equals(status) || "confirmed".equals(status)
                        ? OffsetDateTime.of(2026, 8, 21, 9, 5, 0, 0, ZoneOffset.UTC)
                        : null,
                "confirmed".equals(status)
                        ? OffsetDateTime.of(2026, 8, 21, 9, 10, 0, 0, ZoneOffset.UTC)
                        : null,
                null,
                OffsetDateTime.of(2026, 8, 21, 9, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 8, 21, 9, 10, 0, 0, ZoneOffset.UTC)
        );
    }

    private SurveyParticipantSummary participant(UUID participantId) {
        return new SurveyParticipantSummary(participantId, "참여자", "https://cdn.example.com/p.png", "콘텐츠럭");
    }
}
