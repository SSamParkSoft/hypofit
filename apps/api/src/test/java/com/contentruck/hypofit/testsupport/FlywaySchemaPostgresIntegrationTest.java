package com.contentruck.hypofit.testsupport;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FlywaySchemaPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Test
    void springValidatesAgainstCurrentFlywayBaseline() {
        assertThat(jdbcTemplate.queryForObject(
                "select version from flyway_schema_history where success order by installed_rank desc limit 1",
                String.class
        )).isEqualTo("0025");
    }
}
