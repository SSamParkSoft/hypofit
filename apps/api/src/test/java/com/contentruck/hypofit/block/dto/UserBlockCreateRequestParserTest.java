package com.contentruck.hypofit.block.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class UserBlockCreateRequestParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parseNormalizesBlankReasonToNull() throws Exception {
        var command = UserBlockCreateRequestParser.parse(objectMapper.readValue("""
                {
                  "reason": "   "
                }
                """, UserBlockCreateRequest.class));

        assertThat(command.reason()).isNull();
    }

    @Test
    void parseRejectsReasonLongerThan500() throws Exception {
        String longReason = "a".repeat(501);

        assertThatThrownBy(() -> UserBlockCreateRequestParser.parse(objectMapper.readValue("""
                {
                  "reason": "%s"
                }
                """.formatted(longReason), UserBlockCreateRequest.class)))
                .isInstanceOf(HypofitValidationException.class)
                .hasMessageContaining("입력값을 확인해 주세요.");
    }
}
