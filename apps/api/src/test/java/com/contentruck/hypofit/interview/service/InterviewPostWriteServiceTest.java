package com.contentruck.hypofit.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.audit.service.AuditWriteService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InterviewPostWriteServiceTest {

    @Mock
    private InterviewPostWriteRepository repository;

    @Mock
    private AuditWriteService auditWriteService;

    private InterviewPostWriteService service;

    @BeforeEach
    void setUp() {
        service = new InterviewPostWriteService(repository, auditWriteService);
    }

    @Test
    void updatePostClearsLocationWhenSwitchedOnline() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "draft", "offline")));
        when(repository.updatePost(eq(postId), anyMap()))
                .thenReturn(writePost(postId, actorUserId, "open", "online"));

        service.updatePost(
                actorUserId,
                postId,
                new InterviewPostUpdateCommand(
                        Set.of("title", "interviewMode", "status"),
                        "온라인 인터뷰로 전환",
                        null,
                        null,
                        null,
                        null,
                        null,
                        "online",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "open"
                )
        );

        verify(repository).updatePost(eq(postId), argThat(changes ->
                "온라인 인터뷰로 전환".equals(changes.get("title"))
                        && "online".equals(changes.get("interviewMode"))
                        && "open".equals(changes.get("status"))
                        && changes.containsKey("location")
                        && changes.get("location") == null
                        && changes.containsKey("locationText")
                        && changes.get("locationText") == null
                        && changes.containsKey("locationLatitude")
                        && changes.get("locationLatitude") == null
                        && changes.containsKey("locationLongitude")
                        && changes.get("locationLongitude") == null
        ));
        verify(auditWriteService).record(argThat(command ->
                command.actorUserId().equals(actorUserId)
                        && "user".equals(command.actorType())
                        && "interview_post_updated".equals(command.eventType())
                        && "interview_post".equals(command.targetType())
                        && command.targetId().equals(postId)
                        && "offline".equals(command.before().get("interview_mode"))
                        && "draft".equals(command.before().get("status"))
                        && "online".equals(command.after().get("interview_mode"))
                        && "open".equals(command.after().get("status"))
                        && actorUserId.toString().equals(command.metadata().get("founder_id"))
                        && command.metadata().get("updated_fields").equals(List.of(
                        "interview_mode",
                        "location",
                        "location_address",
                        "location_latitude",
                        "location_longitude",
                        "location_place_name",
                        "location_precision",
                        "location_source",
                        "location_text",
                        "status",
                        "title"
                ))
        ));
    }

    @Test
    void archivePostRejectsCompletedStatus() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "both")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "completed", "online")));

        assertThatThrownBy(() -> service.archivePost(actorUserId, postId))
                .isInstanceOf(InterviewPostConflictException.class)
                .hasMessageContaining("Only closed, draft, open interview posts can be archived");
    }

    @Test
    void reopenPostRejectsOpenStatus() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "open", "online")));

        assertThatThrownBy(() -> service.reopenPost(actorUserId, postId))
                .isInstanceOf(InterviewPostConflictException.class)
                .hasMessageContaining("Only archived, closed interview posts can be reopened");
    }

    @Test
    void updatePostRequiresOwner() {
        UUID actorUserId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, founderId, "open", "online")));

        assertThatThrownBy(() -> service.updatePost(
                actorUserId,
                postId,
                new InterviewPostUpdateCommand(Set.of("title"), "수정", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null)
        ))
                .isInstanceOf(InterviewPostPermissionDeniedException.class)
                .hasMessageContaining("Forbidden");
    }

    @Test
    void createPostRequiresFounderRole() {
        UUID actorUserId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "respondent")));

        assertThatThrownBy(() -> service.createPost(
                actorUserId,
                new InterviewPostCreateCommand(
                        "인터뷰 모집",
                        "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                        "최근 3개월 내 관련 경험자",
                        15000,
                        30,
                        0,
                        "online",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of("평일 저녁"),
                        "open"
                )
        ))
                .isInstanceOf(InterviewPostPermissionDeniedException.class)
                .hasMessageContaining("Founder role required");
    }

    @Test
    void closePostReturnsUnhydratedCompatibilityResponse() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "open", "online")));
        when(repository.updateStatus(postId, "closed")).thenReturn(writePost(postId, actorUserId, "closed", "online"));

        var response = service.closePost(actorUserId, postId);

        var order = inOrder(repository, auditWriteService);
        order.verify(repository).updateStatus(postId, "closed");
        order.verify(auditWriteService).record(argThat(command ->
                "interview_post_closed".equals(command.eventType())
                        && "open".equals(command.before().get("status"))
                        && "closed".equals(command.after().get("status"))
                        && actorUserId.toString().equals(command.metadata().get("founder_id"))
        ));
        assertThat(response.id()).isEqualTo(postId);
        assertThat(response.createdAt()).isEqualTo(OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC));
        assertThat(response.founder()).isNull();
        assertThat(response.founderReviewSummary()).isNull();
        assertThat(response.distanceMeters()).isNull();
    }

    @Test
    void archivePostRecordsCompatibilityAudit() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "closed", "online")));
        when(repository.updateStatus(postId, "archived"))
                .thenReturn(writePost(postId, actorUserId, "archived", "online"));

        service.archivePost(actorUserId, postId);

        verify(auditWriteService).record(argThat(command ->
                "interview_post_archived".equals(command.eventType())
                        && "closed".equals(command.before().get("status"))
                        && "archived".equals(command.after().get("status"))
                        && actorUserId.toString().equals(command.metadata().get("founder_id"))
        ));
    }

    @Test
    void reopenPostRecordsCompatibilityAudit() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "archived", "online")));
        when(repository.updateStatus(postId, "open")).thenReturn(writePost(postId, actorUserId, "open", "online"));

        service.reopenPost(actorUserId, postId);

        verify(auditWriteService).record(argThat(command ->
                "interview_post_reopened".equals(command.eventType())
                        && "archived".equals(command.before().get("status"))
                        && "open".equals(command.after().get("status"))
                        && actorUserId.toString().equals(command.metadata().get("founder_id"))
        ));
    }

    private InterviewPostActorAccount activeFounder(UUID userId, String role) {
        return new InterviewPostActorAccount(userId, "founder@example.com", role, false, false);
    }

    private InterviewPostWriteModel writePost(UUID postId, UUID founderId, String status, String interviewMode) {
        return new InterviewPostWriteModel(
                postId,
                founderId,
                "기존 모집글",
                "사용자 검증을 위한 인터뷰를 진행합니다.",
                "최근 3개월 내 유사 서비스 사용 경험자",
                15000,
                30,
                0,
                interviewMode,
                "offline".equals(interviewMode) ? "강남역" : null,
                "offline".equals(interviewMode) ? "강남역" : null,
                "offline".equals(interviewMode) ? "서울 강남구 강남대로" : null,
                "offline".equals(interviewMode) ? "강남역 1번 출구" : null,
                "offline".equals(interviewMode) ? 37.4979 : null,
                "offline".equals(interviewMode) ? 127.0276 : null,
                "offline".equals(interviewMode) ? "exact" : null,
                "offline".equals(interviewMode) ? "manual" : null,
                List.of("평일 저녁"),
                status,
                OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC)
        );
    }
}
