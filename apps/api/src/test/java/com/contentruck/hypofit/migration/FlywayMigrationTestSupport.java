package com.contentruck.hypofit.migration;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.flywaydb.core.Flyway;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

final class FlywayMigrationTestSupport {

    private FlywayMigrationTestSupport() {
    }

    static PostgreSQLContainer<?> startPostgres() {
        PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("hypofit")
                .withUsername("postgres")
                .withPassword("postgres");
        postgres.start();
        return postgres;
    }

    static Flyway configureFlyway(PostgreSQLContainer<?> postgres) {
        return Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .load();
    }

    static List<String> appliedVersions(Flyway flyway) {
        return Arrays.stream(flyway.info().applied())
                .map(info -> info.getVersion() == null
                        ? null
                        : normalizeVersion(info.getVersion().getVersion()))
                .filter(version -> version != null)
                .toList();
    }

    private static String normalizeVersion(String version) {
        return Arrays.stream(version.split("\\."))
                .map(part -> part.matches("\\d+") ? new BigInteger(part).toString() : part)
                .collect(Collectors.joining("."));
    }
}
