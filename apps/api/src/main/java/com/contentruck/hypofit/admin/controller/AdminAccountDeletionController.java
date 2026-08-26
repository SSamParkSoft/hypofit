package com.contentruck.hypofit.admin.controller;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionService;
import com.contentruck.hypofit.admin.dto.AdminAccountDeletionRequestParser;
import com.contentruck.hypofit.admin.dto.AdminAccountDeletionWebModels;
import com.contentruck.hypofit.admin.service.AdminAccessService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@io.swagger.v3.oas.annotations.tags.Tag(name = "운영자 · 계정 삭제")
@SecurityRequirement(name = "HTTPBearer")
public class AdminAccountDeletionController {

    private final AdminAccessService adminAccessService;
    private final AccountDeletionService accountDeletionService;

    public AdminAccountDeletionController(
            AdminAccessService adminAccessService,
            AccountDeletionService accountDeletionService
    ) {
        this.adminAccessService = adminAccessService;
        this.accountDeletionService = accountDeletionService;
    }

    @GetMapping("/account-deletion-requests")
    public List<AdminAccountDeletionWebModels.AdminAccountDeletionRequestResponse> listRequests(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(schema = @Schema(type = "integer", minimum = "1", maximum = "200", defaultValue = "100"))
            @RequestParam(value = "limit", required = false) String limit,
            @Parameter(schema = @Schema(types = {"null", "string"}, pattern = "^(requested|verified|in_review|completed|rejected|canceled)$"))
            @RequestParam(value = "status", required = false) String status
    ) {
        adminAccessService.requireAdmin(jwt);
        return accountDeletionService.listAdminRequests(
                        AdminAccountDeletionRequestParser.parseStatusFilter(status),
                        AdminAccountDeletionRequestParser.parseLimit(limit)
                ).stream()
                .map(AdminAccountDeletionWebModels.AdminAccountDeletionRequestResponse::from)
                .toList();
    }

    @PostMapping("/account-deletion-requests/{request_id}/retry-auth-cleanup")
    public AdminAccountDeletionWebModels.AdminAccountDeletionRequestResponse retryAuthCleanup(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(schema = @Schema(format = "uuid"))
            @PathVariable("request_id") String requestId
    ) {
        AdminAccessService.CurrentAdmin admin = adminAccessService.requireAdmin(jwt);
        return AdminAccountDeletionWebModels.AdminAccountDeletionRequestResponse.from(
                accountDeletionService.retryAuthCleanup(
                        AdminAccountDeletionRequestParser.parseRequestId(requestId),
                        admin.id()
                )
        );
    }
}
