package com.contentruck.hypofit.support.controller;

import com.contentruck.hypofit.support.dto.SupportTicketCreateRequest;
import com.contentruck.hypofit.support.dto.SupportTicketRequestParser;
import com.contentruck.hypofit.support.dto.SupportTicketResponse;
import com.contentruck.hypofit.support.dto.SupportTicketUpdateRequest;

import com.contentruck.hypofit.support.service.SupportTicketService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/support")
@io.swagger.v3.oas.annotations.tags.Tag(name = "문의")
@SecurityRequirement(name = "HTTPBearer")
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    public SupportTicketController(SupportTicketService supportTicketService) {
        this.supportTicketService = supportTicketService;
    }

    @GetMapping("/tickets")
    public List<SupportTicketResponse> listTickets(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "kind", required = false) String kind
    ) {
        SupportTicketRequestParser.validateKindFilter(kind);
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return supportTicketService.listTickets(currentUserId, kind).stream()
                .map(SupportTicketResponse::from)
                .toList();
    }

    @PostMapping("/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    public SupportTicketResponse createTicket(
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = SupportTicketCreateRequest.OpenApiSchema.class))
            )
            @RequestBody SupportTicketCreateRequest request
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return SupportTicketResponse.from(
                supportTicketService.createTicket(currentUserId, SupportTicketRequestParser.parseCreate(request))
        );
    }

    @PatchMapping("/tickets/{ticket_id}")
    public SupportTicketResponse updateTicket(
            @PathVariable("ticket_id") UUID ticketId,
            @AuthenticationPrincipal Jwt jwt,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = SupportTicketUpdateRequest.OpenApiSchema.class))
            )
            @RequestBody SupportTicketUpdateRequest request
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return SupportTicketResponse.from(
                supportTicketService.updateTicket(currentUserId, ticketId, SupportTicketRequestParser.parseUpdate(request))
        );
    }

    @DeleteMapping("/tickets/{ticket_id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTicket(
            @PathVariable("ticket_id") UUID ticketId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        supportTicketService.deleteTicket(currentUserId, ticketId);
    }
}
