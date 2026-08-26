package com.contentruck.hypofit.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ApplicationSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ClaimedArtifact;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.FailedArtifactCompletion;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.GuardedCompletionResult;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.InterviewSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ReadyArtifactCompletion;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.RetryableArtifactFailure;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.RetryableFailureResult;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.SummaryType;
import com.contentruck.hypofit.common.config.HypofitProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;

@ExtendWith(MockitoExtension.class)
class AiSummaryGenerationServiceTest {

    @Mock
    private AiSummaryArtifactRepository repository;

    @Mock
    private AiSummaryProvider provider;

    @Mock
    private AiSummarySourceHasher sourceHasher;

    @Mock
    private TransactionOperations transactions;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private HypofitProperties properties;
    private AiSummaryGenerationService service;

    @BeforeEach
    void setUp() {
        properties = new HypofitProperties();
        properties.setAiSummaryEnabled(true);
        properties.setAiSummaryWorkerEnabled(true);
        properties.setAiSummaryProvider("gemini");
        properties.setGeminiApiKey("test-key");
        properties.setAiSummaryModel("gemini-2.5-flash");
        properties.setAiSummaryWorkerBatchSize(5);
        properties.setAiSummaryProcessingTimeoutSeconds(300);
        properties.setAiSummaryMaxAttempts(3);

        service = new AiSummaryGenerationService(
                repository,
                provider,
                sourceHasher,
                objectMapper,
                properties,
                transactions
        );
    }

    @Test
    void processPendingReturnsZeroWithoutTouchingDependenciesWhenFlagsAreOff() {
        properties.setAiSummaryEnabled(false);

        AiSummaryGenerationService.GenerationBatchResult result = service.processPending();

        assertThat(result).isEqualTo(new AiSummaryGenerationService.GenerationBatchResult(0, 0, 0, 0, 0));
        verifyNoInteractions(repository, provider, sourceHasher, transactions);
    }

    @Test
    void processPendingMarksInterviewSummaryReadyOnSuccessfulGeneration() throws Exception {
        stubTransactions();

        UUID artifactId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        ClaimedArtifact artifact = new ClaimedArtifact(
                artifactId,
                SummaryType.INTERVIEW_POST,
                interviewPostId,
                null,
                "interview-hash-v1",
                "interview-summary-v1",
                1,
                0
        );
        InterviewSummarySource source = new InterviewSummarySource(
                interviewPostId,
                "운동 앱 인터뷰",
                "운동 앱 이탈 경험을 확인해요.",
                "최근 운동 앱 사용 경험자",
                30000,
                30,
                3,
                "online",
                "안산시",
                List.of("평일 저녁", "토요일 오전")
        );
        AiSummaryProvider.InterviewSummaryResult providerResult = new AiSummaryProvider.InterviewSummaryResult(
                "gemini",
                "gemini-2.5-flash",
                new AiSummaryProvider.InterviewSummaryContent(
                        "운동 앱 사용 경험을 듣는 인터뷰예요.",
                        "중단 경험이 있는 분이 적합해요.",
                        List.of("평일 저녁 30분 화상 인터뷰예요.")
                ),
                new AiSummaryProvider.Usage(41, 19, 60)
        );

        when(repository.claimPendingArtifacts(any(), eq(5))).thenReturn(List.of(artifact));
        when(repository.loadInterviewPostSource(interviewPostId)).thenReturn(Optional.of(source));
        when(sourceHasher.hashInterview(source)).thenReturn("interview-hash-v1");
        when(provider.summarizeInterview(any())).thenReturn(providerResult);
        when(repository.markReady(any())).thenReturn(GuardedCompletionResult.APPLIED);

        AiSummaryGenerationService.GenerationBatchResult result = service.processPending();

        assertThat(result).isEqualTo(new AiSummaryGenerationService.GenerationBatchResult(1, 1, 0, 0, 0));
        verify(repository).resetStaleProcessingArtifacts(any(), eq(300), eq(3));
        verify(provider).summarizeInterview(any());

        ArgumentCaptor<ReadyArtifactCompletion> completionCaptor =
                ArgumentCaptor.forClass(ReadyArtifactCompletion.class);
        verify(repository).markReady(completionCaptor.capture());
        ReadyArtifactCompletion completion = completionCaptor.getValue();
        assertThat(completion.artifactId()).isEqualTo(artifactId);
        assertThat(completion.sourceHash()).isEqualTo("interview-hash-v1");
        assertThat(completion.promptVersion()).isEqualTo("interview-summary-v1");
        assertThat(completion.workVersion()).isEqualTo(1);
        assertThat(completion.provider()).isEqualTo("gemini");
        assertThat(completion.model()).isEqualTo("gemini-2.5-flash");
        assertThat(completion.inputTokens()).isEqualTo(41);
        assertThat(completion.outputTokens()).isEqualTo(19);

        JsonNode json = objectMapper.readTree(completion.resultJson());
        assertThat(json.path("overview").asText()).isEqualTo("운동 앱 사용 경험을 듣는 인터뷰예요.");
        assertThat(json.path("target_fit").asText()).isEqualTo("중단 경험이 있는 분이 적합해요.");
        assertThat(json.path("key_points")).hasSize(1);
    }

