package com.contentruck.hypofit.interview.web;

import com.contentruck.hypofit.interview.application.InterviewAdminPolicy;
import com.contentruck.hypofit.interview.application.InterviewPostQueryService;
import com.contentruck.hypofit.interview.application.InterviewPostWriteService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/interview-posts")
@SecurityRequirement(name = "HTTPBearer")
public class InterviewPostController {

    private final InterviewPostQueryService interviewPostQueryService;
    private final InterviewPostWriteService interviewPostWriteService;
    private final InterviewAdminPolicy interviewAdminPolicy;

    public InterviewPostController(
            InterviewPostQueryService interviewPostQueryService,
            InterviewPostWriteService interviewPostWriteService,
            InterviewAdminPolicy interviewAdminPolicy
    ) {
        this.interviewPostQueryService = interviewPostQueryService;
        this.interviewPostWriteService = interviewPostWriteService;
        this.interviewAdminPolicy = interviewAdminPolicy;
    }

    @GetMapping("/")
    public List<InterviewPostResponse> listInterviewPosts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "mode", required = false) String mode,
            @RequestParam(name = "founder_id", required = false) UUID founderId,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "reward_min", required = false) Integer rewardMin,
            @RequestParam(name = "reward_max", required = false) Integer rewardMax,
            @RequestParam(name = "lat", required = false) Double lat,
            @RequestParam(name = "lng", required = false) Double lng,
            @RequestParam(name = "radius_m", required = false) Integer radiusM,
            @RequestParam(name = "sort", defaultValue = "newest") String sort,
            @RequestParam(name = "limit", defaultValue = "100") Integer limit
    ) {
        UUID viewerId = jwt == null ? null : UUID.fromString(jwt.getSubject());
        boolean isAdmin = jwt != null && interviewAdminPolicy.isAdminEmail(jwt.getClaimAsString("email"));

        InterviewPostListRequest request = new InterviewPostListRequest(
                status,
                mode,
                founderId,
                q,
                rewardMin,
                rewardMax,
                lat,
                lng,
                radiusM,
                sort,
                limit
        );

        return interviewPostQueryService.listPosts(request.toCriteria(viewerId, isAdmin))
                .stream()
                .map(InterviewPostResponse::from)
                .toList();
    }

    @GetMapping("/{post_id}")
    public InterviewPostResponse getInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID viewerId = jwt == null ? null : UUID.fromString(jwt.getSubject());
        boolean isAdmin = jwt != null && interviewAdminPolicy.isAdminEmail(jwt.getClaimAsString("email"));
        return InterviewPostResponse.from(interviewPostQueryService.getVisiblePost(postId, viewerId, isAdmin));
    }

    @PostMapping("/")
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewPostResponse createInterviewPost(
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = InterviewPostCreateRequest.OpenApiSchema.class))
            )
            @RequestBody InterviewPostCreateRequest request
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        return InterviewPostResponse.from(
                interviewPostWriteService.createPost(actorUserId, InterviewPostRequestParser.parseCreate(request))
        );
    }

    @PatchMapping("/{post_id}")
    public InterviewPostResponse updateInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = InterviewPostUpdateRequest.OpenApiSchema.class))
            )
            @RequestBody InterviewPostUpdateRequest request
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        return InterviewPostResponse.from(
                interviewPostWriteService.updatePost(actorUserId, postId, InterviewPostRequestParser.parseUpdate(request))
        );
    }

    @PatchMapping("/{post_id}/status")
    public InterviewPostResponse updateInterviewPostStatus(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = InterviewPostStatusUpdateRequest.OpenApiSchema.class))
            )
            @RequestBody InterviewPostStatusUpdateRequest request
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        InterviewPostRequestParser.parseCloseStatus(request);
        return InterviewPostResponse.from(interviewPostWriteService.closePost(actorUserId, postId));
    }

    @PostMapping("/{post_id}/archive")
    public InterviewPostResponse archiveInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        return InterviewPostResponse.from(interviewPostWriteService.archivePost(actorUserId, postId));
    }

    @PostMapping("/{post_id}/reopen")
    public InterviewPostResponse reopenInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        return InterviewPostResponse.from(interviewPostWriteService.reopenPost(actorUserId, postId));
    }
}
