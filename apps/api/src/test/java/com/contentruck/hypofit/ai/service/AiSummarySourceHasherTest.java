package com.contentruck.hypofit.ai.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.ApplicationSummarySource;
import com.contentruck.hypofit.ai.repository.AiSummaryArtifactRepository.InterviewSummarySource;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AiSummarySourceHasherTest {

    private final AiSummarySourceHasher hasher = new AiSummarySourceHasher(new ObjectMapper());

    @Test
    void hashApplicationIgnoresAnswerInsertionOrder() {
        UUID applicationId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();

        Map<String, String> firstAnswers = new LinkedHashMap<>();
        firstAnswers.put("experience", "운동 앱을 오래 썼어요.");
        firstAnswers.put("motivation", "중단 이유를 설명할 수 있어요.");

        Map<String, String> secondAnswers = new LinkedHashMap<>();
        secondAnswers.put("motivation", "중단 이유를 설명할 수 있어요.");
        secondAnswers.put("experience", "운동 앱을 오래 썼어요.");

        ApplicationSummarySource first = new ApplicationSummarySource(
                applicationId,
                interviewPostId,
                "운동 앱 인터뷰",
                "최근 3개월 내 운동 앱 사용 경험자",
                firstAnswers,
                List.of("평일 저녁")
        );
        ApplicationSummarySource second = new ApplicationSummarySource(
                applicationId,
                interviewPostId,
                "운동 앱 인터뷰",
                "최근 3개월 내 운동 앱 사용 경험자",
                secondAnswers,
                List.of("평일 저녁")
        );

        assertThat(hasher.hashApplication(first)).isEqualTo(hasher.hashApplication(second));
    }

    @Test
    void hashInterviewChangesWhenSummarizedFieldChanges() {
        UUID interviewPostId = UUID.randomUUID();
        InterviewSummarySource baseline = new InterviewSummarySource(
                interviewPostId,
                "운동 앱 인터뷰",
                "이탈 경험을 듣고 싶어요.",
                "최근 3개월 내 운동 앱 사용 경험자",
                30000,
                30,
                3,
                "online",
                "안산시",
                List.of("평일 저녁", "토요일 오전")
        );
        InterviewSummarySource changed = new InterviewSummarySource(
                interviewPostId,
                "운동 앱 인터뷰",
                "이탈 경험을 듣고 싶어요.",
                "최근 3개월 내 운동 앱 사용 경험자",
                30000,
                45,
                3,
                "online",
                "안산시",
                List.of("평일 저녁", "토요일 오전")
        );

        assertThat(hasher.hashInterview(baseline)).isNotEqualTo(hasher.hashInterview(changed));
    }
}
