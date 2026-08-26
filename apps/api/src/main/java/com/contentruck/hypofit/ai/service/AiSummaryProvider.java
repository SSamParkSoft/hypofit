package com.contentruck.hypofit.ai.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public interface AiSummaryProvider {

    InterviewSummaryResult summarizeInterview(InterviewSummaryRequest request);

    ApplicantSummaryResult summarizeApplication(ApplicantSummaryRequest request);

    record InterviewSummaryRequest(
            String promptVersion,
            String title,
            String serviceSummary,
            String targetDescription,
            String interviewMode,
            Integer durationMinutes,
            Integer rewardAmount,
            Integer recruitCount,
            String locationText,
            List<String> scheduleOptions
    ) {
        public InterviewSummaryRequest {
            promptVersion = normalize(promptVersion);
            title = normalize(title);
            serviceSummary = normalize(serviceSummary);
            targetDescription = normalize(targetDescription);
            interviewMode = normalize(interviewMode);
            locationText = normalize(locationText);
            scheduleOptions = normalizeList(scheduleOptions);
        }
    }

    record ApplicantSummaryRequest(
            String promptVersion,
            String interviewTitle,
            String targetDescription,
            Map<String, String> answers,
            List<String> availableTimes
    ) {
        public ApplicantSummaryRequest {
            promptVersion = normalize(promptVersion);
            interviewTitle = normalize(interviewTitle);
            targetDescription = normalize(targetDescription);
            answers = normalizeMap(answers);
            availableTimes = normalizeList(availableTimes);
        }
    }

    record InterviewSummaryResult(
            String provider,
            String model,
            InterviewSummaryContent content,
            Usage usage
    ) {
    }

    record ApplicantSummaryResult(
            String provider,
            String model,
            ApplicantSummaryContent content,
            Usage usage
    ) {
    }

    record InterviewSummaryContent(
            String overview,
            @JsonProperty("target_fit")
            String targetFit,
            @JsonProperty("key_points")
            List<String> keyPoints
    ) {
        public InterviewSummaryContent {
            overview = normalize(overview);
            targetFit = normalize(targetFit);
            keyPoints = normalizeList(keyPoints);
        }
    }

    record ApplicantSummaryContent(
            String overview,
            @JsonProperty("relevant_experience")
            List<String> relevantExperience,
            String availability,
            @JsonProperty("questions_to_confirm")
            List<String> questionsToConfirm
    ) {
        public ApplicantSummaryContent {
            overview = normalize(overview);
            relevantExperience = normalizeList(relevantExperience);
            availability = normalize(availability);
            questionsToConfirm = normalizeList(questionsToConfirm);
        }
    }

    record Usage(
            Integer promptTokens,
            Integer candidateTokens,
            Integer totalTokens
    ) {
    }

    enum FailureCode {
        PROVIDER_NOT_CONFIGURED("ai_summary_provider_not_configured", false),
        PROVIDER_INVALID_CONFIGURATION("ai_summary_provider_invalid_configuration", false),
        PROVIDER_AUTH_FAILED("ai_summary_provider_auth_failed", false),
        PROVIDER_RATE_LIMITED("ai_summary_provider_rate_limited", true),
        PROVIDER_TIMEOUT("ai_summary_provider_timeout", true),
        PROVIDER_UNAVAILABLE("ai_summary_provider_unavailable", true),
        OUTPUT_SCHEMA_INVALID("ai_summary_output_schema_invalid", false),
        OUTPUT_POLICY_INVALID("ai_summary_output_policy_invalid", false);

        private final String code;
        private final boolean retryable;

        FailureCode(String code, boolean retryable) {
            this.code = code;
            this.retryable = retryable;
        }

        public String code() {
            return code;
        }

        public boolean retryable() {
            return retryable;
        }
    }

    final class ProviderException extends RuntimeException {

        private final FailureCode failureCode;

        public ProviderException(FailureCode failureCode) {
            this(failureCode, null);
        }

        public ProviderException(FailureCode failureCode, Throwable cause) {
            super(failureCode == null
                    ? FailureCode.PROVIDER_UNAVAILABLE.code()
                    : failureCode.code(), cause);
            this.failureCode = failureCode == null
                    ? FailureCode.PROVIDER_UNAVAILABLE
                    : failureCode;
        }

        public FailureCode failureCode() {
            return failureCode;
        }

        public String code() {
            return failureCode.code();
        }

        public boolean retryable() {
            return failureCode.retryable();
        }
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private static List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .map(AiSummaryProvider::normalize)
                .toList();
    }

    private static Map<String, String> normalizeMap(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        Map<String, String> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : values.entrySet()) {
            normalized.put(normalize(entry.getKey()), normalize(entry.getValue()));
        }
        return Map.copyOf(normalized);
    }
}
