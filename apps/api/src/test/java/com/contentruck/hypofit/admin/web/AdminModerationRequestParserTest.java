package com.contentruck.hypofit.admin.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AdminModerationRequestParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parseNormalizesReasonAndDefaultsMetadata() throws Exception {
        var command = AdminModerationRequestParser.parse(objectMapper.readTree("""
                {
                  "target_type": "chat_message",
                  "target_id": "11111111-1111-1111-1111-111111111111",
                  "action": "hide",
                  "reason": "   ",
                  "unknown": "ignored"
                }
                """));

        assertThat(command.reason()).isNull();
        assertThat(command.metadata()).isEqualTo(Map.of());
    }

    @Test
    void parseRejectsNullMetadata() throws Exception {
        assertThatThrownBy(() -> AdminModerationRequestParser.parse(objectMapper.readTree("""
                {
                  "target_type": "chat_message",
                  "target_id": "11111111-1111-1111-1111-111111111111",
                  "action": "hide",
                  "metadata": null
                }
                """)))
                .isInstanceOf(HypofitValidationException.class);
    }

    @Test
    void parseRejectsUnknownAction() throws Exception {
        assertThatThrownBy(() -> AdminModerationRequestParser.parse(objectMapper.readTree("""
                {
                  "target_type": "chat_message",
                  "target_id": "11111111-1111-1111-1111-111111111111",
                  "action": "invalid"
                }
                """)))
                .isInstanceOf(HypofitValidationException.class);
    }
}
