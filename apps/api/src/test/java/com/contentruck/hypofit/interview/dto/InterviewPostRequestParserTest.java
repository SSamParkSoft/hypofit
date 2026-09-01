package com.contentruck.hypofit.interview.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
