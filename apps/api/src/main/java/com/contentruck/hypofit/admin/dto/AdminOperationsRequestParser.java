package com.contentruck.hypofit.admin.dto;

import com.contentruck.hypofit.admin.service.AdminOperationsService;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.common.web.RawRequestBodyJson;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class AdminOperationsRequestParser {

    private static final Set<String> TARGET_TYPES = Set.of(
            "user",
            "interview_post",
            "application",
            "chat_room",
            "chat_message",
            "session"
    );
    private static final Set<String> NOTIFICATION_TYPES = Set.of(
            "chat_message",
            "application_created",
            "application_selected",
            "application_rejected",
            "session_rescheduled",
            "session_canceled",
            "no_show_marked",
            "support_replied"
    );
    private static final Set<String> NOTIFICATION_TARGET_TYPES = Set.of(
            "application",
            "chat_room",
            "interview_post",
            "interview_session",
            "support_ticket"
    );

    private AdminOperationsRequestParser() {
    }

    public static String parseTargetType(String raw) {
        if (raw == null || !TARGET_TYPES.contains(raw)) {
            throw validation("target_type", "입력값을 확인해 주세요.");
        }
        return raw;
    }

    public static AdminOperationsService.AdminTestNotificationCommand parseTestNotification(AdminTestNotificationCreateRequest payload) {
        return parseTestNotification(RawRequestBodyJson.toJsonNode(payload.rawBody()));
    }

    static AdminOperationsService.AdminTestNotificationCommand parseTestNotification(JsonNode payload) {
        JsonNode object = requireObject(payload);
        List<FieldError> errors = new ArrayList<>();

        String email = requiredEmail(object, "email", errors);
        String type = requiredEnum(object, "type", NOTIFICATION_TYPES, errors);
        String targetType = optionalEnum(object, "target_type", NOTIFICATION_TARGET_TYPES, errors);
        UUID targetId = optionalUuid(object, "target_id", errors);
        Boolean dispatch = optionalBoolean(object, "dispatch", errors);

        if (!errors.isEmpty()) {
            throw new HypofitValidationException("Admin operations validation failed", errors);
        }
        return new AdminOperationsService.AdminTestNotificationCommand(
                email,
                type,
                targetType,
                targetId,
                dispatch != null && dispatch
        );
    }

    private static JsonNode requireObject(JsonNode payload) {
        if (payload == null || payload.isNull() || !payload.isObject()) {
            throw validation("__root__", "입력값을 확인해 주세요.");
        }
        return payload;
    }

    private static String requiredEmail(JsonNode object, String field, List<FieldError> errors) {
        if (!object.has(field) || object.get(field).isNull() || !object.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = object.get(field).asText().trim().toLowerCase();
        if (value.length() < 5 || value.length() > 320 || !value.contains("@") || !value.substring(value.indexOf('@') + 1).contains(".")) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
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

    private static String optionalEnum(JsonNode object, String field, Set<String> allowed, List<FieldError> errors) {
        if (!object.has(field) || object.get(field).isNull()) {
            return null;
        }
        if (!object.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = object.get(field).asText();
        if (!allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static UUID optionalUuid(JsonNode object, String field, List<FieldError> errors) {
        if (!object.has(field) || object.get(field).isNull()) {
            return null;
        }
        if (!object.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        try {
            return UUID.fromString(object.get(field).asText());
        } catch (IllegalArgumentException exception) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
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
                "Admin operations validation failed",
                List.of(new FieldError(field, message))
        );
    }
}
