package com.contentruck.hypofit.admin.web;

import com.contentruck.hypofit.admin.application.AdminAccessService;
import com.contentruck.hypofit.admin.application.AdminSupportService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@SecurityRequirement(name = "HTTPBearer")
public class AdminSupportController {

    private final AdminAccessService adminAccessService;
    private final AdminSupportService adminSupportService;

    public AdminSupportController(
            AdminAccessService adminAccessService,
            AdminSupportService adminSupportService
    ) {
        this.adminAccessService = adminAccessService;
        this.adminSupportService = adminSupportService;
    }

    @GetMapping("/support/tickets")
    public List<AdminSupportWebModels.AdminSupportTicketResponse> listSupportTickets(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(schema = @Schema(type = "boolean"))
            @RequestParam(value = "deleted_by_user", required = false) String deletedByUser,
            @RequestParam(value = "kind", required = false) String kind,
            @Parameter(schema = @Schema(type = "integer", minimum = "1", maximum = "200", defaultValue = "100"))
            @RequestParam(value = "limit", required = false) String limit,
            @RequestParam(value = "status", required = false) String status
    ) {
        adminAccessService.requireAdmin(jwt);
        return adminSupportService.listTickets(
                        AdminSupportRequestParser.parseKindFilter(kind),
                        AdminSupportRequestParser.parseStatusFilter(status),
                        AdminSupportRequestParser.parseDeletedByUserFilter(deletedByUser),
                        AdminSupportRequestParser.parseLimit(limit)
                ).stream()
                .map(AdminSupportWebModels.AdminSupportTicketResponse::from)
                .toList();
    }

    @GetMapping("/support/tickets/{ticket_id}")
    public AdminSupportWebModels.AdminSupportTicketResponse getSupportTicket(
            @PathVariable("ticket_id") UUID ticketId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        adminAccessService.requireAdmin(jwt);
        return AdminSupportWebModels.AdminSupportTicketResponse.from(adminSupportService.getTicket(ticketId));
    }

    @PatchMapping("/support/tickets/{ticket_id}/status")
    public AdminSupportWebModels.AdminSupportTicketResponse updateSupportTicketStatus(
            @PathVariable("ticket_id") UUID ticketId,
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = AdminSupportTicketStatusUpdateRequest.OpenApiSchema.class))
            )
            @RequestBody AdminSupportTicketStatusUpdateRequest request
    ) {
        AdminAccessService.CurrentAdmin admin = adminAccessService.requireAdmin(jwt);
        return AdminSupportWebModels.AdminSupportTicketResponse.from(
                adminSupportService.updateStatus(admin.id(), ticketId, AdminSupportRequestParser.parseStatusUpdate(request))
        );
    }

    @PostMapping("/support/tickets/{ticket_id}/replies")
    public AdminSupportWebModels.SupportTicketEventResponse addReply(
            @PathVariable("ticket_id") UUID ticketId,
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = AdminSupportTicketReplyCreateRequest.OpenApiSchema.class))
            )
            @RequestBody AdminSupportTicketReplyCreateRequest request
    ) {
        AdminAccessService.CurrentAdmin admin = adminAccessService.requireAdmin(jwt);
        return AdminSupportWebModels.SupportTicketEventResponse.from(
                adminSupportService.addReply(admin.id(), ticketId, AdminSupportRequestParser.parseReply(request))
        );
    }
}
