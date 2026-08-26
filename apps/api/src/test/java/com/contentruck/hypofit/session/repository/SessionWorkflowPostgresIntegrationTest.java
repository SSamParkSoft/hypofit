package com.contentruck.hypofit.session.repository;


import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionWorkflowService;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SessionWorkflowPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private SessionWorkflowService service;

    @Test
    void concurrentAttendanceConfirmationKeepsSingleAttendanceAndRewardRows() throws Exception {
        Fixture fixture = seedFixture("selected", "scheduled");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Throwable> founder = confirmAttendanceCall(fixture, fixture.founderId(), "founder", ready, start);
        Callable<Throwable> respondent = confirmAttendanceCall(fixture, fixture.respondentId(), "respondent", ready, start);

        List<Throwable> outcomes = executeConcurrently(founder, respondent, ready, start);

        assertThat(outcomes).withFailMessage("outcomes=%s", outcomes).filteredOn(value -> value == null).hasSize(2);
        assertThat(count("select count(*) from attendance_records where session_id = ?", fixture.session().id())).isEqualTo(1);
        assertThat(count("select count(*) from reward_confirmations where session_id = ?", fixture.session().id())).isEqualTo(1);
        assertThat(selectString("select status from interview_sessions where id = ?", fixture.session().id()))
                .isEqualTo("completed");
        assertThat(selectString("select status from applications where id = ?", fixture.application().id()))
                .isEqualTo("completed");
        assertThat(selectBoolean("select founder_confirmed from attendance_records where session_id = ?", fixture.session().id()))
                .isTrue();
        assertThat(selectBoolean("select respondent_confirmed from attendance_records where session_id = ?", fixture.session().id()))
                .isTrue();
    }

    @Test
    void concurrentMarkRewardPaidCreatesSingleRewardRow() throws Exception {
        Fixture fixture = seedFixture("completed", "completed");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Throwable> first = markRewardPaidCall(fixture, ready, start);
        Callable<Throwable> second = markRewardPaidCall(fixture, ready, start);

        List<Throwable> outcomes = executeConcurrently(first, second, ready, start);

        assertThat(outcomes).withFailMessage("outcomes=%s", outcomes).filteredOn(value -> value == null).hasSize(2);
        assertThat(count("select count(*) from reward_confirmations where session_id = ?", fixture.session().id())).isEqualTo(1);
        assertThat(selectString("select status from reward_confirmations where session_id = ?", fixture.session().id()))
                .isEqualTo("founder_marked_paid");
        assertThat(selectTimestamp("select founder_marked_paid_at from reward_confirmations where session_id = ?", fixture.session().id()))
                .isNotNull();
    }

    @Test
    void concurrentRewardResolutionAllowsOneTerminalTransition() throws Exception {
        Fixture fixture = seedFixture("completed", "completed");
        insertRewardConfirmation(fixture, "founder_marked_paid");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Throwable> confirm = concurrentCall(
                () -> service.confirmRewardReceived(
                        fixture.session(),
                        fixture.application(),
                        fixture.post(),
                        fixture.respondentId(),
                        "respondent"
                ),
                ready,
                start
        );
        Callable<Throwable> dispute = concurrentCall(
                () -> service.disputeReward(
                        fixture.session(),
                        fixture.application(),
                        fixture.post(),
                        fixture.respondentId(),
                        "respondent",
                        "아직 못 받았어요."
                ),
                ready,
                start
        );

        List<Throwable> outcomes = executeConcurrently(confirm, dispute, ready, start);

        assertThat(outcomes).withFailMessage("outcomes=%s", outcomes).filteredOn(value -> value == null).hasSize(1);
        assertThat(outcomes)
                .filteredOn(HypofitException.class::isInstance)
                .singleElement()
                .matches(throwable -> ((HypofitException) throwable).getStatus() == 409);
        assertThat(count("select count(*) from reward_confirmations where session_id = ?", fixture.session().id())).isEqualTo(1);
        assertThat(selectString("select status from reward_confirmations where session_id = ?", fixture.session().id()))
                .isIn("respondent_confirmed", "disputed");
    }

    @Test
    void concurrentDuplicateReviewCreationKeepsSingleReviewRow() throws Exception {
        Fixture fixture = seedFixture("completed", "completed");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Throwable> first = createReviewCall(fixture, ready, start);
        Callable<Throwable> second = createReviewCall(fixture, ready, start);

        List<Throwable> outcomes = executeConcurrently(first, second, ready, start);

        assertThat(outcomes).withFailMessage("outcomes=%s", outcomes).filteredOn(value -> value == null).hasSize(1);
        assertThat(outcomes)
                .filteredOn(HypofitException.class::isInstance)
                .singleElement()
                .matches(throwable -> ((HypofitException) throwable).getStatus() == 409);
        assertThat(count(
                "select count(*) from interview_reviews where session_id = ? and reviewer_id = ?",
                fixture.session().id(),
                fixture.respondentId()
        )).isEqualTo(1);
    }

    private Callable<Throwable> confirmAttendanceCall(
            Fixture fixture,
            UUID actorUserId,
            String actorRole,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return concurrentCall(
                () -> service.confirmAttendance(
                        fixture.session(),
                        fixture.application(),
                        fixture.post(),
                        actorUserId,
                        actorRole
                ),
                ready,
                start
        );
    }

    private Callable<Throwable> markRewardPaidCall(
            Fixture fixture,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return concurrentCall(
                () -> service.markRewardPaid(
                        fixture.session(),
                        fixture.application(),
                        fixture.post(),
                        fixture.founderId(),
                        "founder"
                ),
                ready,
                start
        );
    }

    private Callable<Throwable> createReviewCall(
            Fixture fixture,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return concurrentCall(
                () -> service.createReview(
                        fixture.session(),
                        fixture.application(),
                        fixture.post(),
                        fixture.respondentId(),
                        "respondent",
                        5,
                        List.of("시간 준수", "친절해요"),
                        "좋았어요."
                ),
                ready,
                start
        );
    }

    private List<Throwable> executeConcurrently(
            Callable<Throwable> first,
            Callable<Throwable> second,
            CountDownLatch ready,
            CountDownLatch start
    ) throws Exception {
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Throwable> firstFuture = executor.submit(first);
            Future<Throwable> secondFuture = executor.submit(second);
            ready.await();
            start.countDown();
            return Arrays.asList(firstFuture.get(), secondFuture.get());
        }
    }

    private Callable<Throwable> concurrentCall(
            ThrowingSupplier<?> action,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return () -> {
            ready.countDown();
            start.await();
            try {
                action.get();
                return null;
            } catch (Throwable throwable) {
                return throwable;
            }
        };
    }

    private Fixture seedFixture(String applicationStatus, String sessionStatus) {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        OffsetDateTime scheduledAt = OffsetDateTime.parse("2026-08-04T10:00:00Z");

        insertUser(founderId, "founder");
        insertUser(respondentId, "respondent");
        jdbcTemplate.update(
                """
                insert into interview_posts (
                  id, founder_id, title, service_summary, target_description,
                  reward_amount, duration_minutes, interview_mode, recruitment_type, schedule_options, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]'::jsonb, ?)
                """,
                interviewPostId,
                founderId,
                "세션 동시성 테스트",
                "서비스 설명",
                "타깃 설명",
                15000,
                30,
                "online",
                "interview",
                "open"
        );
        jdbcTemplate.update(
                """
                insert into applications (
                  id, interview_post_id, respondent_id, answers, available_times, status
                ) values (?, ?, ?, '{}'::jsonb, '[]'::jsonb, ?)
                """,
                applicationId,
                interviewPostId,
                respondentId,
                applicationStatus
        );
        jdbcTemplate.update(
                """
                insert into interview_sessions (
                  id, application_id, scheduled_at, meeting_type, meeting_url, status
                ) values (?, ?, ?, ?, ?, ?)
                """,
                sessionId,
                applicationId,
                scheduledAt,
                "online",
                "https://meet.example.com/session",
                sessionStatus
        );

        return new Fixture(
                founderId,
                respondentId,
                new InterviewPostRecord(interviewPostId, founderId, "세션 동시성 테스트", 15000, "interview"),
                new ApplicationRecord(
                        applicationId,
                        interviewPostId,
                        respondentId,
                        java.util.Map.of("motivation", "테스트"),
                        List.of("평일 저녁"),
                        applicationStatus,
                        "visible",
                        null
                ),
                new InterviewSessionRecord(
                        sessionId,
                        applicationId,
                        scheduledAt,
                        "online",
                        "https://meet.example.com/session",
                        null,
                        sessionStatus,
                        "visible"
                )
        );
    }

    private void insertRewardConfirmation(Fixture fixture, String status) {
        jdbcTemplate.update(
                """
                insert into reward_confirmations (
                  id, session_id, application_id, founder_id, respondent_id, amount,
                  status, founder_marked_paid_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                fixture.session().id(),
                fixture.application().id(),
                fixture.founderId(),
                fixture.respondentId(),
                fixture.post().rewardAmount(),
                status,
                OffsetDateTime.parse("2026-08-04T11:00:00Z")
        );
    }

    private void insertUser(UUID userId, String role) {
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, ?)",
                userId,
                userId + "@example.com",
                role + " user",
                role
        );
    }

    private int count(String sql, Object... arguments) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, arguments);
        return count == null ? 0 : count;
    }

    private boolean selectBoolean(String sql, Object... arguments) {
        Boolean value = jdbcTemplate.queryForObject(sql, Boolean.class, arguments);
        return Boolean.TRUE.equals(value);
    }

    private String selectString(String sql, Object... arguments) {
        return jdbcTemplate.queryForObject(sql, String.class, arguments);
    }

    private OffsetDateTime selectTimestamp(String sql, Object... arguments) {
        return jdbcTemplate.queryForObject(sql, OffsetDateTime.class, arguments);
    }

    @FunctionalInterface
    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }

    private record Fixture(
            UUID founderId,
            UUID respondentId,
            InterviewPostRecord post,
            ApplicationRecord application,
            InterviewSessionRecord session
    ) {
    }
}
