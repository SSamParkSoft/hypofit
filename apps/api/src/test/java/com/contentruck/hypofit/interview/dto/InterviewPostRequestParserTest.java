package com.contentruck.hypofit.interview.dto;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

class InterviewPostRequestParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

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
