package com.contentruck.hypofit.admin.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface AdminSupportRepository {

    List<SupportTicketRecord> listTickets(String kind, String status, Boolean deletedByUser, int limit);

    Optional<SupportTicketRecord> findTicket(UUID ticketId);

    Map<UUID, List<SupportTicketEventRecord>> listTicketEvents(List<UUID> ticketIds);

    SupportTicketRecord updateStatus(UUID ticketId, UUID actorUserId, String fromStatus, String status, String reason);

    SupportTicketEventRecord addReply(UUID ticketId, UUID actorUserId, String body, boolean visibleToUser, String status);

    void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            String reason,
            Map<String, Object> metadata
    );

    record SupportTicketRecord(
            UUID id,
            UUID userId,
            String kind,
            String category,
            String subject,
            String body,
            String contactEmail,
            String targetType,
            UUID targetId,
            String status,
            OffsetDateTime deletedByUserAt,
            Map<String, Object> metadata,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    record SupportTicketEventRecord(
            UUID id,
            UUID ticketId,
            UUID actorUserId,
            String actorType,
            String eventType,
            String fromStatus,
            String toStatus,
            String message,
            Map<String, Object> metadata,
            OffsetDateTime createdAt
    ) {
    }
}
