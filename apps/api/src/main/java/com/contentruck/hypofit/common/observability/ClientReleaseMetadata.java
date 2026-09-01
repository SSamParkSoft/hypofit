package com.contentruck.hypofit.common.observability;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public final class ClientReleaseMetadata {

    public static final String VERSION_HEADER = "X-Client-Version";
    public static final String BUILD_HEADER = "X-Client-Build";
    public static final String REVISION_HEADER = "X-Client-Revision";

    private static final int MAX_VALUE_LENGTH = 64;

    private ClientReleaseMetadata() {
    }

    public static String version(HttpServletRequest request) {
        return normalize(request.getHeader(VERSION_HEADER));
    }

    public static String build(HttpServletRequest request) {
        return normalize(request.getHeader(BUILD_HEADER));
    }

    public static String revision(HttpServletRequest request) {
        return normalize(request.getHeader(REVISION_HEADER));
    }

    static String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > MAX_VALUE_LENGTH || !normalized.matches("[A-Za-z0-9._+-]+")) {
            return null;
        }
        return normalized;
    }
}
