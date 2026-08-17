package com.contentruck.hypofit.interviewview.controller;

import com.contentruck.hypofit.interviewview.dto.InterviewPostViewCreateRequest;
import com.contentruck.hypofit.interviewview.dto.InterviewPostViewResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.interviewview.service.InterviewPostViewService;
import com.contentruck.hypofit.interviewview.service.InterviewPostViewReadModel;
import com.contentruck.hypofit.interviewview.service.InterviewPostViewSource;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class InterviewPostViewControllerTest {

    @Mock
    private InterviewPostViewService service;

    @Test
    void listViewsUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        when(service.listViews(userId)).thenReturn(List.of(view(userId, UUID.randomUUID(), 1, "home")));

        InterviewPostViewController controller = new InterviewPostViewController(service);
        List<InterviewPostViewResponse> result = controller.listInterviewPostViews(jwt(userId));

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().userId()).isEqualTo(userId);
        assertThat(result.getFirst().source()).isEqualTo("home");
    }

    @Test
    void markViewedUsesPathAndBody() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(service.markViewed(userId, postId, InterviewPostViewSource.DETAIL))
                .thenReturn(view(userId, postId, 2, "detail"));

        InterviewPostViewController controller = new InterviewPostViewController(service);
        InterviewPostViewResponse result = controller.markInterviewPostViewed(
                postId,
                new InterviewPostViewCreateRequest(InterviewPostViewSource.DETAIL),
                jwt(userId)
        );

        assertThat(result.interviewPostId()).isEqualTo(postId);
        assertThat(result.viewCount()).isEqualTo(2);
        assertThat(result.source()).isEqualTo("detail");
    }

    @Test
    void listViewsRequiresJwt() {
        InterviewPostViewController controller = new InterviewPostViewController(service);

        assertThatThrownBy(() -> controller.listInterviewPostViews(null))
                .isInstanceOf(AuthRequiredException.class);
    }

    private static Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
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
