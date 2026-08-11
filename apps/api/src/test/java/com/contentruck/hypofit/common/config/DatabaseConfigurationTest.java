package com.contentruck.hypofit.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;

class DatabaseConfigurationTest {

    @Test
    void appliesExplicitHikariPoolLimitsToCustomDataSource() {
        HypofitProperties properties = new HypofitProperties();
        properties.setDatabaseUrl("postgresql://user:password@127.0.0.1:5432/hypofit");

        try (HikariDataSource dataSource = (HikariDataSource) new DatabaseConfiguration()
                .dataSource(properties, 3, 1)) {
            assertThat(dataSource.getMaximumPoolSize()).isEqualTo(3);
            assertThat(dataSource.getMinimumIdle()).isEqualTo(1);
        }
    }
}
