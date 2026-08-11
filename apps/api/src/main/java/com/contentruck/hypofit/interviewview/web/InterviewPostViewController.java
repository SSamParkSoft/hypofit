package com.contentruck.hypofit.interviewview.web;

import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.interviewview.application.InterviewPostViewService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "HTTPBearer")
public class InterviewPostViewController {

    private final InterviewPostViewService service;

    public InterviewPostViewController(InterviewPostViewService service) {
        this.service = service;
    }

    @GetMapping("/interview-post-views/")
    public List<InterviewPostViewResponse> listInterviewPostViews(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return service.listViews(userId)
                .stream()
                .map(InterviewPostViewResponse::from)
                .toList();
    }

    @PostMapping("/interview-posts/{post_id}/view")
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewPostViewResponse markInterviewPostViewed(
            @PathVariable("post_id") UUID postId,
            @Valid @RequestBody InterviewPostViewCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = currentUserId(jwt);
        return InterviewPostViewResponse.from(service.markViewed(userId, postId, request.source()));
    }

    private UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AuthRequiredException("JWT subject is missing");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
