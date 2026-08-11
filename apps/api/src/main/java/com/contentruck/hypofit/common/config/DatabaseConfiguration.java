package com.contentruck.hypofit.common.config;

import javax.sql.DataSource;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.util.StringUtils;

@Configuration
public class DatabaseConfiguration {

    @Bean
    DataSource dataSource(
            HypofitProperties properties,
            @Value("${spring.datasource.hikari.maximum-pool-size:10}") int maximumPoolSize,
            @Value("${spring.datasource.hikari.minimum-idle:10}") int minimumIdle
    ) {
        DatabaseUrlComponents components = DatabaseUrlComponents.parse(properties.getDatabaseUrl());
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(components.jdbcUrl());
        if (StringUtils.hasText(components.username())) {
            dataSource.setUsername(components.username());
        }
        if (StringUtils.hasText(components.password())) {
            dataSource.setPassword(components.password());
        }
        dataSource.setInitializationFailTimeout(0);
        dataSource.setMaximumPoolSize(maximumPoolSize);
        dataSource.setMinimumIdle(minimumIdle);
        dataSource.setPoolName("hypofit-api");
        return dataSource;
    }

    @Bean
    JdbcClient jdbcClient(DataSource dataSource) {
        return JdbcClient.create(dataSource);
    }
}
