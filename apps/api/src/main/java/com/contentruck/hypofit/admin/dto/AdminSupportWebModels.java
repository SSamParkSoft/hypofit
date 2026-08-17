package com.contentruck.hypofit.admin.dto;

import com.contentruck.hypofit.admin.service.AdminSupportRepository;
import com.contentruck.hypofit.admin.service.AdminSupportService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AdminSupportWebModels {

    private AdminSupportWebModels() {
    }

    public record SupportTicketEventResponse(
            UUID id,
            @JsonProperty("ticket_id") UUID ticketId,
            @JsonProperty("actor_user_id") UUID actorUserId,
            @JsonProperty("actor_type") String actorType,
            @JsonProperty("event_type") String eventType,
            @JsonProperty("from_status") String fromStatus,
            @JsonProperty("to_status") String toStatus,
            String message,
            Map<String, Object> metadata,
            @JsonProperty("created_at") OffsetDateTime createdAt
    ) {
        public static SupportTicketEventResponse from(AdminSupportRepository.SupportTicketEventRecord event) {
            return new SupportTicketEventResponse(
                    event.id(),
                    event.ticketId(),
                    event.actorUserId(),
                    event.actorType(),
                    event.eventType(),
                    event.fromStatus(),
                    event.toStatus(),
                    event.message(),
                    event.metadata(),
                    event.createdAt()
            );
        }
    }

    public record SupportTicketReplyResponse(
            UUID id,
            @JsonProperty("ticket_id") UUID ticketId,
            String message,
            @JsonProperty("created_at") OffsetDateTime createdAt
    ) {
    }

    public record AdminSupportTicketResponse(
            UUID id,
            @JsonProperty("user_id") UUID userId,
            String kind,
            String category,
            String subject,
            String body,
            @JsonProperty("contact_email") String contactEmail,
            @JsonProperty("target_type") String targetType,
            @JsonProperty("target_id") UUID targetId,
            String status,
            @JsonProperty("deleted_by_user_at") OffsetDateTime deletedByUserAt,
            Map<String, Object> metadata,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt,
            List<SupportTicketReplyResponse> replies,
            List<SupportTicketEventResponse> events
    ) {
        public static AdminSupportTicketResponse from(AdminSupportService.AdminSupportTicketView view) {
            AdminSupportRepository.SupportTicketRecord ticket = view.ticket();
            return new AdminSupportTicketResponse(
                    ticket.id(),
                    ticket.userId(),
                    ticket.kind(),
                    ticket.category(),
                    ticket.subject(),
                    ticket.body(),
                    ticket.contactEmail(),
                    ticket.targetType(),
                    ticket.targetId(),
                    ticket.status(),
                    ticket.deletedByUserAt(),
                    ticket.metadata(),
                    ticket.createdAt(),
                    ticket.updatedAt(),
                    List.of(),
                    view.events().stream().map(SupportTicketEventResponse::from).toList()
            );
        }
    }
}
