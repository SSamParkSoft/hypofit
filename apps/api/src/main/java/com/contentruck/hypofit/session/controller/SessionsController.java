package com.contentruck.hypofit.session.controller;

import com.contentruck.hypofit.session.dto.SessionWebModels;
import com.contentruck.hypofit.session.service.SessionWorkflowService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sessions")
@SecurityRequirement(name = "HTTPBearer")
public class SessionsController {

    private final SessionWorkflowService sessionWorkflowService;

    public SessionsController(SessionWorkflowService sessionWorkflowService) {
        this.sessionWorkflowService = sessionWorkflowService;
    }

    @GetMapping("/")
    public List<SessionWebModels.InterviewSessionResponse> listSessions(@AuthenticationPrincipal Jwt jwt) {
        return sessionWorkflowService.listSessions(currentUserId(jwt))
                .stream()
                .map(SessionWebModels.InterviewSessionResponse::from)
                .toList();
    }

    @PostMapping("/")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionWebModels.InterviewSessionResponse createSession(
            @Valid @RequestBody SessionWebModels.CreateSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.createSession(
                        currentUserId(jwt),
                        request.applicationId(),
                        request.scheduledAt(),
                        request.meetingType(),
                        request.meetingUrl(),
                        request.place()
                )
        );
    }

    @PatchMapping("/{session_id}")
    public SessionWebModels.InterviewSessionResponse updateSession(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.UpdateSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        request.validateForPatch();
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.updateSession(
                        currentUserId(jwt),
                        sessionId,
                        request.getReason(),
                        request.getScheduledAt(),
                        request.isScheduledAtPresent(),
                        request.getMeetingType(),
                        request.isMeetingTypePresent(),
                        request.getMeetingUrl(),
                        request.isMeetingUrlPresent(),
                        request.getPlace(),
                        request.isPlacePresent()
                )
        );
    }

    @PostMapping("/{session_id}/complete")
    public SessionWebModels.InterviewSessionResponse completeSession(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.completeSession(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/confirm-attendance")
    public SessionWebModels.ConfirmAttendanceResponse confirmAttendance(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.ConfirmAttendanceResponse.from(
                sessionWorkflowService.confirmAttendance(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/reward/mark-paid")
    public SessionWebModels.RewardConfirmationResponse markRewardPaid(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.RewardConfirmationResponse.from(
                sessionWorkflowService.markRewardPaid(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/reward/confirm")
    public SessionWebModels.RewardConfirmationResponse confirmRewardReceived(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.RewardConfirmationResponse.from(
                sessionWorkflowService.confirmRewardReceived(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/reward/dispute")
    public SessionWebModels.RewardConfirmationResponse disputeReward(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.RewardDisputeRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.RewardConfirmationResponse.from(
                sessionWorkflowService.disputeReward(currentUserId(jwt), sessionId, request.reason())
        );
    }

    @PostMapping("/{session_id}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionWebModels.InterviewReviewResponse createReview(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.ReviewCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewReviewResponse.from(
                sessionWorkflowService.createReview(
                        currentUserId(jwt),
                        sessionId,
                        request.rating(),
                        request.tags(),
                        request.comment()
                )
        );
    }

    @GetMapping("/{session_id}/reviews")
    public List<SessionWebModels.InterviewReviewResponse> listReviews(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return sessionWorkflowService.listReviews(currentUserId(jwt), sessionId)
                .stream()
                .map(SessionWebModels.InterviewReviewResponse::from)
                .toList();
    }

    @PostMapping("/{session_id}/cancel")
    public SessionWebModels.InterviewSessionResponse cancelSession(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.CancelSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.cancelSession(currentUserId(jwt), sessionId, request.reason())
        );
    }

    @PostMapping("/{session_id}/no-show")
    public SessionWebModels.InterviewSessionResponse markNoShow(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.NoShowRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.markNoShow(currentUserId(jwt), sessionId, request.noShowParty())
        );
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
