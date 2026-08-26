package com.contentruck.hypofit.ai.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class JdbcAiSummaryArtifactRepositoryPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private AiSummaryArtifactRepository repository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void interviewPendingUpsertIsIdempotentAndRequeuesChangedSource() {
        UUID founderId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        insertUser(founderId, "founder", "Founder", "팀 소개", "team", "Hypofit");
        insertInterviewPost(interviewPostId, founderId, "open", "강남역", List.of("평일 저녁"));

        OffsetDateTime firstNow = atUtc(2026, 8, 25, 9, 0);
        AiSummaryArtifactRepository.UpsertResult inserted = repository.upsertInterviewPostPendingWork(
                new AiSummaryArtifactRepository.PendingWorkUpsert(interviewPostId, "hash-v1", "prompt-v1", firstNow)
        );

        assertThat(inserted.changed()).isTrue();
        assertThat(inserted.workVersion()).isEqualTo(1);
        Map<String, Object> insertedRow = artifactRow("select * from ai_summary_artifacts where interview_post_id = ?", interviewPostId);
        assertThat(insertedRow.get("summary_type")).isEqualTo("interview_post");
        assertThat(insertedRow.get("status")).isEqualTo("pending");
        assertThat(insertedRow.get("source_hash")).isEqualTo("hash-v1");
        assertThat(insertedRow.get("prompt_version")).isEqualTo("prompt-v1");
        assertThat(insertedRow.get("work_version")).isEqualTo(1);
        assertThat(insertedRow.get("attempt_count")).isEqualTo(0);
        assertThat(insertedRow.get("result")).isNull();

        jdbcTemplate.update("""
                update ai_summary_artifacts
                set status = 'ready',
                    result = ?::jsonb,
                    provider = 'gemini',
                    model = 'gemini-2.5-flash',
                    input_tokens = 120,
                    output_tokens = 40,
                    estimated_cost_usd = 0.012345,
                    started_at = ?,
                    completed_at = ?,
                    updated_at = ?
                where interview_post_id = ?
                """,
                """
                {"overview":"요약","target_fit":"대상","key_points":["포인트"]}
                """,
                Timestamp.from(firstNow.minusMinutes(1).toInstant()),
                Timestamp.from(firstNow.toInstant()),
                Timestamp.from(firstNow.toInstant()),
                interviewPostId
        );

        OffsetDateTime sameNow = atUtc(2026, 8, 25, 9, 5);
        AiSummaryArtifactRepository.UpsertResult sameVersion = repository.upsertInterviewPostPendingWork(
                new AiSummaryArtifactRepository.PendingWorkUpsert(interviewPostId, "hash-v1", "prompt-v1", sameNow)
        );
        assertThat(sameVersion.changed()).isFalse();
        assertThat(sameVersion.workVersion()).isEqualTo(1);

        Map<String, Object> sameRow = artifactRow("select * from ai_summary_artifacts where interview_post_id = ?", interviewPostId);
        assertThat(sameRow.get("status")).isEqualTo("ready");
        assertThat(sameRow.get("work_version")).isEqualTo(1);
        assertThat(sameRow.get("provider")).isEqualTo("gemini");

        OffsetDateTime changedNow = atUtc(2026, 8, 25, 9, 10);
        AiSummaryArtifactRepository.UpsertResult updated = repository.upsertInterviewPostPendingWork(
                new AiSummaryArtifactRepository.PendingWorkUpsert(interviewPostId, "hash-v2", "prompt-v2", changedNow)
        );

        assertThat(updated.changed()).isTrue();
        assertThat(updated.workVersion()).isEqualTo(2);
        Map<String, Object> changedRow = artifactRow("select * from ai_summary_artifacts where interview_post_id = ?", interviewPostId);
        assertThat(changedRow.get("status")).isEqualTo("pending");
        assertThat(changedRow.get("source_hash")).isEqualTo("hash-v2");
        assertThat(changedRow.get("prompt_version")).isEqualTo("prompt-v2");
        assertThat(changedRow.get("work_version")).isEqualTo(2);
        assertThat(changedRow.get("attempt_count")).isEqualTo(0);
        assertThat(changedRow.get("result")).isNull();
        assertThat(changedRow.get("provider")).isNull();
        assertThat(changedRow.get("model")).isNull();
        assertThat(changedRow.get("input_tokens")).isNull();
        assertThat(changedRow.get("output_tokens")).isNull();
        assertThat(changedRow.get("estimated_cost_usd")).isNull();
        assertThat(changedRow.get("started_at")).isNull();
        assertThat(changedRow.get("completed_at")).isNull();
        assertThat(asOffsetDateTime(changedRow.get("next_attempt_at"))).isEqualTo(changedNow);
    }

    @Test
    void applicationPendingUpsertResetsPreviousFailureState() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        insertUser(founderId, "founder", "Founder", null, "team", "Hypofit");
        insertUser(respondentId, "respondent", "Respondent", null, null, null);
        insertInterviewPost(interviewPostId, founderId, "open", "성수동", List.of("토요일 오전"));
        insertApplication(applicationId, interviewPostId, respondentId, "visible");

        OffsetDateTime firstNow = atUtc(2026, 8, 25, 10, 0);
        AiSummaryArtifactRepository.UpsertResult firstUpsert = repository.upsertApplicationPendingWork(
                new AiSummaryArtifactRepository.PendingWorkUpsert(applicationId, "application-hash-v1", "prompt-v1", firstNow)
        );
        assertThat(firstUpsert.changed()).isTrue();
        assertThat(firstUpsert.workVersion()).isEqualTo(1);

        jdbcTemplate.update("""
                update ai_summary_artifacts
                set status = 'failed',
                    attempt_count = 2,
                    last_error_code = 'provider_timeout',
                    updated_at = ?
                where application_id = ?
                """,
                Timestamp.from(firstNow.toInstant()),
                applicationId
        );

        OffsetDateTime secondNow = atUtc(2026, 8, 25, 10, 7);
        AiSummaryArtifactRepository.UpsertResult secondUpsert = repository.upsertApplicationPendingWork(
                new AiSummaryArtifactRepository.PendingWorkUpsert(applicationId, "application-hash-v2", "prompt-v1", secondNow)
        );
        assertThat(secondUpsert.changed()).isTrue();
        assertThat(secondUpsert.workVersion()).isEqualTo(2);

        Map<String, Object> row = artifactRow("select * from ai_summary_artifacts where application_id = ?", applicationId);
        assertThat(row.get("summary_type")).isEqualTo("application");
        assertThat(row.get("status")).isEqualTo("pending");
        assertThat(row.get("source_hash")).isEqualTo("application-hash-v2");
        assertThat(row.get("prompt_version")).isEqualTo("prompt-v1");
        assertThat(row.get("work_version")).isEqualTo(2);
        assertThat(row.get("attempt_count")).isEqualTo(0);
        assertThat(row.get("last_error_code")).isNull();
        assertThat(row.get("last_error_message")).isNull();
        assertThat(asOffsetDateTime(row.get("next_attempt_at"))).isEqualTo(secondNow);
    }

    @Test
    void resetStaleProcessingArtifactsRequeuesActiveRetriesAndFailsExhaustedRows() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        insertUser(founderId, "founder", "Founder", null, "team", "Hypofit");
        insertUser(respondentId, "respondent", "Respondent", null, null, null);
        insertInterviewPost(interviewPostId, founderId, "open", "홍대", List.of("평일 오후"));
        insertApplication(applicationId, interviewPostId, respondentId, "visible");

        OffsetDateTime oldStartedAt = atUtc(2026, 8, 25, 8, 0);
        UUID pendingArtifactId = insertArtifactForPost(
                interviewPostId,
                "processing",
                "hash-a",
                "prompt-v1",
                1,
                1,
                oldStartedAt,
                oldStartedAt,
                null
        );
        UUID exhaustedArtifactId = insertArtifactForApplication(
                applicationId,
                "processing",
                "hash-b",
                "prompt-v1",
                1,
                3,
                oldStartedAt,
                oldStartedAt,
                null
        );

        OffsetDateTime now = atUtc(2026, 8, 25, 8, 10);
        AiSummaryArtifactRepository.StaleProcessingResetResult result =
                repository.resetStaleProcessingArtifacts(now, 300, 3);

        assertThat(result.resetToPendingCount()).isEqualTo(1);
        assertThat(result.markedFailedCount()).isEqualTo(1);

        Map<String, Object> resetRow = artifactRow("select * from ai_summary_artifacts where id = ?", pendingArtifactId);
        assertThat(resetRow.get("status")).isEqualTo("pending");
        assertThat(resetRow.get("started_at")).isNull();
        assertThat(resetRow.get("completed_at")).isNull();
        assertThat(resetRow.get("last_error_code")).isNull();
        assertThat(asOffsetDateTime(resetRow.get("next_attempt_at"))).isEqualTo(now);

        Map<String, Object> failedRow = artifactRow("select * from ai_summary_artifacts where id = ?", exhaustedArtifactId);
        assertThat(failedRow.get("status")).isEqualTo("failed");
        assertThat(failedRow.get("started_at")).isNull();
        assertThat(asOffsetDateTime(failedRow.get("completed_at"))).isEqualTo(now);
        assertThat(failedRow.get("last_error_code")).isEqualTo("processing_lease_expired");
    }

    @Test
    void concurrentClaimsPartitionPendingRowsWithoutDuplicates() throws Exception {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        insertUser(founderId, "founder", "Founder", null, "team", "Hypofit");
        insertUser(respondentId, "respondent", "Respondent", null, null, null);

        UUID firstPostId = UUID.randomUUID();
        UUID secondPostId = UUID.randomUUID();
        UUID thirdPostId = UUID.randomUUID();
        UUID fourthPostId = UUID.randomUUID();
        insertInterviewPost(firstPostId, founderId, "open", "강남", List.of("평일 저녁"));
        insertInterviewPost(secondPostId, founderId, "open", "성수", List.of("평일 저녁"));
        insertInterviewPost(thirdPostId, founderId, "open", "합정", List.of("평일 저녁"));
        insertInterviewPost(fourthPostId, founderId, "open", "잠실", List.of("평일 저녁"));

        UUID firstApplicationId = UUID.randomUUID();
        UUID secondApplicationId = UUID.randomUUID();
        insertApplication(firstApplicationId, thirdPostId, respondentId, "visible");
        insertApplication(secondApplicationId, fourthPostId, respondentId, "visible");

        OffsetDateTime dueAt = atUtc(2026, 8, 25, 11, 0);
        UUID firstArtifactId = insertArtifactForPost(firstPostId, "pending", "hash-1", "prompt-v1", 1, 0, null, dueAt, null);
        UUID secondArtifactId = insertArtifactForPost(secondPostId, "pending", "hash-2", "prompt-v1", 1, 0, null, dueAt.plusSeconds(1), null);
        UUID thirdArtifactId = insertArtifactForApplication(firstApplicationId, "pending", "hash-3", "prompt-v1", 1, 0, null, dueAt.plusSeconds(2), null);
        UUID fourthArtifactId = insertArtifactForApplication(secondApplicationId, "pending", "hash-4", "prompt-v1", 1, 0, null, dueAt.plusSeconds(3), null);

        OffsetDateTime claimNow = atUtc(2026, 8, 25, 11, 5);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<List<AiSummaryArtifactRepository.ClaimedArtifact>> claim = () -> {
            ready.countDown();
            start.await();
            return new TransactionTemplate(transactionManager).execute(status -> repository.claimPendingArtifacts(claimNow, 2));
        };

        List<AiSummaryArtifactRepository.ClaimedArtifact> firstClaim;
        List<AiSummaryArtifactRepository.ClaimedArtifact> secondClaim;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<List<AiSummaryArtifactRepository.ClaimedArtifact>> first = executor.submit(claim);
            Future<List<AiSummaryArtifactRepository.ClaimedArtifact>> second = executor.submit(claim);
            ready.await();
            start.countDown();
            firstClaim = first.get();
            secondClaim = second.get();
        }

        assertThat(firstClaim).hasSize(2);
        assertThat(secondClaim).hasSize(2);
        assertThat(firstClaim.stream().map(AiSummaryArtifactRepository.ClaimedArtifact::artifactId))
                .doesNotContainAnyElementsOf(secondClaim.stream().map(AiSummaryArtifactRepository.ClaimedArtifact::artifactId).toList());
        List<AiSummaryArtifactRepository.SummaryType> claimedTypes = java.util.stream.Stream.concat(
                        firstClaim.stream(),
                        secondClaim.stream()
                )
                .map(AiSummaryArtifactRepository.ClaimedArtifact::summaryType)
                .toList();
        assertThat(claimedTypes).containsExactlyInAnyOrder(
                AiSummaryArtifactRepository.SummaryType.INTERVIEW_POST,
                AiSummaryArtifactRepository.SummaryType.INTERVIEW_POST,
                AiSummaryArtifactRepository.SummaryType.APPLICATION,
                AiSummaryArtifactRepository.SummaryType.APPLICATION
        );

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "select id, status, attempt_count, started_at from ai_summary_artifacts where id in (?, ?, ?, ?)",
                firstArtifactId,
                secondArtifactId,
                thirdArtifactId,
                fourthArtifactId
        );
        assertThat(rows).hasSize(4);
        rows.forEach(row -> {
            assertThat(row.get("status")).isEqualTo("processing");
            assertThat(row.get("attempt_count")).isEqualTo(1);
            assertThat(asOffsetDateTime(row.get("started_at"))).isEqualTo(claimNow);
        });
    }

    @Test
    void minimizedSourceLoadersRespectVisibilityBoundaries() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID visiblePostId = UUID.randomUUID();
        UUID hiddenPostId = UUID.randomUUID();
        UUID visibleApplicationId = UUID.randomUUID();
        UUID hiddenApplicationId = UUID.randomUUID();
        insertUser(founderId, "founder", "Founder", "창업 팀 소개", "company", "Contentruck");
        insertUser(respondentId, "respondent", "Respondent", "사용 경험이 있어요", null, null);
        insertInterviewPost(visiblePostId, founderId, "open", "안산시", List.of("평일 저녁", "토요일 오전"));
        insertInterviewPost(hiddenPostId, founderId, "hidden", "서울시", List.of("평일 점심"));
        insertApplication(visibleApplicationId, visiblePostId, respondentId, "visible");
        insertApplication(hiddenApplicationId, hiddenPostId, respondentId, "hidden");

        AiSummaryArtifactRepository.InterviewSummarySource visiblePost =
                repository.loadInterviewPostSource(visiblePostId).orElseThrow();
        assertThat(visiblePost.title()).isEqualTo("인터뷰 모집글");
        assertThat(visiblePost.publicLocationText()).isEqualTo("안산시");
        assertThat(visiblePost.scheduleOptions()).containsExactly("평일 저녁", "토요일 오전");

        AiSummaryArtifactRepository.ApplicationSummarySource visibleApplication =
                repository.loadApplicationSource(visibleApplicationId).orElseThrow();
        assertThat(visibleApplication.interviewTitle()).isEqualTo("인터뷰 모집글");
        assertThat(visibleApplication.targetDescription()).isEqualTo("최근 3개월 내 운동 앱 사용 경험이 있는 사람");
        assertThat(visibleApplication.answers()).containsEntry("experience", "운동 앱을 꾸준히 썼어요");
        assertThat(visibleApplication.availableTimes()).containsExactly("평일 저녁", "토요일 오전");

        assertThat(repository.loadInterviewPostSource(hiddenPostId)).isEmpty();
        assertThat(repository.loadApplicationSource(hiddenApplicationId)).isEmpty();
    }

    @Test
    void guardedCompletionWritesHandleReadyRetryAndFailedTransitions() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        insertUser(founderId, "founder", "Founder", null, "team", "Hypofit");
        insertUser(respondentId, "respondent", "Respondent", null, null, null);
        insertInterviewPost(interviewPostId, founderId, "open", "연남동", List.of("평일 저녁"));
        insertApplication(applicationId, interviewPostId, respondentId, "visible");

        UUID readyArtifactId = insertArtifactForPost(
                interviewPostId,
                "processing",
                "ready-hash",
                "prompt-v1",
                2,
                1,
                atUtc(2026, 8, 25, 12, 0),
                atUtc(2026, 8, 25, 12, 0),
                null
        );
        OffsetDateTime readyNow = atUtc(2026, 8, 25, 12, 5);
        AiSummaryArtifactRepository.GuardedCompletionResult readyResult = repository.markReady(
                new AiSummaryArtifactRepository.ReadyArtifactCompletion(
                        readyArtifactId,
                        "ready-hash",
                        "prompt-v1",
                        2,
                        readyNow,
                        "gemini",
                        "gemini-2.5-flash",
                        """
                        {"overview":"요약","target_fit":"대상","key_points":["핵심 1","핵심 2"]}
                        """,
                        144,
                        38,
                        new BigDecimal("0.012345")
                )
        );

        assertThat(readyResult).isEqualTo(AiSummaryArtifactRepository.GuardedCompletionResult.APPLIED);
        Map<String, Object> readyRow = artifactRow("select * from ai_summary_artifacts where id = ?", readyArtifactId);
        assertThat(readyRow.get("status")).isEqualTo("ready");
        assertThat(readyRow.get("provider")).isEqualTo("gemini");
        assertThat(readyRow.get("model")).isEqualTo("gemini-2.5-flash");
        assertThat(readyRow.get("input_tokens")).isEqualTo(144);
        assertThat(readyRow.get("output_tokens")).isEqualTo(38);
        assertThat((BigDecimal) readyRow.get("estimated_cost_usd")).isEqualByComparingTo("0.012345");
        assertThat(readyRow.get("last_error_code")).isNull();
        assertThat(asOffsetDateTime(readyRow.get("completed_at"))).isEqualTo(readyNow);
        assertThat(readyRow.get("started_at")).isNull();

        assertThat(repository.markReady(
                new AiSummaryArtifactRepository.ReadyArtifactCompletion(
                        readyArtifactId,
                        "ready-hash",
                        "prompt-v1",
                        2,
                        readyNow.plusMinutes(1),
                        "gemini",
                        "gemini-2.5-flash",
                        """
                        {"overview":"다른 요약","target_fit":"대상","key_points":["핵심"]}
                        """,
                        1,
                        1,
                        new BigDecimal("0.000001")
                )
        )).isEqualTo(AiSummaryArtifactRepository.GuardedCompletionResult.STALE);

        UUID retryArtifactId = insertArtifactForApplication(
                applicationId,
                "processing",
                "retry-hash",
                "prompt-v1",
                1,
                1,
                atUtc(2026, 8, 25, 12, 10),
                atUtc(2026, 8, 25, 12, 10),
                null
        );
        OffsetDateTime retryNow = atUtc(2026, 8, 25, 12, 11);
        OffsetDateTime nextAttemptAt = retryNow.plusMinutes(2);
        assertThat(repository.markRetryableFailure(
                new AiSummaryArtifactRepository.RetryableArtifactFailure(
                        retryArtifactId,
                        "retry-hash",
                        "prompt-v1",
                        1,
                        retryNow,
                        nextAttemptAt,
                        "provider_timeout",
                        "gemini",
                        "gemini-2.5-flash",
                        3
                )
        )).isEqualTo(AiSummaryArtifactRepository.RetryableFailureResult.RETRY_SCHEDULED);
        Map<String, Object> retryRow = artifactRow("select * from ai_summary_artifacts where id = ?", retryArtifactId);
        assertThat(retryRow.get("status")).isEqualTo("pending");
        assertThat(retryRow.get("last_error_code")).isEqualTo("provider_timeout");
        assertThat(asOffsetDateTime(retryRow.get("next_attempt_at"))).isEqualTo(nextAttemptAt);
        assertThat(retryRow.get("completed_at")).isNull();

        UUID exhaustedPostId = UUID.randomUUID();
        UUID exhaustedApplicationId = UUID.randomUUID();
        insertInterviewPost(exhaustedPostId, founderId, "open", "연남동", List.of("주말 오후"));
        insertApplication(exhaustedApplicationId, exhaustedPostId, respondentId, "visible");
        UUID exhaustedArtifactId = insertArtifactForApplication(
                exhaustedApplicationId,
                "processing",
                "exhausted-hash",
                "prompt-v1",
                1,
                3,
                atUtc(2026, 8, 25, 12, 20),
                atUtc(2026, 8, 25, 12, 20),
                null
        );
        OffsetDateTime exhaustedNow = atUtc(2026, 8, 25, 12, 21);
        assertThat(repository.markRetryableFailure(
                new AiSummaryArtifactRepository.RetryableArtifactFailure(
                        exhaustedArtifactId,
                        "exhausted-hash",
                        "prompt-v1",
                        1,
                        exhaustedNow,
                        exhaustedNow.plusMinutes(5),
                        "provider_timeout",
                        "gemini",
                        "gemini-2.5-flash",
                        3
                )
        )).isEqualTo(AiSummaryArtifactRepository.RetryableFailureResult.MARKED_FAILED);
        Map<String, Object> exhaustedRow = artifactRow("select * from ai_summary_artifacts where id = ?", exhaustedArtifactId);
        assertThat(exhaustedRow.get("status")).isEqualTo("failed");
        assertThat(asOffsetDateTime(exhaustedRow.get("completed_at"))).isEqualTo(exhaustedNow);

        UUID failedPostId = UUID.randomUUID();
        insertInterviewPost(failedPostId, founderId, "open", "연남동", List.of("평일 오전"));
        UUID failedArtifactId = insertArtifactForPost(
                failedPostId,
                "processing",
                "failed-hash",
                "prompt-v1",
                4,
                2,
                atUtc(2026, 8, 25, 12, 30),
                atUtc(2026, 8, 25, 12, 30),
                null
        );
        OffsetDateTime failedNow = atUtc(2026, 8, 25, 12, 31);
        assertThat(repository.markFailed(
                new AiSummaryArtifactRepository.FailedArtifactCompletion(
                        failedArtifactId,
                        "wrong-hash",
                        "prompt-v1",
                        4,
                        failedNow,
                        "invalid_source_contract",
                        "gemini",
                        "gemini-2.5-flash"
                )
        )).isEqualTo(AiSummaryArtifactRepository.GuardedCompletionResult.STALE);
        assertThat(repository.markFailed(
                new AiSummaryArtifactRepository.FailedArtifactCompletion(
                        failedArtifactId,
                        "failed-hash",
                        "prompt-v1",
                        4,
                        failedNow,
                        "invalid_source_contract",
                        "gemini",
                        "gemini-2.5-flash"
                )
        )).isEqualTo(AiSummaryArtifactRepository.GuardedCompletionResult.APPLIED);
        Map<String, Object> failedRow = artifactRow("select * from ai_summary_artifacts where id = ?", failedArtifactId);
        assertThat(failedRow.get("status")).isEqualTo("failed");
        assertThat(failedRow.get("last_error_code")).isEqualTo("invalid_source_contract");
        assertThat(asOffsetDateTime(failedRow.get("completed_at"))).isEqualTo(failedNow);
    }

    private void insertUser(
            UUID userId,
            String role,
            String name,
            String bio,
            String organizationType,
            String organizationName
    ) {
        jdbcTemplate.update(
                """
                insert into app_users (
                  id, email, name, bio, role, organization_type, organization_name
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                userId,
                userId + "@example.com",
                name,
                bio,
                role,
                organizationType,
                organizationName
        );
    }

    private void insertInterviewPost(
            UUID interviewPostId,
            UUID founderId,
            String status,
            String locationText,
            List<String> scheduleOptions
    ) {
        OffsetDateTime now = atUtc(2026, 8, 25, 7, 0);
        jdbcTemplate.update(
                """
                insert into interview_posts (
                  id,
                  founder_id,
                  recruitment_type,
                  title,
                  service_summary,
                  target_description,
                  reward_amount,
                  duration_minutes,
                  recruit_count,
                  interview_mode,
                  location_text,
                  location_precision,
                  schedule_options,
                  status,
                  created_at,
                  updated_at
                ) values (?, ?, 'interview', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)
                """,
                interviewPostId,
                founderId,
                "인터뷰 모집글",
                "운동 앱 사용 중단 이유를 알아보는 인터뷰입니다.",
                "최근 3개월 내 운동 앱 사용 경험이 있는 사람",
                30000,
                30,
                2,
                "online",
                locationText,
                "district",
                toJsonArray(scheduleOptions),
                status,
                Timestamp.from(now.toInstant()),
                Timestamp.from(now.toInstant())
        );
    }

    private void insertApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID respondentId,
            String moderationStatus
    ) {
        OffsetDateTime now = atUtc(2026, 8, 25, 7, 5);
        jdbcTemplate.update(
                """
                insert into applications (
                  id,
                  interview_post_id,
                  respondent_id,
                  answers,
                  available_times,
                  status,
                  moderation_status,
                  created_at,
                  updated_at
                ) values (?, ?, ?, ?::jsonb, ?::jsonb, 'applied', ?, ?, ?)
                """,
                applicationId,
                interviewPostId,
                respondentId,
                """
                {"experience":"운동 앱을 꾸준히 썼어요","motivation":"사용 중단 이유를 설명할 수 있어요"}
                """,
                """
                ["평일 저녁","토요일 오전"]
                """,
                moderationStatus,
                Timestamp.from(now.toInstant()),
                Timestamp.from(now.toInstant())
        );
    }

    private UUID insertArtifactForPost(
            UUID interviewPostId,
            String status,
            String sourceHash,
            String promptVersion,
            int workVersion,
            int attemptCount,
            OffsetDateTime startedAt,
            OffsetDateTime nextAttemptAt,
            String lastErrorCode
    ) {
        UUID artifactId = UUID.randomUUID();
        OffsetDateTime createdAt = atUtc(2026, 8, 25, 6, 0);
        jdbcTemplate.update(
                """
                insert into ai_summary_artifacts (
                  id,
                  summary_type,
                  interview_post_id,
                  status,
                  source_hash,
                  prompt_version,
                  work_version,
                  attempt_count,
                  next_attempt_at,
                  last_error_code,
                  started_at,
                  created_at,
                  updated_at
                ) values (?, 'interview_post', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                artifactId,
                interviewPostId,
                status,
                sourceHash,
                promptVersion,
                workVersion,
                attemptCount,
                Timestamp.from(nextAttemptAt.toInstant()),
                lastErrorCode,
                startedAt == null ? null : Timestamp.from(startedAt.toInstant()),
                Timestamp.from(createdAt.toInstant()),
                Timestamp.from(createdAt.toInstant())
        );
        return artifactId;
    }

    private UUID insertArtifactForApplication(
            UUID applicationId,
            String status,
            String sourceHash,
            String promptVersion,
            int workVersion,
            int attemptCount,
            OffsetDateTime startedAt,
            OffsetDateTime nextAttemptAt,
            String lastErrorCode
    ) {
        UUID artifactId = UUID.randomUUID();
        OffsetDateTime createdAt = atUtc(2026, 8, 25, 6, 0);
        jdbcTemplate.update(
                """
                insert into ai_summary_artifacts (
                  id,
                  summary_type,
                  application_id,
                  status,
                  source_hash,
                  prompt_version,
                  work_version,
                  attempt_count,
                  next_attempt_at,
                  last_error_code,
                  started_at,
                  created_at,
                  updated_at
                ) values (?, 'application', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                artifactId,
                applicationId,
                status,
                sourceHash,
                promptVersion,
                workVersion,
                attemptCount,
                Timestamp.from(nextAttemptAt.toInstant()),
                lastErrorCode,
                startedAt == null ? null : Timestamp.from(startedAt.toInstant()),
                Timestamp.from(createdAt.toInstant()),
                Timestamp.from(createdAt.toInstant())
        );
        return artifactId;
    }

    private Map<String, Object> artifactRow(String sql, Object... args) {
        return new LinkedHashMap<>(jdbcTemplate.queryForMap(sql, args));
    }

    private OffsetDateTime atUtc(int year, int month, int day, int hour, int minute) {
        return OffsetDateTime.of(year, month, day, hour, minute, 0, 0, ZoneOffset.UTC);
    }

    private OffsetDateTime asOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        return ((Timestamp) value).toInstant().atOffset(ZoneOffset.UTC);
    }

    private String toJsonArray(List<String> values) {
        return values.stream()
                .map(value -> "\"" + value + "\"")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
    }
}
