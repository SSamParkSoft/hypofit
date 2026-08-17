package com.contentruck.hypofit.admin.dto;

import com.contentruck.hypofit.admin.service.AdminSupportService;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.common.web.RawRequestBodyJson;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class AdminSupportRequestParser {

    private static final Set<String> KINDS = Set.of("inquiry", "report", "privacy", "account_deletion");
    private static final Set<String> STATUSES = Set.of("open", "in_review", "resolved", "closed");

    private AdminSupportRequestParser() {
    }

    public static String parseKindFilter(String raw) {
        if (raw == null) {
            return null;
        }
        if (!KINDS.contains(raw)) {
            throw validation("kind", "입력값을 확인해 주세요.");
        }
        return raw;
    }

    public static String parseStatusFilter(String raw) {
        if (raw == null) {
            return null;
        }
        if (!STATUSES.contains(raw)) {
            throw validation("status", "입력값을 확인해 주세요.");
        }
        return raw;
    }

    public static Boolean parseDeletedByUserFilter(String raw) {
        if (raw == null) {
            return null;
        }
        return switch (raw) {
            case "true" -> Boolean.TRUE;
            case "false" -> Boolean.FALSE;
            default -> throw validation("deleted_by_user", "입력값을 확인해 주세요.");
        };
    }

    public static int parseLimit(String raw) {
        if (raw == null || raw.isBlank()) {
            return 100;
        }
        try {
            int value = Integer.parseInt(raw);
            if (value < 1 || value > 200) {
                throw validation("limit", "입력값을 확인해 주세요.");
            }
            return value;
        } catch (NumberFormatException exception) {
            throw validation("limit", "입력값을 확인해 주세요.");
        }
    }

    public static AdminSupportService.AdminSupportStatusUpdateCommand parseStatusUpdate(AdminSupportTicketStatusUpdateRequest payload) {
        return parseStatusUpdate(RawRequestBodyJson.toJsonNode(payload.rawBody()));
    }

    public static AdminSupportService.AdminSupportStatusUpdateCommand parseStatusUpdate(JsonNode payload) {
        JsonNode object = requireObject(payload);
        List<FieldError> errors = new ArrayList<>();

        String status = requiredEnum(object, "status", STATUSES, errors);
        String reason = optionalReason(object, "reason", errors);

        if (!errors.isEmpty()) {
            throw new HypofitValidationException("Admin support validation failed", errors);
        }
        return new AdminSupportService.AdminSupportStatusUpdateCommand(status, reason);
    }

    public static AdminSupportService.AdminSupportReplyCommand parseReply(AdminSupportTicketReplyCreateRequest payload) {
        return parseReply(RawRequestBodyJson.toJsonNode(payload.rawBody()));
    }

    public static AdminSupportService.AdminSupportReplyCommand parseReply(JsonNode payload) {
        JsonNode object = requireObject(payload);
        List<FieldError> errors = new ArrayList<>();

        String body = requiredBody(object, errors);
        Boolean visibleToUser = optionalBoolean(object, "visible_to_user", errors);

        if (!errors.isEmpty()) {
            throw new HypofitValidationException("Admin support validation failed", errors);
        }
        return new AdminSupportService.AdminSupportReplyCommand(body, visibleToUser == null || visibleToUser);
    }

    private static JsonNode requireObject(JsonNode payload) {
        if (payload == null || payload.isNull() || !payload.isObject()) {
            throw validation("__root__", "입력값을 확인해 주세요.");
        }
        return payload;
    }

    private static String requiredEnum(JsonNode object, String field, Set<String> allowed, List<FieldError> errors) {
        if (!object.has(field) || object.get(field).isNull() || !object.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = object.get(field).asText();
        if (!allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String optionalReason(JsonNode object, String field, List<FieldError> errors) {
        if (!object.has(field) || object.get(field).isNull()) {
            return null;
        }
        if (!object.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String trimmed = object.get(field).asText().trim();
        String value = trimmed.isEmpty() ? "" : String.join(" ", trimmed.split("\\s+"));
        if (value.length() > 1000) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value.isBlank() ? null : value;
    }

    private static String requiredBody(JsonNode object, List<FieldError> errors) {
        if (!object.has("body") || object.get("body").isNull() || !object.get("body").isTextual()) {
            errors.add(new FieldError("body", "입력값을 확인해 주세요."));
            return null;
        }
        String value = object.get("body").asText().trim();
        if (value.length() < 2) {
            errors.add(new FieldError("body", "답변을 입력하세요."));
        }
        if (value.length() > 2000) {
            errors.add(new FieldError("body", "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static Boolean optionalBoolean(JsonNode object, String field, List<FieldError> errors) {
        if (!object.has(field) || object.get(field).isNull()) {
            return null;
        }
        if (!object.get(field).isBoolean()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return object.get(field).asBoolean();
    }

    private static HypofitValidationException validation(String field, String message) {
        return new HypofitValidationException(
                "Admin support validation failed",
                List.of(new FieldError(field, message))
        );
    }
}
