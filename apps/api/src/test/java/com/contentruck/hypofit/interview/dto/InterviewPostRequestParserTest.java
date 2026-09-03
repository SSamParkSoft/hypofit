package com.contentruck.hypofit.interview.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

class InterviewPostRequestParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void createDefaultsRecruitmentTypeToInterview() throws Exception {
        var command = InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "title": "인터뷰 모집",
                  "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                  "target_description": "최근 3개월 내 관련 경험자",
                  "reward_amount": 15000,
                  "duration_minutes": 30,
                  "interview_mode": "online",
                  "schedule_options": ["평일 저녁"],
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class));

        assertThat(command.recruitmentType()).isEqualTo("interview");
    }

    @Test
    void createAcceptsNullOptionalBetaFieldsFromNonBetaClients() throws Exception {
        var command = InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "title": "인터뷰 모집",
                  "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                  "target_description": "최근 3개월 내 관련 경험자",
                  "reward_amount": 0,
                  "compensations": [{ "type": "none" }],
                  "duration_minutes": 30,
                  "interview_mode": "online",
                  "beta_test_platforms": null,
                  "beta_test_starts_at": null,
                  "beta_test_ends_at": null,
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class));

        assertThat(command.recruitmentType()).isEqualTo("interview");
        assertThat(command.betaTestPlatforms()).isNull();
    }

    @Test
    void createParsesStructuredParticipantRequirements() throws Exception {
        var command = InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "title": "인터뷰 모집",
                  "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                  "target_description": "최근 3개월 내 관련 경험자",
                  "participant_requirements": ["최근 3개월 내 관련 경험", "평일 저녁 참여 가능"],
                  "reward_amount": 15000,
                  "duration_minutes": 30,
                  "interview_mode": "online",
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class));

        assertThat(command.participantRequirements())
                .containsExactly("최근 3개월 내 관련 경험", "평일 저녁 참여 가능");
    }

    @Test
    void createParsesCanonicalTypeAwareCreationFields() throws Exception {
        var command = InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "recruitment_type": "beta_test",
                  "title": "운동 기록 앱 베타테스터 모집",
                  "service_summary": "새 운동 기록 기능을 일주일 동안 사용해 봐요.",
                  "target_description": "iPhone 또는 Android 운동 기록 앱 사용자",
                  "reward_amount": 0,
                  "duration_minutes": 10080,
                  "duration_value": 7,
                  "duration_unit": "days",
                  "recruit_count": 0,
                  "recruitment_limit_mode": "unlimited",
                  "schedule_mode": "recurring",
                  "schedule_recurring_windows": ["평일 저녁", "주말 오전"],
                  "schedule_note": "일주일 동안 자유롭게 사용해 주세요.",
                  "beta_test_platforms": ["ios", "android"],
                  "beta_test_starts_at": "2026-09-10T00:00:00Z",
                  "beta_test_ends_at": "2026-09-17T23:59:59Z",
                  "beta_test_environment": "iOS 17 이상 또는 Android 14 이상",
                  "beta_test_workflow_note": "사용 후 설문을 제출해 주세요.",
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class));

        assertThat(command.durationMinutes()).isEqualTo(10080);
        assertThat(command.creationConfiguration().durationValue()).isEqualTo(7);
        assertThat(command.creationConfiguration().durationUnit()).isEqualTo("days");
        assertThat(command.creationConfiguration().scheduleMode()).isEqualTo("recurring");
        assertThat(command.creationConfiguration().scheduleRecurringWindows())
                .containsExactly("평일 저녁", "주말 오전");
        assertThat(command.creationConfiguration().recruitmentLimitMode()).isEqualTo("unlimited");
        assertThat(command.creationConfiguration().betaTestEnvironment())
                .isEqualTo("iOS 17 이상 또는 Android 14 이상");
        assertThat(command.creationConfiguration().betaTestWorkflowNote())
                .isEqualTo("사용 후 설문을 제출해 주세요.");
    }

    @Test
    void updateAcceptsStructuredParticipantRequirements() throws Exception {
        var command = InterviewPostRequestParser.parseUpdate(objectMapper.readValue("""
                {
                  "participant_requirements": ["직접 사용 경험", "모바일 참여 가능"]
                }
                """, InterviewPostUpdateRequest.class));

        assertThat(command.hasField("participantRequirements")).isTrue();
        assertThat(command.participantRequirements())
                .containsExactly("직접 사용 경험", "모바일 참여 가능");
    }

    @Test
    void parsesOptionalClientSubmissionId() throws Exception {
        var request = objectMapper.readValue("""
                {
                  "client_submission_id": "11111111-1111-1111-1111-111111111111",
                  "title": "인터뷰 모집",
                  "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                  "target_description": "최근 3개월 내 관련 경험자",
                  "reward_amount": 15000,
                  "duration_minutes": 30,
                  "interview_mode": "online",
                  "schedule_options": ["평일 저녁"],
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class);

        assertThat(InterviewPostRequestParser.parseClientSubmissionId(request))
                .hasToString("11111111-1111-1111-1111-111111111111");
    }

    @Test
    void rejectsMalformedClientSubmissionId() throws Exception {
        var request = objectMapper.readValue("""
                { "client_submission_id": "not-a-uuid" }
                """, InterviewPostCreateRequest.class);

        assertThatThrownBy(() -> InterviewPostRequestParser.parseClientSubmissionId(request))
                .isInstanceOf(HypofitValidationException.class);
    }

    @Test
    void createRejectsUnknownRecruitmentType() throws Exception {
        assertThatThrownBy(() -> InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "recruitment_type": "not_supported",
                  "title": "인터뷰 모집",
                  "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                  "target_description": "최근 3개월 내 관련 경험자",
                  "reward_amount": 15000,
                  "duration_minutes": 30,
                  "interview_mode": "online",
                  "schedule_options": ["평일 저녁"],
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class)))
                .isInstanceOf(HypofitValidationException.class);
    }

    @Test
    void createRejectsPlaceholderOnlyPostingText() throws Exception {
        HypofitValidationException exception = catchThrowableOfType(
                () -> InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "title": "ㅁㄴㅇㄹㅁㄴㅇㄹ",
                  "service_summary": "ㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹ",
                  "target_description": "ㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹ",
                  "reward_amount": 15000,
                  "duration_minutes": 30,
                  "interview_mode": "online",
                  "schedule_options": ["평일 저녁"],
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class)),
                HypofitValidationException.class
        );

        assertThat(exception.getFieldErrors())
                .extracting(error -> error.field() + ":" + error.message())
                .contains("title:제목을 의미 있게 입력해 주세요.");
    }

    @Test
    void createOfflinePostRequiresSelectedLocation() throws Exception {
        assertThatThrownBy(() -> InterviewPostRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "title": "인터뷰 모집",
                  "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                  "target_description": "최근 3개월 내 관련 경험자",
                  "reward_amount": 15000,
                  "duration_minutes": 30,
                  "interview_mode": "offline",
                  "schedule_options": ["평일 저녁"],
                  "status": "open"
                }
                """, InterviewPostCreateRequest.class)))
                .isInstanceOf(HypofitValidationException.class)
                .hasMessageContaining("Offline-capable interview posts require a selected location");
    }

    @Test
    void updateRejectsNullScheduleOptions() throws Exception {
        assertThatThrownBy(() -> InterviewPostRequestParser.parseUpdate(objectMapper.readValue("""
                {
                  "schedule_options": null
                }
                """, InterviewPostUpdateRequest.class)))
                .isInstanceOf(HypofitValidationException.class)
                .hasMessageContaining("schedule_options cannot be null");
    }

    @Test
    void updateRequiresAtLeastOneKnownField() throws Exception {
        assertThatThrownBy(() -> InterviewPostRequestParser.parseUpdate(objectMapper.readValue("""
                {
                  "unknown": "value"
                }
                """, InterviewPostUpdateRequest.class)))
                .isInstanceOf(HypofitValidationException.class)
                .hasMessageContaining("At least one interview post field must be provided");
    }

    @Test
    void closeStatusAcceptsClosedOnly() throws Exception {
        JsonNode body = objectMapper.readTree("""
                {
                  "status": "closed"
                }
                """);

        InterviewPostRequestParser.parseCloseStatus(body);
    }

    @Test
    void closeStatusRejectsNonClosedValue() throws Exception {
        assertThatThrownBy(() -> InterviewPostRequestParser.parseCloseStatus(objectMapper.readTree("""
                {
                  "status": "open"
                }
                """)))
                .isInstanceOf(HypofitValidationException.class)
                .hasMessageContaining("입력값을 확인해 주세요.");
    }
}
