package com.contentruck.hypofit.admin.controller;

import com.contentruck.hypofit.admin.dto.AdminModerationActionCreateRequest;
import com.contentruck.hypofit.admin.dto.AdminModerationRequestParser;
import com.contentruck.hypofit.admin.dto.AdminModerationWebModels;
import com.contentruck.hypofit.admin.service.AdminAccessService;
import com.contentruck.hypofit.admin.service.AdminModerationService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/moderation")
@SecurityRequirement(name = "HTTPBearer")
public class AdminModerationController {

    private final AdminAccessService adminAccessService;
    private final AdminModerationService adminModerationService;

    public AdminModerationController(
            AdminAccessService adminAccessService,
            AdminModerationService adminModerationService
    ) {
        this.adminAccessService = adminAccessService;
        this.adminModerationService = adminModerationService;
    }

    @PostMapping("/actions")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminModerationWebModels.ModerationActionResponse createModerationAction(
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = AdminModerationActionCreateRequest.OpenApiSchema.class))
            )
            @RequestBody AdminModerationActionCreateRequest request
    ) {
        AdminAccessService.CurrentAdmin admin = adminAccessService.requireAdmin(jwt);
        return AdminModerationWebModels.ModerationActionResponse.from(
                adminModerationService.createAction(admin.id(), AdminModerationRequestParser.parse(request))
        );
    }
}
