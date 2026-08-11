package com.contentruck.hypofit.session.web;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.application.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.application.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.application.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.application.SessionWorkflowService;
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
        ActiveUser user = currentUser(jwt);
        return sessionWorkflowService.listSessions(user.id())
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
        ActiveUser user = currentUser(jwt);
        sessionWorkflowService.requireFounderRole(user);

        ApplicationContext context = sessionWorkflowService.getApplicationContext(request.applicationId())
                .orElseThrow(() -> notFound("Application not found"));
        if (!context.post().founderId().equals(user.id())) {
            throw forbiddenDetail("Forbidden");
        }
        if (!"selected".equals(context.application().status())) {
            throw badRequestDetail("Only selected applications can be scheduled");
        }

        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.createSession(
                        context.application(),
                        context.post(),
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
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());

        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.updateSession(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        sessionWorkflowService.authorizeParticipant(user, context.application(), context.post()),
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
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.completeSession(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole
                )
        );
    }

    @PostMapping("/{session_id}/confirm-attendance")
    public SessionWebModels.ConfirmAttendanceResponse confirmAttendance(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.ConfirmAttendanceResponse.from(
                sessionWorkflowService.confirmAttendance(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole
                )
        );
    }

    @PostMapping("/{session_id}/reward/mark-paid")
    public SessionWebModels.RewardConfirmationResponse markRewardPaid(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.RewardConfirmationResponse.from(
                sessionWorkflowService.markRewardPaid(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole
                )
        );
    }

    @PostMapping("/{session_id}/reward/confirm")
    public SessionWebModels.RewardConfirmationResponse confirmRewardReceived(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.RewardConfirmationResponse.from(
                sessionWorkflowService.confirmRewardReceived(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole
                )
        );
    }

    @PostMapping("/{session_id}/reward/dispute")
    public SessionWebModels.RewardConfirmationResponse disputeReward(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.RewardDisputeRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.RewardConfirmationResponse.from(
                sessionWorkflowService.disputeReward(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole,
                        request.reason()
                )
        );
    }

    @PostMapping("/{session_id}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionWebModels.InterviewReviewResponse createReview(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.ReviewCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.InterviewReviewResponse.from(
                sessionWorkflowService.createReview(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole,
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
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return sessionWorkflowService.listReviews(context.session())
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
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.cancelSession(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole,
                        request.reason()
                )
        );
    }

    @PostMapping("/{session_id}/no-show")
    public SessionWebModels.InterviewSessionResponse markNoShow(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.NoShowRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        ActiveUser user = currentUser(jwt);
        SessionContext context = requireSessionContext(sessionId);
        String actorRole = sessionWorkflowService.authorizeParticipant(user, context.application(), context.post());
        return SessionWebModels.InterviewSessionResponse.from(
                sessionWorkflowService.markNoShow(
                        context.session(),
                        context.application(),
                        context.post(),
                        user.id(),
                        actorRole,
                        request.noShowParty()
                )
        );
    }

    private ActiveUser currentUser(Jwt jwt) {
        return sessionWorkflowService.requireActiveUser(UUID.fromString(jwt.getSubject()));
    }

    private SessionContext requireSessionContext(UUID sessionId) {
        return sessionWorkflowService.getSessionContext(sessionId)
                .orElseThrow(() -> notFound("Session not found"));
    }

    private HypofitException badRequestDetail(String detail) {
        return new HypofitException(slug(detail), detail, HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException forbiddenDetail(String detail) {
        return new HypofitException("permission_denied", "권한이 없어요.", HttpStatus.FORBIDDEN.value(), detail);
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
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
}
