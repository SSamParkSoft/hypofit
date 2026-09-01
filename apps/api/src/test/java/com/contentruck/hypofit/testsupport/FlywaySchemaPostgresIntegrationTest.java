package com.contentruck.hypofit.testsupport;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FlywaySchemaPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Test
    void springValidatesAgainstCurrentFlywayBaseline() {
        assertThat(jdbcTemplate.queryForObject(
                "select version from flyway_schema_history where success order by installed_rank desc limit 1",
                String.class
        )).isEqualTo("0029");

        assertThat(jdbcTemplate.queryForObject(
                """
                select column_default
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'interview_posts'
                  and column_name = 'recruitment_type'
                """,
                String.class
        )).contains("interview");

        assertThat(jdbcTemplate.queryForObject(
                """
                select pg_get_constraintdef(oid)
                from pg_constraint
                where conname = 'ck_interview_posts_recruitment_type'
                """,
                String.class
        )).contains(
                "interview",
                "survey",
                "beta_test",
                "usability_test",
                "research_experiment",
                "focus_group",
                "other"
        );

        assertThat(jdbcTemplate.queryForObject(
                """
                select data_type
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'interview_posts'
                  and column_name = 'client_submission_id'
                """,
                String.class
        )).isEqualTo("uuid");

        assertThat(jdbcTemplate.queryForObject(
                """
                select indexdef
                from pg_indexes
                where schemaname = 'public'
                  and tablename = 'interview_posts'
                  and indexname = 'uq_interview_posts_founder_client_submission_id'
                """,
                String.class
        )).contains(
                "UNIQUE INDEX uq_interview_posts_founder_client_submission_id",
                "(founder_id, client_submission_id)",
                "client_submission_id IS NOT NULL"
        );
    }
}
