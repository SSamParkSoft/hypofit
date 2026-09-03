package com.contentruck.hypofit.interview.controller;

import com.contentruck.hypofit.interview.dto.InterviewPostCreateRequest;
import com.contentruck.hypofit.interview.dto.InterviewPostCreationCapabilitiesResponse;
import com.contentruck.hypofit.interview.dto.InterviewPostListRequest;
import com.contentruck.hypofit.interview.dto.InterviewPostRequestParser;
import com.contentruck.hypofit.interview.dto.InterviewPostResponse;
import com.contentruck.hypofit.interview.dto.InterviewPostStatusUpdateRequest;
import com.contentruck.hypofit.interview.dto.InterviewPostUpdateRequest;
import com.contentruck.hypofit.interview.service.InterviewAdminPolicy;
import com.contentruck.hypofit.interview.service.InterviewPostQueryService;
import com.contentruck.hypofit.interview.service.InterviewPostWriteService;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/interview-posts")
@io.swagger.v3.oas.annotations.tags.Tag(name = "모집글")
@SecurityRequirement(name = "HTTPBearer")
public class InterviewPostController {

    private static final String RECRUITMENT_TYPES_FEATURE = "recruitment-types-v1";

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
    @Operation(summary = "모집글 목록 검색")
    public List<InterviewPostResponse> listInterviewPosts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Hypofit-Features", required = false) String featuresHeader,
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
        boolean supportsRecruitmentTypes = supportsRecruitmentTypes(featuresHeader);

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

        return interviewPostQueryService.listPosts(request.toCriteria(viewerId, isAdmin, supportsRecruitmentTypes))
                .stream()
                .map(InterviewPostResponse::from)
                .toList();
    }

    @GetMapping("/{post_id}")
    @Operation(summary = "모집글 상세 조회")
    public InterviewPostResponse getInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Hypofit-Features", required = false) String featuresHeader
    ) {
        UUID viewerId = jwt == null ? null : UUID.fromString(jwt.getSubject());
        boolean isAdmin = jwt != null && interviewAdminPolicy.isAdminEmail(jwt.getClaimAsString("email"));
        return InterviewPostResponse.from(
                interviewPostQueryService.getVisiblePost(
                        postId,
                        viewerId,
                        isAdmin,
                        supportsRecruitmentTypes(featuresHeader)
                )
        );
    }

    @GetMapping("/creation-capabilities")
    @Operation(summary = "모집글 작성 가능 유형")
    public InterviewPostCreationCapabilitiesResponse getCreationCapabilities() {
        return new InterviewPostCreationCapabilitiesResponse(
                interviewPostWriteService.enabledRecruitmentTypesForCreation(),
                interviewPostWriteService.directParticipationRecruitmentTypesForCreation()
        );
    }

    @PostMapping("/")
    @Operation(summary = "모집글 작성")
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
                interviewPostWriteService.createPost(
                        actorUserId,
                        InterviewPostRequestParser.parseCreate(request),
                        InterviewPostRequestParser.parseClientSubmissionId(request)
                )
        );
    }

    @PatchMapping("/{post_id}")
    @Operation(summary = "모집글 수정")
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
    @Operation(summary = "모집 마감")
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
    @Operation(summary = "모집글 보관")
    public InterviewPostResponse archiveInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        return InterviewPostResponse.from(interviewPostWriteService.archivePost(actorUserId, postId));
    }

    @PostMapping("/{post_id}/reopen")
    @Operation(summary = "모집 재개")
    public InterviewPostResponse reopenInterviewPost(
            @PathVariable("post_id") UUID postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        return InterviewPostResponse.from(interviewPostWriteService.reopenPost(actorUserId, postId));
    }

    private boolean supportsRecruitmentTypes(String featuresHeader) {
        if (featuresHeader == null || featuresHeader.isBlank()) {
            return false;
        }
        for (String token : featuresHeader.split(",")) {
            if (RECRUITMENT_TYPES_FEATURE.equals(token.trim())) {
                return true;
            }
        }
        return false;
    }
}
