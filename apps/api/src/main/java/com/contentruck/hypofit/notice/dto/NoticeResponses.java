package com.contentruck.hypofit.notice.dto;

import com.contentruck.hypofit.notice.service.NoticeRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class NoticeResponses {
    private NoticeResponses() { }

    public record NoticeResponse(
            UUID id, String type, String title, String body, String status,
            @JsonProperty("published_at") OffsetDateTime publishedAt,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt
    ) {
        public static NoticeResponse from(NoticeRepository.NoticeRecord value) {
            return new NoticeResponse(value.id(), value.type(), value.title(), value.body(), value.status(), value.publishedAt(), value.createdAt(), value.updatedAt());
        }
    }
}
