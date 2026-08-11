package com.contentruck.hypofit.admin.web;

import com.contentruck.hypofit.admin.application.AdminAccessService;
import com.contentruck.hypofit.admin.application.AdminOperationsService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@SecurityRequirement(name = "HTTPBearer")
public class AdminOperationsController {

    private final AdminAccessService adminAccessService;
    private final AdminOperationsService adminOperationsService;

    public AdminOperationsController(
            AdminAccessService adminAccessService,
            AdminOperationsService adminOperationsService
    ) {
        this.adminAccessService = adminAccessService;
        this.adminOperationsService = adminOperationsService;
    }

    @GetMapping("/me")
    public AdminOperationsWebModels.AdminMeResponse getAdminMe(@AuthenticationPrincipal Jwt jwt) {
        return AdminOperationsWebModels.AdminMeResponse.from(adminAccessService.requireAdmin(jwt));
    }

    @GetMapping("/summary")
    public AdminOperationsWebModels.AdminSummaryResponse getAdminSummary(@AuthenticationPrincipal Jwt jwt) {
        adminAccessService.requireAdmin(jwt);
        return AdminOperationsWebModels.AdminSummaryResponse.from(adminOperationsService.getSummary());
    }

    @GetMapping("/targets/{target_type}/{target_id}")
    public AdminOperationsWebModels.AdminTargetPreviewResponse getTargetPreview(
            @PathVariable("target_type") String targetType,
            @PathVariable("target_id") UUID targetId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        adminAccessService.requireAdmin(jwt);
        return AdminOperationsWebModels.AdminTargetPreviewResponse.from(
                adminOperationsService.getTargetPreview(AdminOperationsRequestParser.parseTargetType(targetType), targetId)
        );
    }

    @PostMapping("/notifications/test")
    public AdminOperationsWebModels.AdminTestNotificationResponse createTestNotification(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = AdminTestNotificationCreateRequest.OpenApiSchema.class))
            )
            @RequestBody AdminTestNotificationCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        adminAccessService.requireAdmin(jwt);
        return AdminOperationsWebModels.AdminTestNotificationResponse.from(
                adminOperationsService.createTestNotification(AdminOperationsRequestParser.parseTestNotification(request))
        );
    }

    @PostMapping("/push-deliveries/dispatch")
    public AdminOperationsWebModels.PushDispatchResultResponse dispatchPendingPushDeliveries(
            @AuthenticationPrincipal Jwt jwt
    ) {
        adminAccessService.requireAdmin(jwt);
        return AdminOperationsWebModels.PushDispatchResultResponse.from(
                adminOperationsService.dispatchPendingPushDeliveries()
        );
    }
}
