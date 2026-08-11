package com.contentruck.hypofit.common.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import org.springframework.util.StringUtils;

public record DatabaseUrlComponents(String jdbcUrl, String username, String password) {

    public static DatabaseUrlComponents parse(String rawUrl) {
        if (!StringUtils.hasText(rawUrl)) {
            throw new IllegalArgumentException("DATABASE_URL is required");
        }

        if (rawUrl.startsWith("jdbc:postgresql://")) {
            return new DatabaseUrlComponents(rawUrl, "", "");
        }

        String normalized = rawUrl
                .replaceFirst("^postgresql\\+asyncpg://", "postgresql://")
                .replaceFirst("^postgres://", "postgresql://");

        URI uri = URI.create(normalized);
        String host = uri.getHost();
        if (!StringUtils.hasText(host)) {
            throw new IllegalArgumentException("DATABASE_URL host is missing");
        }

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                .append(host);
        if (uri.getPort() >= 0) {
            jdbcUrl.append(":").append(uri.getPort());
        }
        jdbcUrl.append(StringUtils.hasText(uri.getPath()) ? uri.getPath() : "/postgres");
        if (StringUtils.hasText(uri.getQuery())) {
            jdbcUrl.append("?").append(uri.getQuery());
        }

        String username = "";
        String password = "";
        String userInfo = uri.getUserInfo();
        if (StringUtils.hasText(userInfo)) {
            String[] parts = userInfo.split(":", 2);
            username = decode(parts[0]);
            if (parts.length > 1) {
                password = decode(parts[1]);
            }
        }

        return new DatabaseUrlComponents(jdbcUrl.toString(), username, password);
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
