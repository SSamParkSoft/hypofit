package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.common.web.RawRequestBodyJson;
import com.contentruck.hypofit.interview.service.InterviewPostCreateCommand;
import com.contentruck.hypofit.interview.service.InterviewPostUpdateCommand;
import com.contentruck.hypofit.interview.service.PostingCompensation;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class InterviewPostRequestParser {

    private static final Set<String> CREATE_STATUSES = Set.of("draft", "open");
    private static final Set<String> UPDATE_STATUSES = Set.of("draft", "open");
    private static final Set<String> RECRUITMENT_TYPES = Set.of(
            "interview", "survey", "beta_test", "usability_test", "research_experiment", "focus_group", "other"
    );
    private static final Set<String> EXTERNAL_PROVIDERS = Set.of("google_forms");
    private static final Set<String> INTERVIEW_MODES = Set.of("offline", "online", "both");
    private static final Set<String> LOCATION_PRECISIONS = Set.of("exact", "nearby", "district");
    private static final Set<String> LOCATION_SOURCES = Set.of("kakao_place", "manual", "current_location");

    private InterviewPostRequestParser() {
    }

    public static InterviewPostCreateCommand parseCreate(InterviewPostCreateRequest body) {
        return parseCreate(RawRequestBodyJson.toJsonNode(body.rawBody()));
    }

    public static InterviewPostCreateCommand parseCreate(JsonNode body) {
        JsonNode object = requireObject(body);
        List<FieldError> errors = new ArrayList<>();

        String recruitmentType = optionalEnum(object, "recruitment_type", RECRUITMENT_TYPES, errors);
        if (!object.has("recruitment_type")) {
            recruitmentType = "interview";
        }
        String title = requiredString(object, "title", 2, 120, errors);
        String serviceSummary = requiredString(object, "service_summary", 10, 2000, errors);
        String targetDescription = requiredString(object, "target_description", 10, 2000, errors);
        Integer rewardAmount = requiredInteger(object, "reward_amount", 0, null, errors);
        List<PostingCompensation> compensations = parseCompensations(object, errors);
        Integer durationMinutes = requiredInteger(object, "duration_minutes", 10, 240, errors);
        Integer recruitCount = optionalInteger(object, "recruit_count", 0, 999, errors);
        if (!object.has("recruit_count")) {
            recruitCount = 0;
        }
        String interviewMode = optionalEnum(object, "interview_mode", INTERVIEW_MODES, errors);
        String externalProvider = optionalEnum(object, "external_provider", EXTERNAL_PROVIDERS, errors);
        String externalUrl = optionalString(object, "external_url", null, 2000, errors);
        OffsetDateTime participationDeadlineAt = optionalOffsetDateTime(object, "participation_deadline_at", errors);
        String externalDataNotice = optionalString(object, "external_data_notice", null, 2000, errors);
        List<String> betaTestPlatforms = parseCreateOptionalStringList(object, "beta_test_platforms", errors);
        OffsetDateTime betaTestStartsAt = optionalOffsetDateTime(object, "beta_test_starts_at", errors);
        OffsetDateTime betaTestEndsAt = optionalOffsetDateTime(object, "beta_test_ends_at", errors);
        String location = optionalString(object, "location", null, 200, errors);
        String locationText = optionalString(object, "location_text", null, 200, errors);
        String locationAddress = optionalString(object, "location_address", null, 300, errors);
        String locationPlaceName = optionalString(object, "location_place_name", null, 200, errors);
        Double locationLatitude = optionalDouble(object, "location_latitude", -90.0, 90.0, errors);
        Double locationLongitude = optionalDouble(object, "location_longitude", -180.0, 180.0, errors);
        String locationPrecision = optionalEnum(object, "location_precision", LOCATION_PRECISIONS, errors);
        String locationSource = optionalEnum(object, "location_source", LOCATION_SOURCES, errors);
        List<String> scheduleOptions = parseCreateScheduleOptions(object, errors);
        String status = optionalEnum(object, "status", CREATE_STATUSES, errors);
        if (!object.has("status")) {
            status = "draft";
        }

        if ("interview".equals(recruitmentType) && interviewMode == null) {
            errors.add(new FieldError("interview_mode", "입력값을 확인해 주세요."));
        }

        throwIfErrors(errors);
        if ("interview".equals(recruitmentType)
                && ("offline".equals(interviewMode) || "both".equals(interviewMode))) {
            validateCreateLocation(
                    location,
                    locationText,
                    locationLatitude,
                    locationLongitude,
                    locationPrecision,
                    locationSource
            );
        }

        return new InterviewPostCreateCommand(
                recruitmentType,
                title,
                serviceSummary,
                targetDescription,
                rewardAmount,
                compensations,
                durationMinutes,
                recruitCount,
                externalProvider,
                externalUrl,
                participationDeadlineAt,
                externalDataNotice,
                betaTestPlatforms,
                betaTestStartsAt,
                betaTestEndsAt,
                interviewMode,
                location,
                locationText,
                locationAddress,
                locationPlaceName,
                locationLatitude,
                locationLongitude,
                locationPrecision,
                locationSource,
                scheduleOptions,
                status
        );
    }

    public static InterviewPostUpdateCommand parseUpdate(InterviewPostUpdateRequest body) {
        return parseUpdate(RawRequestBodyJson.toJsonNode(body.rawBody()));
    }

    private static void validateCreateLocation(
            String location,
            String locationText,
            Double latitude,
            Double longitude,
            String precision,
            String source
    ) {
        if ((location == null || location.isBlank())
                && (locationText == null || locationText.isBlank())
                || latitude == null
                || longitude == null
                || precision == null
                || source == null) {
            throw new HypofitValidationException(
                    "Offline-capable interview posts require a selected location",
                    List.of(new FieldError("__root__", "Offline-capable interview posts require a selected location"))
            );
        }
    }

    private static List<PostingCompensation> parseCompensations(JsonNode object, List<FieldError> errors) {
        if (!object.has("compensations") || object.get("compensations").isNull()) {
            return List.of();
        }
        JsonNode values = object.get("compensations");
        if (!values.isArray()) {
            errors.add(new FieldError("compensations", "입력값을 확인해 주세요."));
            return List.of();
        }
        List<PostingCompensation> result = new ArrayList<>();
        for (JsonNode value : values) {
            if (!value.isObject()) {
                errors.add(new FieldError("compensations", "입력값을 확인해 주세요."));
                continue;
            }
            result.add(new PostingCompensation(
                    optionalRawString(value, "type"),
                    optionalRawString(value, "label"),
                    optionalRawInteger(value, "amount", errors),
                    optionalRawString(value, "currency"),
                    optionalRawInteger(value, "points", errors),
                    optionalRawString(value, "description"),
                    optionalRawString(value, "delivery_method")
            ));
        }
        return result;
    }

    private static String optionalRawString(JsonNode object, String field) {
        JsonNode value = object.get(field);
        return value == null || value.isNull() || !value.isTextual() ? null : value.textValue();
    }

    private static Integer optionalRawInteger(JsonNode object, String field, List<FieldError> errors) {
        JsonNode value = object.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.canConvertToInt()) {
            errors.add(new FieldError("compensations", "입력값을 확인해 주세요."));
            return null;
        }
        return value.intValue();
    }

    public static InterviewPostUpdateCommand parseUpdate(JsonNode body) {
        JsonNode object = requireObject(body);
        List<FieldError> errors = new ArrayList<>();
        Set<String> providedFields = new LinkedHashSet<>();

        String recruitmentType = optionalNullableEnum(object, "recruitment_type", RECRUITMENT_TYPES, errors, providedFields);
        String title = optionalNullableString(object, "title", 2, 120, errors, providedFields);
        String serviceSummary = optionalNullableString(object, "service_summary", 10, 2000, errors, providedFields);
        String targetDescription = optionalNullableString(object, "target_description", 10, 2000, errors, providedFields);
        Integer rewardAmount = optionalNullableInteger(object, "reward_amount", 0, null, errors, providedFields);
        Integer durationMinutes = optionalNullableInteger(object, "duration_minutes", 10, 240, errors, providedFields);
        Integer recruitCount = optionalNullableInteger(object, "recruit_count", 0, 999, errors, providedFields);
        String interviewMode = optionalNullableEnum(object, "interview_mode", INTERVIEW_MODES, errors, providedFields);
        String externalProvider = optionalNullableEnum(object, "external_provider", EXTERNAL_PROVIDERS, errors, providedFields);
        String externalUrl = optionalNullableString(object, "external_url", null, 2000, errors, providedFields);
        OffsetDateTime participationDeadlineAt = optionalNullableOffsetDateTime(
                object,
                "participation_deadline_at",
                errors,
                providedFields
        );
        String externalDataNotice = optionalNullableString(
                object,
                "external_data_notice",
                null,
                2000,
                errors,
                providedFields
        );
        List<String> betaTestPlatforms = parseUpdateOptionalStringList(object, "beta_test_platforms", errors, providedFields);
        OffsetDateTime betaTestStartsAt = optionalNullableOffsetDateTime(object, "beta_test_starts_at", errors, providedFields);
        OffsetDateTime betaTestEndsAt = optionalNullableOffsetDateTime(object, "beta_test_ends_at", errors, providedFields);
        String location = optionalNullableString(object, "location", null, 200, errors, providedFields);
        String locationText = optionalNullableString(object, "location_text", null, 200, errors, providedFields);
        String locationAddress = optionalNullableString(object, "location_address", null, 300, errors, providedFields);
        String locationPlaceName = optionalNullableString(object, "location_place_name", null, 200, errors, providedFields);
        Double locationLatitude = optionalNullableDouble(object, "location_latitude", -90.0, 90.0, errors, providedFields);
        Double locationLongitude = optionalNullableDouble(object, "location_longitude", -180.0, 180.0, errors, providedFields);
        String locationPrecision = optionalNullableEnum(object, "location_precision", LOCATION_PRECISIONS, errors, providedFields);
        String locationSource = optionalNullableEnum(object, "location_source", LOCATION_SOURCES, errors, providedFields);
        List<String> scheduleOptions = parseUpdateScheduleOptions(object, errors, providedFields);
        String status = optionalNullableEnum(object, "status", UPDATE_STATUSES, errors, providedFields);

        if (providedFields.isEmpty()) {
            throw validation("__root__", "At least one interview post field must be provided");
        }
        throwIfErrors(errors);

        return new InterviewPostUpdateCommand(
                providedFields,
                recruitmentType,
                title,
                serviceSummary,
                targetDescription,
                rewardAmount,
                durationMinutes,
                recruitCount,
                externalProvider,
                externalUrl,
                participationDeadlineAt,
                externalDataNotice,
                betaTestPlatforms,
                betaTestStartsAt,
                betaTestEndsAt,
                interviewMode,
                location,
                locationText,
                locationAddress,
                locationPlaceName,
                locationLatitude,
                locationLongitude,
                locationPrecision,
                locationSource,
                scheduleOptions,
                status
        );
    }

    public static void parseCloseStatus(InterviewPostStatusUpdateRequest body) {
        parseCloseStatus(RawRequestBodyJson.toJsonNode(body.rawBody()));
    }

    public static void parseCloseStatus(JsonNode body) {
        JsonNode object = requireObject(body);
        if (!object.has("status") || object.get("status").isNull() || !object.get("status").isTextual()) {
            throw validation("status", "입력값을 확인해 주세요.");
        }
        if (!"closed".equals(object.get("status").asText())) {
            throw validation("status", "입력값을 확인해 주세요.");
        }
    }

    private static JsonNode requireObject(JsonNode body) {
        if (body == null || body.isNull() || !body.isObject()) {
            throw validation("__root__", "입력값을 확인해 주세요.");
        }
        return body;
    }

    private static String requiredString(JsonNode body, String field, Integer min, Integer max, List<FieldError> errors) {
        if (!body.has(field) || body.get(field).isNull() || !body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateString(field, body.get(field).asText(), min, max, errors);
    }

    private static String optionalString(JsonNode body, String field, Integer min, Integer max, List<FieldError> errors) {
        if (!body.has(field)) {
            return null;
        }
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateString(field, body.get(field).asText(), min, max, errors);
    }

    private static String optionalNullableString(
            JsonNode body,
            String field,
            Integer min,
            Integer max,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(toJavaField(field));
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateString(field, body.get(field).asText(), min, max, errors);
    }

    private static String validateString(String field, String value, Integer min, Integer max, List<FieldError> errors) {
        if (min != null && value.length() < min) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        if (max != null && value.length() > max) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static Integer requiredInteger(JsonNode body, String field, Integer min, Integer max, List<FieldError> errors) {
        if (!body.has(field) || body.get(field).isNull() || !body.get(field).canConvertToInt()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateInteger(field, body.get(field).intValue(), min, max, errors);
    }

    private static Integer optionalInteger(JsonNode body, String field, Integer min, Integer max, List<FieldError> errors) {
        if (!body.has(field)) {
            return null;
        }
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).canConvertToInt()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateInteger(field, body.get(field).intValue(), min, max, errors);
    }

    private static Integer optionalNullableInteger(
            JsonNode body,
            String field,
            Integer min,
            Integer max,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(toJavaField(field));
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).canConvertToInt()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateInteger(field, body.get(field).intValue(), min, max, errors);
    }

    private static Integer validateInteger(String field, Integer value, Integer min, Integer max, List<FieldError> errors) {
        if (min != null && value < min) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        if (max != null && value > max) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static Double optionalDouble(JsonNode body, String field, Double min, Double max, List<FieldError> errors) {
        if (!body.has(field)) {
            return null;
        }
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isNumber()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateDouble(field, body.get(field).doubleValue(), min, max, errors);
    }

    private static Double optionalNullableDouble(
            JsonNode body,
            String field,
            Double min,
            Double max,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(toJavaField(field));
        if (body.get(field).isNull()) {
            return null;
        }
        if (!body.get(field).isNumber()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return validateDouble(field, body.get(field).doubleValue(), min, max, errors);
    }

    private static Double validateDouble(String field, Double value, Double min, Double max, List<FieldError> errors) {
        if (min != null && value < min) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        if (max != null && value > max) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static OffsetDateTime optionalOffsetDateTime(JsonNode body, String field, List<FieldError> errors) {
        if (!body.has(field)) {
            return null;
        }
        JsonNode node = body.get(field);
        if (node.isNull()) {
            return null;
        }
        if (!node.isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        try {
            return OffsetDateTime.parse(node.asText());
        } catch (DateTimeParseException exception) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
    }

    private static OffsetDateTime optionalNullableOffsetDateTime(
            JsonNode body,
            String field,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(toJavaField(field));
        JsonNode node = body.get(field);
        if (node.isNull()) {
            return null;
        }
        if (!node.isTextual()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        try {
            return OffsetDateTime.parse(node.asText());
        } catch (DateTimeParseException exception) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
    }

    private static String requiredEnum(JsonNode body, String field, Set<String> allowed, List<FieldError> errors) {
        String value = requiredString(body, field, null, null, errors);
        if (value != null && !allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static String optionalEnum(JsonNode body, String field, Set<String> allowed, List<FieldError> errors) {
        String value = optionalString(body, field, null, null, errors);
        if (value != null && !allowed.contains(value)) {
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
        String value = optionalNullableString(body, field, null, null, errors, providedFields);
        if (value != null && !allowed.contains(value)) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
        }
        return value;
    }

    private static List<String> parseCreateScheduleOptions(JsonNode body, List<FieldError> errors) {
        if (!body.has("schedule_options")) {
            return List.of();
        }
        return parseStringList(body.get("schedule_options"), "schedule_options", errors);
    }

    private static List<String> parseCreateOptionalStringList(JsonNode body, String field, List<FieldError> errors) {
        if (!body.has(field)) {
            return null;
        }
        JsonNode node = body.get(field);
        if (node.isNull()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return null;
        }
        return parseStringList(node, field, errors);
    }

    private static List<String> parseUpdateScheduleOptions(
            JsonNode body,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has("schedule_options")) {
            return null;
        }
        providedFields.add("scheduleOptions");
        JsonNode node = body.get("schedule_options");
        if (node.isNull()) {
            throw validation("schedule_options", "schedule_options cannot be null");
        }
        return parseStringList(node, "schedule_options", errors);
    }

    private static List<String> parseUpdateOptionalStringList(
            JsonNode body,
            String field,
            List<FieldError> errors,
            Set<String> providedFields
    ) {
        if (!body.has(field)) {
            return null;
        }
        providedFields.add(toJavaField(field));
        JsonNode node = body.get(field);
        if (node.isNull()) {
            return null;
        }
        return parseStringList(node, field, errors);
    }

    private static List<String> parseStringList(JsonNode node, String field, List<FieldError> errors) {
        if (node == null || node.isNull() || !node.isArray()) {
            errors.add(new FieldError(field, "입력값을 확인해 주세요."));
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (!item.isTextual()) {
                errors.add(new FieldError(field, "입력값을 확인해 주세요."));
                continue;
            }
            values.add(item.asText());
        }
        return List.copyOf(values);
    }

    private static void throwIfErrors(List<FieldError> errors) {
        if (!errors.isEmpty()) {
            throw new HypofitValidationException("입력값을 확인해 주세요.", List.copyOf(errors));
        }
    }

    private static HypofitValidationException validation(String field, String message) {
        return new HypofitValidationException(message, List.of(new FieldError(field, message)));
    }

    private static String toJavaField(String field) {
        return switch (field) {
            case "recruitment_type" -> "recruitmentType";
            case "service_summary" -> "serviceSummary";
            case "target_description" -> "targetDescription";
            case "reward_amount" -> "rewardAmount";
            case "duration_minutes" -> "durationMinutes";
            case "recruit_count" -> "recruitCount";
            case "interview_mode" -> "interviewMode";
            case "external_provider" -> "externalProvider";
            case "external_url" -> "externalUrl";
            case "participation_deadline_at" -> "participationDeadlineAt";
            case "external_data_notice" -> "externalDataNotice";
            case "beta_test_platforms" -> "betaTestPlatforms";
            case "beta_test_starts_at" -> "betaTestStartsAt";
            case "beta_test_ends_at" -> "betaTestEndsAt";
            case "location_text" -> "locationText";
            case "location_address" -> "locationAddress";
            case "location_place_name" -> "locationPlaceName";
            case "location_latitude" -> "locationLatitude";
            case "location_longitude" -> "locationLongitude";
            case "location_precision" -> "locationPrecision";
            case "location_source" -> "locationSource";
            case "schedule_options" -> "scheduleOptions";
            default -> field;
        };
    }

}
