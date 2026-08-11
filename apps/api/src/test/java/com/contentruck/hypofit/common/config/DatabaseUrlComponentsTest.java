package com.contentruck.hypofit.common.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlComponentsTest {

    @Test
    void parsesAsyncpgStyleDatabaseUrl() {
        DatabaseUrlComponents components = DatabaseUrlComponents.parse(
                "postgresql+asyncpg://postgres:secret@db.example.com:5432/hypofit?sslmode=require"
        );

        assertThat(components.jdbcUrl()).isEqualTo("jdbc:postgresql://db.example.com:5432/hypofit?sslmode=require");
        assertThat(components.username()).isEqualTo("postgres");
        assertThat(components.password()).isEqualTo("secret");
    }
}
