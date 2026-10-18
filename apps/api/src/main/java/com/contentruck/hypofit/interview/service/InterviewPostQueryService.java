package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.HypofitException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewPostQueryService {

    private static final String INTERVIEW_RECRUITMENT_TYPE = "interview";
    private static final int LOCATION_CATALOG_LIMIT = 500;

    private final InterviewPostReadRepository interviewPostReadRepository;

    public InterviewPostQueryService(InterviewPostReadRepository interviewPostReadRepository) {
        this.interviewPostReadRepository = interviewPostReadRepository;
    }

    @Transactional(readOnly = true)
    public List<InterviewPostReadModel> listPosts(InterviewPostListCriteria criteria) {
        return interviewPostReadRepository.findPosts(criteria).stream()
                .filter(post -> criteria.supportsRecruitmentTypes() || INTERVIEW_RECRUITMENT_TYPE.equals(post.recruitmentType()))
                .filter(post -> criteria.supportsResearchRecruitment() || !"research_experiment".equals(post.recruitmentType()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InterviewPostReadModel> listLocationCatalog(
            UUID viewerId, boolean supportsRecruitmentTypes, boolean supportsResearchRecruitment) {
        // A bounded, coordinate-independent feed for small-catalog device search.
        // Fetch one sentinel row so truncation cannot masquerade as a complete map.
        InterviewPostListCriteria criteria = new InterviewPostListCriteria(
                "open", viewerId, false, supportsRecruitmentTypes, null, null, null,
                null, null, null, null, null, "newest", LOCATION_CATALOG_LIMIT + 1,
                supportsResearchRecruitment);
        List<InterviewPostReadModel> posts = interviewPostReadRepository.findLocationCatalog(criteria);
        if (posts.size() > LOCATION_CATALOG_LIMIT) {
            throw new HypofitException(
                    "location_catalog_capacity_exceeded",
                    "주변 공고를 모두 불러올 수 없어요. 일반 공고 목록에서 확인해 주세요.",
                    409,
                    "Location catalog exceeds the device-local limit. No partial catalog was returned.");
        }
        return posts;
    }

    @Transactional(readOnly = true)
    public InterviewPostReadModel getVisiblePost(UUID postId, UUID viewerId, boolean isAdmin, boolean supportsRecruitmentTypes) {
        return getVisiblePost(postId, viewerId, isAdmin, supportsRecruitmentTypes, false);
    }

    @Transactional(readOnly = true)
    public InterviewPostReadModel getVisiblePost(UUID postId, UUID viewerId, boolean isAdmin,
            boolean supportsRecruitmentTypes, boolean supportsResearchRecruitment) {
        InterviewPostReadModel post = interviewPostReadRepository.findVisiblePost(postId, viewerId, isAdmin)
                .orElseThrow(InterviewPostNotFoundException::new);
        if (!supportsRecruitmentTypes && !INTERVIEW_RECRUITMENT_TYPE.equals(post.recruitmentType())) {
            throw new InterviewPostClientUpgradeRequiredException(post.id(), post.recruitmentType());
        }
        if (!supportsResearchRecruitment && "research_experiment".equals(post.recruitmentType())) {
            throw new InterviewPostClientUpgradeRequiredException(post.id(), post.recruitmentType());
        }
        return post;
    }
}
