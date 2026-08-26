package com.contentruck.hypofit.ai.repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface AiSummaryArtifactRepository {

    UpsertResult upsertInterviewPostPendingWork(PendingWorkUpsert command);

    UpsertResult upsertApplicationPendingWork(PendingWorkUpsert command);

    StaleProcessingResetResult resetStaleProcessingArtifacts(
            OffsetDateTime now,
            int timeoutSeconds,
            int maxAttempts
    );

    List<ClaimedArtifact> claimPendingArtifacts(OffsetDateTime now, int limit);

    Optional<InterviewSummarySource> loadInterviewPostSource(UUID interviewPostId);

    Optional<ApplicationSummarySource> loadApplicationSource(UUID applicationId);

    GuardedCompletionResult markReady(ReadyArtifactCompletion command);

    RetryableFailureResult markRetryableFailure(RetryableArtifactFailure command);

    GuardedCompletionResult markFailed(FailedArtifactCompletion command);

    enum SummaryType {
        INTERVIEW_POST("interview_post"),
        APPLICATION("application");

        private final String databaseValue;

        SummaryType(String databaseValue) {
            this.databaseValue = databaseValue;
        }

        public String databaseValue() {
            return databaseValue;
        }

        public static SummaryType fromDatabaseValue(String databaseValue) {
            for (SummaryType candidate : values()) {
                if (candidate.databaseValue.equals(databaseValue)) {
                    return candidate;
                }
            }
            throw new IllegalArgumentException("Unknown ai_summary_artifacts.summary_type: " + databaseValue);
        }
    }

    record PendingWorkUpsert(
            UUID targetId,
            String sourceHash,
            String promptVersion,
            OffsetDateTime now
    ) {
    }

    record UpsertResult(
            UUID artifactId,
            int workVersion,
            boolean changed
    ) {
    }

    record StaleProcessingResetResult(
            int resetToPendingCount,
            int markedFailedCount
    ) {
    }

    enum GuardedCompletionResult {
        APPLIED,
        STALE
    }

    enum RetryableFailureResult {
        RETRY_SCHEDULED,
        MARKED_FAILED,
        STALE
    }

    record ClaimedArtifact(
            UUID artifactId,
            SummaryType summaryType,
            UUID interviewPostId,
            UUID applicationId,
            String sourceHash,
            String promptVersion,
            int workVersion,
            int attemptCount
    ) {
        public UUID targetId() {
            return summaryType == SummaryType.INTERVIEW_POST ? interviewPostId : applicationId;
        }
    }

    record InterviewSummarySource(
            UUID interviewPostId,
            String title,
            String serviceSummary,
            String targetDescription,
            int rewardAmount,
            int durationMinutes,
            int recruitCount,
            String interviewMode,
            String publicLocationText,
            List<String> scheduleOptions
    ) {
    }

    record ApplicationSummarySource(
            UUID applicationId,
            UUID interviewPostId,
            String interviewTitle,
            String targetDescription,
            Map<String, String> answers,
            List<String> availableTimes
    ) {
        public boolean hasContentToSummarize() {
            return !answers.isEmpty() || !availableTimes.isEmpty();
        }
    }

    record ReadyArtifactCompletion(
            UUID artifactId,
            String sourceHash,
            String promptVersion,
            int workVersion,
            OffsetDateTime now,
            String provider,
            String model,
            String resultJson,
            Integer inputTokens,
            Integer outputTokens,
            BigDecimal estimatedCostUsd
    ) {
    }

    record RetryableArtifactFailure(
            UUID artifactId,
            String sourceHash,
            String promptVersion,
            int workVersion,
            OffsetDateTime now,
            OffsetDateTime nextAttemptAt,
            String failureCode,
            String provider,
            String model,
            int maxAttempts
    ) {
    }

    record FailedArtifactCompletion(
            UUID artifactId,
            String sourceHash,
            String promptVersion,
            int workVersion,
            OffsetDateTime now,
            String failureCode,
            String provider,
            String model
    ) {
    }
}