    @Test
    void processPendingSchedulesRetryForRetryableProviderFailure() {
        stubTransactions();

        UUID artifactId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        ClaimedArtifact artifact = new ClaimedArtifact(
                artifactId,
                SummaryType.APPLICATION,
                interviewPostId,
                applicationId,
                "application-hash-v1",
                "application-summary-v1",
                2,
                1
        );
        Map<String, String> answers = new LinkedHashMap<>();
        answers.put("experience", "운동 앱을 여러 번 사용했어요.");
        ApplicationSummarySource source = new ApplicationSummarySource(
                applicationId,
                interviewPostId,
                "운동 앱 인터뷰",
                "최근 운동 앱 사용 경험자",
                answers,
                List.of("평일 오후 8시 이후")
        );

        when(repository.claimPendingArtifacts(any(), eq(5))).thenReturn(List.of(artifact));
        when(repository.loadApplicationSource(applicationId)).thenReturn(Optional.of(source));
        when(sourceHasher.hashApplication(source)).thenReturn("application-hash-v1");
        when(provider.summarizeApplication(any())).thenThrow(
                new AiSummaryProvider.ProviderException(AiSummaryProvider.FailureCode.PROVIDER_RATE_LIMITED)
        );
        when(repository.markRetryableFailure(any())).thenReturn(RetryableFailureResult.RETRY_SCHEDULED);

        AiSummaryGenerationService.GenerationBatchResult result = service.processPending();

        assertThat(result).isEqualTo(new AiSummaryGenerationService.GenerationBatchResult(1, 0, 1, 0, 0));

        ArgumentCaptor<RetryableArtifactFailure> failureCaptor =
                ArgumentCaptor.forClass(RetryableArtifactFailure.class);
        verify(repository).markRetryableFailure(failureCaptor.capture());
        RetryableArtifactFailure failure = failureCaptor.getValue();
        assertThat(failure.artifactId()).isEqualTo(artifactId);
        assertThat(failure.failureCode()).isEqualTo("ai_summary_provider_rate_limited");
        assertThat(failure.provider()).isEqualTo("gemini");
        assertThat(failure.model()).isEqualTo("gemini-2.5-flash");
        assertThat(Duration.between(failure.now(), failure.nextAttemptAt())).isEqualTo(Duration.ofSeconds(30));
    }

    @Test
    void processPendingTreatsSourceChangedArtifactAsStaleWhenGuardedFailureLosesRace() {
        stubTransactions();

        UUID artifactId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        ClaimedArtifact artifact = new ClaimedArtifact(
                artifactId,
                SummaryType.INTERVIEW_POST,
                interviewPostId,
                null,
                "stale-hash",
                "interview-summary-v1",
                3,
                0
        );
        InterviewSummarySource source = new InterviewSummarySource(
                interviewPostId,
                "운동 앱 인터뷰",
                "운동 앱 이탈 경험을 확인해요.",
                "최근 운동 앱 사용 경험자",
                30000,
                30,
                3,
                "online",
                "안산시",
                List.of("평일 저녁")
        );

        when(repository.claimPendingArtifacts(any(), eq(5))).thenReturn(List.of(artifact));
        when(repository.loadInterviewPostSource(interviewPostId)).thenReturn(Optional.of(source));
        when(sourceHasher.hashInterview(source)).thenReturn("fresh-hash");
        when(repository.markFailed(any())).thenReturn(GuardedCompletionResult.STALE);

        AiSummaryGenerationService.GenerationBatchResult result = service.processPending();

        assertThat(result).isEqualTo(new AiSummaryGenerationService.GenerationBatchResult(1, 0, 0, 0, 1));
        verify(provider, never()).summarizeInterview(any());

        ArgumentCaptor<FailedArtifactCompletion> failureCaptor =
                ArgumentCaptor.forClass(FailedArtifactCompletion.class);
        verify(repository).markFailed(failureCaptor.capture());
        FailedArtifactCompletion failure = failureCaptor.getValue();
        assertThat(failure.artifactId()).isEqualTo(artifactId);
        assertThat(failure.failureCode()).isEqualTo("ai_summary_source_changed");
        assertThat(failure.provider()).isNull();
        assertThat(failure.model()).isNull();
    }

    private void stubTransactions() {
        when(transactions.execute(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            TransactionCallback<Object> callback = (TransactionCallback<Object>) invocation.getArgument(0);
            return callback.doInTransaction(org.mockito.Mockito.mock(TransactionStatus.class));
        });
    }
}
