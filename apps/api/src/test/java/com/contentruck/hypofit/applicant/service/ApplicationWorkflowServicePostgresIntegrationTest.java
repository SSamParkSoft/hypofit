package com.contentruck.hypofit.applicant.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.ai.service.AiSummaryEnqueueService;
import com.contentruck.hypofit.chat.service.ApplicationChatLifecycleService;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ApplicationWorkflowServicePostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private ApplicationWorkflowService service;

    @MockitoBean
    private ApplicationChatLifecycleService chatLifecycleService;

    @MockitoBean
    private NotificationWriteService notificationWriteService;

    @MockitoBean
    private AiSummaryEnqueueService aiSummaryEnqueueService;

    @Test
    void concurrentSelectionForLimitedPostAllowsOnlyOneWinner() throws Exception {
        Fixture fixture = seedLimitedSelectionFixture();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Object> selectFirst = select(fixture.founderId(), fixture.firstApplicationId(), ready, start);
        Callable<Object> selectSecond = select(fixture.founderId(), fixture.secondApplicationId(), ready, start);

        List<Object> outcomes;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Object> first = executor.submit(selectFirst);
            Future<Object> second = executor.submit(selectSecond);
            ready.await();
            start.countDown();
            outcomes = Arrays.asList(first.get(), second.get());
        }

        assertThat(outcomes).filteredOn(ApplicationReadModel.class::isInstance).hasSize(1);
        assertThat(outcomes).filteredOn(ApplicationSelectionCapacityReachedException.class::isInstance).hasSize(1);

        Integer selectedCount = jdbcTemplate.queryForObject(
                "select count(*) from applications where interview_post_id = ? and status = 'selected'",
                Integer.class,
                fixture.interviewPostId()
        );
        assertThat(selectedCount).isEqualTo(1);

        List<String> statuses = jdbcTemplate.queryForList(
                "select status from applications where id in (?, ?) order by id",
                String.class,
                fixture.firstApplicationId(),
                fixture.secondApplicationId()
        );
        assertThat(statuses).containsExactlyInAnyOrder("applied", "selected");
    }

    private Callable<Object> select(
            UUID founderId,
            UUID applicationId,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return () -> {
            ready.countDown();
            start.await();
            try {
                return service.updateApplicationStatus(founderId, applicationId, "selected", null);
            } catch (Throwable throwable) {
                return throwable;
            }
        };
    }

    private Fixture seedLimitedSelectionFixture() {
        UUID founderId = UUID.randomUUID();
        UUID firstRespondentId = UUID.randomUUID();
        UUID secondRespondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID firstApplicationId = UUID.randomUUID();
        UUID secondApplicationId = UUID.randomUUID();

        insertUser(founderId, "founder");
        insertUser(firstRespondentId, "respondent");
        insertUser(secondRespondentId, "respondent");

        jdbcTemplate.update(
                """
                insert into interview_posts (
                  id,
                  founder_id,
                  title,
                  service_summary,
                  target_description,
                  reward_amount,
                  duration_minutes,
                  recruit_count,
                  recruitment_type,
                  entry_mode,
                  interview_mode,
                  schedule_options,
                  status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]'::jsonb, ?)
                """,
                interviewPostId,
                founderId,
                "좌석 1개 인터뷰",
                "서비스 설명",
                "타깃 설명",
                15000,
                30,
                1,
                "interview",
                "application_required",
                "online",
                "open"
        );

        insertApplication(firstApplicationId, interviewPostId, firstRespondentId);
        insertApplication(secondApplicationId, interviewPostId, secondRespondentId);

        return new Fixture(founderId, interviewPostId, firstApplicationId, secondApplicationId);
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

    private void insertApplication(UUID applicationId, UUID interviewPostId, UUID respondentId) {
        jdbcTemplate.update(
                """
                insert into applications (
                  id,
                  interview_post_id,
                  respondent_id,
                  answers,
                  available_times,
                  status,
                  moderation_status
                ) values (?, ?, ?, '{}'::jsonb, '[]'::jsonb, 'applied', 'visible')
                """,
                applicationId,
                interviewPostId,
                respondentId
        );
    }

    private record Fixture(
            UUID founderId,
            UUID interviewPostId,
            UUID firstApplicationId,
            UUID secondApplicationId
    ) {
    }
}
