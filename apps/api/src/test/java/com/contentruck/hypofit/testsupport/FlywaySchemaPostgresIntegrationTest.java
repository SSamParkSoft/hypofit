package com.contentruck.hypofit.testsupport;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FlywaySchemaPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Test
    void springValidatesAgainstCurrentFlywayBaseline() {
        assertThat(jdbcTemplate.queryForObject(
                "select version from flyway_schema_history where success order by installed_rank desc limit 1",
                String.class
        )).isEqualTo("0026");

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
        )).contains("interview", "survey", "beta_test");
    }
}
