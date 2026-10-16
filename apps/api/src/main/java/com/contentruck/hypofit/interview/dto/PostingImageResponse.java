package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.interview.service.PostingImageService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PostingImageResponse(UUID id, String url, @JsonProperty("url_expires_at") OffsetDateTime urlExpiresAt,
        int width, int height, @JsonProperty("alt_text") String altText) {
    public static PostingImageResponse from(PostingImageService.SignedImage image) {
        return new PostingImageResponse(image.id(), image.url(), image.urlExpiresAt(), image.width(), image.height(), image.altText());
    }
}
