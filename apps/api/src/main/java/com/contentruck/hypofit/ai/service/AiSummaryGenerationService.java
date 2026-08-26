package com.contentruck.hypofit.ai.service;

import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ApplicationSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ClaimedArtifact;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.InterviewSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.SummaryType;
import com.contentruck.hypofit.common.config.HypofitProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AiSummaryGenerationService {

    private static final Logger logger = LoggerFactory.getLogger(AiSummaryGenerationService.class);
    private static final String SOURCE_UNAVAILABLE = "ai_summary_source_unavailable";
    private static final String SOURCE_CHANGED = "ai_summary_source_changed";
    private static final String INTERNAL_ERROR = "ai_summary_internal_error";

    private final AiSummaryArtifactRepository repository;
    private final AiSummaryProvider provider;
    private final AiSummarySourceHasher sourceHasher;
    private final ObjectMapper objectMapper;
    private final HypofitProperties properties;
    private final TransactionOperations transactions;

    @Autowired
    public AiSummaryGenerationService(
            AiSummaryArtifactRepository repository,
            AiSummaryProvider provider,
            AiSummarySourceHasher sourceHasher,
            ObjectMapper objectMapper,
            HypofitProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this(repository, provider, sourceHasher, objectMapper, properties, new TransactionTemplate(transactionManager));
    }

    AiSummaryGenerationService(
            AiSummaryArtifactRepository repository,
            AiSummaryProvider provider,
            AiSummarySourceHasher sourceHasher,
            ObjectMapper objectMapper,
            HypofitProperties properties,
            TransactionOperations transactions
    ) {
        this.repository = repository;
        this.provider = provider;
        this.sourceHasher = sourceHasher;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.transactions = transactions;
    }

    public GenerationBatchResult processPending() {
        if (!generationRunnable()) {
            return GenerationBatchResult.zero();
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<ClaimedArtifact> claimed = transactions.execute(status -> {
            repository.resetStaleProcessingArtifacts(
                    now,
                    properties.getAiSummaryProcessingTimeoutSeconds(),
                    properties.getAiSummaryMaxAttempts()
            );
            return repository.claimPendingArtifacts(now, properties.getAiSummaryWorkerBatchSize());
        });
        if (claimed == null || claimed.isEmpty()) {
            return GenerationBatchResult.zero();
        }

        int ready = 0;
        int retried = 0;
        int failed = 0;
        int stale = 0;
        for (ClaimedArtifact artifact : claimed) {
            Outcome outcome = processOne(artifact);
            switch (outcome) {
                case READY -> ready++;
                case RETRIED -> retried++;
                case FAILED -> failed++;
                case STALE -> stale++;
            }
        }
        return new GenerationBatchResult(claimed.size(), ready, retried, failed, stale);
    }

    private Outcome processOne(ClaimedArtifact artifact) {
        try {
            return artifact.summaryType() == SummaryType.INTERVIEW_POST
                    ? processInterview(artifact)
                    : processApplication(artifact);
        } catch (AiSummaryProvider.ProviderException exception) {
            return recordProviderFailure(artifact, exception);
        } catch (RuntimeException exception) {
            logger.warn("ai_summary_generation_failed artifact_id={} summary_type={} error_code={}",
                    artifact.artifactId(), artifact.summaryType().databaseValue(), INTERNAL_ERROR, exception);
            return recordFailure(artifact, INTERNAL_ERROR, true, "gemini", properties.getAiSummaryModel());
        }
    }

    private Outcome processInterview(ClaimedArtifact artifact) {
        InterviewSummarySource source = repository.loadInterviewPostSource(artifact.interviewPostId()).orElse(null);
        if (source == null) {
            return recordFailure(artifact, SOURCE_UNAVAILABLE, false, null, null);
        }
        if (!artifact.sourceHash().equals(sourceHasher.hashInterview(source))) {
            return recordFailure(artifact, SOURCE_CHANGED, false, null, null);
        }
        AiSummaryProvider.InterviewSummaryResult result = provider.summarizeInterview(
                new AiSummaryProvider.InterviewSummaryRequest(
                        artifact.promptVersion(), source.title(), source.serviceSummary(), source.targetDescription(),
                        source.interviewMode(), source.durationMinutes(), source.rewardAmount(), source.recruitCount(),
                        source.publicLocationText(), source.scheduleOptions()
                )
        );
        return markReady(artifact, result.provider(), result.model(), result.content(), result.usage());
    }

    private Outcome processApplication(ClaimedArtifact artifact) {
        ApplicationSummarySource source = repository.loadApplicationSource(artifact.applicationId()).orElse(null);
        if (source == null || !source.hasContentToSummarize()) {
            return recordFailure(artifact, SOURCE_UNAVAILABLE, false, null, null);
        }
        if (!artifact.sourceHash().equals(sourceHasher.hashApplication(source))) {
            return recordFailure(artifact, SOURCE_CHANGED, false, null, null);
        }
        AiSummaryProvider.ApplicantSummaryResult result = provider.summarizeApplication(
                new AiSummaryProvider.ApplicantSummaryRequest(
                        artifact.promptVersion(), source.interviewTitle(), source.targetDescription(),
                        source.answers(), source.availableTimes()
                )
        );
        return markReady(artifact, result.provider(), result.model(), result.content(), result.usage());
    }

    private Outcome markReady(
            ClaimedArtifact artifact,
            String providerName,
            String model,
            Object content,
            AiSummaryProvider.Usage usage
    ) {
        String resultJson;
        try {
            resultJson = objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize AI summary result", exception);
        }
        AiSummaryArtifactRepository.GuardedCompletionResult completion = transactions.execute(status ->
                repository.markReady(new AiSummaryArtifactRepository.ReadyArtifactCompletion(
                        artifact.artifactId(), artifact.sourceHash(), artifact.promptVersion(), artifact.workVersion(),
                        OffsetDateTime.now(ZoneOffset.UTC), providerName, model, resultJson,
                        usage == null ? null : usage.promptTokens(),
                        usage == null ? null : usage.candidateTokens(),
                        (BigDecimal) null
                ))
        );
        return completion == AiSummaryArtifactRepository.GuardedCompletionResult.APPLIED
                ? Outcome.READY : Outcome.STALE;
    }

    private Outcome recordProviderFailure(ClaimedArtifact artifact, AiSummaryProvider.ProviderException exception) {
        return recordFailure(
                artifact,
                exception.code(),
                exception.retryable(),
                "gemini",
                properties.getAiSummaryModel()
        );
    }

    private Outcome recordFailure(
            ClaimedArtifact artifact,
            String failureCode,
            boolean retryable,
            String providerName,
            String model
    ) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (retryable) {
            AiSummaryArtifactRepository.RetryableFailureResult result = transactions.execute(status ->
                    repository.markRetryableFailure(new AiSummaryArtifactRepository.RetryableArtifactFailure(
                            artifact.artifactId(), artifact.sourceHash(), artifact.promptVersion(), artifact.workVersion(),
                            now, nextAttemptAt(now, artifact.attemptCount()), failureCode, providerName, model,
                            properties.getAiSummaryMaxAttempts()
                    ))
            );
            if (result == AiSummaryArtifactRepository.RetryableFailureResult.STALE) {
                return Outcome.STALE;
            }
            return result == AiSummaryArtifactRepository.RetryableFailureResult.RETRY_SCHEDULED
                    ? Outcome.RETRIED : Outcome.FAILED;
        }
        AiSummaryArtifactRepository.GuardedCompletionResult result = transactions.execute(status ->
                repository.markFailed(new AiSummaryArtifactRepository.FailedArtifactCompletion(
                        artifact.artifactId(), artifact.sourceHash(), artifact.promptVersion(), artifact.workVersion(),
                        now, failureCode, providerName, model
                ))
        );
        return result == AiSummaryArtifactRepository.GuardedCompletionResult.APPLIED
                ? Outcome.FAILED : Outcome.STALE;
    }

    private OffsetDateTime nextAttemptAt(OffsetDateTime now, int attemptCount) {
        return attemptCount <= 1 ? now.plusSeconds(30) : now.plusMinutes(2);
    }

    private boolean generationRunnable() {
        return properties.isAiSummaryEnabled()
                && properties.isAiSummaryWorkerEnabled()
                && "gemini".equalsIgnoreCase(properties.getAiSummaryProvider())
                && properties.getGeminiApiKey() != null
                && !properties.getGeminiApiKey().isBlank()
                && properties.getAiSummaryModel() != null
                && !properties.getAiSummaryModel().isBlank();
    }

    enum Outcome {
        READY,
        RETRIED,
        FAILED,
        STALE
    }

    public record GenerationBatchResult(int processed, int ready, int retried, int failed, int stale) {
        static GenerationBatchResult zero() {
            return new GenerationBatchResult(0, 0, 0, 0, 0);
        }
    }
}
