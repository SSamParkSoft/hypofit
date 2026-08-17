package com.contentruck.hypofit.applicant.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.applicant.service.ApplicationReadModel;
import com.contentruck.hypofit.applicant.service.ApplicationWorkflowRepository;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class ApplicationWorkflowPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private ApplicationWorkflowRepository repository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void mutationResultsStayUnhydratedWhileListResultsIncludeRespondent() {
        Fixture fixture = seedFixture();

        ApplicationReadModel created = new TransactionTemplate(transactionManager).execute(status ->
                repository.createApplication(
                        fixture.interviewPostId(),
                        fixture.respondentId(),
                        Map.of("experience", "사용 경험이 있어요"),
                        List.of("평일 저녁")
                )
        );

        assertThat(created).isNotNull();
        assertThat(created.respondent()).isNull();

        ApplicationReadModel selected = new TransactionTemplate(transactionManager).execute(status ->
                repository.updateStatusIfCurrent(
                                created.id(),
                                "selected",
                                Set.of("applied"),
                                null
                        )
                        .orElseThrow()
        );

        assertThat(selected).isNotNull();
        assertThat(selected.respondent()).isNull();

        List<ApplicationReadModel> listed = new TransactionTemplate(transactionManager).execute(status ->
                repository.listVisibleApplicationsForUser(fixture.respondentId())
        );

        assertThat(listed).isNotNull();
        assertThat(listed).singleElement().satisfies(application ->
                assertThat(application.respondent()).isNotNull()
        );
    }

    @Test
    void concurrentDuplicateApplicationCreationKeepsSingleRow() throws Exception {
        Fixture fixture = seedFixture();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Throwable> create = () -> {
            ready.countDown();
            start.await();
            try {
                new TransactionTemplate(transactionManager).executeWithoutResult(status -> repository.createApplication(
                        fixture.interviewPostId(),
                        fixture.respondentId(),
                        Map.of("experience", "사용 경험이 있어요"),
                        List.of("평일 저녁")
                ));
                return null;
            } catch (Throwable throwable) {
                return throwable;
            }
        };

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Throwable> first = executor.submit(create);
            Future<Throwable> second = executor.submit(create);
            ready.await();
            start.countDown();

            List<Throwable> outcomes = Arrays.asList(first.get(), second.get());
            assertThat(outcomes).filteredOn(value -> value == null).hasSize(1);
            assertThat(outcomes).filteredOn(DataIntegrityViolationException.class::isInstance).hasSize(1);
        }

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from applications where interview_post_id = ? and respondent_id = ?",
                Integer.class,
                fixture.interviewPostId(),
                fixture.respondentId()
        );
        assertThat(count).isEqualTo(1);
    }

    @Test
    void concurrentStatusUpdatesRejectTheStaleWriter() throws Exception {
        Fixture fixture = seedFixture();
        UUID applicationId = insertApplication(fixture);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Optional<?>> select = statusUpdate(applicationId, "selected", ready, start);
        Callable<Optional<?>> reject = statusUpdate(applicationId, "rejected", ready, start);
        List<Optional<?>> outcomes;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Optional<?>> first = executor.submit(select);
            Future<Optional<?>> second = executor.submit(reject);
            ready.await();
            start.countDown();
            outcomes = List.of(first.get(), second.get());
        }

        assertThat(outcomes).filteredOn(Optional::isPresent).hasSize(1);
        assertThat(outcomes).filteredOn(Optional::isEmpty).hasSize(1);
        String status = jdbcTemplate.queryForObject(
                "select status from applications where id = ?",
                String.class,
                applicationId
        );
        assertThat(status).isIn("selected", "rejected");
    }

    @Test
    void founderDetailIncludesPersistedAiSummaryButRespondentDetailOmitsIt() {
        Fixture fixture = seedFixture();
        UUID applicationId = insertApplication(fixture);
        jdbcTemplate.update(
                """
                insert into ai_summary_artifacts (
                  id, summary_type, application_id, status, source_hash, prompt_version,
                  work_version, result, updated_at
                ) values (
                  ?, 'application', ?, 'ready', 'hash', 'v1', 1,
                  ?::jsonb, now()
                )
                """,
                UUID.randomUUID(),
                applicationId,
                """
                {
                  "overview": "사용 경험을 구체적으로 적었어요.",
                  "relevant_experience": ["운동 앱 2종 사용"],
                  "availability": "평일 저녁 가능",
                  "questions_to_confirm": ["최근 사용 중단 시점 확인"]
                }
                """
        );

        ApplicationReadModel founderDetail = new TransactionTemplate(transactionManager).execute(status ->
                repository.findVisibleApplicationDetail(applicationId, fixture.founderId()).orElseThrow()
        );
        ApplicationReadModel respondentDetail = new TransactionTemplate(transactionManager).execute(status ->
                repository.findVisibleApplicationDetail(applicationId, fixture.respondentId()).orElseThrow()
        );

        assertThat(founderDetail.aiSummary()).isNotNull();
        assertThat(founderDetail.aiSummary().status()).isEqualTo("ready");
        assertThat(founderDetail.aiSummary().content()).isNotNull();
        assertThat(founderDetail.aiSummary().content().relevantExperience()).containsExactly("운동 앱 2종 사용");

        assertThat(respondentDetail.aiSummary()).isNull();
    }

    @Test
    void unrelatedViewerCannotReadVisibleApplicationDetail() {
        Fixture fixture = seedFixture();
        UUID outsiderId = UUID.randomUUID();
        UUID applicationId = insertApplication(fixture);
        insertUser(outsiderId, "respondent");

        Optional<ApplicationReadModel> detail = new TransactionTemplate(transactionManager).execute(status ->
                repository.findVisibleApplicationDetail(applicationId, outsiderId)
        );

        assertThat(detail).isEmpty();
    }

    private Callable<Optional<?>> statusUpdate(
            UUID applicationId,
            String nextStatus,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return () -> {
            ready.countDown();
            start.await();
            return new TransactionTemplate(transactionManager).execute(status -> repository.updateStatusIfCurrent(
                    applicationId,
                    nextStatus,
                    Set.of("applied"),
                    "rejected".equals(nextStatus) ? "조건이 맞지 않아요" : null
            ));
        };
    }

    private Fixture seedFixture() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        insertUser(founderId, "founder");
        insertUser(respondentId, "respondent");
        jdbcTemplate.update(
                """
                insert into interview_posts (
                  id, founder_id, title, service_summary, target_description,
                  reward_amount, duration_minutes, interview_mode, schedule_options, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, '[]'::jsonb, ?)
                """,
                interviewPostId,
                founderId,
                "동시성 테스트 인터뷰",
                "서비스 설명",
                "타깃 설명",
                15000,
                30,
                "online",
                "open"
        );
        return new Fixture(founderId, respondentId, interviewPostId);
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

    private UUID insertApplication(Fixture fixture) {
        UUID applicationId = UUID.randomUUID();
        jdbcTemplate.update(
                """
                insert into applications (
                  id, interview_post_id, respondent_id, answers, available_times, status
                ) values (?, ?, ?, '{}'::jsonb, '[]'::jsonb, 'applied')
                """,
                applicationId,
                fixture.interviewPostId(),
                fixture.respondentId()
        );
        return applicationId;
    }

    private record Fixture(UUID founderId, UUID respondentId, UUID interviewPostId) {
    }
}
