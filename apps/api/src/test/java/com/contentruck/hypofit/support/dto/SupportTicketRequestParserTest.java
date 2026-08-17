package com.contentruck.hypofit.support.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.support.service.SupportTicketCreateCommand;
import com.contentruck.hypofit.support.service.SupportTicketUpdateCommand;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SupportTicketRequestParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parseCreateNormalizesTrimmedFieldsAndMetadata() throws Exception {
        SupportTicketCreateCommand command = SupportTicketRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "kind": "inquiry",
                  "category": "other",
                  "subject": "  문의 제목  ",
                  "body": "  불편했던 점을 남깁니다.  ",
                  "contact_email": " USER@EXAMPLE.COM ",
                  "metadata": { "source": "mobile_feedback" }
                }
                """, SupportTicketCreateRequest.class));

        assertThat(command.subject()).isEqualTo("문의 제목");
        assertThat(command.body()).isEqualTo("불편했던 점을 남깁니다.");
        assertThat(command.contactEmail()).isEqualTo("user@example.com");
        assertThat(command.metadata()).containsEntry("source", "mobile_feedback");
    }

    @Test
    void parseCreateRejectsInvalidContactEmail() throws Exception {
        assertThatThrownBy(() -> SupportTicketRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "kind": "inquiry",
                  "category": "account",
                  "body": "문의 내용을 적었습니다.",
                  "contact_email": "wrong-email"
                }
                """, SupportTicketCreateRequest.class)))
                .isInstanceOf(HypofitValidationException.class);
    }

    @Test
    void parseCreateDefaultsMetadataWhenFieldIsAbsent() throws Exception {
        SupportTicketCreateCommand command = SupportTicketRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "kind": "inquiry",
                  "category": "account",
                  "body": "문의 내용을 적었습니다.",
                  "contact_email": "user@example.com"
                }
                """, SupportTicketCreateRequest.class));

        assertThat(command.metadata()).isEmpty();
    }

    @Test
    void parseCreateRejectsNullMetadata() throws Exception {
        assertThatThrownBy(() -> SupportTicketRequestParser.parseCreate(objectMapper.readValue("""
                {
                  "kind": "inquiry",
                  "category": "account",
                  "body": "문의 내용을 적었습니다.",
                  "contact_email": "user@example.com",
                  "metadata": null
                }
                """, SupportTicketCreateRequest.class)))
                .isInstanceOf(HypofitValidationException.class);
    }

    @Test
    void parseUpdateRequiresKnownField() throws Exception {
        assertThatThrownBy(() -> SupportTicketRequestParser.parseUpdate(objectMapper.readValue("""
                {
                  "unknown": "value"
                }
                """, SupportTicketUpdateRequest.class)))
                .isInstanceOf(HypofitValidationException.class);
    }

    @Test
    void parseUpdateTracksProvidedNullableFields() throws Exception {
        SupportTicketUpdateCommand command = SupportTicketRequestParser.parseUpdate(objectMapper.readValue("""
                {
                  "category": null,
                  "subject": "   ",
                  "contact_email": null
                }
                """, SupportTicketUpdateRequest.class));

        assertThat(command.providedFields()).containsExactlyInAnyOrder("category", "subject", "contact_email");
        assertThat(command.category()).isNull();
        assertThat(command.subject()).isNull();
        assertThat(command.contactEmail()).isNull();
    }
}
