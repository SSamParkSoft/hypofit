package com.contentruck.hypofit.interview.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.applicant.service.ApplicationWorkflowService;
import com.contentruck.hypofit.chat.service.ChatService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.interview.dto.InterviewPostRequestParser;
import com.contentruck.hypofit.interview.dto.InterviewPostResponse;
import com.contentruck.hypofit.interview.service.InterviewPostClientUpgradeRequiredException;
import com.contentruck.hypofit.interview.service.InterviewPostQueryService;
import com.contentruck.hypofit.interview.service.InterviewPostWriteRepository;
import com.contentruck.hypofit.interview.service.InterviewPostWriteService;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import com.contentruck.hypofit.survey.service.SurveyParticipationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.server.ResponseStatusException;

@TestPropertySource(properties = {
        "hypofit.survey-recruitment-creation-enabled=true",
        "hypofit.beta-test-recruitment-creation-enabled=true"
})
class RecruitmentPostingRoundTripPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private InterviewPostWriteService writeService;

    @Autowired
    private InterviewPostQueryService queryService;

    @Autowired
    private InterviewPostWriteRepository writeRepository;

    @Autowired
    private ApplicationWorkflowService applicationService;

    @Autowired
    private ChatService chatService;

    @Autowired
    private SurveyParticipationService surveyService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void ownerEditPersistsCompensationsAndKeepsClosedStatusAndUntouchedFields() throws Exception {
        UUID ownerId = insertOwner();
        var created = writeService.createPost(ownerId, InterviewPostRequestParser.parseCreate(objectMapper.readTree("""
                {
                  "title": "인터뷰 수정 보존 테스트",
                  "service_summary": "기존 공고를 수정하면서 값을 보존합니다.",
                  "target_description": "일정 관리 경험이 있는 참여자",
                  "reward_amount": 30000,
                  "duration_minutes": 40,
                  "interview_mode": "online",
                  "schedule_options": ["평일 저녁", "토요일 오후"],
                  "participant_requirements": ["기존 구조화 조건"],
                  "status": "open"
                }
                """)));
        writeService.closePost(ownerId, created.id());
        var patch = InterviewPostRequestParser.parseUpdate(objectMapper.readTree("""
                {
                  "title": "수정한 인터뷰 공고",
                  "compensations": [
                    {"type": "cash", "amount": 40000, "currency": "KRW"},
                    {"type": "gift_card", "label": "커피 기프티콘"}
                  ]
                }
                """));
        assertThatThrownBy(() -> writeService.updatePost(insertOwner(), created.id(), patch))
                .isInstanceOf(HypofitException.class);
        writeService.updatePost(ownerId, created.id(), patch);
        var stored = writeRepository.findPost(created.id()).orElseThrow();
        assertThat(stored.status()).isEqualTo("closed");
        assertThat(stored.title()).isEqualTo("수정한 인터뷰 공고");
        assertThat(stored.durationMinutes()).isEqualTo(40);
        assertThat(stored.scheduleOptions()).containsExactly("평일 저녁", "토요일 오후");
        assertThat(stored.participantRequirements()).containsExactly("기존 구조화 조건");
        assertThat(stored.rewardAmount()).isEqualTo(40000);
        assertThat(stored.compensations()).hasSize(2);
        writeService.updatePost(ownerId, created.id(), InterviewPostRequestParser.parseUpdate(
                objectMapper.readTree("{\"reward_amount\":50000}")));
        var legacyEdit = writeRepository.findPost(created.id()).orElseThrow();
        assertThat(legacyEdit.rewardAmount()).isEqualTo(50000);
        assertThat(legacyEdit.compensations()).hasSize(2);
        assertThat(legacyEdit.compensations()).anySatisfy(item -> assertThat(item.label()).isEqualTo("커피 기프티콘"));
        writeService.updatePost(ownerId, created.id(), InterviewPostRequestParser.parseUpdate(
                objectMapper.readTree("{\"compensations\":[{\"type\":\"none\"}]}")));
        var withoutReward = writeRepository.findPost(created.id()).orElseThrow();
        assertThat(withoutReward.rewardAmount()).isZero();
        assertThat(withoutReward.compensations()).singleElement().satisfies(item -> assertThat(item.type()).isEqualTo("none"));
    }

    @Test
    void betaCreateFetchAndDetailProjectionPreserveCanonicalValuesAndReplay() throws Exception {
        UUID ownerId = insertOwner();
        UUID submissionId = UUID.randomUUID();
        var command = InterviewPostRequestParser.parseCreate(objectMapper.readTree("""
                {
                  "recruitment_type": "beta_test",
                  "entry_mode": "application_required",
                  "title": "모바일 일정 앱 베타테스트",
                  "service_summary": "일주일간 일정을 기록하고 사용 경험을 알려 주세요.",
                  "target_description": "스마트폰으로 매일 일정을 관리하는 참여자",
                  "participant_requirements": ["스마트폰 일정 관리 경험"],
                  "reward_amount": 0,
                  "compensations": [{"type": "coupon_or_access", "label": "프리미엄 이용권"}],
                  "duration_minutes": 10080,
                  "duration_value": 7,
                  "duration_unit": "days",
                  "recruit_count": 4,
                  "recruitment_limit_mode": "limited",
                  "interview_mode": "online",
                  "schedule_mode": "none",
                  "schedule_note": "설정은 선정 후 안내해요.",
                  "beta_test_platforms": ["ios", "android"],
                  "beta_test_starts_at": "2099-09-10T00:00:00Z",
                  "beta_test_ends_at": "2099-09-17T23:59:59Z",
                  "beta_test_environment": "iOS 17 또는 Android 14 이상",
                  "beta_test_workflow_note": "7일 사용 후 경험을 채팅으로 알려 주세요.",
                  "status": "open"
                }
                """));

        var created = writeService.createPost(ownerId, command, submissionId);
        var replayed = writeService.createPost(ownerId, command, submissionId);
        var fetched = queryService.getVisiblePost(created.id(), null, false, true);
        var detail = InterviewPostResponse.from(fetched);
        var stored = writeRepository.findPost(created.id()).orElseThrow();

        assertThat(replayed.id()).isEqualTo(created.id());
        assertThat(detail.recruitmentType()).isEqualTo("beta_test");
        assertThat(detail.entryMode()).isEqualTo("application_required");
        assertThat(detail.durationValue()).isEqualTo(7);
        assertThat(detail.durationUnit()).isEqualTo("days");
        assertThat(detail.durationMinutes()).isEqualTo(10080);
        assertThat(detail.betaTestPlatforms()).containsExactly("ios", "android");
        assertThat(detail.betaTestStartsAt()).isEqualTo(command.betaTestStartsAt());
        assertThat(detail.betaTestEndsAt()).isEqualTo(command.betaTestEndsAt());
        assertThat(detail.betaTestEnvironment()).isEqualTo(command.creationConfiguration().betaTestEnvironment());
        assertThat(detail.betaTestWorkflowNote()).isEqualTo(command.creationConfiguration().betaTestWorkflowNote());
        assertThat(detail.compensations()).singleElement().satisfies(reward -> {
            assertThat(reward.type()).isEqualTo("coupon_or_access");
            assertThat(reward.label()).isEqualTo("프리미엄 이용권");
        });
        assertThat(stored.creationConfiguration()).isEqualTo(fetched.creationConfiguration());
        assertThat(detail.scheduleNote()).isEqualTo("설정은 선정 후 안내해요.");
        assertThat(detail.externalUrl()).isNull();
        assertThatThrownBy(() -> queryService.getVisiblePost(created.id(), null, false, false))
                .isInstanceOf(InterviewPostClientUpgradeRequiredException.class);

        UUID participantId = insertOwner();
        UUID outsiderId = insertOwner();
        var application = applicationService.createApplication(participantId, created.id(), Map.of(), List.of());
        assertThat(chatService.listRooms(participantId)).isEmpty();
        applicationService.updateApplicationStatus(ownerId, application.id(), "selected", null);
        var rooms = chatService.listRooms(participantId);
        assertThat(rooms).hasSize(1);
        UUID roomId = rooms.getFirst().id();
        assertThat(chatService.getRoom(ownerId, roomId).applicationId()).isEqualTo(application.id());
        chatService.sendMessage(participantId, roomId, "테스트 준비가 됐어요.", UUID.randomUUID().toString());
        assertThatThrownBy(() -> chatService.getRoom(outsiderId, roomId))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatusCode().value()).isEqualTo(403));
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from interview_sessions where application_id = ?", Integer.class, application.id()
        )).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"direct", "application_required"})
    void surveyCreateFetchPreservesEntryAndMasksPrivateLink(String entryMode) throws Exception {
        UUID ownerId = insertOwner();
        var command = InterviewPostRequestParser.parseCreate(objectMapper.readTree("""
                {
                  "recruitment_type": "survey",
                  "entry_mode": "%s",
                  "title": "일정 관리 경험 설문",
                  "service_summary": "일정 관리 도구를 사용하는 경험을 조사합니다.",
                  "target_description": "최근 한 달 내 일정 관리 도구를 사용한 참여자",
                  "reward_amount": 0,
                  "compensations": [{"type": "none"}],
                  "duration_minutes": 10,
                  "duration_value": 10,
                  "duration_unit": "minutes",
                  "recruit_count": 0,
                  "recruitment_limit_mode": "unlimited",
                  "interview_mode": "online",
                  "schedule_mode": "none",
                  "external_provider": "google_forms",
                  "external_url": "https://docs.google.com/forms/d/e/fixture/viewform",
                  "external_data_notice": "응답은 외부 설문 서비스에서 처리해요.",
                  "participation_deadline_at": "2099-09-20T14:59:59Z",
                  "status": "open"
                }
                """.formatted(entryMode)));

        var created = writeService.createPost(ownerId, command);
        var publicDetail = InterviewPostResponse.from(queryService.getVisiblePost(created.id(), null, false, true));
        var ownerDetail = InterviewPostResponse.from(queryService.getVisiblePost(created.id(), ownerId, false, true));
        var stored = writeRepository.findPost(created.id()).orElseThrow();

        assertThat(publicDetail.entryMode()).isEqualTo(entryMode);
        assertThat(publicDetail.externalUrl()).isNull();
        assertThat(ownerDetail.externalUrl()).isNull();
        assertThat(stored.externalUrl()).isEqualTo(command.externalUrl());
        assertThat(publicDetail.externalProvider()).isEqualTo("google_forms");
        assertThat(publicDetail.durationValue()).isEqualTo(10);
        assertThat(publicDetail.recruitmentLimitMode()).isEqualTo("unlimited");
        assertThat(publicDetail.participationDeadlineAt()).isEqualTo(command.participationDeadlineAt());

        writeService.updatePost(ownerId, created.id(), InterviewPostRequestParser.parseUpdate(
                objectMapper.readTree("{\"title\":\"설문 제목만 수정\"}")));
        var afterEdit = writeRepository.findPost(created.id()).orElseThrow();
        assertThat(afterEdit.externalUrl()).isEqualTo(command.externalUrl());
        assertThat(afterEdit.participationDeadlineAt()).isEqualTo(command.participationDeadlineAt());
        assertThat(InterviewPostResponse.from(queryService.getVisiblePost(created.id(), ownerId, false, true)).externalUrl()).isNull();

        UUID participantId = insertOwner();
        if ("application_required".equals(entryMode)) {
            assertThatThrownBy(() -> surveyService.open(participantId, created.id()))
                    .isInstanceOf(HypofitException.class)
                    .extracting(error -> ((HypofitException) error).getCode())
                    .isEqualTo("survey_access_not_granted");
            var application = applicationService.createApplication(participantId, created.id(), Map.of(), List.of());
            applicationService.updateApplicationStatus(ownerId, application.id(), "selected", null);
            assertThat(chatService.listRooms(participantId)).isEmpty();
            assertThat(jdbcTemplate.queryForObject(
                    "select count(*) from interview_sessions where application_id = ?", Integer.class, application.id()
            )).isZero();
        }
        assertThat(surveyService.open(participantId, created.id()).externalUrl()).isEqualTo(command.externalUrl());
        assertThat(surveyService.submit(participantId, created.id()).participation().status()).isEqualTo("submitted");
        assertThat(surveyService.confirm(ownerId, created.id(), participantId).participation().status()).isEqualTo("confirmed");
    }

    private UUID insertOwner() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, ?)",
                id, id + "@example.com", "테스트 모집자", "both"
        );
        return id;
    }
}
