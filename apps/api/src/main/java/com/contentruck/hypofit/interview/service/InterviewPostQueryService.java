package com.contentruck.hypofit.interview.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewPostQueryService {

    private static final String INTERVIEW_RECRUITMENT_TYPE = "interview";

    private final InterviewPostReadRepository interviewPostReadRepository;

    public InterviewPostQueryService(InterviewPostReadRepository interviewPostReadRepository) {
        this.interviewPostReadRepository = interviewPostReadRepository;
    }

    @Transactional(readOnly = true)
    public List<InterviewPostReadModel> listPosts(InterviewPostListCriteria criteria) {
        return interviewPostReadRepository.findPosts(criteria).stream()
                .filter(post -> criteria.supportsRecruitmentTypes() || INTERVIEW_RECRUITMENT_TYPE.equals(post.recruitmentType()))
                .toList();
    }

    @Transactional(readOnly = true)
    public InterviewPostReadModel getVisiblePost(UUID postId, UUID viewerId, boolean isAdmin, boolean supportsRecruitmentTypes) {
        InterviewPostReadModel post = interviewPostReadRepository.findVisiblePost(postId, viewerId, isAdmin)
                .orElseThrow(InterviewPostNotFoundException::new);
        if (!supportsRecruitmentTypes && !INTERVIEW_RECRUITMENT_TYPE.equals(post.recruitmentType())) {
            throw new InterviewPostClientUpgradeRequiredException(post.id(), post.recruitmentType());
        }
        return post;
    }
}
