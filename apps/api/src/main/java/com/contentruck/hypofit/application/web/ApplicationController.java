package com.contentruck.hypofit.application.web;

import com.contentruck.hypofit.application.service.ApplicationWorkflowService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping(
        value = "/api/v1/applications",
        produces = MediaType.APPLICATION_JSON_VALUE
)
@SecurityRequirement(name = "HTTPBearer")
public class ApplicationController {

    private final ApplicationWorkflowService applicationWorkflowService;

    public ApplicationController(ApplicationWorkflowService applicationWorkflowService) {
        this.applicationWorkflowService = applicationWorkflowService;
    }

    @GetMapping("/{application_id}")
    public ApplicationResponse getApplicationDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("application_id") UUID applicationId
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ApplicationResponse.from(applicationWorkflowService.getApplicationDetail(userId, applicationId));
    }

    @GetMapping("/")
    public List<ApplicationResponse> listApplications(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return applicationWorkflowService.listApplications(userId)
                .stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @PostMapping("/")
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse createApplication(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApplicationCreateRequest request
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ApplicationResponse.from(applicationWorkflowService.createApplication(
                userId,
                request.interviewPostId(),
                request.answers(),
                request.availableTimes()
        ));
    }

    @PostMapping("/{application_id}/withdraw")
    public ApplicationResponse withdrawApplication(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("application_id") UUID applicationId
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ApplicationResponse.from(applicationWorkflowService.withdrawApplication(userId, applicationId));
    }

    @PatchMapping("/{application_id}/status")
    public ApplicationResponse updateApplicationStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("application_id") UUID applicationId,
            @RequestBody ApplicationStatusUpdateRequest request
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        ApplicationStatusUpdateRequest.ValidatedStatusUpdate validated = request.validateAndNormalize();
        return ApplicationResponse.from(applicationWorkflowService.updateApplicationStatus(
                userId,
                applicationId,
                validated.status(),
                validated.rejectionReason()
        ));
    }
}
