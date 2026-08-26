package com.contentruck.hypofit.survey.controller;

import com.contentruck.hypofit.survey.dto.SurveyParticipationActionResponse;
import com.contentruck.hypofit.survey.dto.SurveyParticipationConfirmRequest;
import com.contentruck.hypofit.survey.dto.SurveyParticipationResponse;
import com.contentruck.hypofit.survey.service.SurveyParticipationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/v1/interview-posts/{postId}/survey")
@io.swagger.v3.oas.annotations.tags.Tag(name = "설문 참여")
@SecurityRequirement(name = "HTTPBearer")
public class SurveyParticipationController {

    private final SurveyParticipationService surveyParticipationService;

    public SurveyParticipationController(SurveyParticipationService surveyParticipationService) {
        this.surveyParticipationService = surveyParticipationService;
    }

    @PostMapping("/open")
    public SurveyParticipationActionResponse open(
            @PathVariable UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SurveyParticipationActionResponse.from(
                surveyParticipationService.open(actorUserId(jwt), postId)
        );
    }

    @PostMapping("/submit")
    public SurveyParticipationActionResponse submit(
            @PathVariable UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SurveyParticipationActionResponse.from(
                surveyParticipationService.submit(actorUserId(jwt), postId)
        );
    }

    @PostMapping("/withdraw")
    public SurveyParticipationActionResponse withdraw(
            @PathVariable UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SurveyParticipationActionResponse.from(
                surveyParticipationService.withdraw(actorUserId(jwt), postId)
        );
    }

    @PostMapping("/confirm")
    public SurveyParticipationResponse confirm(
            @PathVariable UUID postId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SurveyParticipationConfirmRequest request
    ) {
        return SurveyParticipationResponse.from(
                surveyParticipationService.confirm(actorUserId(jwt), postId, request.participantId())
        );
    }

    @GetMapping("/participants")
    public List<SurveyParticipationResponse> participants(
            @PathVariable UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return surveyParticipationService.listParticipants(actorUserId(jwt), postId)
                .stream()
                .map(SurveyParticipationResponse::from)
                .toList();
    }

    private UUID actorUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
