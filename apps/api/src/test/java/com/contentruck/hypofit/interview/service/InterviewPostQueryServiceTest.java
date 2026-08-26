package com.contentruck.hypofit.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InterviewPostQueryServiceTest {

    @Mock
    private InterviewPostReadRepository interviewPostReadRepository;

    private InterviewPostQueryService interviewPostQueryService;

    @BeforeEach
    void setUp() {
        interviewPostQueryService = new InterviewPostQueryService(interviewPostReadRepository);
    }

    @Test
    void getVisiblePostReturnsRepositoryResult() {
        UUID postId = UUID.randomUUID();
        InterviewPostReadModel post = InterviewPostFixtures.interviewPost(postId);
        when(interviewPostReadRepository.findVisiblePost(postId, null, false)).thenReturn(Optional.of(post));

        assertThat(interviewPostQueryService.getVisiblePost(postId, null, false, false)).isSameAs(post);
    }

    @Test
    void getVisiblePostThrowsWhenRepositoryReturnsEmpty() {
        UUID postId = UUID.randomUUID();
        when(interviewPostReadRepository.findVisiblePost(postId, null, false)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewPostQueryService.getVisiblePost(postId, null, false, false))
                .isInstanceOf(InterviewPostNotFoundException.class);
    }

    @Test
    void listPostsReturnsRepositoryResults() {
        InterviewPostListCriteria criteria = new InterviewPostListCriteria(
                "open",
                null,
                false,
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "newest",
                100
        );
        when(interviewPostReadRepository.findPosts(criteria)).thenReturn(List.of(
                InterviewPostFixtures.interviewPost(UUID.randomUUID())
        ));

        assertThat(interviewPostQueryService.listPosts(criteria)).hasSize(1);
    }

    @Test
    void listPostsFiltersNonInterviewPostsForLegacyClients() {
        InterviewPostListCriteria criteria = new InterviewPostListCriteria(
                "open",
                null,
                false,
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "newest",
                100
        );
        when(interviewPostReadRepository.findPosts(criteria)).thenReturn(List.of(
                InterviewPostFixtures.interviewPost(UUID.randomUUID()),
                surveyPost(UUID.randomUUID())
        ));

        assertThat(interviewPostQueryService.listPosts(criteria))
                .extracting(InterviewPostReadModel::recruitmentType)
                .containsExactly("interview");
    }

    @Test
    void getVisiblePostRejectsNonInterviewForLegacyClients() {
        UUID postId = UUID.randomUUID();
        when(interviewPostReadRepository.findVisiblePost(postId, null, false))
                .thenReturn(Optional.of(surveyPost(postId)));

        assertThatThrownBy(() -> interviewPostQueryService.getVisiblePost(postId, null, false, false))
                .isInstanceOf(InterviewPostClientUpgradeRequiredException.class)
                .hasMessageContaining("recruitment type survey");
    }

    @Test
    void getVisiblePostAllowsNonInterviewForCapabilityAwareClients() {
        UUID postId = UUID.randomUUID();
        InterviewPostReadModel post = surveyPost(postId);
        when(interviewPostReadRepository.findVisiblePost(postId, null, false)).thenReturn(Optional.of(post));

        assertThat(interviewPostQueryService.getVisiblePost(postId, null, false, true)).isSameAs(post);
    }

    private InterviewPostReadModel surveyPost(UUID postId) {
        InterviewPostReadModel interviewPost = InterviewPostFixtures.interviewPost(postId);
        return new InterviewPostReadModel(
                interviewPost.id(),
                interviewPost.founderId(),
                "survey",
                interviewPost.title(),
                interviewPost.serviceSummary(),
                interviewPost.targetDescription(),
                interviewPost.rewardAmount(),
                interviewPost.durationMinutes(),
                interviewPost.recruitCount(),
                interviewPost.interviewMode(),
                interviewPost.location(),
                interviewPost.locationText(),
                interviewPost.locationAddress(),
                interviewPost.locationPlaceName(),
                interviewPost.locationLatitude(),
                interviewPost.locationLongitude(),
                interviewPost.locationPrecision(),
                interviewPost.locationSource(),
                interviewPost.scheduleOptions(),
                interviewPost.status(),
                interviewPost.createdAt(),
                interviewPost.founder(),
                interviewPost.founderReviewSummary(),
                interviewPost.distanceMeters(),
                interviewPost.aiSummary()
        );
    }
}
