package com.contentruck.hypofit.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ApplicationSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.InterviewSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.PendingWorkUpsert;
import com.contentruck.hypofit.common.config.HypofitProperties;
import java.time.Duration;
import java.time.OffsetDateTime;
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

@ExtendWith(MockitoExtension.class)
class AiSummaryEnqueueServiceTest {

    @Mock
    private AiSummaryArtifactRepository repository;

    @Mock
    private AiSummarySourceHasher sourceHasher;

    private HypofitProperties properties;
    private AiSummaryEnqueueService service;

    @BeforeEach
    void setUp() {
        properties = new HypofitProperties();
        service = new AiSummaryEnqueueService(repository, sourceHasher, properties);
    }

    @Test
    void enqueueDoesNothingWhenAiSummariesAreDisabled() {
        service.enqueueInterviewSummary(UUID.randomUUID());
        service.enqueueApplicationSummary(UUID.randomUUID());

        verifyNoInteractions(repository, sourceHasher);
    }

    @Test
    void enqueueInterviewSummaryHashesLoadedSourceAndUpsertsPendingWork() {
        properties.setAiSummaryEnabled(true);
        properties.setAiInterviewSummaryEnabled(true);

        UUID interviewPostId = UUID.randomUUID();
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
        when(repository.loadInterviewPostSource(interviewPostId)).thenReturn(Optional.of(source));
        when(sourceHasher.hashInterview(source)).thenReturn("interview-hash-v1");

        service.enqueueInterviewSummary(interviewPostId);

        ArgumentCaptor<PendingWorkUpsert> captor = ArgumentCaptor.forClass(PendingWorkUpsert.class);
        verify(sourceHasher).hashInterview(source);
        verify(repository).upsertInterviewPostPendingWork(captor.capture());
        PendingWorkUpsert command = captor.getValue();
        assertThat(command.targetId()).isEqualTo(interviewPostId);
        assertThat(command.sourceHash()).isEqualTo("interview-hash-v1");
        assertThat(command.promptVersion()).isEqualTo(AiSummaryEnqueueService.INTERVIEW_PROMPT_VERSION);
        assertThat(Duration.between(command.now(), OffsetDateTime.now(command.now().getOffset())).abs())
                .isLessThan(Duration.ofSeconds(5));
        verify(repository, never()).upsertApplicationPendingWork(any());
    }

    @Test
    void enqueueApplicationSummaryHashesLoadedSourceAndUpsertsPendingWork() {
        properties.setAiSummaryEnabled(true);
        properties.setAiApplicantSummaryEnabled(true);

        UUID applicationId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        Map<String, String> answers = new LinkedHashMap<>();
        answers.put("experience", "운동 앱을 오래 썼어요.");
        ApplicationSummarySource source = new ApplicationSummarySource(
                applicationId,
                interviewPostId,
                "운동 앱 인터뷰",
                "최근 운동 앱 사용 경험자",
                answers,
                List.of("평일 저녁")
        );
        when(repository.loadApplicationSource(applicationId)).thenReturn(Optional.of(source));
        when(sourceHasher.hashApplication(source)).thenReturn("application-hash-v1");

        service.enqueueApplicationSummary(applicationId);

        ArgumentCaptor<PendingWorkUpsert> captor = ArgumentCaptor.forClass(PendingWorkUpsert.class);
        verify(sourceHasher).hashApplication(source);
        verify(repository).upsertApplicationPendingWork(captor.capture());
        PendingWorkUpsert command = captor.getValue();
        assertThat(command.targetId()).isEqualTo(applicationId);
        assertThat(command.sourceHash()).isEqualTo("application-hash-v1");
        assertThat(command.promptVersion()).isEqualTo(AiSummaryEnqueueService.APPLICANT_PROMPT_VERSION);
    }

    @Test
    void enqueueApplicationSummarySkipsSourcesWithoutContent() {
        properties.setAiSummaryEnabled(true);
        properties.setAiApplicantSummaryEnabled(true);

        UUID applicationId = UUID.randomUUID();
        ApplicationSummarySource source = new ApplicationSummarySource(
                applicationId,
                UUID.randomUUID(),
                "운동 앱 인터뷰",
                "최근 운동 앱 사용 경험자",
                Map.of(),
                List.of()
        );
        when(repository.loadApplicationSource(applicationId)).thenReturn(Optional.of(source));

        service.enqueueApplicationSummary(applicationId);

        verify(sourceHasher, never()).hashApplication(any());
        verify(repository, never()).upsertApplicationPendingWork(any());
    }
}
