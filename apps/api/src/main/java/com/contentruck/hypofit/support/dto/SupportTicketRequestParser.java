package com.contentruck.hypofit.support.dto;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.common.web.RawRequestBodyJson;
import com.contentruck.hypofit.support.service.SupportTicketCreateCommand;
import com.contentruck.hypofit.support.service.SupportTicketUpdateCommand;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class SupportTicketRequestParser {

    private static final Set<String> KINDS = Set.of("inquiry", "report", "privacy", "account_deletion");
    private static final Set<String> CATEGORIES = Set.of(
            "account",
            "interview_post",
            "application",
            "chat",
            "reward",
            "privacy",
            "abuse",
            "no_show",
            "other"
    );
    private static final Set<String> TARGET_TYPES = Set.of(
            "interview_post",
            "application",
            "chat_room",
            "chat_message",
            "user",
            "session"
    );
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private SupportTicketRequestParser() {
    }

    public static void validateKindFilter(String kind) {
        if (kind == null) {
            return;
        }
        if (!KINDS.contains(kind)) {
            throw validation("kind", "입력값을 확인해 주세요.");
        }
    }

    public static SupportTicketCreateCommand parseCreate(SupportTicketCreateRequest payload) {
        return parseCreate(RawRequestBodyJson.toJsonNode(payload.rawBody()));
    }

    public static SupportTicketCreateCommand parseCreate(JsonNode payload) {
        JsonNode object = requireObject(payload);
        List<FieldError> errors = new ArrayList<>();

        String kind = requiredEnum(object, "kind", KINDS, errors);
        String category = requiredEnum(object, "category", CATEGORIES, errors);
        String subject = optionalSubject(object, "subject", errors);
        String body = requiredBody(object, errors);
        String contactEmail = requiredContactEmail(object, errors);
        String targetType = optionalEnum(object, "target_type", TARGET_TYPES, errors);
        UUID targetId = optionalUuid(object, "target_id", errors);
        Map<String, Object> metadata = optionalMetadata(object, "metadata", errors);

        throwIfErrors(errors);
        return new SupportTicketCreateCommand(
                kind,
                category,
                subject,
                body,
                contactEmail,
                targetType,
                targetId,
                metadata == null ? Map.of() : metadata
        );
    }

    public static SupportTicketUpdateCommand parseUpdate(SupportTicketUpdateRequest payload) {
        return parseUpdate(RawRequestBodyJson.toJsonNode(payload.rawBody()));
    }

    public static SupportTicketUpdateCommand parseUpdate(JsonNode payload) {
        JsonNode object = requireObject(payload);
        List<FieldError> errors = new ArrayList<>();
        Set<String> providedFields = new LinkedHashSet<>();

        String category = optionalNullableEnum(object, "category", CATEGORIES, errors, providedFields);
        String subject = optionalNullableSubject(object, "subject", errors, providedFields);
        String body = optionalNullableBody(object, "body", errors, providedFields);
        String contactEmail = optionalNullableContactEmail(object, "contact_email", errors, providedFields);

        if (providedFields.isEmpty()) {
            throw validation("__root__", "수정할 항목을 입력하세요.");
        }
        throwIfErrors(errors);
        return new SupportTicketUpdateCommand(providedFields, category, subject, body, contactEmail);
    }

    private static JsonNode requireObject(JsonNode body) {
        if (body == null || body.isNull() || !body.isObject()) {
            throw validation("__root__", "입력값을 확인해 주세요.");
        }
        return body;
    }

    private static String requiredEnum(JsonNode body, String field, Set<String> allowed, List<FieldError> errors) {
        if (!body.has(field) || body.get(field).isNull() || !body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = body.get(field).asText();
        if (!allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String optionalEnum(JsonNode body, String field, Set<String> allowed, List<FieldError> errors) {
        if (!body.has(field) || body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = body.get(field).asText();
        if (!allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String optionalNullableEnum(
            JsonNode body,
            String field,
            Set<String> allowed,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(field);
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = body.get(field).asText();
        if (!allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String optionalSubject(JsonNode body, String field, List<FieldError> errors) {
        if (!body.has(field) || body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = body.get(field).asText().trim();
        if (value.isEmpty()) {
            return null;
        }
        if (value.length() > 140) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String optionalNullableSubject(
            JsonNode body,
            String field,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(field);
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        String value = body.get(field).asText().trim();
        if (value.isEmpty()) {
            return null;
        }
        if (value.length() > 140) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String requiredBody(JsonNode body, List<FieldError> errors) {
        if (!body.has("body") || body.get("body").isNull() || !body.get("body").isTextual()) {
            errors.add(new FieldError("body", "입력값을 확인해 주세요."));
            return null;
        }
        return normalizeBody("body", body.get("body").asText(), errors);
    }

    private static String optionalNullableBody(
            JsonNode body,
            String field,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(field);
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return normalizeBody(field, body.get(field).asText(), errors);
    }

    private static String normalizeBody(String field, String value, List<FieldError> errors) {
        String stripped = value.trim();
        if (stripped.length() < 5) {
            errors.add(new FieldError(field, "내용을 5자 이상 입력하세요."));
        }
        if (stripped.length() > 2000) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return stripped;
    }

    private static String requiredContactEmail(JsonNode body, List<FieldError> errors) {
        if (!body.has("contact_email") || body.get("contact_email").isNull() || !body.get("contact_email").isTextual()) {
            errors.add(new FieldError("contact_email", "입력값을 확인해 주세요."));
            return null;
        }
        return normalizeContactEmail("contact_email", body.get("contact_email").asText(), errors);
    }

    private static String optionalNullableContactEmail(
            JsonNode body,
            String field,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(field);
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return normalizeContactEmail(field, body.get(field).asText(), errors);
    }

    private static String normalizeContactEmail(String field, String value, List<FieldError> errors) {
        String stripped = value.trim().toLowerCase();
        if (stripped.length() < 5 || stripped.length() > 320) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return stripped;
        }
        int atIndex = stripped.indexOf('@');
        if (atIndex < 1 || atIndex == stripped.length() - 1 || !stripped.substring(atIndex + 1).contains(".")) {
            errors.add(new FieldError(field, "답변 받을 이메일을 확인해주세요."));
        }
        return stripped;
    }

    private static UUID optionalUuid(JsonNode body, String field, List<FieldError> errors) {
        if (!body.has(field) || body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        try {
            return UUID.fromString(body.get(field).asText());
        } catch (IllegalArgumentException exception) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
    }

    private static Map<String, Object> optionalMetadata(JsonNode body, String field, List<FieldError> errors) {
        if (!body.has(field)) {
            return Map.of();
        }
        JsonNode node = body.get(field);
        if (node.isNull() || !node.isObject()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return Map.of();
        }
        return OBJECT_MAPPER.convertValue(node, new TypeReference<>() {
        });
    }

    private static void throwIfErrors(List<FieldError> errors) {
        if (!errors.isEmpty()) {
            throw new HypofitValidationException("Support ticket request validation failed", errors);
        }
    }

    private static HypofitValidationException validation(String field, String message) {
        return new HypofitValidationException(
                "Support ticket request validation failed",
                List.of(new FieldError(field, message))
        );
    }
}
