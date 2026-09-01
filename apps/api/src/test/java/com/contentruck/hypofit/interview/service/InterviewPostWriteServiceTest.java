package com.contentruck.hypofit.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.ai.service.AiSummaryEnqueueService;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
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

    @Mock
    private AiSummaryEnqueueService aiSummaryEnqueueService;

    private InterviewPostWriteService service;
    private SimpleMeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        service = new InterviewPostWriteService(
                repository,
                auditWriteService,
                new HypofitProperties(),
                aiSummaryEnqueueService,
                meterRegistry
        );
    }

    @Test
    void createPostRecordsIdempotencyOutcomesWithoutRequestSpecificTags() {
        UUID actorUserId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        InterviewPostWriteModel existing = writePost(UUID.randomUUID(), actorUserId, "open", "online");
        service = new InterviewPostWriteService(
                repository,
                auditWriteService,
                new HypofitProperties(),
                aiSummaryEnqueueService,
                meterRegistry
        );
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPostByClientSubmissionId(actorUserId, submissionId)).thenReturn(Optional.of(existing));

        service.createPost(actorUserId, matchingCommand(), submissionId);

        assertThat(meterRegistry.get("hypofit.interview_post.create")
                .tag("outcome", "replayed")
                .counter()
                .count()).isEqualTo(1);
        assertThat(meterRegistry.getMeters()).allSatisfy(meter ->
                assertThat(meter.getId().getTags()).allSatisfy(tag ->
                        assertThat(tag.getKey()).isEqualTo("outcome")
                )
        );
    }

    @Test
    void createPostRecordsFailureWithoutRequestSpecificTags() {
        UUID actorUserId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createPost(actorUserId, matchingCommand()))
                .isInstanceOf(UserProfileMissingException.class);

        assertThat(meterRegistry.get("hypofit.interview_post.create")
                .tag("outcome", "failed")
                .counter()
                .count()).isEqualTo(1);
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
                        null,
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

        verify(aiSummaryEnqueueService).enqueueInterviewSummary(postId);

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
                new InterviewPostUpdateCommand(Set.of("title"), null, "수정", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null)
        ))
                .isInstanceOf(InterviewPostPermissionDeniedException.class)
                .hasMessageContaining("Forbidden");
    }

    @Test
    void createPostAllowsRespondentRoleWhenAccountIsActive() {
        UUID actorUserId = UUID.randomUUID();
        InterviewPostWriteModel created = writePost(UUID.randomUUID(), actorUserId, "open", "online");
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "respondent")));
        when(repository.createPost(eq(actorUserId), any())).thenReturn(created);

        InterviewPostReadModel result = service.createPost(
                actorUserId,
                new InterviewPostCreateCommand(
                        "interview",
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
        );

        assertThat(result.id()).isEqualTo(created.id());
        assertThat(result.founderId()).isEqualTo(actorUserId);
        verify(aiSummaryEnqueueService).enqueueInterviewSummary(created.id());
    }

    @Test
    void createPostReturnsExistingPostForRepeatedClientSubmissionId() {
        UUID actorUserId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        InterviewPostWriteModel existing = writePost(UUID.randomUUID(), actorUserId, "open", "online");
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPostByClientSubmissionId(actorUserId, submissionId)).thenReturn(Optional.of(existing));

        InterviewPostReadModel result = service.createPost(actorUserId, matchingCommand(), submissionId);

        assertThat(result.id()).isEqualTo(existing.id());
        var order = inOrder(repository);
        order.verify(repository).lockClientSubmission(actorUserId, submissionId);
        order.verify(repository).findPostByClientSubmissionId(actorUserId, submissionId);
        verify(repository, never()).createPost(eq(actorUserId), any());
        verify(aiSummaryEnqueueService, never()).enqueueInterviewSummary(existing.id());
    }

    @Test
    void createPostRejectsClientSubmissionIdReusedWithDifferentPayload() {
        UUID actorUserId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        InterviewPostWriteModel existing = writePost(UUID.randomUUID(), actorUserId, "open", "online");
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPostByClientSubmissionId(actorUserId, submissionId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.createPost(
                actorUserId,
                new InterviewPostCreateCommand(
                        "interview", "다른 제목", "사용자 검증을 위한 인터뷰를 진행합니다.",
                        "최근 3개월 내 유사 서비스 사용 경험자", 15000, 30, 0,
                        "online", null, null, null, null, null, null, null, null,
                        List.of("평일 저녁"), "open"
                ),
                submissionId
        ))
                .isInstanceOf(InterviewPostIdempotencyConflictException.class)
                .hasMessageContaining("Client submission ID was reused");

        verify(repository, never()).createPost(eq(actorUserId), any());
        verify(aiSummaryEnqueueService, never()).enqueueInterviewSummary(existing.id());
    }

    @Test
    void createOnlineInterviewClearsLocationPayload() {
        UUID actorUserId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "both")));
        when(repository.createPost(eq(actorUserId), argThat(command ->
                "online".equals(command.interviewMode())
                        && command.location() == null
                        && command.locationText() == null
                        && command.locationAddress() == null
                        && command.locationPlaceName() == null
                        && command.locationLatitude() == null
                        && command.locationLongitude() == null
                        && command.locationPrecision() == null
                        && command.locationSource() == null
        ))).thenReturn(writePost(UUID.randomUUID(), actorUserId, "draft", "online"));

        service.createPost(actorUserId, new InterviewPostCreateCommand(
                "interview", "온라인 인터뷰", "사용 경험을 확인해요.", "최근 사용 경험자",
                15000, 30, 3,
                "online", "강남역", "강남역", "서울 강남구", "강남역",
                37.4979, 127.0276, "exact", "manual", List.of("평일 저녁"), "draft"
        ));
    }

    @Test
    void createPostRejectsNonInterviewRecruitmentType() {
        UUID actorUserId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));

        assertThatThrownBy(() -> service.createPost(
                actorUserId,
                new InterviewPostCreateCommand(
                        "survey",
                        "설문 모집",
                        "서비스 사용 경험을 짧게 확인해요.",
                        "최근 3개월 내 관련 경험자",
                        0,
                        10,
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
                        List.of(),
                        "draft"
                )
        ))
                .isInstanceOf(InterviewPostRecruitmentTypeNotSupportedException.class)
                .hasMessageContaining("survey");
    }

    @Test
    void createSurveyPostNormalizesCompatibilityFieldsWhenEnabled() {
        UUID actorUserId = UUID.randomUUID();
        OffsetDateTime deadline = OffsetDateTime.of(2026, 9, 1, 9, 0, 0, 0, ZoneOffset.UTC);
        HypofitProperties properties = new HypofitProperties();
        properties.setSurveyRecruitmentCreationEnabled(true);
        service = new InterviewPostWriteService(repository, auditWriteService, properties, aiSummaryEnqueueService, meterRegistry);
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.createPost(eq(actorUserId), argThat(command ->
                "survey".equals(command.recruitmentType())
                        && "google_forms".equals(command.externalProvider())
                        && "https://docs.google.com/forms/d/e/example/viewform".equals(command.externalUrl())
                        && deadline.equals(command.participationDeadlineAt())
                        && "Google Forms에서 응답을 처리해요.".equals(command.externalDataNotice())
                        && "online".equals(command.interviewMode())
                        && command.location() == null
                        && command.scheduleOptions().isEmpty()
        ))).thenReturn(writePost(UUID.randomUUID(), actorUserId, "draft", "online"));

        service.createPost(actorUserId, new InterviewPostCreateCommand(
                "survey", "설문 참여자 모집", "서비스 이용 경험을 확인해요.", "최근 사용 경험자",
                0, 10, 20,
                " google_forms ", " https://docs.google.com/forms/d/e/example/viewform ", deadline,
                " Google Forms에서 응답을 처리해요. ",
                List.of("unused"), null, null,
                null, "unused", "unused", null, null, null, null, null, null,
                List.of("unused"), "draft"
        ));
    }

    @Test
    void createSurveyPostRejectsUnapprovedExternalUrl() {
        UUID actorUserId = UUID.randomUUID();
        HypofitProperties properties = new HypofitProperties();
        properties.setSurveyRecruitmentCreationEnabled(true);
        service = new InterviewPostWriteService(repository, auditWriteService, properties, aiSummaryEnqueueService, meterRegistry);
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));

        assertThatThrownBy(() -> service.createPost(actorUserId, new InterviewPostCreateCommand(
                "survey", "설문 참여자 모집", "서비스 이용 경험을 확인해요.", "최근 사용 경험자",
                0, 10, 20,
                "google_forms", "https://example.com/forms/1",
                OffsetDateTime.of(2026, 9, 1, 9, 0, 0, 0, ZoneOffset.UTC),
                "외부 설문 서비스에서 응답을 처리해요.",
                List.of(), null, null,
                null, null, null, null, null, null, null, null, null,
                List.of(), "draft"
        )))
                .isInstanceOf(com.contentruck.hypofit.common.error.HypofitValidationException.class)
                .hasMessageContaining("approved Google Forms URL");
    }

    @Test
    void createBetaTestPostRejectsWhenFeatureFlagIsDisabled() {
        UUID actorUserId = UUID.randomUUID();
        OffsetDateTime startsAt = OffsetDateTime.of(2026, 9, 2, 9, 0, 0, 0, ZoneOffset.UTC);
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));

        assertThatThrownBy(() -> service.createPost(actorUserId, new InterviewPostCreateCommand(
                "beta_test", "베타테스터 모집", "출시 전 사용성을 확인해요.", "모바일 앱 사용자",
                10000, 30, 10,
                null, null, null, null,
                List.of("ios"), startsAt, startsAt.plusDays(7),
                null, null, null, null, null, null, null, null, null,
                List.of(), "draft"
        )))
                .isInstanceOf(InterviewPostRecruitmentTypeNotSupportedException.class)
                .hasMessageContaining("beta_test");
    }

    @Test
    void createBetaTestPostNormalizesPlatformsWhenEnabled() {
        UUID actorUserId = UUID.randomUUID();
        OffsetDateTime startsAt = OffsetDateTime.of(2026, 9, 2, 9, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime endsAt = startsAt.plusDays(7);
        HypofitProperties properties = new HypofitProperties();
        properties.setBetaTestRecruitmentCreationEnabled(true);
        service = new InterviewPostWriteService(repository, auditWriteService, properties, aiSummaryEnqueueService, meterRegistry);
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.createPost(eq(actorUserId), argThat(command ->
                "beta_test".equals(command.recruitmentType())
                        && command.betaTestPlatforms().equals(List.of("ios", "android"))
                        && startsAt.equals(command.betaTestStartsAt())
                        && endsAt.equals(command.betaTestEndsAt())
                        && "online".equals(command.interviewMode())
                        && command.scheduleOptions().isEmpty()
        ))).thenReturn(writePost(UUID.randomUUID(), actorUserId, "draft", "online"));

        service.createPost(actorUserId, new InterviewPostCreateCommand(
                "beta_test", "베타테스터 모집", "출시 전 사용성을 확인해요.", "모바일 앱 사용자",
                10000, 30, 10,
                null, null, null, null,
                List.of(" ios ", "android", "ios"), startsAt, endsAt,
                null, null, null, null, null, null, null, null, null,
                List.of("unused"), "draft"
        ));
    }

    @Test
    void updatePostRejectsNonInterviewRecruitmentType() {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(actorUserId)).thenReturn(Optional.of(activeFounder(actorUserId, "founder")));
        when(repository.findPost(postId)).thenReturn(Optional.of(writePost(postId, actorUserId, "draft", "online")));

        assertThatThrownBy(() -> service.updatePost(
                actorUserId,
                postId,
                new InterviewPostUpdateCommand(
                        Set.of("recruitmentType"),
                        "beta_test",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        ))
                .isInstanceOf(InterviewPostRecruitmentTypeNotSupportedException.class)
                .hasMessageContaining("beta_test");
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
        verify(aiSummaryEnqueueService, never()).enqueueInterviewSummary(postId);
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
        verify(aiSummaryEnqueueService, never()).enqueueInterviewSummary(postId);
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
        verify(aiSummaryEnqueueService).enqueueInterviewSummary(postId);
    }

    private InterviewPostActorAccount activeFounder(UUID userId, String role) {
        return new InterviewPostActorAccount(userId, "founder@example.com", role, false, false);
    }

    private InterviewPostCreateCommand matchingCommand() {
        return new InterviewPostCreateCommand(
                "interview", "기존 모집글", "사용자 검증을 위한 인터뷰를 진행합니다.",
                "최근 3개월 내 유사 서비스 사용 경험자", 15000, 30, 0,
                "online", null, null, null, null, null, null, null, null,
                List.of("평일 저녁"), "open"
        );
    }

    private InterviewPostWriteModel writePost(UUID postId, UUID founderId, String status, String interviewMode) {
        return new InterviewPostWriteModel(
                postId,
                founderId,
                "interview",
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
