package com.contentruck.hypofit.ai.service;

import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository;
import com.contentruck.hypofit.common.config.HypofitProperties;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AiSummaryEnqueueService {

    static final String INTERVIEW_PROMPT_VERSION = "interview-summary-v1";
    static final String APPLICANT_PROMPT_VERSION = "applicant-summary-v1";

    private final AiSummaryArtifactRepository repository;
    private final AiSummarySourceHasher sourceHasher;
    private final HypofitProperties properties;

    public AiSummaryEnqueueService(
            AiSummaryArtifactRepository repository,
            AiSummarySourceHasher sourceHasher,
            HypofitProperties properties
    ) {
        this.repository = repository;
        this.sourceHasher = sourceHasher;
        this.properties = properties;
    }

    public void enqueueInterviewSummary(UUID interviewPostId) {
        if (!properties.isAiSummaryEnabled() || !properties.isAiInterviewSummaryEnabled()) {
            return;
        }
        repository.loadInterviewPostSource(interviewPostId).ifPresent(source ->
                repository.upsertInterviewPostPendingWork(new AiSummaryArtifactRepository.PendingWorkUpsert(
                        interviewPostId,
                        sourceHasher.hashInterview(source),
                        INTERVIEW_PROMPT_VERSION,
                        OffsetDateTime.now(ZoneOffset.UTC)
                ))
        );
    }

    public void enqueueApplicationSummary(UUID applicationId) {
        if (!properties.isAiSummaryEnabled() || !properties.isAiApplicantSummaryEnabled()) {
            return;
        }
        repository.loadApplicationSource(applicationId)
                .filter(AiSummaryArtifactRepository.ApplicationSummarySource::hasContentToSummarize)
                .ifPresent(source -> repository.upsertApplicationPendingWork(
                        new AiSummaryArtifactRepository.PendingWorkUpsert(
                                applicationId,
                                sourceHasher.hashApplication(source),
                                APPLICANT_PROMPT_VERSION,
                                OffsetDateTime.now(ZoneOffset.UTC)
                        )
                ));
    }
}
