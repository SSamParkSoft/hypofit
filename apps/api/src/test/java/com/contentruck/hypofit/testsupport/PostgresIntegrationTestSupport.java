package com.contentruck.hypofit.testsupport;

import org.junit.jupiter.api.BeforeEach;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@ActiveProfiles("test")
public abstract class PostgresIntegrationTestSupport {

    private static final PostgreSQLContainer POSTGRES = startPostgres();

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void configurePostgres(DynamicPropertyRegistry registry) {
        registry.add("hypofit.database-url", PostgresIntegrationTestSupport::springDatabaseUrl);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access", () -> true);
    }

    @BeforeEach
    void truncateDomainTables() {
        String tables = jdbcTemplate.queryForList(
                        """
                        select quote_ident(tablename)
                        from pg_tables
                        where schemaname = 'public'
                          and tablename <> 'flyway_schema_history'
                        order by tablename
                        """,
                        String.class
                )
                .stream()
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
        if (!tables.isBlank()) {
            jdbcTemplate.execute("truncate table " + tables + " restart identity cascade");
        }
    }

    private static PostgreSQLContainer startPostgres() {
        PostgreSQLContainer postgres = new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("hypofit")
                .withUsername("postgres")
                .withPassword("postgres");
        postgres.start();
        applyFlywayMigrations(postgres);
        return postgres;
    }

    private static String springDatabaseUrl() {
        return "postgresql://%s:%s@%s:%d/%s".formatted(
                POSTGRES.getUsername(),
                POSTGRES.getPassword(),
                POSTGRES.getHost(),
                POSTGRES.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT),
                POSTGRES.getDatabaseName()
        );
    }

    private static void applyFlywayMigrations(PostgreSQLContainer postgres) {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .load()
                .migrate();
    }
}
