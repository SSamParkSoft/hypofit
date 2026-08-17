package com.contentruck.hypofit.interviewview.service;


import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewPostViewService {

    private final InterviewPostViewRepository repository;

    public InterviewPostViewService(InterviewPostViewRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<InterviewPostViewReadModel> listViews(UUID userId) {
        requireActiveUser(userId);
        return repository.listViewsForUser(userId);
    }

    @Transactional
    public InterviewPostViewReadModel markViewed(UUID userId, UUID postId, InterviewPostViewSource source) {
        requireActiveUser(userId);
        return repository.upsertView(userId, postId, source, OffsetDateTime.now(ZoneOffset.UTC))
                .orElseThrow(InterviewPostViewNotFoundException::new);
    }

    private void requireActiveUser(UUID userId) {
        InterviewPostViewRepository.ViewerAccountRecord user = repository.findViewerAccount(userId)
                .orElseThrow(InterviewPostViewProfileMissingException::new);
        if (user.deletedAt() != null) {
            throw new InterviewPostViewAccountDeletedException();
        }
        if (user.deactivatedAt() != null) {
            throw new InterviewPostViewAccountDeactivatedException();
        }
    }
}
