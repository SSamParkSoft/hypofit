package com.contentruck.hypofit.block.dto;

import com.contentruck.hypofit.block.service.UserBlockCommand;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.common.web.RawRequestBodyJson;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public final class UserBlockCreateRequestParser {

    private UserBlockCreateRequestParser() {
    }

    public static UserBlockCommand parse(UserBlockCreateRequest request) {
        return parse(RawRequestBodyJson.toJsonNode(request.rawBody()));
    }

    public static UserBlockCommand parse(JsonNode body) {
        if (body == null || body.isNull() || !body.isObject()) {
            throw validation("__root__", "입력값을 확인해 주세요.");
        }

        String reason = null;
        JsonNode reasonNode = body.get("reason");
        if (reasonNode != null && !reasonNode.isNull()) {
            if (!reasonNode.isTextual()) {
                throw validation("reason", "입력값을 확인해 주세요.");
            }
            String rawReason = reasonNode.asText();
            if (rawReason.length() > 500) {
                throw validation("reason", "입력값을 확인해 주세요.");
            }
            reason = normalizeReason(rawReason);
        }

        return new UserBlockCommand(reason);
    }

    private static String normalizeReason(String value) {
        String stripped = String.join(" ", value.trim().split("\\s+"));
        return stripped.isBlank() ? null : stripped;
    }

    private static HypofitValidationException validation(String field, String message) {
        return new HypofitValidationException(message, List.of(new FieldError(field, message)));
    }
}
