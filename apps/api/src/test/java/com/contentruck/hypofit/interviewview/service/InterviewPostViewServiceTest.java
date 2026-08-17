package com.contentruck.hypofit.interviewview.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InterviewPostViewServiceTest {

    @Mock
    private InterviewPostViewRepository repository;

    private InterviewPostViewService service;

    @BeforeEach
    void setUp() {
        service = new InterviewPostViewService(repository);
    }

    @Test
    void listViewsReturnsRepositoryRowsForActiveUser() {
        UUID userId = UUID.randomUUID();
        when(repository.findViewerAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.listViewsForUser(userId)).thenReturn(List.of(view(userId, UUID.randomUUID(), 1, "home")));

        List<InterviewPostViewReadModel> result = service.listViews(userId);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().source()).isEqualTo(InterviewPostViewSource.HOME);
    }

    @Test
    void listViewsRejectsDeletedUser() {
        UUID userId = UUID.randomUUID();
        when(repository.findViewerAccount(userId)).thenReturn(Optional.of(
                new InterviewPostViewRepository.ViewerAccountRecord(
                        userId,
                        null,
                        OffsetDateTime.now(ZoneOffset.UTC)
                )
        ));

        assertThatThrownBy(() -> service.listViews(userId))
                .isInstanceOf(InterviewPostViewAccountDeletedException.class);
    }

    @Test
    void markViewedThrowsWhenPostDoesNotExist() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findViewerAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.upsertView(eq(userId), eq(postId), eq(InterviewPostViewSource.MAP), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markViewed(userId, postId, InterviewPostViewSource.MAP))
                .isInstanceOf(InterviewPostViewNotFoundException.class);
    }

    @Test
    void markViewedReturnsUpsertedRow() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        InterviewPostViewReadModel saved = view(userId, postId, 3, "chat");
        when(repository.findViewerAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.upsertView(eq(userId), eq(postId), eq(InterviewPostViewSource.CHAT), any()))
                .thenReturn(Optional.of(saved));

        InterviewPostViewReadModel result = service.markViewed(userId, postId, InterviewPostViewSource.CHAT);

        assertThat(result.viewCount()).isEqualTo(3);
        assertThat(result.source()).isEqualTo(InterviewPostViewSource.CHAT);
    }

    private static InterviewPostViewRepository.ViewerAccountRecord activeUser(UUID userId) {
        return new InterviewPostViewRepository.ViewerAccountRecord(userId, null, null);
    }

    private static InterviewPostViewReadModel view(UUID userId, UUID postId, int count, String source) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new InterviewPostViewReadModel(
                UUID.randomUUID(),
                userId,
                postId,
                now.minusDays(1),
                now,
                count,
                InterviewPostViewSource.fromValue(source)
        );
    }
}
