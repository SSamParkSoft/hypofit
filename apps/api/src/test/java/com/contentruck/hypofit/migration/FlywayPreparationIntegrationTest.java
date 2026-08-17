package com.contentruck.hypofit.migration;

import static org.assertj.core.api.Assertions.assertThat;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

class FlywayPreparationIntegrationTest {

    @Test
    void cleanDatabaseIsCreatedFromVersion25Baseline() {
        try (PostgreSQLContainer<?> postgres = FlywayMigrationTestSupport.startPostgres()) {
            Flyway flyway = FlywayMigrationTestSupport.configureFlyway(postgres);
            MigrateResult migrateResult = flyway.migrate();

            assertThat(migrateResult.success).isTrue();
            assertThat(FlywayMigrationTestSupport.appliedVersions(flyway))
                    .containsExactly("24", "25");
        }
    }

    @Test
    void repeatedMigrationIsIdempotent() {
        try (PostgreSQLContainer<?> postgres = FlywayMigrationTestSupport.startPostgres()) {
            Flyway flyway = FlywayMigrationTestSupport.configureFlyway(postgres);
            flyway.migrate();
            MigrateResult secondResult = flyway.migrate();

            assertThat(secondResult.success).isTrue();
            assertThat(secondResult.migrationsExecuted).isZero();
            assertThat(FlywayMigrationTestSupport.appliedVersions(flyway))
                    .containsExactly("24", "25");
        }
    }
}
