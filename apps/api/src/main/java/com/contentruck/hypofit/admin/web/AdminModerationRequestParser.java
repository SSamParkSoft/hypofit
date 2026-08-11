package com.contentruck.hypofit.admin.web;

import com.contentruck.hypofit.admin.application.AdminModerationActionCommand;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.common.web.RawRequestBodyJson;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

final class AdminModerationRequestParser {

    private static final Set<String> TARGET_TYPES = Set.of(
            "user",
            "interview_post",
            "application",
            "chat_room",
            "chat_message",
            "session"
    );
    private static final Set<String> ACTIONS = Set.of(
            "warn",
            "hide",
            "remove",
            "block",
            "unblock",
            "close_report",
            "restore"
    );
    private static final TypeReference<Map<String, Object>> OBJECT_MAP_TYPE = new TypeReference<>() {
    };
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private AdminModerationRequestParser() {
    }

    static AdminModerationActionCommand parse(AdminModerationActionCreateRequest payload) {
        return parse(RawRequestBodyJson.toJsonNode(payload.rawBody()));
    }

    static AdminModerationActionCommand parse(JsonNode payload) {
        if (payload == null || payload.isNull() || !payload.isObject()) {
            throw validation("__root__", "입력값을 확인해 주세요.");
        }

        List<FieldError> errors = new ArrayList<>();
        String targetType = requiredEnum(payload, "target_type", TARGET_TYPES, errors);
        UUID targetId = requiredUuid(payload, "target_id", errors);
        String action = requiredEnum(payload, "action", ACTIONS, errors);
        String reason = optionalReason(payload, "reason", errors);
        UUID sourceTicketId = optionalUuid(payload, "source_ticket_id", errors);
        Map<String, Object> metadata = optionalMetadata(payload, "metadata", errors);

        if (!errors.isEmpty()) {
            throw new HypofitValidationException("Admin moderation validation failed", errors);
        }

        return new AdminModerationActionCommand(
                targetType,
                targetId,
                action,
                reason,
                sourceTicketId,
                metadata
        );
    }

    private static String requiredEnum(JsonNode payload, String field, Set<String> allowed, List<FieldError> errors) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull() || !node.isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = node.asText();
        if (!allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static UUID requiredUuid(JsonNode payload, String field, List<FieldError> errors) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull() || !node.isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        try {
            return UUID.fromString(node.asText());
        } catch (IllegalArgumentException exception) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
    }

    private static UUID optionalUuid(JsonNode payload, String field, List<FieldError> errors) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        try {
            return UUID.fromString(node.asText());
        } catch (IllegalArgumentException exception) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
    }

    private static String optionalReason(JsonNode payload, String field, List<FieldError> errors) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }

        String raw = node.asText();
        if (raw.length() > 1000) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String normalized = String.join(" ", raw.trim().split("\\s+"));
        return normalized.isBlank() ? null : normalized;
    }

    private static Map<String, Object> optionalMetadata(JsonNode payload, String field, List<FieldError> errors) {
        JsonNode node = payload.get(field);
        if (node == null) {
            return Map.of();
        }
        if (node.isNull() || !node.isObject()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return Map.of();
        }
        return OBJECT_MAPPER.convertValue(node, OBJECT_MAP_TYPE);
    }

    private static HypofitValidationException validation(String field, String message) {
        return new HypofitValidationException(
                "Admin moderation validation failed",
                List.of(new FieldError(field, message))
        );
    }
}
