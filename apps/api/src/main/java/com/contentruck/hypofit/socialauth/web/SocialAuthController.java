package com.contentruck.hypofit.socialauth.web;

import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.socialauth.application.AppleSignInNotificationService;
import com.contentruck.hypofit.socialauth.application.SocialAuthService;
import com.contentruck.hypofit.socialauth.domain.SocialAuthReadModels;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/auth/social")
public class SocialAuthController {

    private final SocialAuthService service;
    private final AppleSignInNotificationService appleSignInNotificationService;

    public SocialAuthController(
            SocialAuthService service,
            AppleSignInNotificationService appleSignInNotificationService
    ) {
        this.service = service;
        this.appleSignInNotificationService = appleSignInNotificationService;
    }

    @PostMapping("/apple/notifications")
    public AppleSignInNotificationAccepted receiveAppleSignInNotifications(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = AppleSignInNotificationReceive.OpenApiSchema.class))
            )
            @Valid @RequestBody AppleSignInNotificationReceive request
    ) {
        return appleSignInNotificationService.processNotification(request);
    }

    @PostMapping("/attempts")
    @ResponseStatus(HttpStatus.CREATED)
    public SocialAuthAttemptResponse createAttempt(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = SocialAuthAttemptCreateRequest.OpenApiSchema.class))
            )
            @Valid @RequestBody SocialAuthAttemptCreateRequest request
    ) {
        SocialAuthReadModels.AttemptReadModel attempt = service.createAttempt(
                request.provider(),
                request.platform(),
                request.flow(),
                request.return_path()
        );
        return SocialAuthAttemptResponse.from(attempt);
    }

    @GetMapping("/identities")
    @SecurityRequirement(name = "HTTPBearer")
    public SocialIdentityListResponse listIdentities(@AuthenticationPrincipal Jwt jwt) {
        return SocialIdentityListResponse.from(service.listIdentities(currentUserId(jwt)));
    }

    @PostMapping("/identities/link-attempts")
    @SecurityRequirement(name = "HTTPBearer")
    @ResponseStatus(HttpStatus.CREATED)
    public SocialAuthAttemptResponse createLinkAttempt(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = SocialAuthLinkAttemptCreateRequest.OpenApiSchema.class))
            )
            @Valid @RequestBody SocialAuthLinkAttemptCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID authUserId = currentUserId(jwt);
        SocialAuthReadModels.AttemptReadModel attempt = service.createLinkAttempt(
                authUserId,
                request.provider(),
                request.platform(),
                request.return_path()
        );
        return SocialAuthAttemptResponse.from(attempt);
    }

    @PostMapping("/complete")
    @SecurityRequirement(name = "HTTPBearer")
    public SocialAuthCompleteResponse completeAttempt(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = SocialAuthCompleteRequest.OpenApiSchema.class))
            )
            @Valid @RequestBody SocialAuthCompleteRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        SocialAuthReadModels.CompleteReadModel result = service.completeAttempt(
                currentUserId(jwt),
                request.attempt_id(),
                request.attempt_secret()
        );
        return SocialAuthCompleteResponse.from(result);
    }

    @PostMapping("/identities/reconcile")
    @SecurityRequirement(name = "HTTPBearer")
    public SocialIdentityReconcileResponse reconcileIdentities(@AuthenticationPrincipal Jwt jwt) {
        UUID authUserId = currentUserId(jwt);
        return SocialIdentityReconcileResponse.from(service.reconcileIdentities(authUserId, authUserId));
    }

    private UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AuthRequiredException("JWT subject is missing");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
