package com.contentruck.hypofit.admin.web;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

final class AdminAccountDeletionRequestParser {

    private static final Set<String> STATUSES =
            Set.of("requested", "verified", "in_review", "completed", "rejected", "canceled");

    private AdminAccountDeletionRequestParser() {
    }

    static String parseStatusFilter(String raw) {
        if (raw == null) {
            return null;
        }
        if (!STATUSES.contains(raw)) {
            throw validation("status", "입력값을 확인해 주세요.");
        }
        return raw;
    }

    static int parseLimit(String raw) {
        if (raw == null || raw.isBlank()) {
            return 100;
        }
        try {
            int value = Integer.parseInt(raw);
            if (value < 1 || value > 200) {
                throw validation("limit", "입력값을 확인해 주세요.");
            }
            return value;
        } catch (NumberFormatException exception) {
            throw validation("limit", "입력값을 확인해 주세요.");
        }
    }

    static UUID parseRequestId(String raw) {
        if (raw == null || raw.isBlank()) {
            throw validation("request_id", "입력값을 확인해 주세요.");
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException exception) {
            throw validation("request_id", "입력값을 확인해 주세요.");
        }
    }

    private static HypofitValidationException validation(String field, String message) {
        return new HypofitValidationException(
                "Admin account deletion validation failed",
                List.of(new FieldError(field, message))
        );
    }
}
