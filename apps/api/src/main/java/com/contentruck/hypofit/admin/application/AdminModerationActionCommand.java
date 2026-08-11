package com.contentruck.hypofit.admin.application;

import java.util.Map;
import java.util.UUID;

public record AdminModerationActionCommand(
        String targetType,
        UUID targetId,
        String action,
        String reason,
        UUID sourceTicketId,
        Map<String, Object> metadata
) {
}
