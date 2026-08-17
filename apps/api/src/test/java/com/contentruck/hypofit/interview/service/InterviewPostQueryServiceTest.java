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

        assertThat(interviewPostQueryService.getVisiblePost(postId, null, false)).isSameAs(post);
    }

    @Test
    void getVisiblePostThrowsWhenRepositoryReturnsEmpty() {
        UUID postId = UUID.randomUUID();
        when(interviewPostReadRepository.findVisiblePost(postId, null, false)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewPostQueryService.getVisiblePost(postId, null, false))
                .isInstanceOf(InterviewPostNotFoundException.class);
    }

    @Test
    void listPostsReturnsRepositoryResults() {
        InterviewPostListCriteria criteria = new InterviewPostListCriteria(
                "open",
                null,
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
}
