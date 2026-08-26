package com.contentruck.hypofit.interview.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.interview.service.InterviewPostListCriteria;
import com.contentruck.hypofit.interview.service.InterviewPostReadRepository;
import com.contentruck.hypofit.interview.service.InterviewPostReadModel;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class InterviewPostReadRepositoryAdapterPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private InterviewPostReadRepository repository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void detailIncludesPersistedAiSummaryButListKeepsItNull() {
        UUID founderId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.of(2026, 8, 9, 10, 15, 0, 0, ZoneOffset.UTC);
        insertUser(founderId);
        insertPost(postId, founderId, createdAt);
        jdbcTemplate.update(
                """
                insert into ai_summary_artifacts (
                  id, summary_type, interview_post_id, status, source_hash, prompt_version,
                  work_version, result, updated_at
                ) values (
                  ?, 'interview_post', ?, 'ready', 'hash', 'v1', 1,
                  ?::jsonb, now()
                )
                """,
                UUID.randomUUID(),
                postId,
                """
                {
                  "overview": "무엇을 배우고 싶은지 짧게 정리했어요.",
                  "target_fit": "운동 앱 사용 중단 경험자",
                  "key_points": ["평일 저녁 30분", "사례비 15000원"]
                }
                """
        );

        InterviewPostReadModel detail = new TransactionTemplate(transactionManager).execute(status ->
                repository.findVisiblePost(postId, null, false).orElseThrow()
        );
        List<InterviewPostReadModel> listed = new TransactionTemplate(transactionManager).execute(status ->
                repository.findPosts(new InterviewPostListCriteria(
                        null,
                        null,
                        false,
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
                ))
        );

        assertThat(detail.aiSummary()).isNotNull();
        assertThat(detail.createdAt()).isEqualTo(createdAt);
        assertThat(detail.aiSummary().status()).isEqualTo("ready");
        assertThat(detail.aiSummary().content()).isNotNull();
        assertThat(detail.aiSummary().content().keyPoints()).containsExactly("평일 저녁 30분", "사례비 15000원");

        assertThat(listed).singleElement().satisfies(post -> {
            assertThat(post.createdAt()).isEqualTo(createdAt);
            assertThat(post.aiSummary()).isNull();
        });
    }

    @Test
    void detailOmitsReadyContentWhenArtifactIsPending() {
        UUID founderId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.of(2026, 8, 10, 11, 45, 0, 0, ZoneOffset.UTC);
        insertUser(founderId);
        insertPost(postId, founderId, createdAt);
        jdbcTemplate.update(
                """
                insert into ai_summary_artifacts (
                  id, summary_type, interview_post_id, status, source_hash, prompt_version,
                  work_version, updated_at
                ) values (
                  ?, 'interview_post', ?, 'pending', 'hash', 'v1', 1, now()
                )
                """,
                UUID.randomUUID(),
                postId
        );

        Optional<InterviewPostReadModel> detail = new TransactionTemplate(transactionManager).execute(status ->
                repository.findVisiblePost(postId, null, false)
        );

        assertThat(detail).isPresent();
        assertThat(detail.orElseThrow().createdAt()).isEqualTo(createdAt);
        assertThat(detail.orElseThrow().aiSummary()).isNotNull();
        assertThat(detail.orElseThrow().aiSummary().status()).isEqualTo("pending");
        assertThat(detail.orElseThrow().aiSummary().content()).isNull();
    }

    private void insertUser(UUID founderId) {
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, ?)",
                founderId,
                founderId + "@example.com",
                "founder user",
                "founder"
        );
    }

    private void insertPost(UUID postId, UUID founderId, OffsetDateTime createdAt) {
        jdbcTemplate.update(
                """
                insert into interview_posts (
                  id, founder_id, title, service_summary, target_description,
                  reward_amount, duration_minutes, interview_mode, schedule_options, status, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, '[]'::jsonb, ?, ?, ?)
                """,
                postId,
                founderId,
                "AI 요약 인터뷰",
                "운동 앱 중단 경험을 알아보는 인터뷰입니다.",
                "최근 3개월 내 운동 앱을 사용하다 중단한 사람",
                15000,
                30,
                "online",
                "open",
                createdAt,
                createdAt
        );
    }
}
