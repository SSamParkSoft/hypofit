package com.contentruck.hypofit.session.controller;

import com.contentruck.hypofit.session.dto.SessionWebModels;
import com.contentruck.hypofit.session.service.SessionAttendanceService;
import com.contentruck.hypofit.session.service.SessionQueryService;
import com.contentruck.hypofit.session.service.SessionReviewService;
import com.contentruck.hypofit.session.service.SessionRewardService;
import com.contentruck.hypofit.session.service.SessionSchedulingService;
import io.swagger.v3.oas.annotations.Operation;
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
@io.swagger.v3.oas.annotations.tags.Tag(name = "인터뷰 진행")
@SecurityRequirement(name = "HTTPBearer")
public class SessionsController {

    private final SessionQueryService queryService;
    private final SessionSchedulingService schedulingService;
    private final SessionAttendanceService attendanceService;
    private final SessionRewardService rewardService;
    private final SessionReviewService reviewService;

    public SessionsController(
            SessionQueryService queryService,
            SessionSchedulingService schedulingService,
            SessionAttendanceService attendanceService,
            SessionRewardService rewardService,
            SessionReviewService reviewService
    ) {
        this.queryService = queryService;
        this.schedulingService = schedulingService;
        this.attendanceService = attendanceService;
        this.rewardService = rewardService;
        this.reviewService = reviewService;
    }

    @GetMapping("/")
    @Operation(summary = "인터뷰 일정 목록")
    public List<SessionWebModels.InterviewSessionResponse> listSessions(@AuthenticationPrincipal Jwt jwt) {
        return queryService.listSessions(currentUserId(jwt))
                .stream()
                .map(SessionWebModels.InterviewSessionResponse::from)
                .toList();
    }

    @PostMapping("/")
    @Operation(summary = "인터뷰 일정 생성")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionWebModels.InterviewSessionResponse createSession(
            @Valid @RequestBody SessionWebModels.CreateSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                schedulingService.createSession(
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
    @Operation(summary = "인터뷰 일정 수정")
    public SessionWebModels.InterviewSessionResponse updateSession(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.UpdateSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        request.validateForPatch();
        return SessionWebModels.InterviewSessionResponse.from(
                schedulingService.updateSession(
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
    @Operation(summary = "인터뷰 완료 처리")
    public SessionWebModels.InterviewSessionResponse completeSession(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                attendanceService.completeSession(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/confirm-attendance")
    @Operation(summary = "참석 확인")
    public SessionWebModels.ConfirmAttendanceResponse confirmAttendance(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.ConfirmAttendanceResponse.from(
                attendanceService.confirmAttendance(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/reward/mark-paid")
    @Operation(summary = "사례비 지급 표시")
    public SessionWebModels.RewardConfirmationResponse markRewardPaid(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.RewardConfirmationResponse.from(
                rewardService.markRewardPaid(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/reward/confirm")
    @Operation(summary = "사례비 수령 확인")
    public SessionWebModels.RewardConfirmationResponse confirmRewardReceived(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.RewardConfirmationResponse.from(
                rewardService.confirmRewardReceived(currentUserId(jwt), sessionId)
        );
    }

    @PostMapping("/{session_id}/reward/dispute")
    @Operation(summary = "사례비 이의 제기")
    public SessionWebModels.RewardConfirmationResponse disputeReward(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.RewardDisputeRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.RewardConfirmationResponse.from(
                rewardService.disputeReward(currentUserId(jwt), sessionId, request.reason())
        );
    }

    @PostMapping("/{session_id}/reviews")
    @Operation(summary = "후기 작성")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionWebModels.InterviewReviewResponse createReview(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.ReviewCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewReviewResponse.from(
                reviewService.createReview(
                        currentUserId(jwt),
                        sessionId,
                        request.rating(),
                        request.tags(),
                        request.comment()
                )
        );
    }

    @GetMapping("/{session_id}/reviews")
    @Operation(summary = "후기 목록")
    public List<SessionWebModels.InterviewReviewResponse> listReviews(
            @PathVariable("session_id") UUID sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return reviewService.listReviews(currentUserId(jwt), sessionId)
                .stream()
                .map(SessionWebModels.InterviewReviewResponse::from)
                .toList();
    }

    @PostMapping("/{session_id}/cancel")
    @Operation(summary = "인터뷰 취소")
    public SessionWebModels.InterviewSessionResponse cancelSession(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.CancelSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                schedulingService.cancelSession(currentUserId(jwt), sessionId, request.reason())
        );
    }

    @PostMapping("/{session_id}/no-show")
    @Operation(summary = "노쇼 기록")
    public SessionWebModels.InterviewSessionResponse markNoShow(
            @PathVariable("session_id") UUID sessionId,
            @Valid @RequestBody SessionWebModels.NoShowRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return SessionWebModels.InterviewSessionResponse.from(
                attendanceService.markNoShow(currentUserId(jwt), sessionId, request.noShowParty())
        );
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
