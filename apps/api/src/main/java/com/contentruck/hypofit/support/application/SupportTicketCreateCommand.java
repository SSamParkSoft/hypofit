package com.contentruck.hypofit.support.application;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

public record SupportTicketCreateCommand(
        String kind,
        String category,
        String subject,
        String body,
        String contactEmail,
        String targetType,
        UUID targetId,
        Map<String, Object> metadata
) {
    public SupportTicketCreateCommand {
        metadata = metadata == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(metadata));
    }
}
