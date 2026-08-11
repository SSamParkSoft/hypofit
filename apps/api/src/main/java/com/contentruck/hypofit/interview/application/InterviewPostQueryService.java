package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.interview.domain.InterviewPostReadModel;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewPostQueryService {

    private final InterviewPostReadRepository interviewPostReadRepository;

    public InterviewPostQueryService(InterviewPostReadRepository interviewPostReadRepository) {
        this.interviewPostReadRepository = interviewPostReadRepository;
    }

    @Transactional(readOnly = true)
    public List<InterviewPostReadModel> listPosts(InterviewPostListCriteria criteria) {
        return interviewPostReadRepository.findPosts(criteria);
    }

    @Transactional(readOnly = true)
    public InterviewPostReadModel getVisiblePost(UUID postId, UUID viewerId, boolean isAdmin) {
        return interviewPostReadRepository.findVisiblePost(postId, viewerId, isAdmin)
                .orElseThrow(InterviewPostNotFoundException::new);
    }
}
