package com.contentruck.hypofit.audit.service;

import java.util.Map;
import java.util.UUID;

public record AuditEventCommand(
        UUID actorUserId,
        String actorType,
        String eventType,
        String targetType,
        UUID targetId,
        Map<String, Object> before,
        Map<String, Object> after,
        String reason,
        Map<String, Object> metadata
) {

    public AuditEventCommand {
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }
}
