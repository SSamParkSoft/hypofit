package com.contentruck.hypofit.interview.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.interview.application.InterviewPostCreateCommand;
import com.contentruck.hypofit.interview.application.InterviewPostWriteRepository;
import com.contentruck.hypofit.interview.domain.InterviewPostWriteModel;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class InterviewPostWriteRepositoryPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private InterviewPostWriteRepository repository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void createPostPersistsScheduleOptionsAsJsonbAndReadsThemBack() {
        UUID founderId = UUID.randomUUID();
        insertUser(founderId, "founder");
        InterviewPostCreateCommand command = new InterviewPostCreateCommand(
                "인터뷰 모집",
                "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                "최근 3개월 내 관련 경험자",
                15000,
                30,
                0,
                "online",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of("평일 저녁", "주말 오후"),
                "open"
        );

        InterviewPostWriteModel created = new TransactionTemplate(transactionManager)
                .execute(status -> repository.createPost(founderId, command));

        assertThat(created).isNotNull();
        assertThat(created.scheduleOptions()).containsExactly("평일 저녁", "주말 오후");

        Integer scheduleOptionCount = jdbcTemplate.queryForObject(
                "select jsonb_array_length(schedule_options) from interview_posts where id = ?",
                Integer.class,
                created.id()
        );
        String firstScheduleOption = jdbcTemplate.queryForObject(
                "select schedule_options ->> 0 from interview_posts where id = ?",
                String.class,
                created.id()
        );
        String secondScheduleOption = jdbcTemplate.queryForObject(
                "select schedule_options ->> 1 from interview_posts where id = ?",
                String.class,
                created.id()
        );

        assertThat(scheduleOptionCount).isEqualTo(2);
        assertThat(firstScheduleOption).isEqualTo("평일 저녁");
        assertThat(secondScheduleOption).isEqualTo("주말 오후");

        InterviewPostWriteModel reloaded = new TransactionTemplate(transactionManager)
                .execute(status -> repository.findPost(created.id()).orElseThrow());

        assertThat(reloaded).isNotNull();
        assertThat(reloaded.scheduleOptions()).containsExactly("평일 저녁", "주말 오후");
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
}
