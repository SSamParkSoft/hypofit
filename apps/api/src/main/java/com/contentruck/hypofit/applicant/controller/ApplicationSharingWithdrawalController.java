package com.contentruck.hypofit.applicant.controller;

import com.contentruck.hypofit.admin.service.AdminAccessService;
import com.contentruck.hypofit.applicant.service.ApplicationSharingWithdrawalService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApplicationSharingWithdrawalController {
    private final ApplicationSharingWithdrawalService service;
    private final AdminAccessService adminAccess;

    public ApplicationSharingWithdrawalController(ApplicationSharingWithdrawalService service, AdminAccessService adminAccess) {
        this.service = service;
        this.adminAccess = adminAccess;
    }

    @PostMapping("/api/v1/applications/{application_id}/sharing-consent/withdraw")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@AuthenticationPrincipal Jwt jwt, @PathVariable("application_id") UUID applicationId) {
        service.withdraw(UUID.fromString(jwt.getSubject()), applicationId);
    }

    @PostMapping("/api/v1/admin/support/tickets/{ticket_id}/applications/{application_id}/withdraw-sharing")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdrawFromTicket(@AuthenticationPrincipal Jwt jwt,
                                   @PathVariable("ticket_id") UUID ticketId,
                                   @PathVariable("application_id") UUID applicationId) {
        service.withdrawFromTicket(adminAccess.requireAdmin(jwt).id(), ticketId, applicationId);
    }
}
