package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.net.IDN;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class PostingTypeValidator {

    private static final Set<String> SURVEY_PROVIDERS = Set.of(
            "google_forms", "naver_forms", "microsoft_forms", "typeform", "tally", "external"
    );

    private PostingTypeValidator() {
    }

    static void validateResearchConfiguration(String entryMode, int durationMinutes, PostingCreationConfiguration configuration) {
        List<FieldError> errors = new ArrayList<>();
        if (!"application_required".equals(entryMode)) {
            errors.add(new FieldError("entry_mode", "연구 실험은 신청 후 선정된 참여자만 참여할 수 있어요."));
        }
        if (durationMinutes < 10 || durationMinutes > 240) {
            errors.add(new FieldError("duration_value", "예상 시간은 10분에서 4시간 사이로 입력해 주세요."));
        }
        String mode = configuration.scheduleMode();
        if (!Set.of("fixed", "recurring", "negotiated").contains(mode == null ? "" : mode)) {
            errors.add(new FieldError("schedule_mode", "연구 실험의 일정 설정 방식을 선택해 주세요."));
        } else if ("fixed".equals(mode) && configuration.scheduleFixedSlots().isEmpty()) {
            errors.add(new FieldError("schedule_fixed_slots", "참여 가능한 날짜와 시간을 하나 이상 추가해 주세요."));
        } else if ("recurring".equals(mode) && configuration.scheduleRecurringWindows().isEmpty()) {
            errors.add(new FieldError("schedule_recurring_windows", "반복 가능한 시간대를 하나 이상 선택해 주세요."));
        }
        if (!errors.isEmpty()) {
            throw validationFailed("Research recruitment configuration is invalid", errors);
        }
    }

    static void validateInterviewCreate(InterviewPostCreateCommand command) {
        if (!hasText(command.interviewMode())) {
            throw validationFailed(
                    "Interview recruitment posts require interview_mode",
                    List.of(new FieldError("interview_mode", "입력값을 확인해 주세요."))
            );
        }
        if (!"online".equals(command.interviewMode())) {
            Map<String, Object> location = new LinkedHashMap<>();
            location.put("location", command.location());
            location.put("locationText", command.locationText());
            location.put("locationLatitude", command.locationLatitude());
            location.put("locationLongitude", command.locationLongitude());
            location.put("locationPrecision", command.locationPrecision());
            location.put("locationSource", command.locationSource());
            validateOfflineCapableLocation(location);
        }
    }

    static void validateSurveyConfiguration(
            String externalProvider,
            String externalUrl,
            OffsetDateTime participationDeadlineAt,
            String externalDataNotice
    ) {
        List<FieldError> errors = new ArrayList<>();
        if (externalProvider == null || !SURVEY_PROVIDERS.contains(externalProvider)) {
            errors.add(new FieldError("external_provider", "설문 종류를 선택해 주세요.", "survey_provider_not_supported"));
        }
        if (!hasText(externalUrl) || !isExternalSurveyUrl(externalUrl)) {
            errors.add(new FieldError("external_url", "https://로 시작하는 올바른 참여 링크를 2000자 이하로 입력해 주세요.", "survey_url_invalid"));
        }
        if (participationDeadlineAt == null) {
            errors.add(new FieldError("participation_deadline_at", "입력값을 확인해 주세요."));
        }
        if (!hasText(externalDataNotice)) {
            errors.add(new FieldError("external_data_notice", "입력값을 확인해 주세요."));
        }
        if (!errors.isEmpty()) {
            throw validationFailed(
                    "Survey recruitment posts require a valid HTTPS URL, deadline, and data notice",
                    errors
            );
        }
    }

    static void validateBetaConfiguration(
            List<String> betaTestPlatforms,
            OffsetDateTime betaTestStartsAt,
            OffsetDateTime betaTestEndsAt
    ) {
        List<FieldError> errors = new ArrayList<>();
        if (betaTestPlatforms == null || betaTestPlatforms.isEmpty()) {
            errors.add(new FieldError("beta_test_platforms", "입력값을 확인해 주세요."));
        }
        if (betaTestStartsAt == null) {
            errors.add(new FieldError("beta_test_starts_at", "입력값을 확인해 주세요."));
        }
        if (betaTestEndsAt == null) {
            errors.add(new FieldError("beta_test_ends_at", "입력값을 확인해 주세요."));
        }
        if (betaTestStartsAt != null && betaTestEndsAt != null && !betaTestStartsAt.isBefore(betaTestEndsAt)) {
            errors.add(new FieldError("beta_test_ends_at", "입력값을 확인해 주세요."));
        }
        if (!errors.isEmpty()) {
            throw validationFailed(
                    "Beta-test recruitment posts require platforms and a valid start/end period",
                    errors
            );
        }
    }

    static void validateOfflineCapableLocation(Map<String, Object> effective) {
        String location = asString(effective.get("location"));
        String locationText = asString(effective.get("locationText"));
        Double latitude = asDouble(effective.get("locationLatitude"));
        Double longitude = asDouble(effective.get("locationLongitude"));
        String precision = asString(effective.get("locationPrecision"));
        String source = asString(effective.get("locationSource"));

        if ((!hasValue(locationText) && !hasValue(location))
                || latitude == null
                || longitude == null
                || precision == null
                || source == null) {
            throw new HypofitValidationException(
                    "Offline-capable interview posts require a selected location",
                    List.of(new FieldError("location", "대면 진행에는 지도에서 장소를 선택해 주세요."))
            );
        }
    }

    private static boolean isExternalSurveyUrl(String externalUrl) {
        try {
            if (externalUrl.length() > 2000) {
                return false;
            }
            URI uri = new URI(externalUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                return false;
            }
            if (uri.getUserInfo() != null) {
                return false;
            }
            String host = uri.getHost();
            if (!hasText(host)) {
                return false;
            }
            String asciiHost = IDN.toASCII(host.trim().toLowerCase());
            if (!asciiHost.contains(".") || isLocalOrIpLiteral(asciiHost)) {
                return false;
            }
            return uri.getPort() == -1 || (uri.getPort() > 0 && uri.getPort() <= 65535);
        } catch (URISyntaxException | IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean isLocalOrIpLiteral(String host) {
        return "localhost".equals(host)
                || host.matches("^\\d{1,3}(\\.\\d{1,3}){3}$")
                || host.contains(":");
    }

    private static String asString(Object value) {
        return value == null ? null : (String) value;
    }

    private static Double asDouble(Object value) {
        return value == null ? null : ((Number) value).doubleValue();
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static boolean hasValue(String value) {
        return value != null && !value.isEmpty();
    }

    private static HypofitValidationException validationFailed(String debugMessage, List<FieldError> fieldErrors) {
        return new HypofitValidationException(debugMessage, List.copyOf(fieldErrors));
    }
}
