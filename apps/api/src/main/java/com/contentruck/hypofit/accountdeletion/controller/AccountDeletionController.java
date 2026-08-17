package com.contentruck.hypofit.accountdeletion.controller;


import com.contentruck.hypofit.accountdeletion.service.AccountDeletionService;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.AccountDeletionRequestResponse;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.AccountDeletionVerificationResponse;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.AuthenticatedCreateRequest;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.ConfirmRequest;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.PublicAccountDeletionRequestResponse;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.PublicAccountDeletionVerificationResponse;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.PublicCreateRequest;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.ResendRequest;
import com.contentruck.hypofit.accountdeletion.dto.AccountDeletionWebModels.VerifyRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account-deletion-requests")
public class AccountDeletionController {

    private final AccountDeletionService accountDeletionService;

    public AccountDeletionController(AccountDeletionService accountDeletionService) {
        this.accountDeletionService = accountDeletionService;
    }

    @PostMapping("/public")
    @ResponseStatus(HttpStatus.CREATED)
    public PublicAccountDeletionRequestResponse createPublicRequest(@RequestBody PublicCreateRequest request) {
        return PublicAccountDeletionRequestResponse.from(accountDeletionService.createPublicRequest(request.toCommand()));
    }

    @PostMapping("/public/verify")
    public PublicAccountDeletionVerificationResponse verifyPublicRequest(@RequestBody VerifyRequest request) {
        return PublicAccountDeletionVerificationResponse.from(accountDeletionService.verifyPublicRequest(request.toCommand()));
    }

    @PostMapping("/public/resend")
    public PublicAccountDeletionRequestResponse resendPublicRequest(@RequestBody ResendRequest request) {
        return PublicAccountDeletionRequestResponse.from(accountDeletionService.resendPublicRequest(request.toCommand()));
    }

    @PostMapping("/public/confirm")
    public PublicAccountDeletionRequestResponse confirmPublicRequest(@RequestBody ConfirmRequest request) {
        return PublicAccountDeletionRequestResponse.from(accountDeletionService.confirmPublicRequest(request.toCommand()));
    }

    @PostMapping("/me")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "HTTPBearer")
    public AccountDeletionRequestResponse createAuthenticatedRequest(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody AuthenticatedCreateRequest request
    ) {
        return AccountDeletionRequestResponse.from(
                accountDeletionService.createAuthenticatedRequest(currentUserId(jwt), request.toCommand())
        );
    }

    @PostMapping("/me/verify")
    @SecurityRequirement(name = "HTTPBearer")
    public AccountDeletionVerificationResponse verifyAuthenticatedRequest(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody VerifyRequest request
    ) {
        return AccountDeletionVerificationResponse.from(
                accountDeletionService.verifyAuthenticatedRequest(currentUserId(jwt), request.toCommand())
        );
    }

    @PostMapping("/me/resend")
    @SecurityRequirement(name = "HTTPBearer")
    public AccountDeletionRequestResponse resendAuthenticatedRequest(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody ResendRequest request
    ) {
        return AccountDeletionRequestResponse.from(
                accountDeletionService.resendAuthenticatedRequest(currentUserId(jwt), request.toCommand())
        );
    }

    @PostMapping("/me/confirm")
    @SecurityRequirement(name = "HTTPBearer")
    public AccountDeletionRequestResponse confirmAuthenticatedRequest(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody ConfirmRequest request
    ) {
        return AccountDeletionRequestResponse.from(
                accountDeletionService.confirmAuthenticatedRequest(currentUserId(jwt), request.toCommand())
        );
    }

    @PostMapping("/me/delete")
    @Deprecated
    @Operation(deprecated = true)
    @SecurityRequirement(name = "HTTPBearer")
    public AccountDeletionRequestResponse deleteAuthenticatedAccount(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody AuthenticatedCreateRequest request
    ) {
        return AccountDeletionRequestResponse.from(
                accountDeletionService.deactivateCurrentUser(currentUserId(jwt), request.toCommand())
        );
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
